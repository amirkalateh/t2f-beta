"use client";

import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  showImage?: boolean;
  showDescription?: boolean;
}

export function SkeletonCard({ className, showImage = true, showDescription = true }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border border-border/30 overflow-hidden animate-pulse", className)}>
      {showImage && (
        <div className="aspect-video bg-muted/50" />
      )}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted/50 rounded w-3/4" />
        {showDescription && (
          <>
            <div className="h-3 bg-muted/30 rounded w-full" />
            <div className="h-3 bg-muted/30 rounded w-2/3" />
          </>
        )}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
  showImage?: boolean;
}

export function SkeletonList({ count = 4, className, showImage = true }: SkeletonListProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showImage={showImage} />
      ))}
    </div>
  );
}

export function SkeletonTimeline({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-4 animate-pulse", className)}>
      <div className="h-6 bg-muted/30 rounded" />
      <div className="space-y-1">
        <div className="h-12 bg-muted/20 rounded flex items-center gap-2 px-4">
          <div className="w-16 h-8 bg-blue-500/20 rounded" />
          <div className="w-24 h-8 bg-blue-500/20 rounded" />
          <div className="w-32 h-8 bg-blue-500/20 rounded" />
        </div>
        <div className="h-12 bg-muted/20 rounded flex items-center gap-2 px-4">
          <div className="w-20 h-8 bg-blue-500/20 rounded" />
          <div className="w-40 h-8 bg-blue-500/20 rounded" />
        </div>
      </div>
    </div>
  );
}
