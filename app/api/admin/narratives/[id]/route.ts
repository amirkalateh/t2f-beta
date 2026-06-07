import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { narratives } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_PATCH_FIELDS = new Set(["idea", "logline", "script", "outline"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const projectId = Number(id);
    const body = await request.json();

    const cleanBody: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_PATCH_FIELDS.has(k)) cleanBody[k] = v;
    }

    if (Object.keys(cleanBody).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(narratives)
      .where(eq(narratives.projectId, projectId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(narratives)
        .set({ ...cleanBody })
        .where(eq(narratives.id, existing.id))
        .returning();
      return NextResponse.json({ narrative: updated });
    } else {
      // Create new narrative
      const [created] = await db
        .insert(narratives)
        .values({ projectId, ...cleanBody })
        .returning();
      return NextResponse.json({ narrative: created }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin narrative patch error:", error);
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const projectId = Number(id);

    await db
      .delete(narratives)
      .where(eq(narratives.projectId, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin narrative delete error:", error);
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
