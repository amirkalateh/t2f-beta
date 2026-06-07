import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { omniChatSessions, omniChatMessages } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = parseInt(params.sessionId);

    const [session] = await db
      .select()
      .from(omniChatSessions)
      .where(and(eq(omniChatSessions.id, sessionId), eq(omniChatSessions.userId, user.id)));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const msgs = await db
      .select()
      .from(omniChatMessages)
      .where(eq(omniChatMessages.sessionId, sessionId))
      .orderBy(asc(omniChatMessages.createdAt));

    return NextResponse.json({ ...session, messages: msgs });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = parseInt(params.sessionId);

    await db
      .delete(omniChatSessions)
      .where(and(eq(omniChatSessions.id, sessionId), eq(omniChatSessions.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = parseInt(params.sessionId);
    const body = await request.json();

    const [updated] = await db
      .update(omniChatSessions)
      .set({ title: body.title, updatedAt: new Date() })
      .where(and(eq(omniChatSessions.id, sessionId), eq(omniChatSessions.userId, user.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
