"""Supervisor node — intelligent LLM-driven routing with action proposals.

No keyword triggers. Pure context-aware LLM understanding.
The supervisor:
  1. Reads the full project state + user message
  2. Understands intent deeply (not keyword matching)
  3. Decides which specialist to route to
  4. Generates a clear Persian action_proposal of what will happen
  5. Stores the proposal in state so it can be shown in the interrupt card
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..prompts import SUPERVISOR_SYSTEM, serialize_state
from ..state import FilmProductionState


def _build_routing_context(state: FilmProductionState) -> str:
    """Concise project status summary for the supervisor LLM."""
    narrative = state.get("narrative", {})
    director_brief = state.get("director_brief", {})
    shots = state.get("shots", [])
    shots_with_images = sum(1 for s in shots if s.get("generated_image_url"))
    shots_with_video = sum(1 for s in shots if s.get("generated_video_url"))
    shots_with_prompts = sum(1 for s in shots if s.get("prompt"))
    has_brief = any(v for v in director_brief.values() if v)

    lines = [
        f"=== CURRENT PROJECT STATUS ===",
        f"Title: {state.get('project_title', 'Untitled')}",
        f"Stage: {state.get('current_stage', 'narrative')}",
        f"",
        f"NARRATIVE:",
        f"  Has idea: {bool(narrative.get('idea'))}",
        f"  Has logline: {bool(narrative.get('logline'))}",
        f"  Has script: {bool(narrative.get('script'))} ({len(narrative.get('script') or '')} chars)",
        f"",
        f"DIRECTOR BRIEF: {'complete' if has_brief else 'missing'}",
        f"",
        f"SHOTS: {len(shots)} total | {shots_with_prompts} with prompts | {shots_with_images} with images | {shots_with_video} with video",
        f"",
        f"NARRATIVE EXCERPT:",
    ]

    if narrative.get("idea"):
        lines.append(f"  Idea: {narrative['idea'][:200]}")
    if narrative.get("logline"):
        lines.append(f"  Logline: {narrative['logline']}")

    return "\n".join(lines)


async def supervisor_node(state: FilmProductionState, llm: Any) -> Dict[str, Any]:
    """Route the user's intent to the correct specialist node using pure LLM understanding."""
    messages = state.get("messages", [])
    last_human = next(
        (m for m in reversed(messages) if isinstance(m, HumanMessage)), None
    )
    user_text = last_human.content if last_human else state.get("current_intent", "")

    routing_context = _build_routing_context(state)

    routing_prompt = f"""{routing_context}

USER MESSAGE:
{user_text}

Analyze the project state and user message. Output the JSON routing decision."""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=SUPERVISOR_SYSTEM),
            HumanMessage(content=routing_prompt),
        ])
        raw = response.content.strip()

        # Extract JSON from response (may be wrapped in ```json blocks)
        parsed = None
        json_block = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', raw)
        if json_block:
            try:
                parsed = json.loads(json_block.group(1))
            except Exception:
                pass

        if not parsed:
            # Try to find raw JSON object
            json_match = re.search(r'\{[^{}]*"next_node"[^{}]*\}', raw, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                except Exception:
                    pass

        if not parsed:
            # Fallback: try to parse the whole response
            try:
                parsed = json.loads(raw)
            except Exception:
                pass

        if parsed and isinstance(parsed, dict):
            next_node = parsed.get("next_node", "answer")
            action_proposal = parsed.get("action_proposal", "")
            action_type = parsed.get("action_type", "answer")
        else:
            next_node = "answer"
            action_proposal = ""
            action_type = "answer"

        # Validate next_node
        valid_nodes = {
            "narrative", "director_brief", "elements", "shot_breakdown", "prompt_builder",
            "kling_image", "kling_video", "continuity_check", "assembly_advice",
            "answer", "human_feedback",
        }
        if next_node not in valid_nodes:
            next_node = "answer"

        result: Dict[str, Any] = {
            "next_node": next_node,
            "action_proposal": action_proposal,
            "action_type": action_type,
            "last_node": "supervisor",
        }

        # Add a brief thinking message if routing to a write node
        if action_proposal and next_node not in ("answer",):
            result["messages"] = [AIMessage(content=f"🎬 {action_proposal}")]

        return result

    except Exception as exc:
        return {
            "next_node": "answer",
            "action_proposal": "",
            "action_type": "answer",
            "last_node": "supervisor",
            "error": str(exc),
        }
