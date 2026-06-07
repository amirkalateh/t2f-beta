import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const updates: Partial<typeof users.$inferInsert> = {};
    if (body.tier !== undefined) updates.tier = body.tier;
    if (body.credits !== undefined) updates.credits = body.credits;
    if (body.isAdmin !== undefined) updates.isAdmin = body.isAdmin;
    if (body.displayName !== undefined) updates.displayName = body.displayName;
    if (body.email !== undefined) updates.email = body.email;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "خطا در حذف" }, { status: 500 });
  }
}
