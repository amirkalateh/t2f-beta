import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, ticketMessages } from "@shared/schema";
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
    const { status } = body;
    if (!status || !["open", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await db
      .update(tickets)
      .set({ status })
      .where(eq(tickets.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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
    const ticketId = Number(id);
    // Delete messages first (cascade handles this, but be explicit)
    await db.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticketId));
    await db.delete(tickets).where(eq(tickets.id, ticketId));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
