import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionShots } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_PATCH_FIELDS = new Set([
  "title", "description", "promptText", "shotType", "duration",
  "sceneNumber", "status", "cinematography", "promptStyle",
  "generatedImageUrl", "generatedVideoUrl",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shotId: string }> }
) {
  try {
    await requireAdmin();
    const { shotId } = await params;
    const id = Number(shotId);
    const body = await request.json();

    const cleanBody: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_PATCH_FIELDS.has(k)) cleanBody[k] = v;
    }

    if (Object.keys(cleanBody).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const [updated] = await db
      .update(visionShots)
      .set({ ...cleanBody })
      .where(eq(visionShots.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ shot: updated });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin shot patch error:", error);
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ shotId: string }> }
) {
  try {
    await requireAdmin();
    const { shotId } = await params;
    const id = Number(shotId);

    const [deleted] = await db
      .delete(visionShots)
      .where(eq(visionShots.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin shot delete error:", error);
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
