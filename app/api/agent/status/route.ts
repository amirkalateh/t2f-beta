/**
 * Proxy for the agent /status endpoint — returns current graph state for a thread.
 *
 * Security:
 *  1. Requires authenticated user.
 *  2. Verifies the project_id belongs to the authenticated user (ownership guard).
 *  3. Forwards AGENT_INTERNAL_TOKEN so FastAPI token check passes in secure deployments.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";

export const dynamic = "force-dynamic";

const AGENT_BASE_URL = process.env.AGENT_BASE_URL || "http://localhost:8000";
const AGENT_INTERNAL_TOKEN = process.env.AGENT_INTERNAL_TOKEN || "";

export async function GET(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message, code: "UNAUTHORIZED" }, { status: 401 });
      }
      throw e;
    }

    const searchParams = request.nextUrl.searchParams;
    const thread_id = searchParams.get("thread_id");
    const project_id = searchParams.get("project_id");

    if (!thread_id) {
      return NextResponse.json({ error: "thread_id required" }, { status: 400 });
    }

    // project_id is mandatory for authorization
    if (!project_id || project_id === "0") {
      return NextResponse.json({ error: "project_id required for authorization", code: "BAD_REQUEST" }, { status: 400 });
    }

    // Ownership guard: verify project belongs to authenticated user
    const pid = parseInt(project_id, 10);
    if (isNaN(pid)) {
      return NextResponse.json({ error: "Invalid project_id", code: "BAD_REQUEST" }, { status: 400 });
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, pid), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Forward internal token so FastAPI auth check passes in secured deployments
    const headers: Record<string, string> = {};
    if (AGENT_INTERNAL_TOKEN) headers["X-Agent-Token"] = AGENT_INTERNAL_TOKEN;

    const resp = await fetch(
      `${AGENT_BASE_URL}/agent/status/${thread_id}?project_id=${project_id || 0}`,
      { cache: "no-store", headers }
    );
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent unavailable", code: "AGENT_UNAVAILABLE" },
      { status: 503 }
    );
  }
}
