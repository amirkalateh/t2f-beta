"""FilmProductionState — the single source of truth shared across all graph nodes."""

from __future__ import annotations

import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_core.messages import BaseMessage


def _add_messages(left: List[BaseMessage], right: List[BaseMessage]) -> List[BaseMessage]:
    """Append new messages; keep at most 60 to avoid token bloat."""
    combined = left + right
    return combined[-60:]


class NarrativeState(TypedDict, total=False):
    idea: Optional[str]
    logline: Optional[str]
    script: Optional[str]
    target_audience: Optional[str]
    duration: Optional[str]


class DirectorBriefState(TypedDict, total=False):
    film_style: Optional[str]
    film_texture: Optional[str]
    color_science: Optional[str]
    lighting_philosophy: Optional[str]
    overall_mood: Optional[str]
    reference_films: Optional[str]
    era: Optional[str]
    visual_style: Optional[str]
    camera_body: Optional[str]
    lens_family: Optional[str]
    base_aspect_ratio: Optional[str]


class ShotState(TypedDict, total=False):
    id: int
    order: int
    title: str
    description: Optional[str]
    prompt: Optional[str]
    shot_type: Optional[str]
    camera_angle: Optional[str]
    camera_movement: Optional[str]
    key_light: Optional[str]
    color_grade: Optional[str]
    camera_model: Optional[str]
    lens_type: Optional[str]
    focal_length: Optional[str]
    cinema_aspect_ratio: Optional[str]
    duration: int
    dialogue_text: Optional[str]
    notes: Optional[str]
    scene_number: Optional[int]
    scene_name: Optional[str]
    status: str
    generated_image_url: Optional[str]
    generated_video_url: Optional[str]
    kling_task_id: Optional[str]
    character_ids: List[int]
    prop_ids: List[int]
    location_id: Optional[int]


class ElementState(TypedDict, total=False):
    id: int
    name: str
    type: str
    description: Optional[str]
    image_url: Optional[str]
    kling_element_id: Optional[str]
    sex: Optional[str]
    age: Optional[str]
    metadata: Optional[Dict[str, Any]]


class FilmProductionState(TypedDict, total=False):
    """Complete, persistent state shared across all LangGraph nodes.

    Persisted by LangGraph's PostgreSQL checkpointer keyed by (project_id, thread_id).
    Every node receives the full state and returns a partial update dict.
    """

    # Identity
    project_id: int
    project_title: str
    aspect_ratio: str

    # Workflow position
    current_stage: str          # narrative | director_brief | elements | vision | storyboard | assembly | export
    current_intent: str         # what the user just asked

    # Full film context — loaded from DB on entry, updated in-place by nodes
    narrative: NarrativeState
    director_brief: DirectorBriefState
    shots: List[ShotState]
    elements: List[ElementState]

    # Conversation history — messages accumulate via _add_messages reducer
    messages: Annotated[List[BaseMessage], _add_messages]

    # Generation pipeline
    pending_shot_ids: List[int]          # queued for image gen
    pending_video_shot_ids: List[int]    # queued for video gen
    active_kling_tasks: Dict[str, str]   # shot_id_str → kling_task_id
    continuity_issues: List[str]         # feedback from continuity_check node

    # Autonomous multi-step pipeline
    auto_pipeline: bool                  # when True supervisor chains stages automatically
    pipeline_stage_queue: List[str]      # ordered remaining stages in auto run

    # Human-in-the-loop
    human_feedback_next: Optional[str]   # node to execute after human approves

    # Action proposal — what the supervisor plans to do (shown in confirm card)
    action_proposal: Optional[str]       # Persian natural language description of planned action
    action_type: Optional[str]           # write | generate | analyze | answer

    # Routing
    next_node: Optional[str]             # supervisor's routing decision
    last_node: str

    # Observability
    error: Optional[str]
    run_cost: float                      # accumulated estimated Kling cost this run
    thread_id: str
