import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { announcements, announcementReads } from "@shared/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const userId = user?.id || null;

    const items = await db
      .select()
      .from(announcements)
      .where(eq(announcements.active, true))
      .orderBy(desc(announcements.createdAt));

    if (!userId) {
      return NextResponse.json({ announcements: items, unreadCount: 0 });
    }

    const reads = await db
      .select({ announcementId: announcementReads.announcementId })
      .from(announcementReads)
      .where(eq(announcementReads.userId, userId));
    const readSet = new Set(reads.map(r => r.announcementId));

    const enriched = items.map(a => ({ ...a, isRead: readSet.has(a.id) }));
    const unreadCount = enriched.filter(a => !a.isRead).length;

    return NextResponse.json({ announcements: enriched, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { announcementId } = await request.json();
    if (!announcementId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db
      .insert(announcementReads)
      .values({
        announcementId: Number(announcementId),
        userId: user.id,
      })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
