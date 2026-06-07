import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionBoards, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseProjectId, invalidProjectIdResponse } from "@/lib/parse-project-id";

const ALLOWED_VISION_FIELDS = new Set([
  "directorBrief", "referenceImages", "colorPalette", "moodKeywords", "sceneDefaults",
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

    const projectId = parseProjectId(params.id);
    if (projectId === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [visionBoard] = await db
      .select()
      .from(visionBoards)
      .where(eq(visionBoards.projectId, projectId))
      .limit(1);

    if (!visionBoard) {
      return NextResponse.json({ error: "Vision board not found" }, { status: 404 });
    }

    return NextResponse.json(visionBoard);
  } catch (error) {
    console.error("Error fetching vision board:", error);
    return NextResponse.json({ error: "Failed to fetch vision board" }, { status: 500 });
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

    const projectId = parseProjectId(params.id);
    if (projectId === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    const unknownKeys = Object.keys(body).filter(
      k => !ALLOWED_VISION_FIELDS.has(k)
    );
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
      .update(visionBoards)
      .set(body)
      .where(eq(visionBoards.projectId, projectId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Vision board not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating vision board:", error);
    return NextResponse.json({ error: "Failed to update vision board" }, { status: 500 });
  }
}
