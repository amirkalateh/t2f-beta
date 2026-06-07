import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { omniChatSessions, omniChatMessages } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const conversationId = parseInt(params.id);

    // Verify ownership
    const [conv] = await db.select().from(omniChatSessions).where(and(eq(omniChatSessions.id, conversationId), eq(omniChatSessions.userId, user.id))).limit(1);
    if (!conv) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const chatMessages = await db.select().from(omniChatMessages)
      .where(eq(omniChatMessages.sessionId, conversationId))
      .orderBy(asc(omniChatMessages.createdAt));

    return NextResponse.json(chatMessages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
