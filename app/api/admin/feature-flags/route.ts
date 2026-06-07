import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { featureFlags } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
    const flags = await db.select().from(featureFlags);
    return NextResponse.json({ flags });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { key, enabled } = body;
    if (!key || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const [updated] = await db
      .update(featureFlags)
      .set({ enabled })
      .where(eq(featureFlags.key, key))
      .returning();
    return NextResponse.json({ flag: updated });
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
    const { key, enabled = true, label } = body;
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    const [created] = await db
      .insert(featureFlags)
      .values({ key, enabled, label })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: { enabled, label },
      })
      .returning();
    return NextResponse.json({ flag: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    await db.delete(featureFlags).where(eq(featureFlags.key, key));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
