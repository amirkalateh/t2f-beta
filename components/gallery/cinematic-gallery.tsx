"use client";

import { useState } from "react";
import SafeImage from "@/components/ui/safe-image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cinematicFrames, type CinematicFrame } from "@/lib/cinematic-frames";
import { Play, Heart, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface CinematicGalleryProps {
  frames?: CinematicFrame[];
  title?: string;
  subtitle?: string;
  variant?: "grid" | "masonry" | "carousel" | "featured";
  className?: string;
  showFilters?: boolean;
}

const CATEGORIES = ["همه", "سینمایی", "طبیعت", "پرتره", "شهری", "انتزاعی"];

export function CinematicGallery({
  frames = cinematicFrames,
  title,
  subtitle,
  variant = "masonry",
  className,
  showFilters = false,
}: CinematicGalleryProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState("همه");

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFrames = activeFilter === "همه"
    ? frames
    : frames.filter((f) => f.category === activeFilter);

  if (variant === "featured") {
    const featuredFrames = frames.slice(0, 3);
    return (
      <div className={cn("space-y-4", className)} data-testid="cinematic-gallery-featured">
        {title && (
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <div className="flex gap-4 justify-center overflow-x-auto pb-4">
          {featuredFrames.map((frame, index) => (
            <motion.div
              key={frame.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative rounded-xl overflow-hidden frame-hover cursor-pointer",
                "w-[280px] md:w-[360px] aspect-wide flex-shrink-0"
              )}
            >
              <SafeImage
                src={frame.src}
                alt={frame.alt}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "carousel") {
    return (
      <div className={cn("relative", className)} data-testid="cinematic-gallery-carousel">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {frames.map((frame, index) => (
            <motion.div
              key={frame.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative rounded-xl overflow-hidden frame-hover cursor-pointer",
                "w-[200px] md:w-[260px] aspect-wide flex-shrink-0",
                "group"
              )}
              onClick={() => {}}
            >
              <SafeImage
                src={frame.src}
                alt={frame.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-black/40 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(frame.id);
                  }}
                >
                  <Heart
                    className={cn("w-4 h-4", favorites.has(frame.id) && "fill-red-500 text-red-500")}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-black/40 text-white"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Masonry variant (new default) and grid variant
  return (
    <div className={cn("space-y-6", className)} data-testid="cinematic-gallery-grid">
      {title && (
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap" dir="rtl" data-testid="gallery-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                activeFilter === cat
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
              data-testid={`filter-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className={variant === "masonry" ? "masonry-grid" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"}>
        {filteredFrames.map((frame, index) => (
          <Dialog key={frame.id}>
            <DialogTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.4 }}
                className={cn(
                  "relative rounded-xl overflow-hidden cursor-pointer group",
                  variant === "masonry"
                    ? ""
                    : (frame.aspectRatio === "1:1" ? "aspect-square" : "aspect-wide")
                )}
              >
                <SafeImage
                  src={frame.src}
                  alt={frame.alt}
                  width={400}
                  height={frame.aspectRatio === "1:1" ? 400 : frame.aspectRatio === "9:16" ? 600 : 225}
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

                <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{frame.mood}</p>
                      <p className="text-white/60 text-[10px]">{frame.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="bg-white/10 text-white backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(frame.id);
                        }}
                        data-testid={`button-fav-${frame.id}`}
                      >
                        <Heart
                          className={cn("w-3.5 h-3.5", favorites.has(frame.id) && "fill-red-500 text-red-500")}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="bg-white/10 text-white backdrop-blur-sm"
                        data-testid={`button-expand-${frame.id}`}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-border/60">
              <div className="relative aspect-video">
                <SafeImage
                  src={frame.src}
                  alt={frame.alt}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{frame.category}</p>
                  <p className="text-sm">{frame.mood}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleFavorite(frame.id)}
                  >
                    <Heart
                      className={cn("w-5 h-5", favorites.has(frame.id) && "fill-red-500 text-red-500")}
                    />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}

interface CinematicVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function CinematicVideo({
  src,
  poster,
  className,
  autoPlay = true,
  loop = true,
  muted = true,
}: CinematicVideoProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  return (
    <div className={cn("relative rounded-xl overflow-hidden group", className)}>
      <video
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className="w-full h-full object-cover"
      />
      {!autoPlay && (
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </button>
      )}
    </div>
  );
}
