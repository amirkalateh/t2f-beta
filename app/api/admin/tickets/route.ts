import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, users, ticketMessages } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
    const allTickets = await db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        userId: tickets.userId,
        username: users.username,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.updatedAt));
    return NextResponse.json({ tickets: allTickets });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
