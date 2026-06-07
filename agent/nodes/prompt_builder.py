"""Prompt builder node — refines and enriches shot prompts with scene-lock."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, SystemMessage

from ..prompts import PROMPT_BUILDER_SYSTEM, serialize_state
from ..state import FilmProductionState


async def _update_shot_prompt(project_id: int, shot_id: int, prompt: str) -> None:
    """Update a single shot's prompt in DB (best-effort)."""
    try:
        from ..db_bridge import _conn
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE vision_shots SET prompt = %s, updated_at = NOW() WHERE id = %s AND project_id = %s",
                (prompt, shot_id, project_id),
            )
    except Exception:
        pass


async def prompt_builder_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Build/refine prompts for shots that lack good image-generation prompts."""
    project_state_text = serialize_state(state)
    continuity_issues = state.get("continuity_issues", [])
    continuity_ctx = ""
    if continuity_issues:
        continuity_ctx = "\n## CONTINUITY ISSUES TO FIX:\n" + "\n".join(f"- {i}" for i in continuity_issues)

    system = f"""{PROMPT_BUILDER_SYSTEM}

## CURRENT PROJECT STATE
{project_state_text}
{continuity_ctx}
"""
    messages = state.get("messages", [])
    history = [m for m in messages if not isinstance(m, SystemMessage)]

    try:
        response = await llm.ainvoke([SystemMessage(content=system)] + history)
        content = response.content

        # Parse shot prompt updates
        block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
        updates: List[Dict] = []
        if block_match:
            try:
                parsed = json.loads(block_match.group(1))
                updates = parsed.get("update_shot_prompts", [])
            except Exception:
                pass

        if updates and state.get("project_id"):
            for upd in updates:
                shot_id = upd.get("shot_id")
                prompt = upd.get("prompt", "")
                if shot_id and prompt:
                    await _update_shot_prompt(state["project_id"], shot_id, prompt)

        display_text = re.sub(r'```(?:json)?\s*\{[\s\S]*?\}\s*```', '', content).strip()
        if not display_text:
            display_text = content

        return {
            "messages": [AIMessage(content=display_text)],
            "continuity_issues": [],  # clear after addressing
            "last_node": "prompt_builder",
            "next_node": None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در ساخت پرامپت: {exc}")],
            "last_node": "prompt_builder",
            "error": str(exc),
            "next_node": None,
        }
