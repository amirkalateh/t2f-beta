"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Play, Pause, Volume2, VolumeX, Maximize2, X,
  FileText, Image, Video, Music, Loader2,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Copy, Check, Trash2, Edit2, Save,
} from "lucide-react";

// ─── Audio Player ───────────────────────────────────────────────────────────────

export function AudioPlayer({
  src,
  title,
  compact = false,
  onDelete,
  onRename,
  className,
}: {
  src: string;
  title?: string;
  compact?: boolean;
  onDelete?: () => void;
  onRename?: (newName: string) => void;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(title || "");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audio = audioRef.current;

  useEffect(() => {
    const el = new Audio(src);
    el.crossOrigin = "anonymous";
    audioRef.current = el;
    setLoading(true);
    setError(false);

    const handleLoaded = () => {
      setDuration(el.duration || 0);
      setLoading(false);
    };
    const handleError = () => {
      setError(true);
      setLoading(false);
    };
    const handleTime = () => setProgress(el.currentTime || 0);
    const handleEnd = () => setPlaying(false);

    el.addEventListener("loadedmetadata", handleLoaded);
    el.addEventListener("error", handleError);
    el.addEventListener("timeupdate", handleTime);
    el.addEventListener("ended", handleEnd);

    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", handleLoaded);
      el.removeEventListener("error", handleError);
      el.removeEventListener("timeupdate", handleTime);
      el.removeEventListener("ended", handleEnd);
      audioRef.current = null;
    };
  }, [src]);

  const toggle = () => {
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError(true));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.min(duration * pct, duration - 0.1);
  };

  const toggleMute = () => {
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  };

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={toggle}
          disabled={loading || error}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
            playing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
          )}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
           error ? <VolumeX className="w-3.5 h-3.5" /> :
           playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {fmtTime(progress)} / {fmtTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-muted/30 p-3 space-y-2", className)}>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          disabled={loading || error}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
            playing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
          )}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
           error ? <VolumeX className="w-4 h-4" /> :
           playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        {editing && onRename ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="flex-1 h-7 text-sm px-2 rounded border bg-background"
              dir="rtl"
              onKeyDown={e => {
                if (e.key === "Enter") { onRename(editName); setEditing(false); }
                if (e.key === "Escape") { setEditing(false); setEditName(title || ""); }
              }}
              autoFocus
            />
            <button onClick={() => { onRename(editName); setEditing(false); }} className="p-1 hover:bg-primary/10 rounded">
              <Save className="w-3.5 h-3.5 text-primary" />
            </button>
            <button onClick={() => { setEditing(false); setEditName(title || ""); }} className="p-1 hover:bg-muted rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-sm font-medium truncate flex-1">{title || "ترک صوتی"}</span>
            {onRename && (
              <button onClick={() => setEditing(true)} className="p-1 hover:bg-muted rounded opacity-0 hover:opacity-100 transition-opacity">
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1 hover:bg-destructive/10 rounded text-destructive/60 hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer relative overflow-hidden" onClick={seek}>
          <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-16 text-left">
          {fmtTime(progress)} / {fmtTime(duration)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleMute} className="p-1 hover:bg-muted rounded">
          {muted ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> : <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

// ─── Video Player ───────────────────────────────────────────────────────────────

export function VideoPlayer({ src, title, className }: { src: string; title?: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const video = videoRef.current;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handleLoaded = () => {
      setDuration(el.duration || 0);
      setLoading(false);
    };
    const handleTime = () => setProgress(el.currentTime || 0);
    const handleEnd = () => setPlaying(false);
    el.addEventListener("loadedmetadata", handleLoaded);
    el.addEventListener("timeupdate", handleTime);
    el.addEventListener("ended", handleEnd);
    return () => {
      el.removeEventListener("loadedmetadata", handleLoaded);
      el.removeEventListener("timeupdate", handleTime);
      el.removeEventListener("ended", handleEnd);
    };
  }, [src]);

  const toggle = () => {
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); }
    else { video.play().then(() => setPlaying(true)); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    video.currentTime = (duration * (e.clientX - rect.left)) / rect.width;
  };

  const toggleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  };

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("rounded-xl border overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        className="w-full aspect-video bg-black"
        onClick={toggle}
        preload="metadata"
        playsInline
        muted={muted}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 animate-spin text-white/60" />
        </div>
      )}
      <div className="bg-black/80 backdrop-blur p-2 space-y-1">
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
            {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
          </button>
          <div className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer relative" onClick={seek}>
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] text-white/70 tabular-nums">{fmtTime(progress)} / {fmtTime(duration)}</span>
          <button onClick={() => setMuted(!muted)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
            {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>
          <button onClick={toggleFullscreen} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image Preview ──────────────────────────────────────────────────────────────

export function ImagePreview({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(src);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={cn("relative group overflow-hidden rounded-lg border hover:border-primary/50 transition-colors", className)}>
        <img src={src} alt={alt || ""} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <ZoomIn className="w-5 h-5 text-white" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative flex flex-col items-center justify-center bg-black/90 min-h-[300px]">
            <img src={src} alt={alt || ""} className="max-w-full max-h-[70vh] object-contain" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={copyUrl} className="gap-1 text-xs">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "کپی شد" : "کپی لینک"}
              </Button>
            </div>
          </div>
          {alt && <div className="p-3 text-sm text-center text-muted-foreground">{alt}</div>}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Text Preview ─────────────────────────────────────────────────────────────

export function TextPreview({
  text,
  title,
  className,
  editable = false,
  onSave,
  maxLines = 8,
}: {
  text: string;
  title?: string;
  className?: string;
  editable?: boolean;
  onSave?: (newText: string) => void;
  maxLines?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [expanded, setExpanded] = useState(false);

  const lines = text.split("\n");
  const truncated = !expanded && lines.length > maxLines;
  const displayText = truncated ? lines.slice(0, maxLines).join("\n") + "\n..." : text;

  return (
    <div className={cn("rounded-xl border bg-muted/20 p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4 text-primary" />
          {title || "متن"}
        </div>
        <div className="flex items-center gap-1">
          {editable && onSave && (
            <button
              onClick={() => {
                if (editing) { onSave(draft); setEditing(false); }
                else { setDraft(text); setEditing(true); }
              }}
              className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
            >
              {editing ? <Save className="w-3.5 h-3.5 text-primary" /> : <Edit2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {lines.length > maxLines && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline">
              {expanded ? "کم کن" : "بیشتر"}
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="min-h-[120px] text-sm"
          dir="rtl"
          autoFocus
        />
      ) : (
        <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap" dir="rtl">
          {displayText}
        </div>
      )}
    </div>
  );
}

// ─── Media Gallery ────────────────────────────────────────────────────────────

export function MediaGallery({
  items,
  className,
}: {
  items: Array<{
    type: "image" | "video" | "audio" | "text";
    src: string;
    title?: string;
    description?: string;
  }>;
  className?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              "relative rounded-xl border overflow-hidden aspect-square group transition-all",
              selected === i ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
            )}
          >
            {item.type === "image" && (
              <img src={item.src} alt={item.title || ""} className="w-full h-full object-cover" loading="lazy" />
            )}
            {item.type === "video" && (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <Video className="w-8 h-8 text-white/40" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
            {item.type === "audio" && (
              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                <Music className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {item.type === "text" && (
              <div className="w-full h-full bg-muted/50 flex items-center justify-center p-3">
                <div className="text-xs text-muted-foreground line-clamp-3 text-right" dir="rtl">
                  {item.description || item.title || "متن"}
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur p-1.5 text-[10px] text-white truncate">
              {item.title || "مدیا"}
            </div>
          </button>
        ))}
      </div>

      {/* Selected preview */}
      {selected !== null && (
        <div className="rounded-xl border overflow-hidden">
          {(() => {
            const item = items[selected];
            if (item.type === "image") return <ImagePreview src={item.src} alt={item.title} className="rounded-none border-0" />;
            if (item.type === "video") return <VideoPlayer src={item.src} title={item.title} className="rounded-none border-0" />;
            if (item.type === "audio") return <AudioPlayer src={item.src} title={item.title} className="rounded-none border-0" />;
            if (item.type === "text") return <TextPreview text={item.src} title={item.title} className="rounded-none border-0" />;
            return null;
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Media Preview Modal (single item) ────────────────────────────────────────

export function MediaPreviewModal({
  open,
  onClose,
  type,
  src,
  title,
}: {
  open: boolean;
  onClose: () => void;
  type: "image" | "video" | "audio" | "text";
  src: string;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{title || "پیش‌نمایش"}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          {type === "image" && (
            <div className="flex items-center justify-center bg-black/90 rounded-lg min-h-[300px]">
              <img src={src} alt={title || ""} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          )}
          {type === "video" && (
            <VideoPlayer src={src} title={title} className="rounded-lg border-0" />
          )}
          {type === "audio" && (
            <AudioPlayer src={src} title={title} className="rounded-lg border-0" />
          )}
          {type === "text" && (
            <TextPreview text={src} title={title} className="rounded-lg border-0" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
