import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { announcements } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const items = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
    return NextResponse.json({ announcements: items });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { title, body: bodyText, icon, priority } = body;
    if (!title || !bodyText) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }
    const [created] = await db
      .insert(announcements)
      .values({
        title,
        body: bodyText,
        icon: icon || "Megaphone",
        priority: priority || "normal",
        active: true,
      })
      .returning();
    return NextResponse.json({ announcement: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
