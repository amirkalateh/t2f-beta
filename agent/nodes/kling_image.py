"""Kling image generation node — generates storyboard images for shots.

Uses the registered kling_generate_image StructuredTool (not _run_kling directly),
ensuring the architecture aligns with the LangGraph tool-node model.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List

from langchain_core.messages import AIMessage

from ..db_bridge import update_shot_image, write_agent_run_log
from ..state import FilmProductionState
from ..tools.kling_tools import kling_generate_image


def _get_aspect_ratio(state: FilmProductionState) -> str:
    """Map project aspect ratio to a Kling-compatible value."""
    ratio = state.get("aspect_ratio", "16:9")
    mapping = {
        "2.39:1": "16:9", "2.35:1": "16:9", "1.85:1": "16:9",
        "4:3": "4:3", "3:4": "3:4", "9:16": "9:16", "1:1": "1:1",
    }
    return mapping.get(ratio, "16:9")


async def kling_image_node(state: FilmProductionState, _llm: Any) -> Dict[str, Any]:
    """Generate storyboard images for shots that have prompts but no images.

    Delegates to the kling_generate_image StructuredTool for each shot,
    then persists results via db_bridge.
    """
    shots = state.get("shots", [])
    pending_ids = state.get("pending_shot_ids", [])

    # Determine which shots to process
    if pending_ids:
        target_shots = [s for s in shots if s.get("id") in pending_ids and not s.get("generated_image_url")]
    else:
        target_shots = [s for s in shots if s.get("prompt") and not s.get("generated_image_url")]

    if not target_shots:
        return {
            "messages": [AIMessage(content="همه شات‌ها قبلاً تصویر دارند.")],
            "last_node": "kling_image",
            "next_node": None,
        }

    aspect_ratio = _get_aspect_ratio(state)
    project_id = state.get("project_id")
    thread_id = state.get("thread_id", "unknown")
    results: List[str] = []
    total_cost = state.get("run_cost", 0.0)
    new_active_tasks = dict(state.get("active_kling_tasks", {}))

    for shot in target_shots[:6]:  # Max 6 per invocation to avoid timeout
        shot_id = shot["id"]
        prompt = shot.get("prompt") or shot.get("description", "")
        if not prompt:
            continue

        # Delegate to the registered StructuredTool
        tool_output_str = await kling_generate_image.ainvoke({
            "prompt": prompt[:800],
            "shot_id": shot_id,
            "aspect_ratio": aspect_ratio,
            "model": "kling-v2",
        })

        try:
            tool_result = json.loads(tool_output_str)
        except Exception:
            tool_result = {"success": False, "output_preview": str(tool_output_str)}

        if tool_result.get("success") and tool_result.get("url"):
            url = tool_result["url"]
            task_id = tool_result.get("task_id", "")
            if project_id:
                update_shot_image(shot_id, url, task_id or "")
            write_agent_run_log(thread_id, project_id or 0, "kling_image", "success", 0.05)
            results.append(f"✓ Shot #{shot_id}: تصویر تولید شد")
            new_active_tasks.pop(str(shot_id), None)
            total_cost += 0.05
        elif tool_result.get("task_id"):
            task_id = tool_result["task_id"]
            new_active_tasks[str(shot_id)] = task_id
            write_agent_run_log(thread_id, project_id or 0, "kling_image", "submitted")
            results.append(f"⏳ Shot #{shot_id}: ارسال شد (task_id: {task_id})")
        else:
            write_agent_run_log(
                thread_id, project_id or 0, "kling_image", "error",
                error=tool_result.get("output_preview", "")[:200]
            )
            results.append(f"✗ Shot #{shot_id}: {tool_result.get('output_preview', 'error')[:100]}")

    summary = "\n".join(results)
    message = f"نتیجه تولید تصویر:\n{summary}" if results else "هیچ شاتی برای تصویرسازی یافت نشد."

    return {
        "messages": [AIMessage(content=message)],
        "active_kling_tasks": new_active_tasks,
        "run_cost": total_cost,
        "last_node": "kling_image",
        "next_node": None,
    }
