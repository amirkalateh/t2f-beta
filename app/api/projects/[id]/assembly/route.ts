import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assemblies, projects } from "@shared/schema";
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

    const [assembly] = await db
      .select()
      .from(assemblies)
      .where(eq(assemblies.projectId, projectId))
      .limit(1);

    if (!assembly) {
      return NextResponse.json(
        { error: "Assembly not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(assembly);
  } catch (error) {
    console.error("Error fetching assembly:", error);
    return NextResponse.json(
      { error: "Failed to fetch assembly" },
      { status: 500 }
    );
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

    const projectId = parseInt(params.id);
    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const rawBody = await request.json();

    // Normalize client field names to DB schema column names
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawBody)) {
      if (key === "timelineData") {
        body.timeline = value;
      } else if (key === "exportSettings") {
        body.exportSettings = value;
      } else if (key === "status") {
        body.status = value;
      } else if (key === "exportUrl") {
        body.exportUrl = value;
      } else {
        body[key] = value;
      }
    }

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Empty update body" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(assemblies)
      .where(eq(assemblies.projectId, projectId))
      .limit(1);

    let updated;
    if (!existing) {
      // Auto-create assembly row if missing
      const [inserted] = await db
        .insert(assemblies)
        .values({ projectId, ...body })
        .returning();
      updated = inserted;
      console.log(`[Assembly] Created for project ${projectId} — ${Object.keys(body).join(", ")}`);
    } else {
      const [result] = await db
        .update(assemblies)
        .set(body)
        .where(eq(assemblies.projectId, projectId))
        .returning();
      updated = result;
      const clipCount = (body.timeline as any)?.clips?.length ?? 0;
      const trackCount = (body.timeline as any)?.tracks?.length ?? 0;
      console.log(`[Assembly] Saved for project ${projectId} — ${clipCount} clips, ${trackCount} tracks, ${Object.keys(body).join(", ")}`);
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Assembly not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating assembly:", error);
    return NextResponse.json(
      { error: "Failed to update assembly" },
      { status: 500 }
    );
  }
}
