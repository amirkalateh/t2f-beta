import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, ticketMessages, users } from "@shared/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, Number(id)));
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "عدم دسترسی" }, { status: 403 });
    }
    const messages = await db
      .select({
        id: ticketMessages.id,
        body: ticketMessages.body,
        authorId: ticketMessages.authorId,
        username: users.username,
        createdAt: ticketMessages.createdAt,
      })
      .from(ticketMessages)
      .leftJoin(users, eq(ticketMessages.authorId, users.id))
      .where(eq(ticketMessages.ticketId, Number(id)))
      .orderBy(desc(ticketMessages.createdAt));
    return NextResponse.json({ ticket, messages });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, Number(id)));
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "عدم دسترسی" }, { status: 403 });
    }
    const body = await request.json();
    const { body: messageBody } = body;
    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json({ error: "Body required" }, { status: 400 });
    }
    const [msg] = await db
      .insert(ticketMessages)
      .values({
        ticketId: Number(id),
        authorId: user.id,
        body: messageBody.trim(),
      })
      .returning();
    return NextResponse.json({ message: msg });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
