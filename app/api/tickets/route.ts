import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, ticketMessages } from "@shared/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();
    const userTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, user.id))
      .orderBy(desc(tickets.updatedAt));
    return NextResponse.json({ tickets: userTickets });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { subject, body: messageBody } = body;
    if (!subject || !subject.trim() || !messageBody || !messageBody.trim()) {
      return NextResponse.json({ error: "عنوان و توضیحات الزامی" }, { status: 400 });
    }
    const [ticket] = await db
      .insert(tickets)
      .values({
        userId: user.id,
        subject: subject.trim(),
      })
      .returning();
    await db
      .insert(ticketMessages)
      .values({
        ticketId: ticket.id,
        authorId: user.id,
        body: messageBody.trim(),
      });
    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
