"""Kling AI tool wrappers that call the OpenClaw Kling skill CLI.

Each tool runs `node skills/klingai/scripts/kling.mjs` as an async subprocess,
polls for completion, and returns structured output.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from langchain_core.tools import tool

# The Kling skill CLI is at this path (relative to workspace root)
_KLING_SCRIPT = Path(__file__).parent.parent.parent / "skills" / "klingai" / "scripts" / "kling.mjs"
_OUTPUT_DIR = Path(tempfile.gettempdir()) / "tex2film_kling_output"
_OUTPUT_DIR.mkdir(exist_ok=True)

_NODE_BIN = shutil.which("node") or "node"


async def _run_kling(args: list[str], timeout: int = 600) -> Dict[str, Any]:
    """Run the Kling CLI and return parsed stdout as dict.

    Returns {"success": bool, "output": str, "task_id": str|None, "url": str|None}
    """
    if not _KLING_SCRIPT.exists():
        return {
            "success": False,
            "output": f"Kling script not found at {_KLING_SCRIPT}. Install OpenClaw first.",
            "task_id": None,
            "url": None,
        }

    cmd = [_NODE_BIN, str(_KLING_SCRIPT)] + args
    env = {**os.environ, "FORCE_COLOR": "0"}

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {"success": False, "output": "Kling CLI timed out", "task_id": None, "url": None}

        out = stdout.decode("utf-8", errors="replace")
        err = stderr.decode("utf-8", errors="replace")
        combined = out + err

        # Extract task_id
        task_id = None
        for pattern in [r"task[_\s]id[:\s]+([a-zA-Z0-9_-]+)", r'"task_id"\s*:\s*"([^"]+)"']:
            m = re.search(pattern, combined, re.IGNORECASE)
            if m:
                task_id = m.group(1)
                break

        # Extract URL
        url = None
        url_patterns = [
            r"https?://[^\s\"']+\.(?:jpg|jpeg|png|mp4|webm|gif)[^\s\"']*",
            r'"url"\s*:\s*"(https?://[^"]+)"',
            r"downloaded[:\s]+(.+\.(?:jpg|jpeg|png|mp4|webm))",
        ]
        for pattern in url_patterns:
            m = re.search(pattern, combined, re.IGNORECASE)
            if m:
                url = m.group(1) if m.lastindex else m.group(0)
                url = url.strip()
                break

        # Check for local file download path
        if not url:
            local_m = re.search(r"saved[:\s]+(.+\.(?:jpg|jpeg|png|mp4|webm))", combined, re.IGNORECASE)
            if local_m:
                url = local_m.group(1).strip()

        success = proc.returncode == 0
        return {
            "success": success,
            "output": combined[:2000],
            "task_id": task_id,
            "url": url,
        }
    except Exception as exc:
        return {
            "success": False,
            "output": str(exc),
            "task_id": None,
            "url": None,
        }


@tool
async def kling_check_account() -> str:
    """Check Kling AI account quota and remaining credits before running generation tasks.
    Always call this before batch image or video generation to confirm balance.
    Returns a text summary of remaining credits and resource packs.
    """
    result = await _run_kling(["account", "--costs"], timeout=30)
    if result["success"]:
        return f"Account status:\n{result['output']}"
    return f"Could not check account (may not be configured yet): {result['output']}"


@tool
async def kling_generate_image(
    prompt: str,
    shot_id: int,
    aspect_ratio: str = "16:9",
    model: str = "kling-v2",
) -> str:
    """Generate a storyboard image for a specific shot using Kling AI.

    Args:
        prompt: Detailed English cinematic image-generation prompt (60-120 words).
        shot_id: Database ID of the shot this image belongs to.
        aspect_ratio: One of 16:9, 9:16, 1:1, 4:3.
        model: Kling model — use 'kling-v2' for cost efficiency.

    Returns:
        JSON string with task_id and image URL on success.
    """
    args = [
        "image",
        "--prompt", prompt,
        "--aspect_ratio", aspect_ratio,
        "--model", model,
        "--output_dir", str(_OUTPUT_DIR),
    ]
    result = await _run_kling(args, timeout=300)
    return json.dumps({
        "shot_id": shot_id,
        "success": result["success"],
        "task_id": result["task_id"],
        "url": result["url"],
        "output_preview": result["output"][:400],
    })


@tool
async def kling_generate_video(
    prompt: str,
    shot_id: int,
    duration: int = 5,
    model: str = "kling-v3",
    aspect_ratio: str = "16:9",
    image_url: Optional[str] = None,
) -> str:
    """Generate a video clip for a specific shot using Kling AI.

    Args:
        prompt: Detailed English cinematic video prompt describing action and motion.
        shot_id: Database ID of the shot this video belongs to.
        duration: Clip duration in seconds (3-15).
        model: Kling model — 'kling-v3' recommended for quality.
        aspect_ratio: One of 16:9, 9:16, 1:1.
        image_url: Optional reference/first-frame image URL.

    Returns:
        JSON string with task_id and video URL on success.
    """
    args = [
        "video",
        "--prompt", prompt,
        "--duration", str(duration),
        "--model", model,
        "--aspect_ratio", aspect_ratio,
        "--output_dir", str(_OUTPUT_DIR),
    ]
    if image_url:
        args += ["--image", image_url]

    result = await _run_kling(args, timeout=600)
    return json.dumps({
        "shot_id": shot_id,
        "success": result["success"],
        "task_id": result["task_id"],
        "url": result["url"],
        "output_preview": result["output"][:400],
    })


@tool
async def kling_poll_task(task_id: str, task_type: str = "image") -> str:
    """Poll a previously submitted Kling task by its task_id.

    Args:
        task_id: The task ID returned from a previous generation call.
        task_type: Either 'image' or 'video'.

    Returns:
        JSON string with current status and URL if completed.
    """
    args = [task_type, "--task_id", task_id, "--download", "--output_dir", str(_OUTPUT_DIR)]
    result = await _run_kling(args, timeout=60)
    return json.dumps({
        "task_id": task_id,
        "success": result["success"],
        "url": result["url"],
        "output_preview": result["output"][:400],
    })


ALL_TOOLS = [kling_check_account, kling_generate_image, kling_generate_video, kling_poll_task]
