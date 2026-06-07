"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SafeImage from "@/components/ui/safe-image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Plus,
  Trash2,
  Upload,
  Film,
  Music,
  ImageIcon,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Magnet,
  Undo2,
  Redo2,
  Settings,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MediaLibrary } from "@/components/media/media-library";
import { KeyboardShortcutsButton } from "@/components/ui/keyboard-shortcuts";
import { Timeline } from "./timeline";
import {
  type TimelineClip,
  type TimelineTrack,
  type MediaAsset,
  TRACK_HEIGHT,
  PIXELS_PER_SECOND,
  formatTimecode,
} from "@/lib/media-types";

interface VideoEditorProps {
  projectId?: string;
  generatedAssets?: MediaAsset[];
}

const createDefaultTracks = (): TimelineTrack[] => [
  { id: "video-1", name: "ویدیو ۱", type: "video", locked: false, muted: false, visible: true, clips: [] },
  { id: "video-2", name: "ویدیو ۲", type: "video", locked: false, muted: false, visible: true, clips: [] },
  { id: "audio-1", name: "صدا ۱", type: "audio", locked: false, muted: false, visible: true, clips: [] },
  { id: "audio-2", name: "صدا ۲", type: "audio", locked: false, muted: false, visible: true, clips: [] },
];

export function VideoEditor({ projectId = "default", generatedAssets = [] }: VideoEditorProps) {
  const [tracks, setTracks] = useState<TimelineTrack[]>(createDefaultTracks);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"media" | "properties">("media");

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const duration = useMemo(() => {
    let maxEnd = 0;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        maxEnd = Math.max(maxEnd, clip.startTime + clip.duration);
      });
    });
    return Math.max(maxEnd, 10);
  }, [tracks]);

  const selectedClip = useMemo(() => {
    if (selectedClipIds.length !== 1) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipIds[0]);
      if (clip) return clip;
    }
    return null;
  }, [tracks, selectedClipIds]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSkipBack = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleSkipForward = useCallback(() => {
    setCurrentTime(duration);
    setIsPlaying(false);
  }, [duration]);

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.25, 0.25));
  }, []);

  const handleClipSelect = useCallback((clipId: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedClipIds((prev) =>
        prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId]
      );
    } else {
      setSelectedClipIds([clipId]);
    }
    setSidebarTab("properties");
  }, []);

  const handleClipMove = useCallback((clipId: string, newStartTime: number, newTrackIndex: number) => {
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, startTime: Math.max(0, newStartTime) } : clip
        ),
      }))
    );
  }, []);

  const handleClipTrim = useCallback((clipId: string, edge: "start" | "end", newValue: number) => {
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;

          if (edge === "start") {
            const newInPoint = Math.max(0, Math.min(newValue, clip.outPoint - 0.1));
            const deltaTime = newInPoint - clip.inPoint;
            return {
              ...clip,
              inPoint: newInPoint,
              startTime: clip.startTime + deltaTime,
              duration: clip.duration - deltaTime,
            };
          } else {
            const newOutPoint = Math.max(clip.inPoint + 0.1, newValue);
            return {
              ...clip,
              outPoint: newOutPoint,
              duration: newOutPoint - clip.inPoint,
            };
          }
        }),
      }))
    );
  }, []);

  const handleClipDelete = useCallback((clipId: string) => {
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      }))
    );
    setSelectedClipIds((prev) => prev.filter((id) => id !== clipId));
  }, []);

  const handleClipDuplicate = useCallback((clipId: string) => {
    setTracks((prev) =>
      prev.map((track) => {
        const clip = track.clips.find((c) => c.id === clipId);
        if (!clip) return track;

        const newClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startTime: clip.startTime + clip.duration,
        };

        return {
          ...track,
          clips: [...track.clips, newClip],
        };
      })
    );
  }, []);

  const handleClipSplit = useCallback((clipId: string, time: number) => {
    setTracks((prev) =>
      prev.map((track) => {
        const clipIndex = track.clips.findIndex((c) => c.id === clipId);
        if (clipIndex === -1) return track;

        const clip = track.clips[clipIndex];
        if (time <= clip.startTime || time >= clip.startTime + clip.duration) return track;

        const splitPoint = time - clip.startTime;
        const firstClip: TimelineClip = {
          ...clip,
          duration: splitPoint,
          outPoint: clip.inPoint + splitPoint,
        };

        const secondClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startTime: time,
          duration: clip.duration - splitPoint,
          inPoint: clip.inPoint + splitPoint,
        };

        const newClips = [...track.clips];
        newClips.splice(clipIndex, 1, firstClip, secondClip);

        return { ...track, clips: newClips };
      })
    );
  }, []);

  const handleTrackToggleLock = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      )
    );
  }, []);

  const handleTrackToggleMute = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      )
    );
  }, []);

  const handleTrackToggleVisible = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, visible: !track.visible } : track
      )
    );
  }, []);

  const handleAssetDrop = useCallback((asset: MediaAsset, trackIndex: number, time: number) => {
    const track = tracks[trackIndex];
    if (!track || track.locked) return;

    const assetDuration = asset.duration || (asset.type === "image" ? 5 : 10);

    const newClip: TimelineClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: asset.id,
      asset,
      startTime: time,
      duration: assetDuration,
      inPoint: 0,
      outPoint: assetDuration,
      trackIndex,
      locked: false,
      muted: false,
      volume: 1,
      opacity: 1,
    };

    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex ? { ...t, clips: [...t.clips, newClip] } : t
      )
    );
    setSelectedClipIds([newClip.id]);
  }, [tracks]);

  const handleMediaSelect = useCallback((asset: MediaAsset) => {
    const targetTrackIndex = asset.type === "audio" ? 2 : 0;
    const track = tracks[targetTrackIndex];
    if (!track) return;

    const lastClipEnd = track.clips.length > 0
      ? Math.max(...track.clips.map((c) => c.startTime + c.duration))
      : 0;

    handleAssetDrop(asset, targetTrackIndex, lastClipEnd);
  }, [tracks, handleAssetDrop]);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.033;
        });
      }, 33);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          isPlaying ? handlePause() : handlePlay();
          break;
        case "Delete":
        case "Backspace":
          if (selectedClipIds.length > 0) {
            selectedClipIds.forEach(handleClipDelete);
          }
          break;
        case "Home":
          handleSkipBack();
          break;
        case "End":
          handleSkipForward();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, selectedClipIds, handlePlay, handlePause, handleSkipBack, handleSkipForward, handleZoomIn, handleZoomOut, handleClipDelete]);

  const getCurrentThumbnail = () => {
    for (const track of tracks) {
      if (track.type !== "video") continue;
      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          return clip.asset.thumbnailUrl;
        }
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Media Library */}
        <div className="w-64 border-l border-border/30 flex flex-col hidden lg:flex">
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as "media" | "properties")} className="flex flex-col h-full">
            <TabsList className="m-2">
              <TabsTrigger value="media" className="flex-1 gap-1 text-xs">
                <Layers className="w-3 h-3" />
                رسانه
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex-1 gap-1 text-xs">
                <Settings className="w-3 h-3" />
                ویژگی‌ها
              </TabsTrigger>
            </TabsList>

            <TabsContent value="media" className="flex-1 m-0 overflow-hidden">
              <MediaLibrary
                projectId={projectId}
                onSelectAsset={handleMediaSelect}
                compact
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full p-3">
                {selectedClip ? (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-lg bg-muted/30 overflow-hidden">
                      {selectedClip.asset.thumbnailUrl ? (
                        <SafeImage
                          src={selectedClip.asset.thumbnailUrl}
                          alt={selectedClip.asset.name}
                          width={256}
                          height={144}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {selectedClip.asset.type === "audio" ? (
                            <Music className="w-8 h-8 opacity-30" />
                          ) : (
                            <ImageIcon className="w-8 h-8 opacity-30" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">نام</label>
                      <p className="text-sm font-medium">{selectedClip.asset.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <label className="text-xs text-muted-foreground">نوع</label>
                        <p>
                          {selectedClip.asset.type === "video" && "ویدیو"}
                          {selectedClip.asset.type === "image" && "تصویر"}
                          {selectedClip.asset.type === "audio" && "صدا"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">مدت</label>
                        <p>{selectedClip.duration.toFixed(2)}s</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">شروع</label>
                        <p>{formatTimecode(selectedClip.startTime)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">پایان</label>
                        <p>{formatTimecode(selectedClip.startTime + selectedClip.duration)}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleClipDelete(selectedClip.id)}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف کلیپ
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Settings className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">کلیپی انتخاب نشده</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center p-4 bg-black/30 min-h-[200px]">
            {tracks.every((t) => t.clips.length === 0) ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-16 h-12 border-2 border-dashed border-border rounded" />
                  <div className="w-12 h-16 border-2 border-border rounded" />
                  <div className="w-20 h-12 border-2 border-border rounded" />
                </div>
                <h3 className="text-lg font-semibold mb-2">بیایید ویرایش را شروع کنیم</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  رسانه‌ها را از پنل چپ به تایم‌لاین بکشید
                </p>
              </div>
            ) : (
              <div className="relative aspect-video w-full max-w-3xl bg-black rounded-lg overflow-hidden">
                {getCurrentThumbnail() ? (
                  <SafeImage
                    src={getCurrentThumbnail()!}
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-border/30 bg-background/50">
            <Button variant="ghost" size="icon" onClick={handleSkipBack} data-testid="button-skip-back">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10"
              onClick={isPlaying ? handlePause : handlePlay}
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSkipForward} data-testid="button-skip-forward">
              <SkipForward className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-border/50 mx-2" />

            <span className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
              {formatTimecode(currentTime)} / {formatTimecode(duration)}
            </span>

            <div className="w-px h-6 bg-border/50 mx-2" />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            <div className="flex-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={snapEnabled ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  data-testid="button-snap-toggle"
                >
                  <Magnet className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>چسبندگی {snapEnabled ? "فعال" : "غیرفعال"}</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <KeyboardShortcutsButton />
          </div>

          {/* Timeline */}
          <Timeline
            tracks={tracks}
            currentTime={currentTime}
            duration={duration}
            zoom={zoom}
            selectedClipIds={selectedClipIds}
            onTimeChange={handleTimeChange}
            onClipMove={handleClipMove}
            onClipTrim={handleClipTrim}
            onClipSelect={handleClipSelect}
            onClipDelete={handleClipDelete}
            onClipDuplicate={handleClipDuplicate}
            onClipSplit={handleClipSplit}
            onTrackToggleLock={handleTrackToggleLock}
            onTrackToggleMute={handleTrackToggleMute}
            onTrackToggleVisible={handleTrackToggleVisible}
            onAssetDrop={handleAssetDrop}
            snapEnabled={snapEnabled}
            className="h-[240px] border-t border-border/30"
          />
        </div>
      </div>
    </div>
  );
}
