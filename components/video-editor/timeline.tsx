"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SafeImage from "@/components/ui/safe-image";
import {
  Film,
  Music,
  Layers,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Plus,
  Scissors,
  Copy,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  Play,
  RefreshCw,
  Zap,
  Mic,
  Gauge,
} from "lucide-react";
import { AudioWaveform } from "./audio-waveform";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  type TimelineClip,
  type TimelineTrack,
  type MediaAsset,
  TRACK_HEIGHT,
  RULER_HEIGHT,
  PIXELS_PER_SECOND,
  SNAP_THRESHOLD,
  formatTimecode,
  findSnapPoints,
  snapToPoints,
} from "@/lib/media-types";

interface TimelineProps {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoom: number;
  selectedClipIds: string[];
  onTimeChange: (time: number) => void;
  onClipMove: (clipId: string, newStartTime: number, newTrackIndex: number, sourceTrackIndex?: number) => void;
  onClipTrim: (clipId: string, edge: "start" | "end", newValue: number) => void;
  onClipSelect: (clipId: string, addToSelection?: boolean) => void;
  onClipDelete: (clipId: string) => void;
  onClipDuplicate: (clipId: string) => void;
  onClipSplit: (clipId: string, time: number) => void;
  onClipRename?: (clipId: string, newName: string) => void;
  onClipRegenerate?: (clipId: string) => void;
  onClipAddSFX?: (clipId: string) => void;
  onClipAddDialogue?: (clipId: string) => void;
  onClipSpeed?: (clipId: string, speed: number) => void;
  onClipVolume?: (clipId: string, volume: number) => void;
  onTrackToggleLock: (trackId: string) => void;
  onTrackToggleMute: (trackId: string) => void;
  onTrackToggleVisible: (trackId: string) => void;
  onAssetDrop: (asset: MediaAsset, trackIndex: number, time: number) => void;
  onAddTrack?: (type: "video" | "audio" | "overlay") => void;
  onTrackRename?: (trackId: string, newName: string) => void;
  onZoomChange?: (newZoom: number) => void;
  snapEnabled?: boolean;
  className?: string;
}

const TRACK_LABEL_WIDTH = 112;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;

type ClipFlavor = "video-only" | "video+dialogue" | "video+sfx" | "video+both" | "audio" | "image" | "overlay" | "default";

function getClipFlavor(clip: TimelineClip): ClipFlavor {
  const m = clip.asset.metadata || {};
  const hasDialogue = !!m.hasDialogue || clip.asset.tags?.includes("dialogue");
  const hasSFX = !!m.hasSFX || clip.asset.tags?.includes("sfx");
  const type = clip.asset.type;
  if (type === "video" || type === "image") {
    if (hasDialogue && hasSFX) return "video+both";
    if (hasDialogue) return "video+dialogue";
    if (hasSFX) return "video+sfx";
    return "video-only";
  }
  if (type === "audio") return "audio";
  if (type === "document") return "overlay";
  return "default";
}

function getClipAccent(type: string): { border: string; bg: string; trackColor: string } {
  if (type === "video") return { border: "#3b82f6", bg: "rgba(59,130,246,0.12)", trackColor: "#3b82f6" };
  if (type === "audio") return { border: "#22c55e", bg: "rgba(34,197,94,0.12)", trackColor: "#22c55e" };
  if (type === "image" || type === "overlay") return { border: "#a855f7", bg: "rgba(168,85,247,0.12)", trackColor: "#a855f7" };
  return { border: "#6b7280", bg: "rgba(107,114,128,0.08)", trackColor: "#6b7280" };
}

function getClipBorderColor(flavor: ClipFlavor): string {
  switch (flavor) {
    case "video-only": return "#3b82f6";
    case "video+dialogue": return "#22c55e";
    case "video+sfx": return "#f59e0b";
    case "video+both": return "#a855f7";
    case "audio": return "#22c55e";
    case "image": return "#a855f7";
    case "overlay": return "#d946ef";
    default: return "#6b7280";
  }
}

function TrackIcon({ type, className, style }: { type: string; className?: string; style?: React.CSSProperties }) {
  if (type === "audio") return <Music className={className} style={style} />;
  if (type === "overlay") return <Layers className={className} style={style} />;
  return <Film className={className} style={style} />;
}

export function Timeline({
  tracks,
  currentTime,
  duration,
  zoom,
  selectedClipIds,
  onTimeChange,
  onClipMove,
  onClipTrim,
  onClipSelect,
  onClipDelete,
  onClipDuplicate,
  onClipSplit,
  onClipRename,
  onClipRegenerate,
  onClipAddSFX,
  onClipAddDialogue,
  onClipSpeed,
  onClipVolume,
  onTrackRename,
  onTrackToggleLock,
  onTrackToggleMute,
  onTrackToggleVisible,
  onAssetDrop,
  onAddTrack,
  onZoomChange,
  snapEnabled = true,
  className,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragState, setDragState] = useState<{
    clipId: string;
    startX: number;
    startTime: number;
    action: "move" | "trim-start" | "trim-end";
  } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ trackIndex: number; time: number } | null>(null);
  const [dragOverTrackIndex, setDragOverTrackIndex] = useState<number | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; scrollLeft: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ clipId: string; x: number; y: number } | null>(null);
  const [renamingClipId, setRenamingClipId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackValue, setEditingTrackValue] = useState("");
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{ clip: TimelineClip; x: number; y: number; time: number } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pixelsPerSecond = PIXELS_PER_SECOND * zoom;
  const timelineWidth = Math.max(duration * pixelsPerSecond + 400, 800);

  const allClips = useMemo(() => {
    return tracks.flatMap((track, trackIndex) =>
      track.clips.map((clip) => ({ ...clip, trackIndex }))
    );
  }, [tracks]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragState) return;
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - TRACK_LABEL_WIDTH;
      if (x < 0) return;
      const newTime = Math.max(0, x / pixelsPerSecond);
      onTimeChange(newTime);
    },
    [pixelsPerSecond, onTimeChange, dragState]
  );

  const handleClipMouseDown = useCallback(
    (e: React.MouseEvent, clip: TimelineClip & { trackIndex: number }, action: "move" | "trim-start" | "trim-end") => {
      e.stopPropagation();
      if (tracks[clip.trackIndex]?.locked) return;
      onClipSelect(clip.id, e.shiftKey);
      setDragState({
        clipId: clip.id,
        startX: e.clientX,
        startTime: action === "trim-start" ? clip.inPoint : action === "trim-end" ? clip.outPoint : clip.startTime,
        action,
      });
    },
    [onClipSelect, tracks]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning && panStart && timelineRef.current) {
        const deltaX = panStart.x - e.clientX;
        timelineRef.current.scrollLeft = panStart.scrollLeft + deltaX;
        return;
      }
      if (isDraggingPlayhead) {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - TRACK_LABEL_WIDTH;
        const newTime = Math.max(0, Math.min(x / pixelsPerSecond, duration));
        onTimeChange(newTime);
        return;
      }
      if (!dragState) return;
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      let newValue = dragState.startTime + deltaTime;

      if (snapEnabled && !e.shiftKey) {
        const snapPoints = findSnapPoints(allClips, dragState.clipId, SNAP_THRESHOLD);
        snapPoints.push(currentTime);
        // Also add grid snap points at 0.5s intervals
        const gridBase = Math.round(newValue / 0.5) * 0.5;
        for (let g = gridBase - 1; g <= gridBase + 1; g += 0.5) {
          if (g >= 0) snapPoints.push(g);
        }
        const { snapped, didSnap } = snapToPoints(newValue, snapPoints, SNAP_THRESHOLD, pixelsPerSecond);
        if (didSnap) {
          newValue = snapped;
          setSnapIndicator(snapped);
        } else {
          setSnapIndicator(null);
        }
      } else {
        setSnapIndicator(null);
      }

      newValue = Math.max(0, newValue);

      if (dragState.action === "move") {
        const clip = allClips.find((c) => c.id === dragState.clipId);
        if (!clip) return;
        // Determine target track from mouse Y position
        let newTrackIndex = clip.trackIndex;
        if (timelineRef.current) {
          const rect = timelineRef.current.getBoundingClientRect();
          const y = e.clientY - rect.top - RULER_HEIGHT;
          const computed = Math.floor(y / TRACK_HEIGHT);
          if (computed >= 0 && computed < tracks.length) newTrackIndex = computed;
        }
        onClipMove(dragState.clipId, newValue, newTrackIndex, clip.trackIndex);
      } else if (dragState.action === "trim-start") {
        onClipTrim(dragState.clipId, "start", newValue);
      } else if (dragState.action === "trim-end") {
        onClipTrim(dragState.clipId, "end", newValue);
      }
    },
    [isDraggingPlayhead, isPanning, panStart, dragState, pixelsPerSecond, duration, onTimeChange, snapEnabled, allClips, currentTime, onClipMove, onClipTrim, tracks.length]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
    setDragState(null);
    setSnapIndicator(null);
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - TRACK_LABEL_WIDTH;
      const y = e.clientY - rect.top - RULER_HEIGHT;
      if (x < 0 || y < 0) { setDropIndicator(null); setDragOverTrackIndex(null); return; }
      const trackIndex = Math.floor(y / TRACK_HEIGHT);
      const time = x / pixelsPerSecond;
      if (trackIndex >= 0 && trackIndex < tracks.length) {
        setDropIndicator({ trackIndex, time });
        setDragOverTrackIndex(trackIndex);
      }
    },
    [pixelsPerSecond, tracks.length]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!dropIndicator) return;

      try {
        const assetData = e.dataTransfer.getData("application/json");
        if (assetData) {
          const asset = JSON.parse(assetData) as MediaAsset;
          onAssetDrop(asset, dropIndicator.trackIndex, dropIndicator.time);
          setDropIndicator(null);
          setDragOverTrackIndex(null);
          return;
        }
      } catch {}

      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const isVideo = file.type.startsWith("video/");
        const isAudio = file.type.startsWith("audio/");
        const isImage = file.type.startsWith("image/");
        if (isVideo || isAudio || isImage) {
          const objectUrl = URL.createObjectURL(file);
          const asset: MediaAsset = {
            id: `local-${Date.now()}`,
            projectId: "",
            name: file.name,
            type: isVideo ? "video" : isAudio ? "audio" : "image",
            mimeType: file.type,
            url: objectUrl,
            thumbnailUrl: isImage ? objectUrl : null,
            size: file.size,
            duration: null,
            width: null,
            height: null,
            createdAt: new Date().toISOString(),
            source: "upload",
            tags: [],
            metadata: {},
          };
          onAssetDrop(asset, dropIndicator.trackIndex, dropIndicator.time);
        }
      }

      setDropIndicator(null);
      setDragOverTrackIndex(null);
    },
    [dropIndicator, onAssetDrop]
  );

  const handleDragLeave = useCallback(() => {
    setDropIndicator(null);
    setDragOverTrackIndex(null);
  }, []);

  const handleClipContextMenu = useCallback((e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 180;
    const menuHeight = 340;
    const x = Math.min(Math.max(e.clientX, 8), window.innerWidth - menuWidth - 8);
    let y = e.clientY;
    if (y + menuHeight > window.innerHeight - 8) {
      y = Math.max(8, e.clientY - menuHeight);
    }
    setContextMenu({ clipId, x, y });
  }, []);

  const startRenameClip = useCallback((clipId: string, currentName: string) => {
    setContextMenu(null);
    setRenamingClipId(clipId);
    setRenameValue(currentName);
  }, []);

  const commitRenameClip = useCallback(() => {
    if (renamingClipId && renameValue.trim()) {
      onClipRename?.(renamingClipId, renameValue.trim());
    }
    setRenamingClipId(null);
    setRenameValue("");
  }, [renamingClipId, renameValue, onClipRename]);

  const handleCtrlScroll = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.85 : 1.15;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    onZoomChange?.(newZoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    if (isDraggingPlayhead || dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, dragState, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleCtrlScroll, { passive: false });
    return () => el.removeEventListener("wheel", handleCtrlScroll);
  }, [handleCtrlScroll]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  useEffect(() => {
    if (!showAddTrackMenu) return;
    const handler = () => setShowAddTrackMenu(false);
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showAddTrackMenu]);

  const renderRuler = () => {
    const markers: JSX.Element[] = [];
    const majorInterval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : 1;
    const minorInterval = majorInterval / 5;
    const maxTime = Math.max(duration, 30);

    for (let t = 0; t <= maxTime + minorInterval; t += minorInterval) {
      const isMajor = Math.abs(t % majorInterval) < 0.001;
      const x = t * pixelsPerSecond + TRACK_LABEL_WIDTH;
      markers.push(
        <div key={t} className="absolute top-0" style={{ left: `${x}px` }}>
          <div
            style={{
              height: isMajor ? `${RULER_HEIGHT}px` : `${Math.round(RULER_HEIGHT * 0.35)}px`,
              width: "1px",
              background: isMajor ? "rgba(148,163,184,0.4)" : "rgba(148,163,184,0.15)",
            }}
          />
          {isMajor && (
            <span
              className="absolute text-[9px] font-mono whitespace-nowrap"
              style={{ top: "3px", left: "3px", color: "rgba(148,163,184,0.6)" }}
            >
              {formatTimecode(t, true)}
            </span>
          )}
        </div>
      );
    }
    return markers;
  };

  const contextMenuClip = contextMenu
    ? allClips.find((c) => c.id === contextMenu.clipId)
    : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col overflow-hidden select-none", className)}
      style={{ background: "#0a0a0f" }}
    >
      <div
        ref={timelineRef}
        className="relative overflow-x-auto overflow-y-auto flex-1"
        style={{ cursor: isDraggingPlayhead ? "ew-resize" : "default" }}
        onClick={handleTimelineClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onMouseDown={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, scrollLeft: timelineRef.current?.scrollLeft || 0 });
          }
        }}
      >
        <div style={{ width: `${timelineWidth}px`, minHeight: `${RULER_HEIGHT + tracks.length * TRACK_HEIGHT + 32}px` }}>

          {/* Ruler */}
          <div
            className="relative border-b sticky top-0 z-20"
            style={{
              height: `${RULER_HEIGHT}px`,
              background: "#0d0d1e",
              borderColor: "rgba(255,255,255,0.06)",
              paddingLeft: `${TRACK_LABEL_WIDTH}px`,
            }}
          >
            {/* Track label column header */}
            <div
              className="absolute top-0 left-0 flex items-center justify-center gap-1 border-r"
              style={{
                width: `${TRACK_LABEL_WIDTH}px`,
                height: "100%",
                background: "#080814",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Layers className="w-3 h-3" style={{ color: "rgba(148,163,184,0.5)" }} />
              <span className="text-[9px] font-medium" style={{ color: "rgba(148,163,184,0.5)" }}>تراک‌ها</span>
            </div>
            {renderRuler()}
          </div>

          {/* Tracks */}
          {tracks.map((track, trackIndex) => (
            <div
              key={track.id}
              className="relative border-b"
              style={{
                height: `${TRACK_HEIGHT}px`,
                background: trackIndex % 2 === 0 ? "#111122" : "#0d0d1e",
                borderColor: "rgba(255,255,255,0.04)",
                opacity: track.locked ? 0.55 : 1,
              }}
            >
              {/* Drag-over overlay */}
              {dragOverTrackIndex === trackIndex && (
                <div
                  className="absolute inset-0 pointer-events-none z-10 rounded-none"
                  style={{
                    border: "2px dashed rgba(56,189,248,0.5)",
                    background: "rgba(56,189,248,0.04)",
                  }}
                />
              )}

              {/* Track Label */}
              <div
                className="absolute left-0 top-0 h-full flex items-center gap-1 border-r z-10"
                style={{
                  width: `${TRACK_LABEL_WIDTH}px`,
                  background: "#080814",
                  borderColor: "rgba(255,255,255,0.06)",
                  paddingLeft: "4px",
                  paddingRight: "6px",
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: `${getClipAccent(track.type).border}22` }}
                >
                  <TrackIcon
                    type={track.type}
                    className="w-2.5 h-2.5"
                    style={{ color: getClipAccent(track.type).border } as React.CSSProperties}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {editingTrackId === track.id ? (
                    <input
                      autoFocus
                      value={editingTrackValue}
                      onChange={(e) => setEditingTrackValue(e.target.value)}
                      onBlur={() => {
                        if (editingTrackValue.trim()) onTrackRename?.(track.id, editingTrackValue.trim());
                        setEditingTrackId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingTrackValue.trim()) onTrackRename?.(track.id, editingTrackValue.trim());
                          setEditingTrackId(null);
                        }
                        if (e.key === "Escape") setEditingTrackId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[9px] font-medium bg-white/10 border border-white/20 rounded px-1 py-0.5 outline-none"
                      style={{ color: "rgba(226,232,240,0.9)" }}
                    />
                  ) : (
                    <p
                      className="text-[9px] font-medium truncate cursor-pointer"
                      style={{ color: "rgba(226,232,240,0.7)" }}
                      onDoubleClick={() => {
                        setEditingTrackId(track.id);
                        setEditingTrackValue(track.name);
                      }}
                      title={track.name}
                    >
                      {track.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    className="w-4 h-4 flex items-center justify-center rounded transition-colors hover:bg-white/10"
                    onClick={(e) => { e.stopPropagation(); onTrackToggleLock(track.id); }}
                    title={track.locked ? "باز کردن قفل" : "قفل کردن"}
                  >
                    {track.locked
                      ? <Lock className="w-2.5 h-2.5" style={{ color: "#f59e0b" }} />
                      : <Unlock className="w-2.5 h-2.5" style={{ color: "rgba(148,163,184,0.4)" }} />}
                  </button>
                  <button
                    className="w-4 h-4 flex items-center justify-center rounded transition-colors hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      track.type === "audio" ? onTrackToggleMute(track.id) : onTrackToggleVisible(track.id);
                    }}
                    title={track.type === "audio" ? (track.muted ? "صدا" : "بی‌صدا") : (track.visible ? "پنهان" : "نمایش")}
                  >
                    {track.type === "audio" ? (
                      track.muted
                        ? <VolumeX className="w-2.5 h-2.5" style={{ color: "#f87171" }} />
                        : <Volume2 className="w-2.5 h-2.5" style={{ color: "rgba(148,163,184,0.4)" }} />
                    ) : (
                      track.visible
                        ? <Eye className="w-2.5 h-2.5" style={{ color: "rgba(148,163,184,0.4)" }} />
                        : <EyeOff className="w-2.5 h-2.5" style={{ color: "#f87171" }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Drop indicator line */}
              {dropIndicator && dropIndicator.trackIndex === trackIndex && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
                  style={{
                    left: `${dropIndicator.time * pixelsPerSecond + TRACK_LABEL_WIDTH}px`,
                    background: "#38bdf8",
                    boxShadow: "0 0 6px 2px rgba(56,189,248,0.5)",
                  }}
                />
              )}

              {/* Clips */}
              {track.clips.map((clip) => {
                const isSelected = selectedClipIds.includes(clip.id);
                const isRenaming = renamingClipId === clip.id;
                const x = clip.startTime * pixelsPerSecond + TRACK_LABEL_WIDTH;
                const width = clip.duration * pixelsPerSecond;
                const accent = getClipAccent(clip.asset.type);
                const flavor = getClipFlavor(clip);
                const borderColor = getClipBorderColor(flavor);
                const clipDuration = clip.duration.toFixed(1);

                return (
                  <div
                    key={clip.id}
                    className="absolute group"
                    style={{
                      left: `${x}px`,
                      width: `${Math.max(width, 24)}px`,
                      top: "4px",
                      bottom: "4px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      cursor: track.locked ? "not-allowed" : "grab",
                      borderLeft: `3px solid ${borderColor}`,
                      borderRight: `1px solid ${borderColor}33`,
                      background: accent.bg,
                      boxShadow: isSelected
                        ? `0 0 0 1.5px #38bdf8, 0 0 12px rgba(56,189,248,0.25)`
                        : `0 1px 4px rgba(0,0,0,0.5)`,
                      transition: "box-shadow 0.1s, transform 0.1s",
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, { ...clip, trackIndex }, "move")}
                    onContextMenu={(e) => handleClipContextMenu(e, clip.id)}
                    onMouseEnter={(e) => {
                      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                      hoverTimerRef.current = setTimeout(() => {
                        const rect = timelineRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const t = (e.clientX - rect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond;
                        setHoverPreview({ clip, x: e.clientX, y: e.clientY, time: Math.max(0, t) });
                      }, 300);
                    }}
                    onMouseMove={(e) => {
                      if (!hoverPreview || hoverPreview.clip.id !== clip.id) return;
                      const rect = timelineRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const t = (e.clientX - rect.left - TRACK_LABEL_WIDTH) / pixelsPerSecond;
                      setHoverPreview(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, time: Math.max(0, t) } : null);
                    }}
                    onMouseLeave={() => {
                      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                      setHoverPreview(null);
                    }}
                    data-testid={`timeline-clip-${clip.id}`}
                  >
                    {/* Thumbnail background */}
                    {clip.asset.type !== "audio" && clip.asset.thumbnailUrl && (
                      <div className="absolute inset-0 pointer-events-none">
                        <SafeImage
                          src={clip.asset.thumbnailUrl}
                          alt={clip.asset.name}
                          fill
                          className="object-cover opacity-40"
                          sizes="200px"
                        />
                        <div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(to left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }}
                        />
                      </div>
                    )}

                    {/* Audio waveform */}
                    {(clip.asset.type === "audio" || (clip.asset.type === "video" && (clip.asset.metadata?.hasDialogue || clip.asset.metadata?.hasSFX))) && (
                      <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none">
                        <AudioWaveform
                          width={Math.max(width - 6, 20)}
                          height={TRACK_HEIGHT - 16}
                          color={clip.asset.type === "audio" ? "rgba(34,197,94,0.55)" : "rgba(164,126,248,0.35)"}
                        />
                      </div>
                    )}

                    {/* Duration badge (top-right) */}
                    {width > 48 && (
                      <div
                        className="absolute top-1 right-1 rounded text-[8px] font-mono px-1 py-px pointer-events-none z-10 border"
                        style={{ background: "rgba(0,0,0,0.55)", color: "rgba(226,232,240,0.7)", borderColor: "rgba(255,255,255,0.08)" }}
                      >
                        {clipDuration}s
                      </div>
                    )}

                    {/* Video badge (top-left) */}
                    {clip.asset.type === "video" && width > 40 && (
                      <div className="absolute top-1 left-1 rounded text-[8px] font-medium px-1 py-px pointer-events-none z-10 border flex items-center gap-0.5"
                        style={{ background: "rgba(59,130,246,0.55)", color: "rgba(255,255,255,0.9)", borderColor: "rgba(59,130,246,0.3)" }}>
                        <Play className="w-2 h-2" fill="currentColor" />
                        ویدیو
                      </div>
                    )}

                    {/* Title (bottom) */}
                    {!isRenaming && width > 40 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 px-1.5 pb-1 pointer-events-none z-10"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
                      >
                        <span
                          className="text-[8px] font-medium truncate block"
                          style={{ color: "rgba(226,232,240,0.85)" }}
                        >
                          {clip.asset.name}
                        </span>
                      </div>
                    )}

                    {/* Rename input */}
                    {isRenaming && (
                      <div
                        className="absolute inset-0 flex items-center px-1 z-20"
                        style={{ background: "rgba(0,0,0,0.8)" }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRenameClip}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRenameClip();
                            if (e.key === "Escape") { setRenamingClipId(null); setRenameValue(""); }
                          }}
                          className="w-full text-[9px] bg-white/10 border border-sky-400/50 rounded px-1 py-px outline-none"
                          style={{ color: "#e2e8f0" }}
                        />
                      </div>
                    )}

                    {/* Trim handles — left edge = start, right edge = end */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-ew-resize"
                      style={{ background: "rgba(255,255,255,0.15)", borderRadius: "4px 0 0 4px" }}
                      onMouseDown={(e) => { e.stopPropagation(); handleClipMouseDown(e, { ...clip, trackIndex }, "trim-start"); }}
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-ew-resize"
                      style={{ background: "rgba(255,255,255,0.15)", borderRadius: "0 4px 4px 0" }}
                      onMouseDown={(e) => { e.stopPropagation(); handleClipMouseDown(e, { ...clip, trackIndex }, "trim-end"); }}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 z-30 pointer-events-none"
            style={{
              left: `${currentTime * pixelsPerSecond + TRACK_LABEL_WIDTH}px`,
              height: `${RULER_HEIGHT + tracks.length * TRACK_HEIGHT}px`,
            }}
          >
            {/* Glowing line */}
            <div
              className="absolute top-0 bottom-0 playhead-glow"
              style={{
                left: "0px",
                width: "1.5px",
                background: "#38bdf8",
              }}
            />
            {/* Triangle handle */}
            <div
              className="absolute pointer-events-auto cursor-ew-resize"
              style={{ top: 0, left: "-7px", width: "15px", height: `${RULER_HEIGHT}px` }}
              onMouseDown={() => setIsDraggingPlayhead(true)}
            >
              {/* Triangle */}
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "8px solid #38bdf8",
                  filter: "drop-shadow(0 0 3px rgba(56,189,248,0.8))",
                }}
              />
              {/* Pill handle */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "10px",
                  height: "14px",
                  background: "#38bdf8",
                  borderRadius: "3px",
                  boxShadow: "0 0 6px rgba(56,189,248,0.7)",
                }}
              />
            </div>
            {/* Time tooltip on drag */}
            {isDraggingPlayhead && (
              <div
                className="absolute font-mono rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap pointer-events-none"
                style={{
                  top: "-20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#38bdf8",
                  color: "#0a0a0f",
                  fontWeight: 600,
                  boxShadow: "0 0 8px rgba(56,189,248,0.5)",
                }}
              >
                {formatTimecode(currentTime, true)}
              </div>
            )}
          </div>

          {/* Snap Indicator */}
          {snapIndicator !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{
                left: `${snapIndicator * pixelsPerSecond + TRACK_LABEL_WIDTH}px`,
                width: "1px",
                background: "#fbbf24",
                boxShadow: "0 0 4px 1px rgba(251,191,36,0.6)",
              }}
            />
          )}
        </div>
      </div>

      {/* Add Track row */}
      {onAddTrack && (
        <div
          className="relative flex items-center border-t flex-shrink-0"
          style={{
            height: "32px",
            background: "#080814",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: `${TRACK_LABEL_WIDTH}px`, position: "absolute", left: 0, height: "100%", borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="relative">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors hover:bg-white/10"
                style={{ color: "rgba(148,163,184,0.6)" }}
                onClick={(e) => { e.stopPropagation(); setShowAddTrackMenu(p => !p); }}
                data-testid="button-add-track"
              >
                <Plus className="w-3 h-3" />
                <span>تراک</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              <AnimatePresence>
                {showAddTrackMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-0 mb-1 rounded-lg overflow-hidden border z-50"
                    style={{ background: "#13132a", borderColor: "rgba(255,255,255,0.1)", minWidth: "120px" }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/10 text-right"
                      style={{ color: "#93c5fd" }}
                      onClick={() => { onAddTrack("video"); setShowAddTrackMenu(false); }}
                    >
                      <Film className="w-3 h-3" />
                      تراک ویدیو
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/10 text-right"
                      style={{ color: "#86efac" }}
                      onClick={() => { onAddTrack("audio"); setShowAddTrackMenu(false); }}
                    >
                      <Music className="w-3 h-3" />
                      تراک صدا
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/10 text-right"
                      style={{ color: "#d8b4fe" }}
                      onClick={() => { onAddTrack("overlay"); setShowAddTrackMenu(false); }}
                    >
                      <Layers className="w-3 h-3" />
                      تراک پوشش
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div
            className="flex items-center pl-3"
            style={{ marginLeft: `${TRACK_LABEL_WIDTH}px`, color: "rgba(148,163,184,0.25)" }}
          >
            <span className="text-[9px]">فایل‌های رسانه را اینجا بکشید و رها کنید</span>
          </div>
        </div>
      )}

      {/* Hover preview popup */}
      <AnimatePresence>
        {hoverPreview && (
          <motion.div
            key="hover-preview"
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[110] pointer-events-none"
            style={{ left: `${hoverPreview.x + 12}px`, top: `${hoverPreview.y - 120}px` }}
          >
            <div
              className="rounded-xl overflow-hidden border shadow-2xl"
              style={{ background: "#13132a", borderColor: "rgba(255,255,255,0.12)", width: "160px" }}
            >
              {hoverPreview.clip.asset.type === "audio" ? (
                <div
                  className="w-full flex flex-col items-center justify-center gap-1"
                  style={{ height: "90px", background: "rgba(34,197,94,0.08)" }}
                >
                  <Music className="w-8 h-8" style={{ color: "rgba(34,197,94,0.6)" }} />
                  <span className="text-[9px]" style={{ color: "rgba(34,197,94,0.5)" }}>
                    {hoverPreview.clip.asset.tags?.[0] ?? "audio"}
                  </span>
                </div>
              ) : hoverPreview.clip.asset.thumbnailUrl ? (
                <div className="relative w-full" style={{ height: "90px" }}>
                  <SafeImage
                    src={hoverPreview.clip.asset.thumbnailUrl}
                    alt={hoverPreview.clip.asset.name}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}
                  />
                </div>
              ) : (
                <div
                  className="w-full flex items-center justify-center"
                  style={{ height: "90px", background: "rgba(255,255,255,0.04)" }}
                >
                  <Film className="w-8 h-8" style={{ color: "rgba(148,163,184,0.2)" }} />
                </div>
              )}
              <div className="px-2.5 py-1.5">
                <p className="text-[10px] font-medium truncate" style={{ color: "rgba(226,232,240,0.9)" }}>
                  {hoverPreview.clip.asset.name}
                </p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }} dir="ltr">
                  {formatTimecode(hoverPreview.time)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-click context menu */}
      <AnimatePresence>
        {contextMenu && contextMenuClip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[100] rounded-xl overflow-hidden border shadow-2xl"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              background: "#13132a",
              borderColor: "rgba(255,255,255,0.1)",
              minWidth: "160px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="px-3 py-2 border-b text-[10px] font-medium truncate"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.6)" }}
            >
              {contextMenuClip.asset.name}
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
              style={{ color: "#e2e8f0" }}
              onClick={() => startRenameClip(contextMenu.clipId, contextMenuClip.asset.name)}
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: "#93c5fd" }} />
              <span className="flex-1">تغییر نام</span>
              <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>F2</span>
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
              style={{ color: "#e2e8f0" }}
              onClick={() => { onClipDuplicate(contextMenu.clipId); setContextMenu(null); }}
            >
              <Copy className="w-3.5 h-3.5" style={{ color: "#86efac" }} />
              <span className="flex-1">تکثیر</span>
              <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Ctrl+D</span>
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
              style={{ color: "#e2e8f0" }}
              onClick={() => { onClipSplit(contextMenu.clipId, currentTime); setContextMenu(null); }}
            >
              <Scissors className="w-3.5 h-3.5" style={{ color: "#fcd34d" }} />
              <span className="flex-1">برش در نشانگر</span>
              <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>S</span>
            </button>
            <div className="h-px mx-2" style={{ background: "rgba(255,255,255,0.06)" }} />
            {onClipRegenerate && contextMenuClip.asset.type === "video" && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
                style={{ color: "#e2e8f0" }}
                onClick={() => { onClipRegenerate(contextMenu.clipId); setContextMenu(null); }}
              >
                <RefreshCw className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                <span className="flex-1">تولید مجدد ویدیو</span>
              </button>
            )}
            {onClipAddSFX && contextMenuClip.asset.type === "video" && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
                style={{ color: "#e2e8f0" }}
                onClick={() => { onClipAddSFX(contextMenu.clipId); setContextMenu(null); }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                <span className="flex-1">افکت صوتی</span>
              </button>
            )}
            {onClipAddDialogue && contextMenuClip.asset.type === "video" && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
                style={{ color: "#e2e8f0" }}
                onClick={() => { onClipAddDialogue(contextMenu.clipId); setContextMenu(null); }}
              >
                <Mic className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
                <span className="flex-1">دیالوگ</span>
              </button>
            )}
            {onClipSpeed && contextMenuClip.asset.type === "video" && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/10 text-right"
                style={{ color: "#e2e8f0" }}
                onClick={() => {
                  const clip = allClips.find((c) => c.id === contextMenu.clipId);
                  if (clip) {
                    const currentSpeed = clip.speed || 1;
                    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
                    const nextIndex = speeds.findIndex((s) => s > currentSpeed);
                    const nextSpeed = nextIndex === -1 ? 1 : speeds[Math.min(nextIndex, speeds.length - 1)];
                    onClipSpeed(contextMenu.clipId, nextSpeed);
                  }
                  setContextMenu(null);
                }}
              >
                <Gauge className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                <span className="flex-1">
                  سرعت: {(contextMenuClip?.speed || 1) === 1 ? "عادی" : `${contextMenuClip?.speed || 1}x`}
                </span>
              </button>
            )}
            {onClipVolume && contextMenuClip && contextMenuClip.asset.type === "audio" && (
              <div className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-2 text-[12px]" style={{ color: "#e2e8f0" }}>
                  <Volume2 className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                  <span className="flex-1">صدا: {Math.round((contextMenuClip.volume ?? 1) * 100)}%</span>
                </div>
                <Slider
                  value={[(contextMenuClip.volume ?? 1)]}
                  min={0}
                  max={2}
                  step={0.05}
                  onValueChange={([v]) => {
                    onClipVolume(contextMenu.clipId, v);
                  }}
                  className="w-full"
                />
              </div>
            )}
            <div className="h-px mx-2" style={{ background: "rgba(255,255,255,0.06)" }} />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-red-500/15 text-right"
              style={{ color: "#f87171" }}
              onClick={() => { onClipDelete(contextMenu.clipId); setContextMenu(null); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="flex-1">حذف</span>
              <span className="text-[10px]" style={{ color: "rgba(248,113,113,0.5)" }}>Del</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
