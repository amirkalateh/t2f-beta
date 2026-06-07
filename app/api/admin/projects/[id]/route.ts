import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.delete(projects).where(eq(projects.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin delete project error:", error);
    return NextResponse.json({ error: "خطا در حذف" }, { status: 500 });
  }
}
