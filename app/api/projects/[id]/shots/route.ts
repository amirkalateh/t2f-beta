import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionShots, projects } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";
import { getAuthenticatedUser, getTierLimits, getProjectShotCount, checkLimit } from "@/lib/auth";
import { parseProjectId, invalidProjectIdResponse } from "@/lib/parse-project-id";

const ALLOWED_SHOT_PATCH_FIELDS = new Set([
  "title", "description", "prompt", "shotType", "cameraAngle", "cameraMovement",
  "keyLight", "duration", "dialogueText", "notes", "cinematographyNotes",
  "cameraModel", "lensType", "focalLength", "cinemaAspectRatio", "colorGrade",
  "sceneNumber", "sceneName", "locationId", "characterIds", "propIds",
  "status", "generatedImageUrl", "generatedVideoUrl", "generatedEndFrameUrl",
  "order", "raccordNotes", "transitionFromPrev", "generationVersions",
  "startImageUrl", "endImageUrl", "endFrameUrl",
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
    if (!user) return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });

    const projectId = parseProjectId(params.id);
    if (projectId === null) return invalidProjectIdResponse();

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const shots = await db
      .select()
      .from(visionShots)
      .where(eq(visionShots.projectId, projectId))
      .orderBy(asc(visionShots.order));

    return NextResponse.json(shots);
  } catch (error) {
    console.error("Error fetching shots:", error);
    return NextResponse.json({ error: "Failed to fetch shots" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });

    const projectId = parseProjectId(params.id);
    if (projectId === null) return invalidProjectIdResponse();

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const limits = getTierLimits(user.tier);
    const shotCount = await getProjectShotCount(projectId);
    if (!checkLimit(shotCount, limits.maxShots)) {
      return NextResponse.json(
        {
          error: `شما به حداکثر تعداد شات (${limits.maxShots}) در پلن ${limits.label} رسیده‌اید.`,
          code: "SHOT_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const [shot] = await db
      .insert(visionShots)
      .values({ ...body, projectId })
      .returning();

    return NextResponse.json(shot, { status: 201 });
  } catch (error) {
    console.error("Error creating shot:", error);
    return NextResponse.json({ error: "Failed to create shot" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });

    const projectId = parseProjectId(params.id);
    if (projectId === null) return invalidProjectIdResponse();

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await request.json();
    const { shotId, ...rawUpdates } = body;

    if (!shotId) {
      return NextResponse.json({ error: "shotId is required" }, { status: 400 });
    }

    const unknownKeys = Object.keys(rawUpdates).filter(k => !ALLOWED_SHOT_PATCH_FIELDS.has(k));
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Disallowed or unknown fields: ${unknownKeys.join(", ")}`,
          code: "INVALID_FIELDS",
        },
        { status: 400 }
      );
    }

    if (Object.keys(rawUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(visionShots)
      .set({ ...rawUpdates, updatedAt: new Date() })
      .where(and(eq(visionShots.id, shotId), eq(visionShots.projectId, projectId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json({ error: "Failed to update shot" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });

    const projectId = parseProjectId(params.id);
    if (projectId === null) return invalidProjectIdResponse();

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const url = new URL(request.url);
    const shotIdParam = url.searchParams.get("shotId");

    if (!shotIdParam) {
      return NextResponse.json({ error: "shotId is required" }, { status: 400 });
    }

    const shotId = parseInt(shotIdParam, 10);
    if (isNaN(shotId)) {
      return NextResponse.json({ error: "Invalid shotId" }, { status: 400 });
    }

    await db
      .delete(visionShots)
      .where(and(eq(visionShots.id, shotId), eq(visionShots.projectId, projectId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot:", error);
    return NextResponse.json({ error: "Failed to delete shot" }, { status: 500 });
  }
}
