import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@shared/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const mediaType = searchParams.get("type");
    const source = searchParams.get("source");

    const conditions = [];
    if (user) {
      conditions.push(
        or(eq(assets.userId, user.id), isNull(assets.userId))
      );
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
        ? await db.select().from(assets)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(assets.createdAt))
        : await db.select().from(assets).orderBy(desc(assets.createdAt));

    const mediaAssets = result.map((a) => ({
      id: String(a.id),
      projectId: a.projectId ? String(a.projectId) : "global",
      name: a.name,
      type: a.mediaType || "image",
      mimeType: a.mimeType || "application/octet-stream",
      url: a.fileUrl || a.imageUrl || "",
      thumbnailUrl: a.thumbnailUrl || (a.mediaType === "image" ? (a.fileUrl || a.imageUrl) : null),
      size: a.fileSize || 0,
      duration: a.duration || null,
      width: a.width || null,
      height: a.height || null,
      createdAt: a.createdAt?.toISOString?.() || new Date().toISOString(),
      source: a.source || "uploaded",
      tags: (a.tags as string[]) || [],
      metadata: a.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      assets: mediaAssets,
      total: mediaAssets.length,
    });
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json(
      { error: "Failed to list media assets" },
      { status: 500 }
    );
  }
}
