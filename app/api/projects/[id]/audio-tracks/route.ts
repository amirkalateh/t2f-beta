import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audioTracks, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(audioTracks)
      .where(eq(audioTracks.projectId, projectId));

    // Normalize DB column names back to client field names
    const tracks = rows.map(r => {
      const meta = (r.metadata || {}) as Record<string, unknown>;
      return {
        ...r,
        label: r.name,
        generatedUrl: r.url,
        shotId: r.shotId,
        textPrompt: (meta.textPrompt as string | undefined) ?? (meta.prompt as string | undefined) ?? null,
        voiceId: (meta.voiceId as string | undefined) ?? null,
      };
    });

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Error fetching audio tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio tracks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json() as Record<string, unknown>;
    // Normalize client field names to DB schema column names
    const metadata: Record<string, unknown> = (body.metadata as Record<string, unknown>) ?? {};
    // If the client sent extra fields (e.g. voiceId, textPrompt) merge them into metadata
    const knownFields = new Set(["name", "url", "duration", "type", "volume", "startTime", "metadata", "label", "generatedUrl", "shotId"]);
    for (const key of Object.keys(body)) {
      if (!knownFields.has(key)) metadata[key] = body[key];
    }
    const [track] = await db
      .insert(audioTracks)
      .values({
        projectId,
        shotId: (body.shotId as number | undefined) ?? null,
        name: (body.name as string | undefined) ?? (body.label as string | undefined) ?? "Track",
        url: (body.url as string | null | undefined) ?? (body.generatedUrl as string | null | undefined) ?? null,
        duration: (body.duration as number | undefined) ?? 5,
        type: (body.type as string | undefined) ?? "music",
        volume: (body.volume as number | undefined) ?? 100,
        startTime: (body.startTime as number | undefined) ?? 0,
        metadata,
      })
      .returning();

    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    console.error("Error creating audio track:", error);
    return NextResponse.json(
      { error: "Failed to create audio track" },
      { status: 500 }
    );
  }
}
