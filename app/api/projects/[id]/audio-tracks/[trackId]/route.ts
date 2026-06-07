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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; trackId: string } }
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

    const trackId = parseInt(params.trackId);
    const body = await request.json();
    const [updated] = await db
      .update(audioTracks)
      .set(body)
      .where(eq(audioTracks.id, trackId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Audio track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating audio track:", error);
    return NextResponse.json(
      { error: "Failed to update audio track" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; trackId: string } }
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

    const trackId = parseInt(params.trackId);
    const [deleted] = await db
      .delete(audioTracks)
      .where(eq(audioTracks.id, trackId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Audio track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting audio track:", error);
    return NextResponse.json(
      { error: "Failed to delete audio track" },
      { status: 500 }
    );
  }
}
