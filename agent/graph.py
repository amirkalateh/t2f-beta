"""LangGraph StateGraph — the core of the Tex2Film aware agent.

Wires all nodes into a stateful, persistent graph with:
- PostgreSQL checkpointing (same DB as the Next.js app)
- Human interrupt points before ALL write nodes (narrative, director_brief,
  shot_breakdown, prompt_builder, kling_image, kling_video)
- User must confirm before any DB mutation or AI generation
- Conditional routing: specialist nodes terminate to END in normal mode
- auto_pipeline mode: supervisor chains stages automatically after approval
"""

from __future__ import annotations

import os
from typing import Literal

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from .nodes.answer import answer_node
from .nodes.assembly_advice import assembly_advice_node
from .nodes.continuity_check import continuity_check_node
from .nodes.director_brief import director_brief_node
from .nodes.human_feedback import human_feedback_node
from .nodes.kling_image import kling_image_node
from .nodes.kling_video import kling_video_node
from .nodes.narrative import narrative_node
from .nodes.prompt_builder import prompt_builder_node
from .nodes.shot_breakdown import shot_breakdown_node
from .nodes.supervisor import supervisor_node
from .state import FilmProductionState

# ──────────────────────────────────────────────────────────────────────────────
# LLM configuration
# ──────────────────────────────────────────────────────────────────────────────

def _build_llm() -> ChatOpenAI:
    base_url = os.environ.get(
        "AI_INTEGRATIONS_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    )
    api_key = os.environ.get("AI_INTEGRATIONS_OPENROUTER_API_KEY", "missing")

    # LangSmith auto-tracing: ensure env is set before any LangGraph run
    os.environ.setdefault("LANGSMITH_TRACING", "true")
    os.environ.setdefault("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    os.environ.setdefault("LANGSMITH_PROJECT", "tex2film agent")

    return ChatOpenAI(
        model="openai/gpt-4o-mini",
        base_url=base_url,
        api_key=api_key,
        temperature=0.4,
        max_tokens=4096,
        streaming=True,
    )


_LLM: ChatOpenAI | None = None


def get_llm() -> ChatOpenAI:
    global _LLM
    if _LLM is None:
        _LLM = _build_llm()
    return _LLM


# ──────────────────────────────────────────────────────────────────────────────
# Node wrappers (bind LLM or plain async)
# ──────────────────────────────────────────────────────────────────────────────

async def _supervisor(state: FilmProductionState) -> dict:
    return await supervisor_node(state, get_llm())

async def _narrative(state: FilmProductionState) -> dict:
    return await narrative_node(state, get_llm())

async def _director_brief(state: FilmProductionState) -> dict:
    return await director_brief_node(state, get_llm())

async def _shot_breakdown(state: FilmProductionState) -> dict:
    return await shot_breakdown_node(state, get_llm())

async def _prompt_builder(state: FilmProductionState) -> dict:
    return await prompt_builder_node(state, get_llm())

async def _kling_image(state: FilmProductionState) -> dict:
    return await kling_image_node(state, get_llm())

async def _kling_video(state: FilmProductionState) -> dict:
    return await kling_video_node(state, get_llm())

async def _continuity_check(state: FilmProductionState) -> dict:
    return await continuity_check_node(state, get_llm())

async def _assembly_advice(state: FilmProductionState) -> dict:
    return await assembly_advice_node(state, get_llm())

async def _answer(state: FilmProductionState) -> dict:
    return await answer_node(state, get_llm())

async def _human_feedback(state: FilmProductionState) -> dict:
    return await human_feedback_node(state)


# ──────────────────────────────────────────────────────────────────────────────
# Routing logic
# ──────────────────────────────────────────────────────────────────────────────

_VALID_NODES = {
    "narrative", "director_brief", "elements", "shot_breakdown", "prompt_builder",
    "kling_image", "kling_video", "continuity_check", "assembly_advice",
    "answer", "human_feedback",
}

_LOOP_NODES = (
    "narrative", "director_brief", "elements", "shot_breakdown", "prompt_builder",
    "kling_image", "assembly_advice", "answer", "human_feedback",
)


def route_supervisor(state: FilmProductionState) -> str:
    """Conditional edge from supervisor → specialist node."""
    next_node = state.get("next_node") or "answer"
    if next_node not in _VALID_NODES:
        return "answer"
    return next_node


def route_after_continuity(state: FilmProductionState) -> str:
    """After continuity check: if issues found, loop to prompt_builder; else END."""
    issues = state.get("continuity_issues", [])
    if issues:
        return "prompt_builder"
    return END


def route_after_specialist(state: FilmProductionState) -> str:
    """After a specialist finishes:
    - In auto_pipeline mode: loop back to supervisor to chain next stage.
    - Otherwise: terminate and wait for next user turn.
    """
    if state.get("auto_pipeline"):
        next_node = state.get("next_node")
        if next_node and next_node in _VALID_NODES:
            return "supervisor"
    return END


# ──────────────────────────────────────────────────────────────────────────────
# Graph assembly
# ──────────────────────────────────────────────────────────────────────────────

def build_graph(checkpointer=None) -> CompiledStateGraph:
    """Build and compile the Tex2Film production graph."""
    builder = StateGraph(FilmProductionState)

    # ── Register nodes ────────────────────────────────────────────────────────
    builder.add_node("supervisor", _supervisor)
    builder.add_node("narrative", _narrative)
    builder.add_node("director_brief", _director_brief)
    builder.add_node("shot_breakdown", _shot_breakdown)
    builder.add_node("prompt_builder", _prompt_builder)
    builder.add_node("kling_image", _kling_image)
    builder.add_node("kling_video", _kling_video)
    builder.add_node("continuity_check", _continuity_check)
    builder.add_node("assembly_advice", _assembly_advice)
    builder.add_node("answer", _answer)
    builder.add_node("human_feedback", _human_feedback)

    # ── Entry point ───────────────────────────────────────────────────────────
    builder.add_edge(START, "supervisor")

    # ── Supervisor → any specialist ───────────────────────────────────────────
    builder.add_conditional_edges(
        "supervisor",
        route_supervisor,
        {n: n for n in _VALID_NODES},
    )

    # ── Continuity check may loop to prompt_builder or end ───────────────────
    builder.add_conditional_edges(
        "continuity_check",
        route_after_continuity,
        {"prompt_builder": "prompt_builder", END: END},
    )

    # ── kling_video always terminates ─────────────────────────────────────────
    builder.add_edge("kling_video", END)

    # ── All other specialists: loop in auto_pipeline or terminate ─────────────
    for node in _LOOP_NODES:
        builder.add_conditional_edges(
            node,
            route_after_specialist,
            {"supervisor": "supervisor", END: END},
        )

    # ── Interrupt points — user MUST confirm before any DB write or AI gen ────
    # This is the core UX: agent proposes → user sees what will happen → approves
    interrupt_before = [
        "narrative",        # writes idea/logline/script to DB
        "director_brief",   # writes visual DNA to DB
        "shot_breakdown",   # creates shot list in DB
        "prompt_builder",   # updates shot prompts in DB
        "kling_image",      # calls Kling API (cost + write)
        "kling_video",      # calls Kling API (expensive + irreversible)
        "human_feedback",   # explicit pipeline gate
    ]

    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=interrupt_before,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Singleton graph (initialized lazily with async Postgres checkpointer)
# ──────────────────────────────────────────────────────────────────────────────

_GRAPH: CompiledStateGraph | None = None


async def get_graph() -> CompiledStateGraph:
    global _GRAPH
    if _GRAPH is None:
        dsn = os.environ.get("DATABASE_URL", "")
        checkpointer = None
        if dsn:
            try:
                import psycopg
                conn = await psycopg.AsyncConnection.connect(
                    dsn, row_factory=psycopg.rows.dict_row, autocommit=True
                )
                checkpointer = AsyncPostgresSaver(conn)
                await checkpointer.setup()
                print("[agent] Async PostgreSQL checkpointer initialized")
            except Exception as e:
                print(f"[agent] Warning: Async PostgreSQL checkpointer failed ({e}), using in-memory")
                checkpointer = None
        _GRAPH = build_graph(checkpointer=checkpointer)
    return _GRAPH
