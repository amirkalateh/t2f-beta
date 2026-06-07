"use client";

import { useState, useCallback } from "react";

export type BlobFileType = "image" | "video" | "audio" | "document" | "other";

export interface BlobFile {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  fileType: BlobFileType;
  originalName?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseBlobStorageReturn {
  upload: (
    file: File,
    options?: { projectId?: string; folder?: string }
  ) => Promise<BlobFile>;
  deleteFile: (url: string) => Promise<void>;
  listFiles: (prefix?: string) => Promise<BlobFile[]>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
}

export function useBlobStorage(): UseBlobStorageReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      file: File,
      options?: { projectId?: string; folder?: string }
    ): Promise<BlobFile> => {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (options?.projectId) {
          formData.append("projectId", options.projectId);
        }
        if (options?.folder) {
          formData.append("folder", options.folder);
        }

        const response = await fetch("/api/blob/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        setUploadProgress({ loaded: file.size, total: file.size, percentage: 100 });
        return data.file;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const deleteFile = useCallback(async (url: string): Promise<void> => {
    setError(null);

    try {
      const response = await fetch("/api/blob/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      throw err;
    }
  }, []);

  const listFiles = useCallback(async (prefix?: string): Promise<BlobFile[]> => {
    setError(null);

    try {
      const params = new URLSearchParams();
      if (prefix) params.append("prefix", prefix);

      const response = await fetch(`/api/blob/list?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to list files");
      }

      const data = await response.json();
      return data.files;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list files";
      setError(message);
      throw err;
    }
  }, []);

  return {
    upload,
    deleteFile,
    listFiles,
    isUploading,
    uploadProgress,
    error,
  };
}
