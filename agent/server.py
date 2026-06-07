"""FastAPI server for the Tex2Film LangGraph agent.

Security model:
  • CORS is open for the Replit preview proxy + localhost origins
  • An optional shared secret (AGENT_INTERNAL_TOKEN env var) can be set.
    When set, every request must include X-Agent-Token: <token>.
    When not set the check is skipped (convenient for local dev).

Endpoints:
  POST /agent/run              — start/continue a run, streams SSE
  POST /agent/resume/{tid}     — resume after human interrupt, streams SSE
  GET  /agent/status/{tid}     — current graph state snapshot
  GET  /agent/history/{tid}    — message history for a thread
  GET  /agent/health           — liveness probe
  GET  /agent/logs/{project_id}— recent run logs
"""

from __future__ import annotations

import json
import os
import traceback
import uuid
from typing import AsyncGenerator, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from .db_bridge import load_project_state, write_agent_run_log
from .graph import get_graph

# ──────────────────────────────────────────────────────────────────────────────
# App + security setup
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Tex2Film Agent", version="2.0.0")

# Allow all origins — this service is proxied through Next.js API routes
# which handle external security. The Python agent is an internal service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Agent-Token"],
)

_INTERNAL_TOKEN: str = os.environ.get("AGENT_INTERNAL_TOKEN", "")


async def _require_internal_token(x_agent_token: Optional[str] = Header(default=None)) -> None:
    """Dependency: validate the shared internal token when AGENT_INTERNAL_TOKEN is set."""
    if _INTERNAL_TOKEN and x_agent_token != _INTERNAL_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden: missing or invalid X-Agent-Token")


# ──────────────────────────────────────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────────────────────────────────────

class RunRequest(BaseModel):
    project_id: int
    user_message: str
    thread_id: Optional[str] = None
    current_stage: Optional[str] = "narrative"  # narrative | director_brief | elements | vision | storyboard | assembly | export


class ResumeRequest(BaseModel):
    thread_id: str
    project_id: int
    approved: bool
    user_message: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# SSE helpers
# ──────────────────────────────────────────────────────────────────────────────

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


_TRACKED_NODES = frozenset({
    "supervisor", "narrative", "director_brief", "shot_breakdown",
    "prompt_builder", "kling_image", "kling_video", "continuity_check",
    "assembly_advice", "answer", "human_feedback",
})

# Nodes that write to the database or call external APIs
_WRITE_NODES = frozenset({
    "narrative", "director_brief", "shot_breakdown", "prompt_builder",
    "kling_image", "kling_video",
})

# Human-readable labels for interrupt confirmation cards
_INTERRUPT_LABELS: dict[str, str] = {
    "narrative":       "می‌خواهم داستان پروژه را بنویسم یا ویرایش کنم.",
    "director_brief":  "می‌خواهم بریف کارگردانی (هویت بصری فیلم) را تعریف کنم.",
    "shot_breakdown":  "می‌خواهم فیلم‌نامه را به شات‌لیست حرفه‌ای تبدیل کنم.",
    "prompt_builder":  "می‌خواهم پرامپت‌های تولید تصویر شات‌ها را بسازم یا بهبود دهم.",
    "kling_image":     "می‌خواهم تصاویر استوری‌بورد را با هوش مصنوعی تولید کنم.",
    "kling_video":     "می‌خواهم کلیپ‌های ویدیویی را با Kling AI تولید کنم. این عملیات هزینه‌بر و غیرقابل بازگشت است.",
    "human_feedback":  "یک مرحله از پایپ‌لاین تولید آماده بازبینی است.",
}


# ──────────────────────────────────────────────────────────────────────────────
# Core streaming helpers
# ──────────────────────────────────────────────────────────────────────────────

def _make_sse_headers(thread_id: str) -> dict:
    return {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
        "X-Thread-ID": thread_id,
    }


async def _stream_graph_events(
    input_value,
    config: dict,
    thread_id: str,
) -> AsyncGenerator[str, None]:
    """Generic SSE event streamer for graph.astream_events().

    Works for both fresh runs (input_value = state dict) and
    resume-after-interrupt runs (input_value = None).

    Event types emitted:
      node_start     — a node began executing
      node_end       — a node finished, may carry message + db_updated
      token          — live streaming token from an LLM call
      action_proposal— supervisor has decided what to do (shown in confirm card)
      interrupt      — graph paused, user must confirm before continuing
      db_updated     — a write node successfully persisted data to DB
      done           — graph reached END
      error          — an exception occurred
    """
    graph = await get_graph()
    last_ai_message = None
    current_node = "supervisor"
    action_proposal = ""
    got_end = False

    try:
        async for event in graph.astream_events(input_value, config=config, version="v2"):
            kind = event.get("event", "")
            name = event.get("name", "")

            # ── Node start ────────────────────────────────────────────────────
            if kind == "on_chain_start" and name in _TRACKED_NODES:
                current_node = name
                yield _sse({"event": "node_start", "node": name, "status": "running"})
                write_agent_run_log(
                    config["configurable"]["thread_id"],
                    config["configurable"].get("project_id", 0),
                    name,
                    "running",
                )

            # ── Node end ──────────────────────────────────────────────────────
            elif kind == "on_chain_end" and name in _TRACKED_NODES:
                output = event.get("data", {}).get("output", {})
                msgs = output.get("messages", [])

                payload: dict = {"event": "node_end", "node": name, "status": "completed"}

                if msgs:
                    last_msg = msgs[-1]
                    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
                    last_ai_message = content
                    payload["message"] = content
                    payload["run_cost"] = output.get("run_cost", 0.0)

                # Capture action_proposal from supervisor
                if name == "supervisor":
                    ap = output.get("action_proposal", "")
                    if ap:
                        action_proposal = ap
                        yield _sse({
                            "event": "action_proposal",
                            "proposal": ap,
                            "next_node": output.get("next_node"),
                            "action_type": output.get("action_type", "write"),
                        })

                yield _sse(payload)

                # Emit db_updated after successful write node completion
                if name in _WRITE_NODES and not output.get("error"):
                    yield _sse({
                        "event": "db_updated",
                        "node": name,
                        "thread_id": thread_id,
                    })

                write_agent_run_log(
                    config["configurable"]["thread_id"],
                    config["configurable"].get("project_id", 0),
                    name,
                    "completed",
                )

            # ── Streaming LLM tokens ──────────────────────────────────────────
            elif kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield _sse({"event": "token", "node": current_node, "token": chunk.content})

            # ── Graph END ─────────────────────────────────────────────────────
            elif kind == "on_chain_end" and name == "LangGraph":
                got_end = True

        # ── After stream ends: check for interrupt ────────────────────────────
        if not got_end:
            try:
                snapshot = await graph.aget_state(config)
                if snapshot and snapshot.next:
                    interrupted_before = list(snapshot.next)[0]

                    # Use supervisor's action_proposal if available, else default label
                    question = action_proposal if action_proposal else _INTERRUPT_LABELS.get(
                        interrupted_before, "تأیید برای ادامه لازم است."
                    )

                    yield _sse({
                        "event": "interrupt",
                        "node": interrupted_before,
                        "status": "waiting",
                        "thread_id": thread_id,
                        "question": question,
                        "action_proposal": action_proposal,
                    })
                    return  # Don't send done — we're waiting for resume
            except Exception as snap_err:
                print(f"[agent] Snapshot check failed: {snap_err}")

        yield _sse({
            "event": "done",
            "node": "__end__",
            "status": "completed",
            "thread_id": thread_id,
            "final_message": last_ai_message,
        })

    except Exception as exc:
        tb = traceback.format_exc()
        yield _sse({"event": "error", "message": str(exc), "traceback": tb[-800:]})


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/agent/health")
async def health():
    return {"status": "ok", "service": "tex2film-agent", "version": "2.0.0"}


@app.post("/agent/run", dependencies=[Depends(_require_internal_token)])
async def run_agent(req: RunRequest):
    """Start or continue an agent run. Streams SSE events."""
    thread_id = req.thread_id or f"proj-{req.project_id}-{uuid.uuid4().hex[:8]}"
    config = {
        "configurable": {
            "thread_id": thread_id,
            "project_id": req.project_id,
        }
    }

    async def generate():
        try:
            db_state = load_project_state(req.project_id)
        except Exception as e:
            yield _sse({"event": "error", "message": f"Failed to load project: {e}"})
            return

        input_state = {
            **db_state,
            "current_intent": req.user_message,
            "current_stage": req.current_stage or "narrative",
            "thread_id": thread_id,
            "messages": [HumanMessage(content=req.user_message)],
            "error": None,
            "action_proposal": None,
        }

        yield _sse({
            "event": "status",
            "node": "supervisor",
            "status": "routing",
            "stage": req.current_stage,
            "project_id": req.project_id,
            "thread_id": thread_id,
        })

        async for chunk in _stream_graph_events(input_state, config, thread_id):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers=_make_sse_headers(thread_id),
    )


@app.post("/agent/resume/{thread_id}", dependencies=[Depends(_require_internal_token)])
async def resume_agent(thread_id: str, req: ResumeRequest):
    """Resume a graph paused at a human interrupt. Streams SSE events."""
    config = {
        "configurable": {
            "thread_id": thread_id,
            "project_id": req.project_id,
        }
    }

    graph = await get_graph()

    if not req.approved:
        # ── Cancel path: explicitly resolve the checkpoint so the thread
        #    does NOT stay wedged. We update state to route to the safe
        #    "answer" node, clear the action proposal, append a cancel
        #    context message, then let the graph run to END.
        try:
            snapshot = await graph.aget_state(config)
            state = snapshot.values if snapshot else {}
            messages = list(state.get("messages", []))
            messages.append(HumanMessage(content="[کاربر عملیات را لغو کرد]"))

            await graph.aupdate_state(
                config,
                {
                    "next_node": "answer",
                    "action_proposal": "",
                    "action_type": "",
                    "messages": messages,
                },
            )
        except Exception as exc:
            # If checkpoint is missing/broken, stream an error and stop
            async def _error():
                yield _sse({
                    "event": "error",
                    "thread_id": thread_id,
                    "error": f"Failed to resolve cancel: {exc}",
                })
                yield _sse({"event": "done", "node": "__end__", "status": "error", "thread_id": thread_id})
            return StreamingResponse(_error(), media_type="text/event-stream", headers=_make_sse_headers(thread_id))

        async def _cancel():
            yield _sse({
                "event": "cancelled",
                "thread_id": thread_id,
                "message": "عملیات لغو شد. هر زمان که آماده بودی، دوباره بگو.",
            })
            async for chunk in _stream_graph_events(None, config, thread_id):
                yield chunk
        return StreamingResponse(_cancel(), media_type="text/event-stream", headers=_make_sse_headers(thread_id))

    async def generate():
        yield _sse({"event": "status", "node": "resume", "status": "resuming", "thread_id": thread_id})
        async for chunk in _stream_graph_events(None, config, thread_id):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers=_make_sse_headers(thread_id),
    )


@app.get("/agent/status/{thread_id}", dependencies=[Depends(_require_internal_token)])
async def get_status(thread_id: str, project_id: int = 0):
    """Get the current graph state for a thread."""
    graph = await get_graph()
    config = {"configurable": {"thread_id": thread_id, "project_id": project_id}}

    try:
        snapshot = await graph.aget_state(config)
        state = snapshot.values if snapshot else {}
        return {
            "thread_id": thread_id,
            "current_node": state.get("last_node", "unknown"),
            "current_stage": state.get("current_stage", "narrative"),
            "shot_count": len(state.get("shots", [])),
            "run_cost": state.get("run_cost", 0.0),
            "error": state.get("error"),
            "interrupted": bool(snapshot.next) if snapshot else False,
            "interrupted_before": list(snapshot.next) if snapshot and snapshot.next else [],
            "action_proposal": state.get("action_proposal", ""),
            "auto_pipeline": state.get("auto_pipeline", False),
        }
    except Exception as exc:
        return {"thread_id": thread_id, "error": str(exc)}


@app.get("/agent/logs/{project_id}", dependencies=[Depends(_require_internal_token)])
async def get_agent_logs(project_id: int, limit: int = 50):
    """Get recent agent run logs for a project."""
    try:
        from .db_bridge import _conn
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT thread_id, node_name, status, cost_credits, error, created_at
                FROM agent_run_logs
                WHERE project_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (project_id, limit),
            )
            rows = cur.fetchall()
            return {"project_id": project_id, "logs": [dict(r) for r in rows]}
    except Exception as exc:
        return {"project_id": project_id, "logs": [], "error": str(exc)}
