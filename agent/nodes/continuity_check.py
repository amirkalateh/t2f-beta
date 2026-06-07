"""Continuity check node — reviews shots for visual consistency across scenes."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..prompts import CONTINUITY_SYSTEM, serialize_state
from ..state import FilmProductionState


async def continuity_check_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Check shot list for continuity/raccord issues."""
    project_state_text = serialize_state(state)

    system = f"""{CONTINUITY_SYSTEM}

## CURRENT PROJECT STATE
{project_state_text}
"""
    messages = state.get("messages", [])
    history = [m for m in messages if not isinstance(m, SystemMessage)]

    try:
        response = await llm.ainvoke([SystemMessage(content=system)] + history)
        content = response.content

        issues: List[str] = []
        is_clean = True

        block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
        if block_match:
            try:
                parsed = json.loads(block_match.group(1))
                report = parsed.get("continuity_report", {})
                issues = report.get("issues", [])
                is_clean = report.get("clean", True)
            except Exception:
                pass

        display_text = re.sub(r'```(?:json)?\s*\{[\s\S]*?\}\s*```', '', content).strip()
        if not display_text:
            display_text = content

        return {
            "messages": [AIMessage(content=display_text)],
            "continuity_issues": issues,
            "last_node": "continuity_check",
            "next_node": "prompt_builder" if issues else None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در بررسی پیوستگی: {exc}")],
            "last_node": "continuity_check",
            "error": str(exc),
            "next_node": None,
        }
