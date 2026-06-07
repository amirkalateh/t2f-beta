/**
 * Proxy for resuming a paused graph after a human interrupt checkpoint.
 *
 * The Python service now streams SSE events during resume (same as /agent/run),
 * so this route proxies the streaming body rather than returning JSON.
 *
 * Security:
 *  1. Requires authenticated user.
 *  2. Forwards AGENT_INTERNAL_TOKEN to the internal Python service.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AGENT_BASE_URL = process.env.AGENT_BASE_URL || "http://localhost:8000";
const AGENT_INTERNAL_TOKEN = process.env.AGENT_INTERNAL_TOKEN || "";

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return new Response(
          JSON.stringify({ error: e.message, code: "UNAUTHORIZED" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      throw e;
    }

    const body = await request.json();
    const { thread_id, project_id, approved, user_message } = body;

    if (!thread_id) {
      return new Response(
        JSON.stringify({ error: "thread_id required", code: "INVALID_REQUEST" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ownership guard: project_id required, must belong to authenticated user
    if (!project_id || typeof project_id !== "number" || project_id <= 0) {
      return NextResponse.json(
        { error: "project_id required for authorization", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, project_id), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (AGENT_INTERNAL_TOKEN) headers["X-Agent-Token"] = AGENT_INTERNAL_TOKEN;

    const agentResponse = await fetch(`${AGENT_BASE_URL}/agent/resume/${thread_id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ thread_id, project_id, approved, user_message }),
      // @ts-ignore
      duplex: "half",
    });

    if (!agentResponse.ok) {
      const errText = await agentResponse.text();
      return new Response(
        JSON.stringify({ error: `Agent server error: ${errText}`, code: "AGENT_ERROR" }),
        { status: agentResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the SSE response from Python directly to the browser
    return new Response(agentResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
        "X-Thread-ID": agentResponse.headers.get("X-Thread-ID") || thread_id,
      },
    });
  } catch (error) {
    console.error("[api/agent/resume] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Agent unavailable",
        code: "AGENT_UNAVAILABLE",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
