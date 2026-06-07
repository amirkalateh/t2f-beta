"use client";

import { useState, useEffect } from "react";
import SafeImage from "@/components/ui/safe-image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Heart,
  Share2,
  RotateCcw,
  Check,
  Loader2,
  X,
  Play,
  Pause,
} from "lucide-react";

export interface GenerationTask {
  id: string;
  taskId: string;
  type: "image" | "video";
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  resultUrl?: string;
  error?: string;
  createdAt: Date;
}

interface GenerationResultProps {
  task: GenerationTask;
  onRetry?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  className?: string;
}

export function GenerationResult({
  task,
  onRetry,
  onSave,
  onShare,
  className,
}: GenerationResultProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    onSave?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative rounded-xl overflow-hidden border border-border/50",
        "bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      {/* Preview Area */}
      <div className="relative aspect-video bg-muted/20">
        {task.status === "pending" || task.status === "processing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center px-4">
              <p className="text-sm font-medium mb-2">
                {task.status === "pending" ? "در صف انتظار..." : "در حال تولید..."}
              </p>
              <Progress value={task.progress} className="w-48 h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(task.progress)}%
              </p>
            </div>
          </div>
        ) : task.status === "failed" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium mb-1">خطا در تولید</p>
              <p className="text-xs text-muted-foreground mb-4">
                {task.error || "لطفا دوباره تلاش کنید"}
              </p>
              <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                تلاش مجدد
              </Button>
            </div>
          </div>
        ) : task.resultUrl ? (
          <>
            {task.type === "image" ? (
              <SafeImage
                src={task.resultUrl}
                alt={task.prompt}
                fill
                className="object-cover"
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  src={task.resultUrl}
                  className="w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                  autoPlay={isPlaying}
                />
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                >
                  {isPlaying ? (
                    <Pause className="w-12 h-12 text-white" />
                  ) : (
                    <Play className="w-12 h-12 text-white" />
                  )}
                </button>
              </div>
            )}
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 text-[10px] uppercase"
            >
              {task.type === "image" ? "تصویر" : "ویدیو"}
            </Badge>
          </>
        ) : null}
      </div>

      {/* Info & Actions */}
      {task.status === "completed" && (
        <div className="p-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 text-right">
            {task.prompt}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSave}
            >
              <Heart
                className={cn(
                  "w-4 h-4",
                  isSaved && "fill-primary text-primary"
                )}
              />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(task.resultUrl, "_blank")}
            >
              <Download className="w-3.5 h-3.5" />
              دانلود
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface GenerationGridProps {
  tasks: GenerationTask[];
  onRetry?: (taskId: string) => void;
  className?: string;
}

export function GenerationGrid({ tasks, onRetry, className }: GenerationGridProps) {
  if (tasks.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <GenerationResult
            key={task.id}
            task={task}
            onRetry={() => onRetry?.(task.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
