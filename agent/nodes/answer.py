"""Answer node — pure conversational responses with full project context."""

from __future__ import annotations

from typing import Any, Dict
##signs of amir
from langchain_core.messages import AIMessage, SystemMessage

from ..prompts import serialize_state
from ..state import FilmProductionState

_ANSWER_SYSTEM = """\
You are the Tex2Film Omni Creative Director. You are a senior Persian-speaking cinematographer,
screenwriter, and film production expert. 

Answer the user's question in fluent Persian (Farsi) with deep film expertise.
Be specific, practical, and reference the actual project state when relevant.
Do not use emoji. Keep responses concise but insightful.
"""


async def answer_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Answer creative or informational questions with full project awareness."""
    project_state_text = serialize_state(state)

    system = f"""{_ANSWER_SYSTEM}

## CURRENT PROJECT STATE
{project_state_text}
"""
    messages = state.get("messages", [])
    history = [m for m in messages if not isinstance(m, SystemMessage)]

    try:
        response = await llm.ainvoke([SystemMessage(content=system)] + history)
        return {
            "messages": [AIMessage(content=response.content)],
            "last_node": "answer",
            "next_node": None,
        }
    except Exception as exc:
        return {
            "messages": [AIMessage(content=f"خطا در پاسخ: {exc}")],
            "last_node": "answer",
            "error": str(exc),
            "next_node": None,
        }
