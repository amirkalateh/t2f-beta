import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getFileType, getContentTypeFromPath } from "@/lib/blob-storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prefix = searchParams.get("prefix") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const result = await list({
      prefix,
      cursor,
      limit,
    });

    const files = result.blobs.map((blob) => {
      const contentType = getContentTypeFromPath(blob.pathname);
      return {
        url: blob.url,
        pathname: blob.pathname,
        contentType,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        fileType: getFileType(contentType),
      };
    });

    return NextResponse.json({
      success: true,
      files,
      cursor: result.cursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
