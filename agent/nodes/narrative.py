"""Narrative node — develops idea, logline, and script with full film awareness."""

from __future__ import annotations

import json
import re
from typing import Any, Dict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..db_bridge import write_narrative
from ..prompts import NARRATIVE_SYSTEM, serialize_state
from ..state import FilmProductionState


async def narrative_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Handle narrative development: idea → logline → script."""
    project_state_text = serialize_state(state)

    system = f"""{NARRATIVE_SYSTEM}

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

        # Try to extract update_narrative JSON command
        narrative_updates = {}
        json_match = re.search(r'\{"update_narrative"[^}]*(?:\{[^}]*\})*[^}]*\}', content, re.DOTALL)
        if not json_match:
            # Try to find any JSON block with narrative keys
            block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
            if block_match:
                try:
                    parsed = json.loads(block_match.group(1))
                    if "update_narrative" in parsed:
                        narrative_updates = parsed["update_narrative"]
                except Exception:
                    pass
        else:
            try:
                parsed = json.loads(json_match.group(0))
                narrative_updates = parsed.get("update_narrative", {})
            except Exception:
                pass

        # Persist to DB if there are updates
        if narrative_updates and state.get("project_id"):
            append = narrative_updates.pop("append", False)
            write_narrative(state["project_id"], narrative_updates, append=append)

        # Clean response text for user (remove JSON blocks)
        display_text = re.sub(r'```(?:json)?\s*\{[\s\S]*?\}\s*```', '', content).strip()
        if not display_text:
            display_text = content

        return {
            "messages": [AIMessage(content=display_text)],
            "last_node": "narrative",
            "next_node": None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در پردازش روایت: {exc}")],
            "last_node": "narrative",
            "error": str(exc),
            "next_node": None,
        }
