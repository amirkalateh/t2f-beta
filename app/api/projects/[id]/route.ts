import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, narratives, visionBoards, visionShots, assemblies, audioTracks } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseProjectId, invalidProjectIdResponse } from "@/lib/parse-project-id";

const ALLOWED_PROJECT_PATCH_FIELDS = new Set([
  "title", "description", "creativeIntent", "style", "tone", "aspectRatio",
  "currentStage", "thumbnailUrl", "progress",
]);

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

    const id = parseProjectId(params.id);
    if (id === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(id, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [narrative] = await db.select().from(narratives).where(eq(narratives.projectId, id)).limit(1);
    const [visionBoard] = await db.select().from(visionBoards).where(eq(visionBoards.projectId, id)).limit(1);
    const shots = await db.select().from(visionShots).where(eq(visionShots.projectId, id)).orderBy(asc(visionShots.order));
    const [assembly] = await db.select().from(assemblies).where(eq(assemblies.projectId, id)).limit(1);
    const tracks = await db.select().from(audioTracks).where(eq(audioTracks.projectId, id));

    return NextResponse.json({
      ...project,
      narrative: narrative || null,
      visionBoard: visionBoard || null,
      shots,
      assembly: assembly || null,
      audioTracks: tracks,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });
    }

    const id = parseProjectId(params.id);
    if (id === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(id, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    const unknownKeys = Object.keys(body).filter(k => !ALLOWED_PROJECT_PATCH_FIELDS.has(k));
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Disallowed or unknown fields: ${unknownKeys.join(", ")}`,
          code: "INVALID_FIELDS",
        },
        { status: 400 }
      );
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(projects)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });
    }

    const id = parseProjectId(params.id);
    if (id === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(id, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
