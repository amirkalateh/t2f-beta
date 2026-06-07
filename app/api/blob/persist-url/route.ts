import { NextRequest, NextResponse } from "next/server";
import { persistRemoteUrl } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { url, projectId, folder, filename } = await request.json();

    if (!url || !projectId) {
      return NextResponse.json(
        { error: "url and projectId are required" },
        { status: 400 },
      );
    }

    const persistedUrl = await persistRemoteUrl(
      url,
      String(projectId),
      folder || "generated",
      filename || `kling_${Date.now()}.png`,
    );

    return NextResponse.json({ success: true, url: persistedUrl });
  } catch (error) {
    console.error("Persist URL error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to persist URL" },
      { status: 500 },
    );
  }
}
