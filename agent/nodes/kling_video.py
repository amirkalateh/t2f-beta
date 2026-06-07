"""Kling video generation node — generates video clips for shots with storyboard images.

Uses the registered kling_generate_video StructuredTool (not _run_kling directly),
ensuring the architecture aligns with the LangGraph tool-node model.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List

from langchain_core.messages import AIMessage

from ..db_bridge import update_shot_video, write_agent_run_log
from ..state import FilmProductionState
from ..tools.kling_tools import kling_generate_video


async def kling_video_node(state: FilmProductionState, _llm: Any) -> Dict[str, Any]:
    """Generate video clips for shots that have images but no video.

    Delegates to the kling_generate_video StructuredTool for each shot,
    then persists results via db_bridge.
    """
    shots = state.get("shots", [])
    pending_ids = state.get("pending_video_shot_ids", [])

    if pending_ids:
        target_shots = [s for s in shots if s.get("id") in pending_ids and not s.get("generated_video_url")]
    else:
        target_shots = [
            s for s in shots
            if s.get("generated_image_url") and not s.get("generated_video_url")
        ]

    if not target_shots:
        return {
            "messages": [AIMessage(content="همه شات‌ها ویدیو دارند یا تصویری برای تبدیل وجود ندارد.")],
            "last_node": "kling_video",
            "next_node": None,
        }

    project_id = state.get("project_id")
    thread_id = state.get("thread_id", "unknown")
    aspect_ratio = state.get("aspect_ratio", "16:9")
    if aspect_ratio not in ("16:9", "9:16", "1:1"):
        aspect_ratio = "16:9"

    results: List[str] = []
    total_cost = state.get("run_cost", 0.0)

    for shot in target_shots[:3]:  # Max 3 videos per invocation (expensive!)
        shot_id = shot["id"]
        prompt = shot.get("prompt") or shot.get("description", "")
        if not prompt:
            continue

        duration = min(max(shot.get("duration", 5), 3), 10)
        image_url = shot.get("generated_image_url")

        # Delegate to the registered StructuredTool
        tool_output_str = await kling_generate_video.ainvoke({
            "prompt": prompt[:800],
            "shot_id": shot_id,
            "duration": duration,
            "model": "kling-v3",
            "aspect_ratio": aspect_ratio,
            "image_url": image_url,
        })

        try:
            tool_result = json.loads(tool_output_str)
        except Exception:
            tool_result = {"success": False, "output_preview": str(tool_output_str)}

        if tool_result.get("success") and tool_result.get("url"):
            url = tool_result["url"]
            task_id = tool_result.get("task_id", "")
            if project_id:
                update_shot_video(shot_id, url, task_id or "")
            write_agent_run_log(thread_id, project_id or 0, "kling_video", "success", 0.40)
            results.append(f"✓ Shot #{shot_id}: ویدیو تولید شد ({duration}s)")
            total_cost += 0.40
        elif tool_result.get("task_id"):
            task_id = tool_result["task_id"]
            write_agent_run_log(thread_id, project_id or 0, "kling_video", "submitted", 0.40)
            results.append(f"⏳ Shot #{shot_id}: ارسال شد (task_id: {task_id})")
            total_cost += 0.40
        else:
            write_agent_run_log(
                thread_id, project_id or 0, "kling_video", "error",
                error=tool_result.get("output_preview", "")[:200]
            )
            results.append(f"✗ Shot #{shot_id}: {tool_result.get('output_preview', 'error')[:100]}")

    summary = "\n".join(results) if results else "هیچ ویدیویی تولید نشد."
    cost_note = f"\n\nهزینه تخمینی این اجرا: {total_cost:.2f} credits"

    return {
        "messages": [AIMessage(content=f"نتیجه تولید ویدیو:\n{summary}{cost_note}")],
        "run_cost": total_cost,
        "last_node": "kling_video",
        "next_node": None,
    }
