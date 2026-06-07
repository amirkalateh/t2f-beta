import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audioTracks } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_PATCH_FIELDS = new Set(["name", "type", "url", "duration", "metadata", "shotId"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    await requireAdmin();
    const { trackId } = await params;
    const id = Number(trackId);
    const body = await request.json();

    const cleanBody: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_PATCH_FIELDS.has(k)) cleanBody[k] = v;
    }

    if (Object.keys(cleanBody).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const [updated] = await db
      .update(audioTracks)
      .set({ ...cleanBody })
      .where(eq(audioTracks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ track: updated });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin track patch error:", error);
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    await requireAdmin();
    const { trackId } = await params;
    const id = Number(trackId);

    const [deleted] = await db
      .delete(audioTracks)
      .where(eq(audioTracks.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin track delete error:", error);
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
