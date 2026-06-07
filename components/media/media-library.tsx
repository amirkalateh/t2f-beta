"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SafeImage from "@/components/ui/safe-image";
import {
  Upload,
  Folder,
  ImageIcon,
  Film,
  Music,
  FileText,
  Search,
  Grid,
  List,
  MoreVertical,
  Trash2,
  Download,
  ExternalLink,
  Sparkles,
  Loader2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMediaLibrary } from "@/hooks/use-media-library";
import type { MediaAsset, MediaType } from "@/lib/media-types";

interface MediaLibraryProps {
  projectId?: string;
  onSelectAsset?: (asset: MediaAsset) => void;
  onDragStart?: (asset: MediaAsset, e: React.DragEvent) => void;
  selectable?: boolean;
  selectedAssetId?: string | null;
  showUpload?: boolean;
  compact?: boolean;
  className?: string;
}

const TYPE_ICONS: Record<MediaType | "all", typeof ImageIcon> = {
  all: Folder,
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
};

const TYPE_LABELS: Record<MediaType | "all", string> = {
  all: "همه",
  image: "تصویر",
  video: "ویدیو",
  audio: "صدا",
  document: "سند",
};

export function MediaLibrary({
  projectId = "default",
  onSelectAsset,
  onDragStart,
  selectable = true,
  selectedAssetId,
  showUpload = true,
  compact = false,
  className,
}: MediaLibraryProps) {
  const {
    filteredAssets,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    uploadFile,
    deleteAsset,
    filterByType,
    searchAssets,
  } = useMediaLibrary({ projectId });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MediaType | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFilterChange = (type: MediaType | "all") => {
    setActiveFilter(type);
    filterByType(type === "all" ? null : type);
  };

  const handleAssetDragStart = (asset: MediaAsset, e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart?.(asset, e);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-3 border-b border-border/30 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            className="pr-9 h-9"
            onChange={(e) => searchAssets(e.target.value)}
            data-testid="input-media-search"
          />
        </div>

        {/* Filters & View Toggle */}
        <div className="flex items-center justify-between gap-2">
          <Tabs value={activeFilter} onValueChange={(v) => handleFilterChange(v as MediaType | "all")}>
            <TabsList className="h-8">
              {(["all", "image", "video", "audio"] as const).map((type) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <TabsTrigger key={type} value={type} className="px-2 text-xs gap-1">
                    <Icon className="w-3 h-3" />
                    {!compact && TYPE_LABELS[type]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <div
          className={cn(
            "mx-3 mt-3 p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-border/50 hover:border-border"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          data-testid="upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-2 text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <div className="w-full max-w-32">
                  <Progress value={uploadProgress} className="h-1" />
                </div>
                <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  فایل را بکشید یا کلیک کنید
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mx-3 mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Assets List */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Folder className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">هنوز فایلی ندارید</p>
            <p className="text-xs text-muted-foreground mt-1">
              فایل‌ها را بارگذاری کنید یا تولید کنید
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <AnimatePresence mode="popLayout">
              {filteredAssets.map((asset) => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden cursor-pointer group hover-elevate",
                      selectable && selectedAssetId === asset.id && "ring-2 ring-primary"
                    )}
                    draggable
                    onDragStart={(e) => handleAssetDragStart(asset, e)}
                    onClick={() => onSelectAsset?.(asset)}
                    data-testid={`asset-card-${asset.id}`}
                  >
                    <div className="aspect-video bg-muted/30 relative">
                      {asset.thumbnailUrl ? (
                        <SafeImage
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {asset.type === "video" && <Film className="w-8 h-8 text-blue-400/50" />}
                          {asset.type === "audio" && <Music className="w-8 h-8 text-purple-400/50" />}
                          {asset.type === "image" && <ImageIcon className="w-8 h-8 text-green-400/50" />}
                          {asset.type === "document" && <FileText className="w-8 h-8 text-orange-400/50" />}
                        </div>
                      )}

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px]">
                            {TYPE_LABELS[asset.type]}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 bg-black/30">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(asset.url, "_blank")}>
                                <ExternalLink className="w-4 h-4 ml-2" />
                                باز کردن
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={asset.url} download={asset.name}>
                                  <Download className="w-4 h-4 ml-2" />
                                  دانلود
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteAsset(asset.url)}
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {asset.source === "generated" && (
                        <div className="absolute top-2 right-2">
                          <Badge className="text-[10px] gap-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 border-0">
                            <Sparkles className="w-3 h-3" />
                            AI
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(asset.size)}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover-elevate",
                  selectable && selectedAssetId === asset.id && "bg-primary/10"
                )}
                draggable
                onDragStart={(e) => handleAssetDragStart(asset, e)}
                onClick={() => onSelectAsset?.(asset)}
              >
                <div className="w-10 h-10 rounded bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {asset.thumbnailUrl ? (
                    <SafeImage
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <>
                      {asset.type === "video" && <Film className="w-5 h-5 text-blue-400/50" />}
                      {asset.type === "audio" && <Music className="w-5 h-5 text-purple-400/50" />}
                      {asset.type === "image" && <ImageIcon className="w-5 h-5 text-green-400/50" />}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[asset.type]} • {formatSize(asset.size)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteAsset(asset.url)}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
