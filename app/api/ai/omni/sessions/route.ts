import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { omniChatSessions, omniChatMessages } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const query = db.select({
      id: omniChatSessions.id,
      title: omniChatSessions.title,
      projectId: omniChatSessions.projectId,
      createdAt: omniChatSessions.createdAt,
      updatedAt: omniChatSessions.updatedAt,
      messageCount: sql<number>`(SELECT COUNT(*) FROM omni_chat_messages WHERE session_id = ${omniChatSessions.id})`,
      lastMessage: sql<string>`(SELECT content FROM omni_chat_messages WHERE session_id = ${omniChatSessions.id} ORDER BY created_at DESC LIMIT 1)`,
    }).from(omniChatSessions).where(
      projectId 
        ? and(eq(omniChatSessions.userId, user.id), eq(omniChatSessions.projectId, parseInt(projectId)))
        : eq(omniChatSessions.userId, user.id)
    ).orderBy(desc(omniChatSessions.updatedAt));

    const sessions = await query;
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { title, projectId } = body;

    const [newConversation] = await db.insert(omniChatSessions).values({
      userId: user.id,
      projectId: projectId ? parseInt(projectId) : null,
      title: title || "New Chat",
    }).returning();

    return NextResponse.json(newConversation);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
