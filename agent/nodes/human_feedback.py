"""Human-feedback passthrough node.

The graph is compiled with interrupt_before=["human_feedback"], so execution
always pauses BEFORE this node runs.  When the user approves (resumes), this
node fires and routes to whatever was stored in state.human_feedback_next.

Pattern:
    supervisor sets human_feedback_next = "shot_breakdown" (for example)
    then routes next_node → "human_feedback"
    → graph pauses → user reviews → user resumes
    → human_feedback_node runs → returns next_node = human_feedback_next
    → route_after_specialist sees next_node in _VALID_NODES → returns "supervisor"
    → supervisor runs again with next_node already set → routes to shot_breakdown
"""

from __future__ import annotations

from typing import Any, Dict

from langchain_core.messages import AIMessage, HumanMessage

from ..state import FilmProductionState


async def human_feedback_node(state: FilmProductionState) -> Dict[str, Any]:
    """Resume after human review; forward to the queued next pipeline step."""
    messages = state.get("messages", [])
    last_human = next(
        (m for m in reversed(messages) if isinstance(m, HumanMessage)), None
    )
    feedback = last_human.content if last_human else ""

    next_target = state.get("human_feedback_next") or "answer"

    ack = AIMessage(
        content=f"بازبینی انجام شد. ادامه پایپ‌لاین: {next_target}."
        if not feedback
        else f"بازخورد دریافت شد: {feedback[:120]}. ادامه به مرحله {next_target}."
    )

    return {
        "last_node": "human_feedback",
        "next_node": next_target,
        "human_feedback_next": None,
        "messages": [ack],
    }
