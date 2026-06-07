import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionShots, projects } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseProjectId, invalidProjectIdResponse } from "@/lib/parse-project-id";

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project || null;
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

    const projectId = parseProjectId(params.id);
    if (projectId === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const items: { id: number; order: number }[] = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Expected a non-empty array of { id, order }" },
        { status: 400 }
      );
    }

    const shotIds = items.map((item) => item.id);

    await db.transaction(async (tx) => {
      const existingShots = await tx
        .select({ id: visionShots.id })
        .from(visionShots)
        .where(
          and(
            eq(visionShots.projectId, projectId),
            inArray(visionShots.id, shotIds)
          )
        );

      const validIds = new Set(existingShots.map((s) => s.id));
      const invalidIds = shotIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        // Throw a typed error so the outer catch can distinguish client vs server errors
        const clientErr = new Error(`INVALID_SHOT_IDS:${invalidIds.join(",")}`);
        throw clientErr;
      }

      await Promise.all(
        items.map((item) =>
          tx
            .update(visionShots)
            .set({ order: item.order })
            .where(
              and(
                eq(visionShots.id, item.id),
                eq(visionShots.projectId, projectId)
              )
            )
        )
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INVALID_SHOT_IDS:")) {
      const ids = error.message.replace("INVALID_SHOT_IDS:", "");
      console.warn(`Shot reorder rejected — invalid IDs for project ${params.id}: ${ids}`);
      return NextResponse.json(
        {
          error: `شات‌های زیر به این پروژه تعلق ندارند: ${ids}`,
          code: "INVALID_SHOT_IDS",
          detail: `ids: ${ids}`,
        },
        { status: 422 }
      );
    }
    console.error("Error reordering shots:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در تغییر ترتیب شات‌ها",
        code: "REORDER_ERROR",
        detail: null,
      },
      { status: 500 }
    );
  }
}
