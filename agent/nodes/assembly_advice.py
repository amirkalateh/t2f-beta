"""Assembly advice node — advises on shot sequencing and pacing."""

from __future__ import annotations

from typing import Any, Dict

from langchain_core.messages import AIMessage, SystemMessage

from ..prompts import ASSEMBLY_SYSTEM, serialize_state
from ..state import FilmProductionState


async def assembly_advice_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Advise on assembly timeline and shot ordering."""
    project_state_text = serialize_state(state)

    system = f"""{ASSEMBLY_SYSTEM}

## CURRENT PROJECT STATE
{project_state_text}
"""
    messages = state.get("messages", [])
    history = [m for m in messages if not isinstance(m, SystemMessage)]

    try:
        response = await llm.ainvoke([SystemMessage(content=system)] + history)
        return {
            "messages": [AIMessage(content=response.content)],
            "last_node": "assembly_advice",
            "next_node": None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در مشاوره مونتاژ: {exc}")],
            "last_node": "assembly_advice",
            "error": str(exc),
            "next_node": None,
        }
