"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SafeImage from "@/components/ui/safe-image";
import {
  Film,
  Mic,
  Music,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Check,
  Wand2,
  Download,
  Settings,
  FileVideo,
  Layers,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Magnet,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Loader2,
  VolumeX,
  ImageIcon,
  Monitor,
  Maximize2,
  LayoutGrid,
  Headphones,
  MessageSquare,
  GripVertical,
  Expand,
  Shrink,
  Clapperboard,
  Video,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, toPersianNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Timeline } from "@/components/video-editor/timeline";
import AudioStudio from "@/components/audio-studio/audio-studio";
import {
  type TimelineClip,
  type TimelineTrack,
  type MediaAsset,
  PIXELS_PER_SECOND,
  formatTimecode,
} from "@/lib/media-types";
import type { Assembly, Shot, AudioTrack, Narrative, DirectorBrief } from "@/lib/types";

type AssemblyTab = "timeline" | "audio";

interface AssemblyFlowProps {
  assembly: Assembly | null;
  shots: Shot[];
  projectId?: string;
  projectAspectRatio?: string;
  projectTitle?: string;
  narrative?: Narrative | null;
  directorBrief?: DirectorBrief | null;
  onUpdate: (updates: Partial<Assembly>) => void;
  onNext: () => void;
  onBack: () => void;
}

const VOICE_PRESETS = [
  { id: "narrator", label: "راوی (انگلیسی)" },
  { id: "persian_male", label: "مرد فارسی‌زبان" },
  { id: "persian_female", label: "زن فارسی‌زبان" },
];

function shotsToTracks(shots: Shot[], sfxTracks: AudioTrack[] = []): TimelineTrack[] {
  // ALL video/image clips go on ONE main video track, in story order
  const videoClips: TimelineClip[] = [];
  const dialogueClips: TimelineClip[] = [];
  const sfxClips: TimelineClip[] = [];
  let globalTime = 0;

  // Build shotId -> startTime mapping for SFX placement
  const shotStartTimes = new Map<number, number>();

  shots.forEach((shot, shotIndex) => {
    const imageUrl = shot.generatedImageUrl || shot.thumbnailUrl;
    const hasLipSync = !!shot.lipSyncUrl;
    const hasVideo = !!shot.generatedVideoUrl;
    const hasImage = !!imageUrl;
    const duration = shot.duration || 5;

    shotStartTimes.set(shot.id, globalTime);

    if (hasLipSync || hasVideo || hasImage) {
      const mediaAsset: MediaAsset = {
        id: `shot-${shot.id}`,
        projectId: String(shot.projectId),
        name: shot.title || `شات ${shotIndex + 1}`,
        type: hasLipSync || hasVideo ? "video" : "image",
        mimeType: hasLipSync || hasVideo ? "video/mp4" : "image/png",
        url: hasLipSync ? (shot.lipSyncUrl || "") : hasVideo ? (shot.generatedVideoUrl || "") : (imageUrl || ""),
        thumbnailUrl: imageUrl || null,
        size: 0,
        duration,
        width: 1920,
        height: 1080,
        createdAt: new Date().toISOString(),
        source: "generated",
        tags: shot.shotType ? [shot.shotType] : ["shot"],
        metadata: {
          shotType: shot.shotType,
          cameraAngle: shot.cameraAngle,
          sceneNumber: shot.sceneNumber,
          description: shot.description,
        },
      };

      videoClips.push({
        id: `clip-v-${shot.id}`,
        assetId: mediaAsset.id,
        asset: mediaAsset,
        startTime: globalTime,
        duration,
        inPoint: 0,
        outPoint: duration,
        trackIndex: 0,
        locked: false,
        muted: false,
        volume: 1,
        opacity: 1,
      });
    }

    if (shot.dialogueText) {
      const dialogueAsset: MediaAsset = {
        id: `dialogue-${shot.id}`,
        projectId: String(shot.projectId),
        name: `دیالوگ: ${shot.title || `شات ${shotIndex + 1}`}`,
        type: "audio",
        mimeType: "audio/mpeg",
        url: "",
        thumbnailUrl: null,
        size: 0,
        duration,
        width: null,
        height: null,
        createdAt: new Date().toISOString(),
        source: "generated",
        tags: ["dialogue"],
        metadata: { text: shot.dialogueText },
      };
      dialogueClips.push({
        id: `clip-a-${shot.id}`,
        assetId: dialogueAsset.id,
        asset: dialogueAsset,
        startTime: globalTime,
        duration,
        inPoint: 0,
        outPoint: duration,
        trackIndex: 1,
        locked: false,
        muted: false,
        volume: 1,
        opacity: 1,
      });
    }

    globalTime += duration;
  });

  // Auto-place shot-linked SFX clips on the SFX track
  sfxTracks
    .filter(t => t.shotId != null && t.generatedUrl && t.type === "sfx")
    .forEach(t => {
      const startTime = shotStartTimes.get(t.shotId!) ?? 0;
      const duration = t.duration || 5;
      const sfxAsset: MediaAsset = {
        id: `sfx-${t.id}`,
        projectId: String(t.projectId),
        name: t.label || t.textPrompt || `SFX ${t.id}`,
        type: "audio",
        mimeType: "audio/mpeg",
        url: t.generatedUrl || "",
        thumbnailUrl: null,
        size: 0,
        duration,
        width: null,
        height: null,
        createdAt: new Date().toISOString(),
        source: "generated",
        tags: ["sfx"],
        metadata: { shotId: t.shotId, prompt: t.textPrompt },
      };
      sfxClips.push({
        id: `clip-sfx-${t.id}`,
        assetId: sfxAsset.id,
        asset: sfxAsset,
        startTime,
        duration,
        inPoint: 0,
        outPoint: duration,
        trackIndex: 2,
        locked: false,
        muted: false,
        volume: 1,
        opacity: 1,
      });
    });

  return [
    { id: "video-main", name: "ویدیو اصلی", type: "video", locked: false, muted: false, visible: true, clips: videoClips },
    { id: "audio-dialogue", name: "دیالوگ", type: "audio", locked: false, muted: false, visible: true, clips: dialogueClips },
    { id: "audio-sfx", name: "افکت صوتی", type: "audio", locked: false, muted: false, visible: true, clips: sfxClips },
    { id: "audio-music", name: "موسیقی", type: "audio", locked: false, muted: false, visible: true, clips: [] },
  ];
}

const aspectRatioClass = (ratio?: string) => {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "4:3") return "aspect-[4/3]";
  if (ratio === "3:4") return "aspect-[3/4]";
  return "aspect-video";
};

function timelineDataToTracks(timelineData: import("@/lib/types").TimelineData, shots: Shot[]): TimelineTrack[] {
  const baseTracks = shotsToTracks(shots, []);
  const clips = timelineData.clips;
  if (!clips || clips.length === 0) return baseTracks;

  // Group clips by trackIndex
  const trackGroups: Record<number, typeof clips> = {};
  clips.forEach((c) => {
    const idx = c.trackIndex ?? 0;
    if (!trackGroups[idx]) trackGroups[idx] = [];
    trackGroups[idx].push(c);
  });

  // Build tracks from saved data, but resolve source URLs from shots when possible
  const resultTracks: TimelineTrack[] = [];
  const tracksMeta = timelineData.tracks || [
    { id: "video-main", name: "ویدیو اصلی", type: "video" },
    { id: "audio-dialogue", name: "دیالوگ", type: "audio" },
    { id: "audio-sfx", name: "افکت صوتی", type: "audio" },
    { id: "audio-music", name: "موسیقی", type: "audio" },
  ];

  Object.entries(trackGroups).forEach(([idxStr, trackClips]) => {
    const trackIndex = parseInt(idxStr, 10);
    const meta = tracksMeta[trackIndex] || tracksMeta[trackIndex] || { id: `track-${trackIndex}`, name: `Track ${trackIndex}`, type: "video" };
    const isAudio = meta.type === "audio";

    const timelineClips: TimelineClip[] = trackClips.map((c) => {
      const type = c.type === "audio" ? "audio" : c.type === "image" ? "image" : "video";
      const isVideoTrack = !isAudio;
      const shotMatch = c.sourceUrl?.match(/shot-(\d+)/);
      const shotId = shotMatch ? parseInt(shotMatch[1], 10) : null;
      const shot = shotId ? shots.find((s) => s.id === shotId) : null;

      const url = shot
        ? (shot.lipSyncUrl || shot.generatedVideoUrl || shot.generatedImageUrl || c.sourceUrl)
        : c.sourceUrl;
      const thumbnailUrl = shot?.generatedImageUrl || null;
      const duration = c.duration || 5;
      const name = c.label || shot?.title || (type === "video" ? "Clip" : "Audio");

      const asset: MediaAsset = {
        id: c.id,
        projectId: String(shot?.projectId || ""),
        name,
        type,
        mimeType: type === "audio" ? "audio/mpeg" : type === "video" ? "video/mp4" : "image/png",
        url: url || "",
        thumbnailUrl,
        size: 0,
        duration,
        width: type === "audio" ? null : 1920,
        height: type === "audio" ? null : 1080,
        createdAt: new Date().toISOString(),
        source: "generated",
        tags: shot?.shotType ? [shot.shotType] : [type],
        metadata: { shotId: shot?.id, sourceUrl: c.sourceUrl },
      };

      return {
        id: c.id,
        assetId: c.id,
        asset,
        startTime: c.startTime,
        duration,
        inPoint: c.inPoint ?? 0,
        outPoint: c.outPoint ?? duration,
        trackIndex,
        locked: false,
        muted: false,
        volume: c.volume ?? 1,
        opacity: 1,
      };
    });

    resultTracks.push({
      id: meta.id || `track-${trackIndex}`,
      name: meta.name || (isAudio ? "صدا" : "ویدیو"),
      type: isAudio ? "audio" : "video",
      locked: false,
      muted: false,
      visible: true,
      clips: timelineClips,
    });
  });

  // Ensure all base tracks exist even if empty
  return resultTracks.length > 0 ? resultTracks : baseTracks;
}

export function AssemblyFlow({ assembly, shots, projectId, projectAspectRatio, projectTitle, narrative, directorBrief, onUpdate, onNext, onBack }: AssemblyFlowProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AssemblyTab>("timeline");
  // Load saved timeline from assembly, or build from shots
  // DB stores as `timeline`, but type interface says `timelineData` — normalize both
  const savedTimeline = (assembly as any)?.timelineData ?? (assembly as any)?.timeline;
  const [tracks, setTracks] = useState<TimelineTrack[]>(() => {
    if (savedTimeline?.clips && savedTimeline.clips.length > 0) {
      return timelineDataToTracks(savedTimeline, shots);
    }
    return shotsToTracks(shots, []);
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const { toast } = useToast();

  // ── Export presets ──────────────────────────────────────────
  const [exportPreset, setExportPreset] = useState<"instagram" | "youtube" | "tiktok" | "custom">("youtube");
  const exportPresets: { id: typeof exportPreset; label: string; aspectRatio: string; width: number; fps: number }[] = [
    { id: "instagram", label: "اینستاگرام ریلز", aspectRatio: "9:16", width: 1080, fps: 30 },
    { id: "youtube",   label: "یوتیوب HD",     aspectRatio: "16:9", width: 1920, fps: 24 },
    { id: "tiktok",    label: "تیک‌تاک",        aspectRatio: "9:16", width: 1080, fps: 30 },
    { id: "custom",    label: "سفارشی",        aspectRatio: projectAspectRatio || "16:9", width: 1280, fps: 24 },
  ];

  // ── Undo / Redo ─────────────────────────────────────────────
  const [historyState, setHistoryState] = useState<{ stack: TimelineTrack[][]; index: number }>({ stack: [], index: -1 });
  const maxHistory = 50;

  function pushHistory(newTracks: TimelineTrack[]) {
    const snapshot = JSON.parse(JSON.stringify(newTracks)) as TimelineTrack[];
    setHistoryState(prev => {
      const nextStack = prev.stack.slice(0, prev.index + 1);
      nextStack.push(snapshot);
      if (nextStack.length > maxHistory) nextStack.shift();
      return { stack: nextStack, index: Math.min(prev.index + 1, maxHistory - 1) };
    });
  }

  function handleUndo() {
    if (historyState.index < 0) return;
    const newIndex = historyState.index - 1;
    if (newIndex >= 0) {
      setTracks(JSON.parse(JSON.stringify(historyState.stack[newIndex])));
    } else {
      setTracks(shotsToTracks(shots, audioTracksList));
    }
    setHistoryState(prev => ({ ...prev, index: newIndex }));
  }

  function handleRedo() {
    if (historyState.index >= historyState.stack.length - 1) return;
    const newIndex = historyState.index + 1;
    setTracks(JSON.parse(JSON.stringify(historyState.stack[newIndex])));
    setHistoryState(prev => ({ ...prev, index: newIndex }));
  }

  const canUndo = historyState.index >= 0;
  const canRedo = historyState.index < historyState.stack.length - 1;

  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("narrator");
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [sfxPrompt, setSfxPrompt] = useState("");
  const [sfxDuration, setSfxDuration] = useState(5);
  const [sfxGenerating, setSfxGenerating] = useState(false);

  // Context-menu action state
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [sfxDialogOpen, setSfxDialogOpen] = useState(false);
  const [ttsDialogOpen, setTtsDialogOpen] = useState(false);

  const [generatedAudioList, setGeneratedAudioList] = useState<Array<{ id: string; label: string; type: string; audioUrl: string; duration: number }>>([]);

  // Music generation state
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicDuration, setMusicDuration] = useState(30);
  const [musicGenre, setMusicGenre] = useState("cinematic");
  const [musicMood, setMusicMood] = useState("dramatic");
  const [musicGenerating, setMusicGenerating] = useState(false);
  const [musicAiLoading, setMusicAiLoading] = useState(false);
  const [musicAiResult, setMusicAiResult] = useState<{
    prompt: string;
    genre: string;
    mood: string;
    suggestedDuration: number;
    bpmRange: string;
    instrumentation: string[];
    sceneBreakdown: string;
  } | null>(null);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: audioTracksList = [] } = useQuery<AudioTrack[]>({
    queryKey: ['/api/projects', projectId, 'audio-tracks'],
    queryFn: () => fetch(`/api/projects/${projectId}/audio-tracks`).then(r => r.json()),
    enabled: !!projectId,
  });

  // Hydrate generatedAudioList from DB tracks when audioTracksList loads
  useEffect(() => {
    if (!audioTracksList.length) return;
    setGeneratedAudioList(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const dbEntries = audioTracksList
        .filter((t: AudioTrack) => t.generatedUrl && !existingIds.has(`db-${t.id}`))
        .map((t: AudioTrack) => ({
          id: `db-${t.id}`,
          label: t.label || t.textPrompt || (t as unknown as Record<string, string>).name || 'Track',
          type: t.type || 'music',
          audioUrl: t.generatedUrl || '',
          duration: t.duration || 5,
        }));
      return dbEntries.length > 0 ? [...prev, ...dbEntries] : prev;
    });
  }, [audioTracksList]);

  const prevAudioTracksRef = useRef<AudioTrack[]>([]);
  const hasUserEdits = useRef(false);

  useEffect(() => {
    if (shots.length === 0) return;
    const prev = prevAudioTracksRef.current;
    const changed =
      audioTracksList.length !== prev.length ||
      audioTracksList.some(
        (t, i) =>
          t.id !== prev[i]?.id ||
          t.generatedUrl !== prev[i]?.generatedUrl ||
          t.shotId !== prev[i]?.shotId
      );
    if (!changed) return;
    prevAudioTracksRef.current = audioTracksList;
    // Only rebuild if user hasn't manually edited the timeline (no saved timeline in DB)
    const saved = (assembly as any)?.timelineData ?? (assembly as any)?.timeline;
    if (saved?.clips && saved.clips.length > 0) {
      return;
    }
    setTracks(shotsToTracks(shots, audioTracksList));
  }, [shots, audioTracksList, assembly?.timelineData]);

  const duration = useMemo(() => {
    let maxEnd = 0;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        maxEnd = Math.max(maxEnd, clip.startTime + clip.duration);
      });
    });
    return Math.max(maxEnd, 10);
  }, [tracks]);

  // Auto-save timeline to backend after edits (2s debounce, stable onUpdate)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTracksRef = useRef<string>("");
  const tracksRef = useRef(tracks);
  const durationRef = useRef(duration);
  const onUpdateRef = useRef(onUpdate);
  tracksRef.current = tracks;
  durationRef.current = duration;
  onUpdateRef.current = onUpdate;
  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;

  const buildTimelineData = useCallback((): import("@/lib/types").TimelineData => {
    const currentTracks = tracksRef.current;
    return {
      clips: currentTracks.flatMap(t =>
        t.clips.map(c => ({
          id: c.id,
          type: c.asset.type as "video" | "image" | "audio",
          sourceUrl: c.asset.url,
          startTime: c.startTime,
          duration: c.duration,
          trackIndex: c.trackIndex,
          label: c.asset.name,
          inPoint: c.inPoint,
          outPoint: c.outPoint,
          volume: c.volume,
        }))
      ),
      duration: durationRef.current,
      fps: 30,
      tracks: currentTracks.map(t => ({ id: t.id, name: t.name, type: t.type })),
    };
  }, []);

  const handleManualSave = useCallback(async () => {
    const snapshot = JSON.stringify(tracksRef.current);
    setSaveStatus('saving');
    setSaveError(null);
    try {
      onUpdateRef.current({ timelineData: buildTimelineData() });
      lastSavedTracksRef.current = snapshot;
      setSaveStatus('saved');
      setTimeout(() => {
        if (saveStatusRef.current === 'saved') setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    }
  }, [buildTimelineData]);

  useEffect(() => {
    const snapshot = JSON.stringify(tracks);
    if (snapshot === lastSavedTracksRef.current) return;
    setSaveStatus('idle');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      const snap = JSON.stringify(tracksRef.current);
      setSaveStatus('saving');
      setSaveError(null);
      try {
        onUpdateRef.current({ timelineData: buildTimelineData() });
        lastSavedTracksRef.current = snap;
        setSaveStatus('saved');
        setTimeout(() => {
          if (saveStatusRef.current === 'saved') setSaveStatus('idle');
        }, 3000);
      } catch (err) {
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'Auto-save failed');
      }
    }, 2000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [tracks, buildTimelineData]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleSkipBack = useCallback(() => { setCurrentTime(0); setIsPlaying(false); }, []);
  const handleSkipForward = useCallback(() => { setCurrentTime(duration); setIsPlaying(false); }, [duration]);
  const handleTimeChange = useCallback((time: number) => setCurrentTime(time), []);
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev * 1.25, 10)), []);
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev / 1.25, 0.5)), []);

  const handleClipSelect = useCallback((clipId: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedClipIds(prev =>
        prev.includes(clipId) ? prev.filter(id => id !== clipId) : [...prev, clipId]
      );
    } else {
      setSelectedClipIds([clipId]);
    }
  }, []);

  const handleClipMove = useCallback((clipId: string, newStartTime: number, newTrackIndex: number, sourceTrackIndex?: number) => {
    setTracks(prev => {
      const sourceTrack = sourceTrackIndex != null ? prev[sourceTrackIndex] : prev.find(t => t.clips.some(c => c.id === clipId));
      const targetTrack = prev[newTrackIndex];
      if (!sourceTrack || !targetTrack) return prev;

      // Enforce type compatibility: video/image/overlay clips only on video/overlay tracks, audio clips only on audio tracks
      const clip = sourceTrack.clips.find(c => c.id === clipId);
      if (!clip) return prev;
      const isAudioClip = clip.asset.type === "audio";
      const isAudioTrack = targetTrack.type === "audio";
      const isVisualTrack = targetTrack.type === "video" || targetTrack.type === "overlay";
      if (isAudioClip && !isAudioTrack) return prev;
      if (!isAudioClip && !isVisualTrack) return prev;

      const sameTrack = sourceTrack.id === targetTrack.id;
      if (sameTrack) {
        return prev.map(track =>
          track.id === targetTrack.id
            ? { ...track, clips: track.clips.map(c => c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime) } : c) }
            : track
        );
      }
      // Cross-track move: remove from source, add to target
      return prev.map(track => {
        if (track.id === sourceTrack.id) {
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
        }
        if (track.id === targetTrack.id) {
          return { ...track, clips: [...track.clips, { ...clip, startTime: Math.max(0, newStartTime), trackIndex: newTrackIndex }] };
        }
        return track;
      });
    });
  }, []);

  const handleClipTrim = useCallback((clipId: string, edge: "start" | "end", newValue: number) => {
    setTracks(prev =>
      prev.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id !== clipId) return clip;
          if (edge === "start") {
            const newInPoint = Math.max(0, Math.min(newValue, clip.outPoint - 0.1));
            const deltaTime = newInPoint - clip.inPoint;
            return { ...clip, inPoint: newInPoint, startTime: clip.startTime + deltaTime, duration: clip.duration - deltaTime };
          } else {
            const newOutPoint = Math.max(clip.inPoint + 0.1, newValue);
            return { ...clip, outPoint: newOutPoint, duration: newOutPoint - clip.inPoint };
          }
        }),
      }))
    );
  }, []);

  const handleClipDelete = useCallback((clipId: string) => {
    pushHistory(tracks);
    setTracks(prev => prev.map(track => ({ ...track, clips: track.clips.filter(c => c.id !== clipId) })));
    setSelectedClipIds(prev => prev.filter(id => id !== clipId));
  }, [tracks]);

  const handleClipRename = useCallback((clipId: string, newName: string) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, asset: { ...clip.asset, name: newName } } : clip
      ),
    })));
  }, []);

  const handleAddTrack = useCallback((type: "video" | "audio" | "overlay") => {
    pushHistory(tracks);
    const id = `track-${type}-${Date.now()}`;
    const countOf = (t: typeof type) => tracks.filter(tr => tr.type === t).length;
    const name = type === "video"
      ? `ویدیو ${countOf("video") + 1}`
      : type === "audio"
        ? `صدا ${countOf("audio") + 1}`
        : `پوشش ${countOf("overlay") + 1}`;
    setTracks(prev => [...prev, { id, name, type, locked: false, muted: false, visible: true, clips: [] }]);
  }, [tracks]);

  const handleTrackRename = useCallback((trackId: string, newName: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, name: newName } : t));
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => setZoom(newZoom), []);

  const handleClipDuplicate = useCallback((clipId: string) => {
    pushHistory(tracks);
    setTracks(prev =>
      prev.map(track => {
        const clip = track.clips.find(c => c.id === clipId);
        if (!clip) return track;
        const newClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startTime: clip.startTime + clip.duration,
        };
        return { ...track, clips: [...track.clips, newClip] };
      })
    );
  }, [tracks]);

  const handleClipSplit = useCallback((clipId: string, time: number) => {
    pushHistory(tracks);
    setTracks(prev =>
      prev.map(track => {
        const clipIndex = track.clips.findIndex(c => c.id === clipId);
        if (clipIndex === -1) return track;
        const clip = track.clips[clipIndex];
        if (time <= clip.startTime || time >= clip.startTime + clip.duration) return track;
        const splitPoint = time - clip.startTime;
        const firstClip: TimelineClip = { ...clip, duration: splitPoint, outPoint: clip.inPoint + splitPoint };
        const secondClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startTime: time, duration: clip.duration - splitPoint, inPoint: clip.inPoint + splitPoint,
        };
        const newClips = [...track.clips];
        newClips.splice(clipIndex, 1, firstClip, secondClip);
        return { ...track, clips: newClips };
      })
    );
  }, [tracks]);

  const handleTrackToggleLock = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t));
  }, []);
  const handleTrackToggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  }, []);
  const handleTrackToggleVisible = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, visible: !t.visible } : t));
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
    pushHistory(tracks);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, clips: [...t.clips, newClip] } : t));
    setSelectedClipIds([newClip.id]);
  }, [tracks]);

  const getCurrentClip = useCallback(() => {
    for (const track of tracks) {
      if (track.type !== "video") continue;
      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          return clip;
        }
      }
    }
    return null;
  }, [tracks, currentTime]);

  const currentClip = getCurrentClip();

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) { setIsPlaying(false); return 0; }
          return prev + 0.033;
        });
      }, 33);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, duration]);

  // ── Audio playback engine ─────────────────────────────────────────────
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!isPlaying || isMuted) {
      // Pause everything and reset when stopped or globally muted
      audioRefs.current.forEach((a) => { a.pause(); a.currentTime = 0; });
      audioRefs.current.clear();
      return;
    }

    const activeClipIds = new Set<string>();
    for (const track of tracks) {
      if (track.type !== "audio" || track.muted) continue;
      for (const clip of track.clips) {
        if (clip.muted) continue;
        const clipEnd = clip.startTime + clip.duration;
        if (currentTime >= clip.startTime && currentTime < clipEnd) {
          activeClipIds.add(clip.id);
          let audio = audioRefs.current.get(clip.id);
          if (!audio) {
            audio = new Audio(clip.asset.url);
            audioRefs.current.set(clip.id, audio);
          }
          const targetTime = currentTime - clip.startTime;
          // Seek if drift is significant (scrub or loop jump)
          if (Math.abs(audio.currentTime - targetTime) > 0.3) {
            audio.currentTime = Math.max(0, targetTime);
          }
          audio.volume = Math.max(0, Math.min(1, (clip.volume ?? 1)));
          if (audio.paused) {
            audio.play().catch(() => {});
          }
        }
      }
    }

    // Stop clips that fell out of the playhead range
    Array.from(audioRefs.current.entries()).forEach(([clipId, audio]) => {
      if (!activeClipIds.has(clipId)) {
        audio.pause();
        audio.currentTime = 0;
        audioRefs.current.delete(clipId);
      }
    });
  }, [currentTime, isPlaying, tracks, isMuted]);

  // Cleanup all audio on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach((a) => { a.pause(); a.src = ""; });
      audioRefs.current.clear();
    };
  }, []);

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

  // Sync video element with play state and timeline currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentClip?.asset.type !== "video") return;
    if (isPlaying) {
      video.currentTime = currentTime - (currentClip?.startTime || 0);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, currentClip]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentClip?.asset.type !== "video" || isPlaying) return;
    video.currentTime = Math.max(0, currentTime - (currentClip?.startTime || 0));
  }, [currentTime, currentClip, isPlaying]);

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsGenerating(true);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voicePreset: ttsVoice }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('TTS error:', data.error);
        return;
      }
      if (data.audioBase64) {
        const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;
        const newEntry = {
          id: `tts-${Date.now()}`,
          label: ttsText.slice(0, 40) + (ttsText.length > 40 ? '...' : ''),
          type: 'dialogue',
          audioUrl,
          duration: 5,
        };
        setGeneratedAudioList(prev => [...prev, newEntry]);

        if (projectId) {
          await fetch(`/api/projects/${projectId}/audio-tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dialogue',
              label: newEntry.label,
              textPrompt: ttsText,
              voiceId: ttsVoice,
              generatedUrl: audioUrl,
              status: 'completed',
            }),
          });
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'audio-tracks'] });
        }
        setTtsText("");
      }
    } catch (error) {
      console.error('TTS generation failed:', error);
    } finally {
      setTtsGenerating(false);
    }
  };

  const handleGenerateSFX = async () => {
    if (!sfxPrompt.trim()) return;
    setSfxGenerating(true);
    try {
      const res = await fetch('/api/ai/sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sfxPrompt,
          durationSeconds: sfxDuration,
          directorBrief: directorBrief || null,
          sceneVisualIdentity: directorBrief?.sceneVisualIdentities?.[0] || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('SFX error:', data.error);
        return;
      }
      if (data.audioBase64) {
        const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;
        const newEntry = {
          id: `sfx-${Date.now()}`,
          label: sfxPrompt.slice(0, 40) + (sfxPrompt.length > 40 ? '...' : ''),
          type: 'sfx',
          audioUrl,
          duration: sfxDuration,
        };
        setGeneratedAudioList(prev => [...prev, newEntry]);

        if (projectId) {
          await fetch(`/api/projects/${projectId}/audio-tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'sfx',
              label: newEntry.label,
              textPrompt: sfxPrompt,
              generatedUrl: audioUrl,
              duration: sfxDuration,
              status: 'completed',
            }),
          });
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'audio-tracks'] });
        }
        setSfxPrompt("");
      }
    } catch (error) {
      console.error('SFX generation failed:', error);
    } finally {
      setSfxGenerating(false);
    }
  };

  const handleAiGenerateMusicPrompt = async () => {
    setMusicAiLoading(true);
    try {
      const res = await fetch('/api/ai/music-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          logline: narrative?.logline || '',
          script: narrative?.script || '',
          directorBrief: directorBrief || {},
          filmDuration: totalDurationSec,
          sceneVisualIdentity: directorBrief?.sceneVisualIdentities?.[0] || null,
          visualArc: directorBrief?.visualArc || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('AI music prompt error:', data.error);
        return;
      }
      setMusicAiResult(data);
      setMusicPrompt(data.prompt || '');
      setMusicGenre(data.genre || 'cinematic');
      setMusicMood(data.mood || 'dramatic');
      setMusicDuration(data.suggestedDuration || 30);
    } catch (error) {
      console.error('AI music prompt generation failed:', error);
    } finally {
      setMusicAiLoading(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) return;
    setMusicGenerating(true);
    try {
      const res = await fetch('/api/audio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt.trim(),
          musicLengthMs: musicDuration * 1000,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Music generation error:', data.error);
        return;
      }
      if (data.audioBase64) {
        const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;
        const newEntry = {
          id: `music-${Date.now()}`,
          label: `موسیقی ${musicGenre} - ${musicMood} (${musicDuration}s)`,
          type: 'music',
          audioUrl,
          duration: data.duration || musicDuration,
        };
        setGeneratedAudioList(prev => [...prev, newEntry]);

        if (projectId) {
          await fetch(`/api/projects/${projectId}/audio-tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'music',
              label: newEntry.label,
              textPrompt: musicPrompt,
              generatedUrl: audioUrl,
              duration: data.duration || musicDuration,
              status: 'completed',
            }),
          });
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'audio-tracks'] });
        }
      }
    } catch (error) {
      console.error('Music generation failed:', error);
    } finally {
      setMusicGenerating(false);
    }
  };

  const handleAddAudioToTimeline = (audio: typeof generatedAudioList[0]) => {
    pushHistory(tracks);
    // Locate target audio track by semantic id/name, not positional index
    const preferredId = audio.type === "sfx" ? "audio-sfx" : audio.type === "music" ? "audio-music" : "audio-dialogue";
    const preferredName = audio.type === "sfx" ? "افکت صوتی" : audio.type === "music" ? "موسیقی" : "دیالوگ";
    const targetTrackIndex = (() => {
      // 1st choice: matching semantic id
      let idx = tracks.findIndex(t => t.id === preferredId);
      if (idx !== -1) return idx;
      // 2nd choice: any audio track whose name matches
      idx = tracks.findIndex(t => t.type === "audio" && t.name === preferredName);
      if (idx !== -1) return idx;
      // 3rd choice: any audio track
      idx = tracks.findIndex(t => t.type === "audio");
      return idx;
    })();

    if (targetTrackIndex === -1) return;
    const track = tracks[targetTrackIndex];

    const lastClipEnd = track.clips.length > 0
      ? Math.max(...track.clips.map(c => c.startTime + c.duration))
      : 0;

    const mediaAsset: MediaAsset = {
      id: audio.id,
      projectId: projectId || "default",
      name: audio.label,
      type: "audio",
      mimeType: "audio/mpeg",
      url: audio.audioUrl,
      thumbnailUrl: null,
      size: 0,
      duration: audio.duration,
      width: null,
      height: null,
      createdAt: new Date().toISOString(),
      source: "generated",
      tags: [audio.type],
      metadata: {},
    };

    const newClip: TimelineClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: mediaAsset.id,
      asset: mediaAsset,
      startTime: lastClipEnd,
      duration: audio.duration,
      inPoint: 0,
      outPoint: audio.duration,
      trackIndex: targetTrackIndex,
      locked: false,
      muted: false,
      volume: 1,
      opacity: 1,
    };

    setTracks(prev => prev.map((t, i) =>
      i === targetTrackIndex ? { ...t, clips: [...t.clips, newClip] } : t
    ));
  };

  const handleSaveAndContinue = () => {
    const timelineDataObj: import("@/lib/types").TimelineData = {
      clips: tracks.flatMap(t =>
        t.clips.map(c => ({
          id: c.id,
          type: c.asset.type as "video" | "image" | "audio",
          sourceUrl: c.asset.url,
          startTime: c.startTime,
          duration: c.duration,
          trackIndex: c.trackIndex,
          label: c.asset.name,
          inPoint: c.inPoint,
          outPoint: c.outPoint,
        }))
      ),
      duration,
      fps: 30,
      tracks: tracks.map(t => ({ id: t.id, name: t.name, type: t.type })),
    };
    onUpdate({ timelineData: timelineDataObj });
    onNext();
  };

  const [saveLoading, setSaveLoading] = useState(false);

  const handleSaveAndRender = async () => {
    const preset = exportPresets.find(p => p.id === exportPreset) || exportPresets[1];
    const timelineDataObj: import("@/lib/types").TimelineData = {
      clips: tracks.flatMap(t =>
        t.clips.map(c => ({
          id: c.id,
          type: c.asset.type as "video" | "image" | "audio",
          sourceUrl: c.asset.url,
          startTime: c.startTime,
          duration: c.duration,
          trackIndex: c.trackIndex,
          label: c.asset.name,
          inPoint: c.inPoint,
          outPoint: c.outPoint,
        }))
      ),
      duration,
      fps: 30,
      tracks: tracks.map(t => ({ id: t.id, name: t.name, type: t.type })),
    };
    setSaveLoading(true);
    try {
      // Save timeline + export preset
      await Promise.all([
        new Promise<void>((resolve) => {
          onUpdate({
            timelineData: timelineDataObj,
            exportSettings: {
              preset: exportPreset,
              ...preset,
            },
            status: "draft",
          });
          resolve();
        }),
      ]);
      // Force immediate ref-based save if needed
      lastSavedTracksRef.current = JSON.stringify(tracks);
      onNext();
    } catch (err) {
      console.error("Save failed:", err);
      alert("خطا در ذخیره‌سازی تایملاین");
    } finally {
      setSaveLoading(false);
    }
  };

  const shotsWithMedia = shots.filter(s => s.lipSyncUrl || s.generatedVideoUrl || s.generatedImageUrl || s.thumbnailUrl);
  const totalDurationSec = shotsWithMedia.reduce((sum, s) => sum + (s.duration || 5), 0);

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl stage-icon-assembly flex items-center justify-center shadow-lg">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" data-testid="text-assembly-title">استودیوی مونتاژ</h2>
              <p className="text-sm text-muted-foreground">ترکیب عناصر صوتی و تصویری</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {toPersianNumber(shotsWithMedia.length)} کلیپ
            </Badge>
            <Badge variant="outline" className="text-xs">
              {toPersianNumber(Math.round(totalDurationSec))} ثانیه
            </Badge>
            <Badge variant="assembly">مرحله ۶ از ۷</Badge>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AssemblyTab)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 mb-4 w-fit">
          <TabsTrigger value="timeline" className="gap-2" data-testid="tab-timeline">
            <Layers className="w-4 h-4" />
            تایم‌لاین
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-2" data-testid="tab-audio">
            <Mic className="w-4 h-4" />
            صدا و موسیقی
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1">
          <Card className="border-card-border overflow-visible">
            <CardContent className="p-0">
              {/* Save status bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <span className="text-[11px] text-primary flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> در حال ذخیره...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                      <Check className="w-3 h-3" /> ذخیره شد
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {saveError || "خطا در ذخیره"}
                    </span>
                  )}
                  {saveStatus === 'idle' && (
                    <span className="text-[11px] text-muted-foreground/60">
                      تغییرات به صورت خودکار ذخیره می‌شود
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  onClick={handleManualSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  ذخیره
                </Button>
              </div>
              {shotsWithMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Film className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">هنوز ویدیویی تولید نشده</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    ابتدا در مراحل قبل تصاویر و ویدیوهای شات‌ها را تولید کنید تا اینجا قابل مونتاژ باشند
                  </p>
                  <Button onClick={onBack} className="gap-2" data-testid="button-back-to-storyboard">
                    <ChevronRight className="w-4 h-4" />
                    بازگشت به استوری‌بورد
                  </Button>
                </div>
              ) : (
                <div className="flex flex-row overflow-hidden">
                  {/* Media Pool — left sidebar */}
                  <div className="flex-shrink-0 border-l border-border/30 overflow-y-auto" style={{ width: "200px", background: "#0a0a0f", maxHeight: "calc(100vh - 280px)" }}>
                    <div className="p-2 border-b border-border/20 flex items-center gap-1.5 sticky top-0 z-10" style={{ background: "#0d0d1e" }}>
                      <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[10px] font-medium text-sky-400">رسانه منابع</span>
                    </div>
                    <div className="p-2 space-y-3">
                      {/* Video/Image shots */}
                      {shotsWithMedia.length > 0 && (
                        <div>
                          <p className="text-[9px] font-medium text-white/40 mb-1.5 flex items-center gap-1">
                            <Film className="w-3 h-3" /> شات‌ها
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {shotsWithMedia.map(shot => {
                              const imageUrl = shot.generatedImageUrl || shot.thumbnailUrl;
                              const hasVideo = !!shot.generatedVideoUrl;
                              const duration = shot.duration || 5;
                              const asset: MediaAsset = {
                                id: `shot-${shot.id}`,
                                projectId: String(shot.projectId),
                                name: shot.title || `شات ${shot.id}`,
                                type: hasVideo ? "video" : "image",
                                mimeType: hasVideo ? "video/mp4" : "image/png",
                                url: hasVideo ? (shot.generatedVideoUrl || "") : (imageUrl || ""),
                                thumbnailUrl: imageUrl || null,
                                size: 0,
                                duration,
                                width: 1920,
                                height: 1080,
                                createdAt: new Date().toISOString(),
                                source: "generated",
                                tags: shot.shotType ? [shot.shotType] : ["shot"],
                                metadata: {},
                              };
                              return (
                                <div
                                  key={shot.id}
                                  className="group relative rounded-md overflow-hidden border border-white/5 cursor-grab hover:border-sky-500/40 transition-colors"
                                  draggable
                                  onClick={() => setPreviewAsset(asset)}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("application/json", JSON.stringify(asset));
                                  }}
                                >
                                  <div className="relative aspect-video">
                                    {imageUrl ? (
                                      <SafeImage src={imageUrl} alt={shot.title || ""} fill className="object-cover" sizes="100px" />
                                    ) : (
                                      <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <Film className="w-4 h-4 text-white/20" />
                                      </div>
                                    )}
                                    {hasVideo && (
                                      <div className="absolute bottom-0.5 left-0.5 bg-blue-500/80 rounded px-1 py-px text-[8px] text-white font-medium flex items-center gap-0.5">
                                        <Play className="w-2 h-2" fill="currentColor" /> ویدیو
                                      </div>
                                    )}
                                    <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <GripVertical className="w-3 h-3 text-white/60" />
                                    </div>
                                  </div>
                                  <div className="px-1 py-0.5 bg-black/60">
                                    <p className="text-[8px] truncate text-white/70">{shot.title || `شات ${shot.id}`}</p>
                                    <p className="text-[8px] text-white/40 font-mono" dir="ltr">{duration}s</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Audio items */}
                      {(generatedAudioList.length > 0 || audioTracksList.length > 0) && (
                        <div>
                          <p className="text-[9px] font-medium text-white/40 mb-1.5 flex items-center gap-1">
                            <Headphones className="w-3 h-3" /> صداها
                          </p>
                          <div className="space-y-1">
                            {generatedAudioList.map(item => {
                              const asset: MediaAsset = {
                                id: item.id,
                                projectId: projectId || "",
                                name: item.label,
                                type: "audio",
                                mimeType: "audio/mpeg",
                                url: item.audioUrl,
                                thumbnailUrl: null,
                                size: 0,
                                duration: item.duration,
                                width: null,
                                height: null,
                                createdAt: new Date().toISOString(),
                                source: "generated",
                                tags: [item.type],
                                metadata: {},
                              };
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 p-1.5 rounded-md border border-white/5 cursor-grab hover:border-green-500/40 transition-colors"
                                  draggable
                                  onClick={() => setPreviewAsset(asset)}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("application/json", JSON.stringify(asset));
                                  }}
                                >
                                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: item.type === "music" ? "rgba(245,158,11,0.15)" : item.type === "dialogue" ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.15)" }}>
                                    <Music className="w-3 h-3" style={{ color: item.type === "music" ? "#f59e0b" : item.type === "dialogue" ? "#3b82f6" : "#22c55e" }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] truncate text-white/70">{item.label}</p>
                                    <p className="text-[8px] text-white/40 font-mono" dir="ltr">{item.duration}s</p>
                                  </div>
                                  <GripVertical className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
                                </div>
                              );
                            })}
                            {audioTracksList
                              .filter((t: AudioTrack) => t.generatedUrl && !generatedAudioList.some(g => g.id === `db-${t.id}`))
                              .map((t: AudioTrack) => {
                                const duration = t.duration || 5;
                                const asset: MediaAsset = {
                                  id: `db-${t.id}`,
                                  projectId: projectId || "",
                                  name: t.label || t.textPrompt || `صدا ${t.id}`,
                                  type: "audio",
                                  mimeType: "audio/mpeg",
                                  url: t.generatedUrl || "",
                                  thumbnailUrl: null,
                                  size: 0,
                                  duration,
                                  width: null,
                                  height: null,
                                  createdAt: new Date().toISOString(),
                                  source: "generated",
                                  tags: [t.type || "audio"],
                                  metadata: {},
                                };
                                return (
                                  <div
                                    key={`db-${t.id}`}
                                    className="flex items-center gap-2 p-1.5 rounded-md border border-white/5 cursor-grab hover:border-green-500/40 transition-colors"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("application/json", JSON.stringify(asset));
                                    }}
                                  >
                                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)" }}>
                                      <Music className="w-3 h-3 text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] truncate text-white/70">{t.label || t.textPrompt || `صدا ${t.id}`}</p>
                                      <p className="text-[8px] text-white/40 font-mono" dir="ltr">{duration}s</p>
                                    </div>
                                    <GripVertical className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline + Preview area */}
                  <div className="flex flex-col flex-1 min-w-0">
                    {/* Preview Monitor */}
                  <div
                    className={cn(
                      "relative bg-black flex items-center justify-center transition-all",
                      previewExpanded ? "fixed inset-0 z-[200]" : ""
                    )}
                    style={previewExpanded ? {} : { minHeight: "240px", maxHeight: "360px" }}
                    data-testid="monitor-preview"
                  >
                    {/* Expand / collapse toggle */}
                    <button
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                      onClick={() => setPreviewExpanded(p => !p)}
                      title={previewExpanded ? "بستن تمام‌صفحه" : "تمام‌صفحه"}
                    >
                      {previewExpanded ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                    </button>

                    {/* Clear preview selection when expanded or clicking the empty space */}
                    {previewAsset && (
                      <button
                        className="absolute top-3 left-14 z-20 w-8 h-8 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                        onClick={() => setPreviewAsset(null)}
                        title="بازگشت به پیش‌نمایش خطی"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                    )}

                    {(previewAsset || currentClip) ? (
                      (() => {
                        const displayAsset = previewAsset || currentClip!.asset;
                        const isVideo = displayAsset.type === "video" && displayAsset.url;
                        const isAudio = displayAsset.type === "audio";
                        return (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className={cn(
                              `relative ${aspectRatioClass(projectAspectRatio)} w-full`,
                              previewExpanded ? "max-w-4xl max-h-[80vh]" : (projectAspectRatio === "9:16" ? "max-h-[560px]" : "max-w-2xl max-h-[320px]")
                            )}>
                              {isVideo ? (
                                <video
                                  ref={previewAsset ? undefined : videoRef}
                                  src={displayAsset.url}
                                  className="w-full h-full object-contain"
                                  muted={isMuted}
                                  playsInline
                                  autoPlay={isPlaying && !previewAsset}
                                  onEnded={() => setIsPlaying(false)}
                                />
                              ) : isAudio ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ minHeight: previewExpanded ? "400px" : "180px" }}>
                                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                                    <Music className="w-10 h-10 text-green-400" />
                                  </div>
                                  <p className="text-white/70 text-sm font-medium">{displayAsset.name}</p>
                                  <audio
                                    src={displayAsset.url}
                                    controls
                                    className="w-48"
                                    style={{ filter: "invert(1)" }}
                                  />
                                </div>
                              ) : displayAsset.thumbnailUrl || displayAsset.url ? (
                                <SafeImage
                                  src={displayAsset.thumbnailUrl || displayAsset.url}
                                  alt={displayAsset.name}
                                  fill
                                  className="object-contain"
                                  sizes={previewExpanded ? "80vw" : "60vw"}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-16 h-16 text-white/10" />
                                </div>
                              )}
                              {displayAsset.type === "image" && (
                                <div className="absolute top-3 left-3">
                                  <Badge variant="outline" className="bg-black/60 text-white/80 border-white/20 text-[10px]">
                                    <ImageIcon className="w-3 h-3 ml-1" />
                                    فوتورمان
                                  </Badge>
                                </div>
                              )}
                              {isVideo && (
                                <div className="absolute top-3 left-3">
                                  <Badge variant="outline" className="bg-blue-500/60 text-white/90 border-blue-400/30 text-[10px]">
                                    <FileVideo className="w-3 h-3 ml-1" />
                                    ویدیو
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-white/90 text-sm truncate">
                                  {displayAsset.name}
                                  {previewAsset && <span className="text-white/50 text-xs ml-2">(پیش‌نمایش رسانه)</span>}
                                </div>
                                <div className="flex items-center gap-3 text-white/70 text-xs font-mono flex-shrink-0" dir="ltr">
                                  <span>{formatTimecode(currentTime)}</span>
                                  <span className="text-white/40">/</span>
                                  <span>{formatTimecode(duration)}</span>
                                </div>
                              </div>
                              {!previewAsset && (
                                <div className="mt-2">
                                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all duration-100"
                                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-white/30">
                        <Monitor className="w-12 h-12 mb-3" />
                        <p className="text-sm">مانیتور پیش‌نمایش</p>
                        <p className="text-xs mt-1 font-mono" dir="ltr">{formatTimecode(currentTime)} / {formatTimecode(duration)}</p>
                        <p className="text-[10px] mt-2 text-white/20">روی یک رسانه در منبع کلیک کنید</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 py-3 px-4 border-b border-border/30 bg-card/50">
                    <Button variant="ghost" size="icon" onClick={handleSkipBack} data-testid="button-skip-back">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={isPlaying ? handlePause : handlePlay}
                      data-testid="button-play-pause"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSkipForward} data-testid="button-skip-forward">
                      <SkipForward className="w-4 h-4" />
                    </Button>

                    <div className="w-px h-6 bg-border/50 mx-2" />

                    <span className="text-sm font-mono text-muted-foreground min-w-[100px] text-center" dir="ltr">
                      {formatTimecode(currentTime)} / {formatTimecode(duration)}
                    </span>

                    <div className="w-px h-6 bg-border/50 mx-2" />

                    <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>

                    <div className="flex-1" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleUndo}
                          disabled={!canUndo}
                          data-testid="button-undo"
                        >
                          <Undo2 className={cn("w-4 h-4", canUndo ? "text-foreground" : "text-muted-foreground/30")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>واگرد (Ctrl+Z)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRedo}
                          disabled={!canRedo}
                          data-testid="button-redo"
                        >
                          <Redo2 className={cn("w-4 h-4", canRedo ? "text-foreground" : "text-muted-foreground/30")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>بازگردانی (Ctrl+Shift+Z)</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-6 bg-border/50 mx-2" />

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

                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="کوچک‌نمایی (Ctrl+scroll)">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <div className="w-20">
                        <Slider
                          value={[zoom]}
                          onValueChange={([v]) => setZoom(v)}
                          min={0.25}
                          max={4}
                          step={0.05}
                          className="h-1"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="بزرگ‌نمایی">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-[11px] font-mono text-muted-foreground min-w-[36px] text-center" dir="ltr">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const totalDuration = tracks.reduce((max, t) =>
                              Math.max(max, t.clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 0)), 0);
                            if (totalDuration > 0) setZoom(Math.min(4, Math.max(0.25, 600 / (totalDuration * 50))));
                          }}
                          data-testid="button-fit-to-window"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>متناسب با پنجره</TooltipContent>
                    </Tooltip>
                  </div>

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
                    onClipRename={handleClipRename}
                    onClipRegenerate={(clipId) => {
                      const clip = tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                      if (!clip) return;
                      const shotIdMatch = clip.assetId.match(/shot-(\d+)/);
                      const shotId = shotIdMatch ? parseInt(shotIdMatch[1], 10) : null;
                      if (!shotId) {
                        toast({ title: "تولید مجدد ناممکن", description: "این کلیپ به شات پیوند ندارد", variant: "destructive" });
                        return;
                      }
                      setActiveClipId(clipId);
                      // Open generate-video dialog for this shot
                      const shot = shots.find(s => s.id === shotId);
                      if (shot) {
                        toast({ title: "تولید مجدد ویدیو", description: `شات ${shot.title || shotId} در حال تولید...`, variant: "default" });
                        // Trigger parent generation via custom event
                        window.dispatchEvent(new CustomEvent('assembly:regenerate-video', { detail: { shotId } }));
                      }
                    }}
                    onClipAddSFX={(clipId) => { setActiveClipId(clipId); setSfxDialogOpen(true); }}
                    onClipAddDialogue={(clipId) => { setActiveClipId(clipId); setTtsDialogOpen(true); }}
                    onClipSpeed={(clipId, speed) => {
                      setTracks(prev => prev.map(track => ({
                        ...track,
                        clips: track.clips.map(c =>
                          c.id === clipId ? { ...c, speed, duration: (c.asset.duration || c.duration) / speed } : c
                        ),
                      })));
                    }}
                    onClipVolume={(clipId, volume) => {
                      setTracks(prev => prev.map(track => ({
                        ...track,
                        clips: track.clips.map(c =>
                          c.id === clipId ? { ...c, volume } : c
                        ),
                      })));
                    }}
                    onTrackRename={handleTrackRename}
                    onTrackToggleLock={handleTrackToggleLock}
                    onTrackToggleMute={handleTrackToggleMute}
                    onTrackToggleVisible={handleTrackToggleVisible}
                    onAssetDrop={handleAssetDrop}
                    onAddTrack={handleAddTrack}
                    onZoomChange={handleZoomChange}
                    snapEnabled={snapEnabled}
                    className="min-h-[320px]"
                  />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="flex-1 min-h-0 overflow-hidden">
          <AudioStudio
            projectId={projectId || "default"}
            projectTitle={projectTitle}
            shots={shots}
            narrative={narrative}
            directorBrief={directorBrief}
            onAddToTimeline={(audio, placement) => {
              pushHistory(tracks);
              const preferredId = audio.type === "sfx" ? "audio-sfx" : audio.type === "music" ? "audio-music" : "audio-dialogue";
              const preferredName = audio.type === "sfx" ? "افکت صوتی" : audio.type === "music" ? "موسیقی" : "دیالوگ";
              const targetTrackIndex = (() => {
                let idx = tracks.findIndex(t => t.id === preferredId);
                if (idx !== -1) return idx;
                idx = tracks.findIndex(t => t.type === "audio" && t.name === preferredName);
                if (idx !== -1) return idx;
                idx = tracks.findIndex(t => t.type === "audio");
                return idx;
              })();
              if (targetTrackIndex === -1) return;
              const track = tracks[targetTrackIndex];
              const startTime = placement?.startTime ?? (track.clips.length > 0
                ? Math.max(...track.clips.map(c => c.startTime + c.duration))
                : 0);
              const mediaAsset: MediaAsset = {
                id: audio.id,
                projectId: projectId || "default",
                name: audio.label,
                type: "audio",
                mimeType: "audio/mpeg",
                url: audio.audioUrl,
                thumbnailUrl: null,
                size: 0,
                duration: audio.duration,
                width: null,
                height: null,
                createdAt: new Date().toISOString(),
                source: "generated",
                tags: [audio.type],
                metadata: audio.metadata || {},
              };
              const newClip: TimelineClip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                assetId: mediaAsset.id,
                asset: mediaAsset,
                startTime,
                duration: audio.duration,
                inPoint: 0,
                outPoint: audio.duration,
                trackIndex: targetTrackIndex,
                locked: false,
                muted: false,
                volume: 1,
                opacity: 1,
              };
              setTracks(prev => prev.map((t, i) =>
                i === targetTrackIndex ? { ...t, clips: [...t.clips, newClip] } : t
              ));
            }}
            timelineTracks={tracks}
            totalDurationSec={totalDurationSec}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4 mt-4 border-t border-border flex-wrap gap-2 items-center">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-prev-stage">
          <ChevronRight className="w-4 h-4" />
          بازگشت به استوری‌بورد
        </Button>

        <div className="flex items-center gap-2">
          <Select
            value={exportPreset}
            onValueChange={(v) => setExportPreset(v as typeof exportPreset)}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs" data-testid="export-preset-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportPresets.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="aiGenerate"
            onClick={handleSaveAndRender}
            disabled={saveLoading || tracks.every(t => t.clips.length === 0)}
            className="gap-2"
            data-testid="button-save-render"
          >
            {saveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saveLoading ? "در حال ذخیره..." : "ذخیره تایملاین و به خروجی"}
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Inline SFX Dialog for timeline clips */}
      <Dialog open={sfxDialogOpen} onOpenChange={setSfxDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-rose-500" />
              افکت صوتی برای کلیپ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="مثال: صدای باد، جیغ، یا صدای گام در راهرو"
              className="min-h-[60px] resize-none"
              value={sfxPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSfxPrompt(e.target.value)}
              dir="rtl"
              disabled={sfxGenerating}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">مدت: {toPersianNumber(sfxDuration)} ثانیه</span>
              <input
                type="range"
                min={0.5}
                max={22}
                step={0.5}
                value={sfxDuration}
                onChange={(e) => setSfxDuration(parseFloat(e.target.value))}
                className="w-32 accent-primary"
                disabled={sfxGenerating}
              />
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setSfxDialogOpen(false)} disabled={sfxGenerating}>
                انصراف
              </Button>
              <Button
                variant="aiGenerate"
                onClick={async () => {
                  await handleGenerateSFX();
                  if (activeClipId) {
                    const clip = tracks.flatMap(t => t.clips).find(c => c.id === activeClipId);
                    if (clip) {
                      const audioEntry = generatedAudioList[generatedAudioList.length - 1];
                      if (audioEntry) {
                        handleAddAudioToTimeline({ ...audioEntry, type: "sfx" });
                      }
                    }
                  }
                  setSfxDialogOpen(false);
                }}
                disabled={!sfxPrompt.trim() || sfxGenerating}
                className="gap-2"
              >
                {sfxGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال تولید...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    تولید و افزودن
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline TTS Dialog for timeline clips */}
      <Dialog open={ttsDialogOpen} onOpenChange={setTtsDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-emerald-500" />
              دیالوگ برای کلیپ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="متن دیالوگ را وارد کنید..."
              className="min-h-[60px] resize-none"
              value={ttsText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTtsText(e.target.value)}
              dir="rtl"
              disabled={ttsGenerating}
            />
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setTtsDialogOpen(false)} disabled={ttsGenerating}>
                انصراف
              </Button>
              <Button
                variant="aiGenerate"
                onClick={async () => {
                  await handleGenerateTTS();
                  if (activeClipId) {
                    const audioEntry = generatedAudioList[generatedAudioList.length - 1];
                    if (audioEntry) {
                      handleAddAudioToTimeline({ ...audioEntry, type: "dialogue" });
                    }
                  }
                  setTtsDialogOpen(false);
                }}
                disabled={!ttsText.trim() || ttsGenerating}
                className="gap-2"
              >
                {ttsGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال تولید...
                  </>
                ) : (
                  <>
                    <Headphones className="w-4 h-4" />
                    تولید و افزودن
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
