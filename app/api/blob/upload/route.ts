import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getFileType } from "@/lib/blob-storage";
import { db } from "@/lib/db";
import { assets } from "@shared/schema";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getMediaTypeFromContentType(contentType: string): string {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return "document";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const folder = formData.get("folder") as string | null;
    const assetName = formData.get("name") as string | null;
    const assetType = formData.get("type") as string | null;
    const saveToDb = formData.get("saveToDb") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = projectId && folder
      ? `projects/${projectId}/${folder}/${timestamp}_${sanitizedFilename}`
      : `uploads/${user?.id || "anonymous"}/${timestamp}_${sanitizedFilename}`;

    const blob = await put(pathname, file, {
      access: "public",
    });

    const contentType = blob.contentType || file.type;
    const mediaType = getMediaTypeFromContentType(contentType);
    const fileType = getFileType(contentType);

    const responseFile = {
      url: blob.url,
      pathname: blob.pathname,
      contentType,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      fileType,
      originalName: file.name,
      mediaType,
    };

    let dbAsset = null;
    if (saveToDb !== "false") {
      const [inserted] = await db.insert(assets).values({
        projectId: projectId ? parseInt(projectId) : null,
        userId: user?.id || null,
        name: assetName || file.name.replace(/\.[^.]+$/, "").replace(/_/g, " "),
        type: (assetType || "property") as "character" | "location" | "property",
        fileUrl: blob.url,
        imageUrl: mediaType === "image" ? blob.url : null,
        thumbnailUrl: mediaType === "image" ? blob.url : null,
        fileSize: file.size,
        mimeType: contentType,
        mediaType,
        source: "uploaded",
        metadata: { originalName: file.name, pathname: blob.pathname },
      }).returning();
      dbAsset = inserted;
    }

    return NextResponse.json({
      success: true,
      file: responseFile,
      asset: dbAsset,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
