import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionShots, projects } from "@shared/schema";
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
  { params }: { params: { id: string; shotId: string } }
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

    const shotId = parseInt(params.shotId);
    const body = await request.json();
    const [updated] = await db
      .update(visionShots)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(visionShots.id, shotId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; shotId: string } }
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

    const shotId = parseInt(params.shotId);
    const [deleted] = await db
      .delete(visionShots)
      .where(eq(visionShots.id, shotId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot:", error);
    return NextResponse.json(
      { error: "Failed to delete shot" },
      { status: 500 }
    );
  }
}
