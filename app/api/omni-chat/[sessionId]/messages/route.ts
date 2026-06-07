import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { omniChatSessions, omniChatMessages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const { role, content, attachedImages, imageGeneration } = body;

    const [msg] = await db
      .insert(omniChatMessages)
      .values({
        sessionId,
        role,
        content: content || "",
        attachedImages: attachedImages || null,
        imageGeneration: imageGeneration || null,
      })
      .returning();

    await db
      .update(omniChatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(omniChatSessions.id, sessionId));

    if (role === "user" && content) {
      const titleSnippet = content.slice(0, 40) + (content.length > 40 ? "..." : "");
      const [existingSession] = await db
        .select()
        .from(omniChatSessions)
        .where(eq(omniChatSessions.id, sessionId));
      if (existingSession && existingSession.title === "گفتگوی جدید") {
        await db
          .update(omniChatSessions)
          .set({ title: titleSnippet })
          .where(eq(omniChatSessions.id, sessionId));
      }
    }

    return NextResponse.json(msg);
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
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
    const { messageId, imageGeneration } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    const [session] = await db
      .select()
      .from(omniChatSessions)
      .where(and(eq(omniChatSessions.id, sessionId), eq(omniChatSessions.userId, user.id)));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(omniChatMessages)
      .set({ imageGeneration })
      .where(and(eq(omniChatMessages.id, messageId), eq(omniChatMessages.sessionId, sessionId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Message not found in this session" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}
