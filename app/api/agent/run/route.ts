/**
 * Next.js proxy route for the LangGraph agent SSE stream.
 *
 * Security:
 *  1. Requires authenticated user (requireAuth).
 *  2. Verifies the requested project belongs to the authenticated user (IDOR guard).
 *  3. Forwards the shared AGENT_INTERNAL_TOKEN so FastAPI can reject requests
 *     that bypassed this proxy.
 */

import { NextRequest } from "next/server";
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
    const { project_id, user_message, thread_id, current_stage } = body;

    if (!project_id || !user_message) {
      return new Response(
        JSON.stringify({ error: "project_id and user_message are required", code: "INVALID_REQUEST" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ownership check — prevent IDOR attacks
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, project_id), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (AGENT_INTERNAL_TOKEN) headers["X-Agent-Token"] = AGENT_INTERNAL_TOKEN;

    const agentResponse = await fetch(`${AGENT_BASE_URL}/agent/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ project_id, user_message, thread_id, current_stage }),
      // @ts-ignore — duplex required for streaming body in some Node versions
      duplex: "half",
    });

    if (!agentResponse.ok) {
      const errText = await agentResponse.text();
      return new Response(
        JSON.stringify({ error: `Agent server error: ${errText}`, code: "AGENT_ERROR" }),
        { status: agentResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(agentResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
        "X-Thread-ID": agentResponse.headers.get("X-Thread-ID") || "",
      },
    });
  } catch (error) {
    console.error("[api/agent/run] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Agent connection error",
        code: "AGENT_UNAVAILABLE",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
