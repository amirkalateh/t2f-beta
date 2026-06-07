import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@shared/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const projectId = searchParams.get("projectId");
    const mediaType = searchParams.get("mediaType");
    const source = searchParams.get("source");

    const conditions = [];
    if (user) {
      conditions.push(
        or(eq(assets.userId, user.id), isNull(assets.userId))
      );
    }
    if (type) {
      conditions.push(eq(assets.type, type as any));
    }
    if (projectId) {
      conditions.push(eq(assets.projectId, parseInt(projectId)));
    }
    if (mediaType) {
      conditions.push(eq(assets.mediaType, mediaType));
    }
    if (source) {
      conditions.push(eq(assets.source, source));
    }

    const result =
      conditions.length > 0
        ? await db
            .select()
            .from(assets)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(assets.createdAt))
        : await db.select().from(assets).orderBy(desc(assets.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const [asset] = await db.insert(assets).values({
      ...body,
      userId: user?.id || null,
    }).returning();
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const conditions = [eq(assets.id, parseInt(id))];
    if (user) {
      conditions.push(eq(assets.userId, user.id));
    }

    await db.delete(assets).where(and(...conditions));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
