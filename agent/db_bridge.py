"""DB bridge — loads and writes film production state using raw SQL.

Connects to the same PostgreSQL instance used by the Next.js app via DATABASE_URL.
No Drizzle ORM dependency; pure psycopg2 for Python side.
"""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras

from .state import (
    DirectorBriefState,
    ElementState,
    FilmProductionState,
    NarrativeState,
    ShotState,
)


def _get_dsn() -> str:
    url = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:password@helium/heliumdb?sslmode=disable"
    )
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return url


@contextmanager
def _conn():
    conn = psycopg2.connect(_get_dsn(), cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────────────────────
# LOADERS
# ──────────────────────────────────────────────────────────────────────────────


def load_project_state(project_id: int) -> FilmProductionState:
    """Hydrate a full FilmProductionState from the database."""
    with _conn() as conn:
        cur = conn.cursor()

        # Project
        cur.execute(
            "SELECT id, title, current_stage, aspect_ratio FROM projects WHERE id = %s",
            (project_id,),
        )
        proj = cur.fetchone()
        if not proj:
            raise ValueError(f"Project {project_id} not found")

        # Narrative
        cur.execute(
            "SELECT idea, logline, script FROM narratives WHERE project_id = %s ORDER BY id DESC LIMIT 1",
            (project_id,),
        )
        narr_row = cur.fetchone()
        narrative: NarrativeState = {}
        if narr_row:
            narrative = {
                "idea": narr_row["idea"],
                "logline": narr_row["logline"],
                "script": narr_row["script"],
            }

        # Director brief
        cur.execute(
            "SELECT director_brief FROM vision_boards WHERE project_id = %s ORDER BY id DESC LIMIT 1",
            (project_id,),
        )
        vb_row = cur.fetchone()
        director_brief: DirectorBriefState = {}
        if vb_row and vb_row["director_brief"]:
            raw = vb_row["director_brief"]
            if isinstance(raw, str):
                raw = json.loads(raw)
            director_brief = {
                "film_style": raw.get("filmStyle"),
                "film_texture": raw.get("filmTexture"),
                "color_science": raw.get("colorScience"),
                "lighting_philosophy": raw.get("lightingPhilosophy"),
                "overall_mood": raw.get("overallMood"),
                "reference_films": raw.get("referenceFilms"),
                "era": raw.get("era"),
                "visual_style": raw.get("visualStyle"),
                "camera_body": raw.get("cameraBody"),
                "lens_family": raw.get("lensFamily"),
                "base_aspect_ratio": raw.get("baseAspectRatio"),
            }

        # Shots
        cur.execute(
            """
            SELECT id, "order", title, description, prompt,
                   shot_type, camera_angle, camera_movement,
                   key_light, color_grade, camera_model, lens_type, focal_length,
                   cinema_aspect_ratio, duration, dialogue_text, notes,
                   scene_number, scene_name, status,
                   generated_image_url, generated_video_url, kling_task_id
            FROM vision_shots
            WHERE project_id = %s
            ORDER BY "order" ASC
            """,
            (project_id,),
        )
        shots: List[ShotState] = []
        for row in cur.fetchall():
            shots.append(
                {
                    "id": row["id"],
                    "order": row["order"],
                    "title": row["title"],
                    "description": row["description"],
                    "prompt": row["prompt"],
                    "shot_type": row["shot_type"],
                    "camera_angle": row["camera_angle"],
                    "camera_movement": row["camera_movement"],
                    "key_light": row["key_light"],
                    "color_grade": row["color_grade"],
                    "camera_model": row["camera_model"],
                    "lens_type": row["lens_type"],
                    "focal_length": row["focal_length"],
                    "cinema_aspect_ratio": row["cinema_aspect_ratio"],
                    "duration": row["duration"] or 3,
                    "dialogue_text": row["dialogue_text"],
                    "notes": row["notes"],
                    "scene_number": row["scene_number"],
                    "scene_name": row["scene_name"],
                    "status": row["status"] or "draft",
                    "generated_image_url": row["generated_image_url"],
                    "generated_video_url": row["generated_video_url"],
                    "kling_task_id": row["kling_task_id"],
                    "character_ids": [],
                    "prop_ids": [],
                    "location_id": None,
                }
            )

        # Elements (characters, locations, props)
        cur.execute(
            """
            SELECT id, name, type, description, image_url, kling_element_id, metadata
            FROM assets
            WHERE project_id = %s
            ORDER BY id ASC
            """,
            (project_id,),
        )
        elements: List[ElementState] = []
        for row in cur.fetchall():
            meta = row["metadata"]
            if isinstance(meta, str):
                meta = json.loads(meta)
            elements.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"] or "character",
                    "description": row["description"],
                    "image_url": row["image_url"],
                    "kling_element_id": row["kling_element_id"],
                    "metadata": meta,
                }
            )

    return {
        "project_id": project_id,
        "project_title": proj["title"],
        "aspect_ratio": proj["aspect_ratio"] or "16:9",
        "current_stage": proj["current_stage"] or "narrative",
        "narrative": narrative,
        "director_brief": director_brief,
        "shots": shots,
        "elements": elements,
        "messages": [],
        "pending_shot_ids": [],
        "pending_video_shot_ids": [],
        "active_kling_tasks": {},
        "continuity_issues": [],
        "next_node": None,
        "last_node": "",
        "error": None,
        "run_cost": 0.0,
    }


# ──────────────────────────────────────────────────────────────────────────────
# WRITERS
# ──────────────────────────────────────────────────────────────────────────────


def write_narrative(
    project_id: int, updates: Dict[str, Any], append: bool = False
) -> None:
    """Update narrative fields (idea / logline / script)."""
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, idea, logline, script FROM narratives WHERE project_id = %s ORDER BY id DESC LIMIT 1",
            (project_id,),
        )
        existing = cur.fetchone()
        if not existing:
            return

        set_parts = []
        values: List[Any] = []

        for field, col in [
            ("idea", "idea"),
            ("logline", "logline"),
            ("script", "script"),
        ]:
            if field in updates and updates[field]:
                if append and existing[col]:
                    new_val = existing[col] + "\n\n" + updates[field]
                else:
                    new_val = updates[field]
                set_parts.append(f"{col} = %s")
                values.append(new_val)

        if not set_parts:
            return

        set_parts.append("updated_at = NOW()")
        values.append(project_id)
        cur.execute(
            f"UPDATE narratives SET {', '.join(set_parts)} WHERE project_id = %s",
            values,
        )


def write_director_brief(project_id: int, brief: Dict[str, Any]) -> None:
    """Merge new director brief values into the vision_boards row."""
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, director_brief FROM vision_boards WHERE project_id = %s ORDER BY id DESC LIMIT 1",
            (project_id,),
        )
        row = cur.fetchone()
        if not row:
            return

        existing = row["director_brief"] or {}
        if isinstance(existing, str):
            existing = json.loads(existing)

        # Map Python snake_case to JS camelCase
        key_map = {
            "film_style": "filmStyle",
            "film_texture": "filmTexture",
            "color_science": "colorScience",
            "lighting_philosophy": "lightingPhilosophy",
            "overall_mood": "overallMood",
            "reference_films": "referenceFilms",
            "era": "era",
            "visual_style": "visualStyle",
            "camera_body": "cameraBody",
            "lens_family": "lensFamily",
            "base_aspect_ratio": "baseAspectRatio",
        }

        merged = dict(existing)
        for py_key, js_key in key_map.items():
            if py_key in brief and brief[py_key] is not None:
                merged[js_key] = brief[py_key]

        cur.execute(
            "UPDATE vision_boards SET director_brief = %s, updated_at = NOW() WHERE project_id = %s",
            (json.dumps(merged), project_id),
        )


def insert_shots(project_id: int, shots: List[Dict[str, Any]]) -> List[int]:
    """Insert new shots and return their IDs."""
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            'SELECT COALESCE(MAX("order"), -1) FROM vision_shots WHERE project_id = %s',
            (project_id,),
        )
        max_order = cur.fetchone()["coalesce"]

        ids = []
        for i, s in enumerate(shots):
            cur.execute(
                """
                INSERT INTO vision_shots
                    (project_id, "order", title, description, prompt,
                     shot_type, camera_angle, camera_movement, key_light,
                     color_grade, camera_model, lens_type, focal_length,
                     cinema_aspect_ratio, duration, dialogue_text, notes,
                     scene_number, scene_name, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'draft')
                RETURNING id
                """,
                (
                    project_id,
                    max_order + 1 + i,
                    s.get("title", f"Shot {max_order + 2 + i}"),
                    s.get("description", ""),
                    s.get("prompt", ""),
                    s.get("shot_type", "medium"),
                    s.get("camera_angle", "eye_level"),
                    s.get("camera_movement", "static"),
                    s.get("key_light", "natural"),
                    s.get("color_grade"),
                    s.get("camera_model"),
                    s.get("lens_type"),
                    s.get("focal_length"),
                    s.get("cinema_aspect_ratio"),
                    s.get("duration", 3),
                    s.get("dialogue_text", ""),
                    s.get("notes", ""),
                    s.get("scene_number"),
                    s.get("scene_name"),
                ),
            )
            ids.append(cur.fetchone()["id"])
        return ids


def update_shot_image(shot_id: int, image_url: str, task_id: str) -> None:
    """Store generated image URL on a shot and mark it as generated."""
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE vision_shots
            SET generated_image_url = %s, kling_task_id = %s, status = 'generated', updated_at = NOW()
            WHERE id = %s
            """,
            (image_url, task_id, shot_id),
        )


def update_shot_video(shot_id: int, video_url: str, task_id: str) -> None:
    """Store generated video URL on a shot."""
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE vision_shots
            SET generated_video_url = %s, kling_task_id = %s, status = 'approved', updated_at = NOW()
            WHERE id = %s
            """,
            (video_url, task_id, shot_id),
        )


def write_agent_run_log(
    thread_id: str,
    project_id: int,
    node_name: str,
    status: str,
    cost_credits: float = 0.0,
    error: Optional[str] = None,
) -> None:
    """Insert an agent run log entry (best-effort, ignores errors)."""
    try:
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO agent_run_logs (thread_id, project_id, node_name, status, cost_credits, error)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (thread_id, project_id, node_name, status, cost_credits, error),
            )
    except Exception:
        pass  # observability is best-effort
