import { put, del, list, head } from "@vercel/blob";

export type BlobFileType = "image" | "video" | "audio" | "document" | "other";

export interface BlobFile {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  fileType: BlobFileType;
}

export function getFileType(contentType: string): BlobFileType {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (
    contentType.includes("text/") ||
    contentType.includes("application/pdf") ||
    contentType.includes("application/json")
  ) {
    return "document";
  }
  return "other";
}

const EXTENSION_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
};

export function getContentTypeFromPath(pathname: string): string {
  const ext = pathname.substring(pathname.lastIndexOf(".")).toLowerCase();
  return EXTENSION_TO_MIME[ext] || "application/octet-stream";
}

export async function uploadFile(
  file: File | Blob,
  pathname: string
): Promise<BlobFile> {
  const blob = await put(pathname, file, {
    access: "public",
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date(),
    fileType: getFileType(blob.contentType || "application/octet-stream"),
  };
}

export async function uploadFromBuffer(
  buffer: Buffer,
  pathname: string,
  contentType: string
): Promise<BlobFile> {
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || contentType,
    size: buffer.length,
    uploadedAt: new Date(),
    fileType: getFileType(blob.contentType || contentType),
  };
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

export async function listFiles(prefix?: string): Promise<BlobFile[]> {
  const { blobs } = await list({ prefix });

  return blobs.map((blob) => {
    const contentType = getContentTypeFromPath(blob.pathname);
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType,
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt),
      fileType: getFileType(contentType),
    };
  });
}

export async function getFileInfo(url: string): Promise<BlobFile | null> {
  try {
    const blob = await head(url);
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType || "application/octet-stream",
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt),
      fileType: getFileType(blob.contentType || "application/octet-stream"),
    };
  } catch {
    return null;
  }
}

export function generatePathname(
  projectId: string,
  folder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `projects/${projectId}/${folder}/${timestamp}_${sanitizedFilename}`;
}

export async function persistRemoteUrl(
  remoteUrl: string,
  projectId: string,
  folder: string,
  filename: string
): Promise<string> {
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote file: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  const pathname = generatePathname(projectId, folder, filename);
  const blobFile = await uploadFromBuffer(buffer, pathname, contentType);
  return blobFile.url;
}
