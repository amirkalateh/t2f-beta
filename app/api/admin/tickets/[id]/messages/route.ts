import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, ticketMessages, users } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [ticket] = await db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        userId: tickets.userId,
      })
      .from(tickets)
      .where(eq(tickets.id, Number(id)));

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
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { body: messageBody } = body;
    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
