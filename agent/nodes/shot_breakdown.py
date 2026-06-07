"""Shot breakdown node — converts script to professional shot list with scene-lock."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..db_bridge import insert_shots
from ..prompts import SHOT_BREAKDOWN_SYSTEM, serialize_state
from ..state import FilmProductionState


async def shot_breakdown_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Break script into shots and persist them."""
    project_state_text = serialize_state(state)
    narrative = state.get("narrative", {})
    script = narrative.get("script", "")
    director_brief = state.get("director_brief", {})

    brief_text = ""
    if any(v for v in director_brief.values() if v):
        brief_lines = []
        mapping = [
            ("film_texture", "Film Texture"),
            ("color_science", "Color Science"),
            ("lighting_philosophy", "Lighting"),
            ("camera_body", "Camera"),
            ("lens_family", "Lenses"),
            ("base_aspect_ratio", "Aspect Ratio"),
            ("reference_films", "References"),
        ]
        for key, label in mapping:
            val = director_brief.get(key)
            if val:
                brief_lines.append(f"- {label}: {val}")
        brief_text = "Director Brief (apply to ALL shots):\n" + "\n".join(brief_lines)

    system = f"""{SHOT_BREAKDOWN_SYSTEM}

## CURRENT PROJECT STATE
{project_state_text}

{brief_text}

## FULL SCRIPT
{script[:6000] if script else "No script yet — ask user to write one first."}
"""
    messages = state.get("messages", [])
    history = [m for m in messages if not isinstance(m, SystemMessage)]

    try:
        response = await llm.ainvoke(
            [SystemMessage(content=system)] + history,
            temperature=0.2,
        )
        content = response.content

        new_shots: List[Dict] = []

        # Try to extract add_shots JSON
        block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
        if block_match:
            try:
                parsed = json.loads(block_match.group(1))
                if "add_shots" in parsed:
                    new_shots = parsed["add_shots"]
            except Exception:
                pass

        if not new_shots:
            # Try inline JSON
            inline_match = re.search(r'\{"add_shots":\s*(\[[\s\S]*?\])\}', content)
            if inline_match:
                try:
                    new_shots = json.loads(inline_match.group(1))
                except Exception:
                    pass

        shot_ids = []
        if new_shots and state.get("project_id"):
            shot_ids = insert_shots(state["project_id"], new_shots)

        display_text = re.sub(r'```(?:json)?\s*\{[\s\S]*?\}\s*```', '', content).strip()
        if not display_text:
            if shot_ids:
                display_text = f"{len(shot_ids)} شات به پروژه اضافه شد."
            else:
                display_text = content

        return {
            "messages": [AIMessage(content=display_text)],
            "pending_shot_ids": shot_ids if shot_ids else state.get("pending_shot_ids", []),
            "last_node": "shot_breakdown",
            "next_node": None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در تقسیم‌بندی شات‌ها: {exc}")],
            "last_node": "shot_breakdown",
            "error": str(exc),
            "next_node": None,
        }
