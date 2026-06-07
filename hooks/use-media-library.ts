"use client";

import { useState, useCallback, useEffect } from "react";
import type { MediaAsset, MediaType } from "@/lib/media-types";
import { useBlobStorage } from "./use-blob-storage";

interface UseMediaLibraryOptions {
  projectId?: string;
  type?: MediaType;
  autoLoad?: boolean;
}

interface UseMediaLibraryReturn {
  assets: MediaAsset[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  loadAssets: () => Promise<void>;
  uploadFile: (file: File) => Promise<MediaAsset | null>;
  deleteAsset: (url: string) => Promise<void>;
  filterByType: (type: MediaType | null) => void;
  searchAssets: (query: string) => void;
  filteredAssets: MediaAsset[];
}

export function useMediaLibrary(options: UseMediaLibraryOptions = {}): UseMediaLibraryReturn {
  const { projectId = "default", type, autoLoad = true } = options;

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<MediaType | null>(type || null);
  const [searchQuery, setSearchQuery] = useState("");

  const { upload, deleteFile, isUploading, uploadProgress } = useBlobStorage();

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (type) params.append("type", type);

      const response = await fetch(`/api/media?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to load assets");
      }

      const data = await response.json();
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, type]);

  const uploadFile = useCallback(
    async (file: File): Promise<MediaAsset | null> => {
      try {
        const blobFile = await upload(file, { projectId, folder: "media" });

        const newAsset: MediaAsset = {
          id: blobFile.pathname,
          projectId,
          name: file.name,
          type: blobFile.fileType as MediaType,
          mimeType: blobFile.contentType,
          url: blobFile.url,
          thumbnailUrl: blobFile.fileType === "image" ? blobFile.url : null,
          size: blobFile.size,
          duration: null,
          width: null,
          height: null,
          createdAt: blobFile.uploadedAt,
          source: "upload",
          tags: [],
          metadata: {},
        };

        setAssets((prev) => [newAsset, ...prev]);
        return newAsset;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        return null;
      }
    },
    [projectId, upload]
  );

  const deleteAsset = useCallback(
    async (url: string) => {
      try {
        await deleteFile(url);
        setAssets((prev) => prev.filter((a) => a.url !== url));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [deleteFile]
  );

  const filterByType = useCallback((newType: MediaType | null) => {
    setTypeFilter(newType);
  }, []);

  const searchAssets = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  useEffect(() => {
    let filtered = assets;

    if (typeFilter) {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    setFilteredAssets(filtered);
  }, [assets, typeFilter, searchQuery]);

  useEffect(() => {
    if (autoLoad) {
      loadAssets();
    }
  }, [autoLoad, loadAssets]);

  return {
    assets,
    isLoading,
    isUploading,
    uploadProgress: uploadProgress?.percentage || 0,
    error,
    loadAssets,
    uploadFile,
    deleteAsset,
    filterByType,
    searchAssets,
    filteredAssets,
  };
}
