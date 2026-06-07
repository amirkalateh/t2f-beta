"""Director brief node — defines visual DNA of the film."""

from __future__ import annotations

import json
import re
from typing import Any, Dict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..db_bridge import write_director_brief
from ..prompts import DIRECTOR_BRIEF_SYSTEM, serialize_state
from ..state import FilmProductionState


async def director_brief_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Build or refine the director's visual brief."""
    project_state_text = serialize_state(state)

    system = f"""{DIRECTOR_BRIEF_SYSTEM}

## CURRENT PROJECT STATE
{project_state_text}
"""
    messages = state.get("messages", [])
    history = [m for m in messages if not isinstance(m, SystemMessage)]

    try:
        response = await llm.ainvoke(
            [SystemMessage(content=system)] + history
        )
        content = response.content

        brief_updates = {}
        block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
        if block_match:
            try:
                parsed = json.loads(block_match.group(1))
                if "update_director_brief" in parsed:
                    brief_updates = parsed["update_director_brief"]
            except Exception:
                pass

        if not brief_updates:
            inline_match = re.search(r'\{"update_director_brief":\s*(\{[^}]+\})\}', content)
            if inline_match:
                try:
                    brief_updates = json.loads(inline_match.group(1))
                except Exception:
                    pass

        if brief_updates and state.get("project_id"):
            write_director_brief(state["project_id"], brief_updates)

        display_text = re.sub(r'```(?:json)?\s*\{[\s\S]*?\}\s*```', '', content).strip()
        if not display_text:
            display_text = content

        return {
            "messages": [AIMessage(content=display_text)],
            "last_node": "director_brief",
            "next_node": None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در تعریف بریف کارگردانی: {exc}")],
            "last_node": "director_brief",
            "error": str(exc),
            "next_node": None,
        }
