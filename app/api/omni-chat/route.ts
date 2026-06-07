import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { omniChatSessions, omniChatMessages } from "@shared/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get("projectId");

    const conditions = [eq(omniChatSessions.userId, user.id)];
    if (projectId) {
      conditions.push(eq(omniChatSessions.projectId, parseInt(projectId)));
    }

    const chatSessions = await db
      .select({
        id: omniChatSessions.id,
        title: omniChatSessions.title,
        projectId: omniChatSessions.projectId,
        createdAt: omniChatSessions.createdAt,
        updatedAt: omniChatSessions.updatedAt,
        messageCount: sql<number>`(SELECT COUNT(*) FROM omni_chat_messages WHERE session_id = ${omniChatSessions.id})`,
        lastMessage: sql<string>`(SELECT content FROM omni_chat_messages WHERE session_id = ${omniChatSessions.id} ORDER BY created_at DESC LIMIT 1)`,
        hasImages: sql<boolean>`EXISTS(SELECT 1 FROM omni_chat_messages WHERE session_id = ${omniChatSessions.id} AND image_generation IS NOT NULL AND (image_generation->>'status') = 'complete')`,
      })
      .from(omniChatSessions)
      .where(and(...conditions))
      .orderBy(desc(omniChatSessions.updatedAt));

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, title } = body;

    const [session] = await db
      .insert(omniChatSessions)
      .values({
        userId: user.id,
        projectId: projectId ? parseInt(projectId) : null,
        title: title || "گفتگوی جدید",
      })
      .returning();

    const [welcomeMsg] = await db
      .insert(omniChatMessages)
      .values({
        sessionId: session.id,
        role: "assistant",
        content: "سلام! من عامل تصویرساز Tex2Film هستم. می‌توانم برایتان تصاویر سینمایی بسازم یا در مورد سبک بصری پروژه‌تان مشاوره بدهم.\n\nکافیست توضیح دهید چه تصویری می‌خواهید، و من آن را با Kling AI تولید می‌کنم.\nبرای ارجاع به عناصر پروژه از @ استفاده کنید.",
      })
      .returning();

    return NextResponse.json({ ...session, messages: [welcomeMsg] });
  } catch (error) {
    console.error("Error creating chat session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
