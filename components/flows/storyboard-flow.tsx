"use client";

import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Film,
  Video,
  Play,
  Pause,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Clapperboard,
  Sparkles,
  Plus,
  Wand2,
  Volume2,
  Mic,
  Music,
  Camera,
  Aperture,
  Move,
  Sun,
  Headphones,
  Trash2,
  Waves,
  User,
  Eye,
  Check,
  Speech,
  MonitorPlay,
  FileAudio,
  Upload,
  AlertCircle,
  RefreshCw,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn, toPersianNumber } from "@/lib/utils";
import type { Shot, AudioTrack, GenerationVersion } from "@/lib/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface StoryboardFlowProps {
  shots: Shot[];
  projectId?: string;
  projectAspectRatio?: string;
  onGenerateVideo: (shotId: number) => void;
  onRetryVideo?: (shotId: number) => void;
  onInsertShot?: (insertIndex: number, description: string) => Promise<boolean>;
  onUpdateShot?: (shotId: number, updates: Partial<Shot>) => void;
  onNext: () => void;
  onBack: () => void;
  isGeneratingVideo?: Record<number, boolean>;
  selectedVideoModel?: string;
  onVideoModelChange?: (model: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  generated: "bg-green-500/10 text-green-600 border-green-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  draft: "پیش‌نویس",
  generating: "در حال تولید",
  generated: "تولید شده",
  failed: "ناموفق",
};

const shotTypeLabels: Record<string, string> = {
  extreme_close_up: "ECU",
  close_up: "CU",
  medium_close_up: "MCU",
  medium: "MS",
  medium_wide: "MWS",
  wide: "WS",
  extreme_wide: "EWS",
  establishing: "EST",
  insert: "INS",
  cutaway: "CUT",
  two_shot: "2S",
  over_shoulder: "OTS",
};

const cameraMovementLabels: Record<string, string> = {
  static: "ثابت",
  pan: "پن",
  tilt: "تیلت",
  dolly_in: "دالی این",
  dolly_out: "دالی اوت",
  truck: "تراک",
  crane: "کرین",
  handheld: "دستی",
  steadicam: "استدی‌کم",
  whip_pan: "ویپ پن",
  zoom: "زوم",
  push_in: "پوش این",
  pull_out: "پول اوت",
  arc: "آرک",
};

const aspectRatioClass = (ratio?: string) => {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "4:3") return "aspect-[4/3]";
  if (ratio === "3:4") return "aspect-[3/4]";
  return "aspect-video";
};

export function StoryboardFlow({
  shots,
  projectId,
  projectAspectRatio,
  onGenerateVideo,
  onRetryVideo,
  onInsertShot,
  onUpdateShot,
  onNext,
  onBack,
  isGeneratingVideo = {},
  selectedVideoModel = "kling-v2-6-pro",
  onVideoModelChange,
}: StoryboardFlowProps) {
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<number | null>(null);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const [insertDescription, setInsertDescription] = useState("");
  const [insertGenerating, setInsertGenerating] = useState(false);

  // Elapsed time tracking for video generation
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<number, number>>({});
  const generationStartTimes = useRef<Record<number, number>>({});

  useEffect(() => {
    const generatingIds = Object.entries(isGeneratingVideo)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));

    generatingIds.forEach((id) => {
      if (!generationStartTimes.current[id]) {
        generationStartTimes.current[id] = Date.now();
      }
    });

    Object.keys(generationStartTimes.current).forEach((key) => {
      const id = Number(key);
      if (!isGeneratingVideo[id]) {
        delete generationStartTimes.current[id];
        setElapsedSeconds((prev) => { const n = { ...prev }; delete n[id]; return n; });
      }
    });

    if (generatingIds.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(
        Object.fromEntries(
          Object.entries(generationStartTimes.current).map(([k, start]) => [k, Math.floor((now - start) / 1000)])
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isGeneratingVideo]);

  // Full-size generation preview dialog
  const [previewVersion, setPreviewVersion] = useState<GenerationVersion | null>(null);
  const [previewShotId, setPreviewShotId] = useState<number | null>(null);

  // Per-shot SFX state
  const [sfxDialogOpen, setSfxDialogOpen] = useState(false);
  const [activeShotId, setActiveShotId] = useState<number | null>(null);
  const [sfxPrompt, setSfxPrompt] = useState("");
  const [sfxDuration, setSfxDuration] = useState(5);
  const [sfxGenerating, setSfxGenerating] = useState(false);
  const [sfxAiLoading, setSfxAiLoading] = useState(false);
  const [generatedSfx, setGeneratedSfx] = useState<Record<number, { url: string; duration: number; prompt: string }>>({});
  const [sfxVisionDetails, setSfxVisionDetails] = useState<{
    visionUsed?: boolean;
    dominantSounds?: string[];
    ambienceLevel?: string;
    moodTag?: string;
  } | null>(null);

  // Inline audio player state
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const audioRef = useMemo(() => typeof window !== "undefined" ? new Audio() : null, []);

  // Per-shot TTS (dialogue) state
  const [ttsDialogOpen, setTtsDialogOpen] = useState(false);
  const [ttsText, setTtsText] = useState("");
  const [ttsVoicePreset, setTtsVoicePreset] = useState<"persian_male" | "persian_female" | "tara">("tara");
  const [ttsGenerating, setTtsGenerating] = useState(false);

  // LipSync state
  const [lipSyncing, setLipSyncing] = useState<Record<number, boolean>>({});
  const [lipSyncStatusMap, setLipSyncStatusMap] = useState<Record<number, string>>({});
  const [dialogueGenerating, setDialogueGenerating] = useState<Record<number, boolean>>({});

  // Dialogue audio upload
  const [uploadTargetShotId, setUploadTargetShotId] = useState<number | null>(null);
  const [dialogueUploading, setDialogueUploading] = useState<Record<number, boolean>>({});
  const dialogueUploadInputRef = useRef<HTMLInputElement>(null);

  // Trigger hidden file input when upload target changes
  useEffect(() => {
    if (uploadTargetShotId && dialogueUploadInputRef.current) {
      dialogueUploadInputRef.current.click();
    }
  }, [uploadTargetShotId]);

  // Poll lip sync status
  const pollLipSyncStatus = useMemo(() => {
    const timers: number[] = [];
    return (shotId: number, taskId: string) => {
      let attempts = 0;
      const maxAttempts = 60;
      const check = async () => {
        attempts++;
        if (attempts > maxAttempts) {
          setLipSyncing(prev => ({ ...prev, [shotId]: false }));
          setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "failed" }));
          return;
        }
        try {
          const res = await fetch(`/api/projects/${projectId}/shots/${shotId}/lipsync`);
          const data = await res.json();
          if (data.status === "completed" && data.videoUrl) {
            setLipSyncing(prev => ({ ...prev, [shotId]: false }));
            setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "completed" }));
            if (onUpdateShot) onUpdateShot(shotId, { lipSyncUrl: data.videoUrl, lipSyncStatus: "completed" });
            return;
          } else if (data.status === "failed") {
            setLipSyncing(prev => ({ ...prev, [shotId]: false }));
            setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "failed" }));
            return;
          }
          const timer = window.setTimeout(check, 8000);
          timers.push(timer);
        } catch (err) {
          console.error("LipSync poll error:", err);
          const timer = window.setTimeout(check, 10000);
          timers.push(timer);
        }
      };
      check();
    };
  }, [projectId, onUpdateShot]);

  // Load audio tracks for shot-level audio visibility
  const { data: audioTracksList = [] } = useQuery<AudioTrack[]>({
    queryKey: ['/api/projects', projectId, 'audio-tracks'],
    queryFn: () => fetch(`/api/projects/${projectId}/audio-tracks`).then(r => r.json()),
    enabled: !!projectId,
  });

  // Group audio tracks by shot
  const shotAudioMap = useMemo(() => {
    const map = new Map<number, AudioTrack[]>();
    audioTracksList.forEach((t: AudioTrack) => {
      if (!t.shotId) return;
      const list = map.get(t.shotId) || [];
      list.push(t);
      map.set(t.shotId, list);
    });
    return map;
  }, [audioTracksList]);

  const openSfxDialog = (shotId: number) => {
    const shot = shots.find(s => s.id === shotId);
    setActiveShotId(shotId);
    setSfxPrompt("");
    setSfxDuration(shot?.duration || 5);
    setSfxVisionDetails(null);
    setSfxDialogOpen(true);
  };

  const handleAiGenerateSfxPrompt = async () => {
    const shot = shots.find(s => s.id === activeShotId);
    if (!shot) return;
    setSfxAiLoading(true);
    try {
      // Prefer the generated image; fall back to thumbnail for vision analysis
      const imageUrl = shot.generatedImageUrl || shot.thumbnailUrl || undefined;
      const res = await fetch('/api/ai/sfx-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shotTitle: shot.title,
          description: shot.description,
          shotType: shot.shotType,
          cameraMovement: shot.cameraMovement,
          sceneName: shot.sceneName,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('AI SFX prompt error:', data.error);
        return;
      }
      setSfxPrompt(data.prompt || '');
      if (data.suggestedDuration) setSfxDuration(data.suggestedDuration);
      if (data.dominantSounds?.length) {
        setSfxVisionDetails({
          visionUsed: data.visionUsed,
          dominantSounds: data.dominantSounds,
          ambienceLevel: data.ambienceLevel,
          moodTag: data.moodTag,
        });
      }
    } catch (err) {
      console.error('AI SFX prompt failed:', err);
    } finally {
      setSfxAiLoading(false);
    }
  };

  const handleGenerateShotSfx = async () => {
    if (!sfxPrompt.trim() || !projectId || !activeShotId) return;
    setSfxGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/shots/${activeShotId}/sfx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: sfxPrompt.trim(),
          durationSeconds: Math.min(Math.max(sfxDuration, 0.5), 22),
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Shot SFX error:', data.error);
        return;
      }
      if (data.audioBase64) {
        setGeneratedSfx(prev => ({
          ...prev,
          [activeShotId]: {
            url: `data:audio/mpeg;base64,${data.audioBase64}`,
            duration: data.duration,
            prompt: sfxPrompt.trim(),
          },
        }));
      }
      setSfxDialogOpen(false);
    } catch (err) {
      console.error('Shot SFX generation failed:', err);
    } finally {
      setSfxGenerating(false);
    }
  };

  // Inline audio player
  const toggleTrackPlayback = (trackId: number, url?: string | null) => {
    if (!url || !audioRef) return;
    if (playingTrackId === trackId) {
      audioRef.pause();
      setPlayingTrackId(null);
    } else {
      audioRef.pause();
      audioRef.src = url;
      audioRef.currentTime = 0;
      audioRef.play().catch(() => {});
      audioRef.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(trackId);
    }
  };

  const queryClient = useQueryClient();

  const deleteTrack = async (trackId: number) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/audio-tracks/${trackId}`, { method: "DELETE" });
      if (!res.ok) return;
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "audio-tracks"] });
    } catch (err) {
      console.error("Delete track error:", err);
    }
  };

  // TTS (dialogue) handlers
  const openTtsDialog = (shotId: number) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot?.dialogueText) return;
    setActiveShotId(shotId);
    setTtsText(shot.dialogueText);
    setTtsVoicePreset("tara");
    setTtsDialogOpen(true);
  };

  const handleGenerateTTS = async () => {
    if (!ttsText.trim() || !projectId || !activeShotId) return;
    setTtsGenerating(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ttsText.trim(),
          voicePreset: ttsVoicePreset,
          modelId: "eleven_multilingual_v2_5",
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("TTS error:", data.error);
        return;
      }
      if (data.audioBase64) {
        // Store as an audio track linked to this shot
        const trackRes = await fetch(`/api/projects/${projectId}/audio-tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `دیالوگ شات ${activeShotId}`,
            type: "dialogue",
            url: `data:audio/mpeg;base64,${data.audioBase64}`,
            duration: 0, // TTS duration unknown until playback; user can adjust in assembly
            shotId: activeShotId,
            startTime: 0,
            voiceId: data.voiceId,
            textPrompt: ttsText.trim(),
          }),
        });
        if (trackRes.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "audio-tracks"] });
        }
      }
      setTtsDialogOpen(false);
    } catch (err) {
      console.error("TTS generation failed:", err);
    } finally {
      setTtsGenerating(false);
    }
  };

  // Auto-generate dialogue + attach as main audio track for this shot
  const handleAutoDialogue = async (shotId: number) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot?.dialogueText || !projectId) return;
    setDialogueGenerating(prev => ({ ...prev, [shotId]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/shots/${shotId}/dialogue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: shot.dialogueText,
          voicePreset: "tara",
          modelId: "eleven_v3",
          autoLipSync: false,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Auto dialogue error:", data.error);
        return;
      }
      if (data.audioBase64) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "audio-tracks"] });
      }
    } catch (err) {
      console.error("Auto dialogue failed:", err);
    } finally {
      setDialogueGenerating(prev => ({ ...prev, [shotId]: false }));
    }
  };

  // Upload dialogue audio file from user's device
  const handleUploadDialogue = async (shotId: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setDialogueUploading(prev => ({ ...prev, [shotId]: true }));
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(',')[1];
        if (!base64) {
          setDialogueUploading(prev => ({ ...prev, [shotId]: false }));
          return;
        }
        const audioUrl = `data:${file.type || 'audio/mpeg'};base64,${base64}`;
        // Store as an audio track of type "dialogue"
        const res = await fetch(`/api/projects/${projectId}/audio-tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name || `دیالوگ شات ${shotId}`,
            url: audioUrl,
            type: 'dialogue',
            duration: 0,
            volume: 100,
            startTime: 0,
            metadata: { uploaded: true, fileName: file.name },
            shotId,
          }),
        });
        const data = await res.json();
        if (data.error) {
          console.error('Dialogue upload error:', data.error);
          return;
        }
        if (onUpdateShot) onUpdateShot(shotId, { dialogueAudioUrl: audioUrl });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'audio-tracks'] });
        setUploadTargetShotId(null);
      };
      reader.onerror = () => {
        console.error('File read error');
        setDialogueUploading(prev => ({ ...prev, [shotId]: false }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload dialogue failed:', err);
      setDialogueUploading(prev => ({ ...prev, [shotId]: false }));
    }
  };

  // LipSync orchestration: identify face + create lip sync task
  const handleLipSync = async (shotId: number) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot?.generatedVideoUrl || !projectId) return;
    setLipSyncing(prev => ({ ...prev, [shotId]: true }));
    setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "identifying" }));
    try {
      const res = await fetch(`/api/projects/${projectId}/shots/${shotId}/lipsync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: shot.dialogueAudioUrl || undefined,
          audioDuration: (shot.duration || 5) * 1000,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("LipSync error:", data.error);
        setLipSyncing(prev => ({ ...prev, [shotId]: false }));
        setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "failed" }));
        return;
      }
      if (data.lipSyncTaskId) {
        setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "syncing" }));
        pollLipSyncStatus(shotId, data.lipSyncTaskId);
      }
    } catch (err) {
      console.error("LipSync failed:", err);
      setLipSyncing(prev => ({ ...prev, [shotId]: false }));
      setLipSyncStatusMap(prev => ({ ...prev, [shotId]: "failed" }));
    }
  };

  const handleOpenInsertDialog = (index: number) => {
    setInsertIndex(index);
    setInsertDescription("");
    setInsertDialogOpen(true);
  };

  const handleConfirmInsert = async () => {
    if (!insertDescription.trim() || !onInsertShot) return;
    setInsertGenerating(true);
    try {
      const success = await onInsertShot(insertIndex, insertDescription);
      if (success) {
        setInsertDialogOpen(false);
        setInsertDescription("");
      }
    } finally {
      setInsertGenerating(false);
    }
  };

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Hidden file input for dialogue upload — triggered by uploadTargetShotId state */}
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        ref={dialogueUploadInputRef}
        onChange={(e) => {
          const sid = uploadTargetShotId;
          setUploadTargetShotId(null);
          if (sid) handleUploadDialogue(sid, e);
        }}
      />
      <div className="mb-6">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl stage-icon-storyboard flex items-center justify-center shadow-lg flex-shrink-0">
              <Clapperboard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-tight" data-testid="text-storyboard-title">استوری‌بورد سینمایی</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">تصاویر شات‌ها را به ویدیو تبدیل کنید</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onVideoModelChange && (
              <Select value={selectedVideoModel} onValueChange={onVideoModelChange}>
                <SelectTrigger className="h-7 text-[11px] w-[130px] sm:w-[150px] border-dashed" data-testid="select-video-model">
                  <SelectValue placeholder="مدل ویدیو" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kling-v2-6-pro">Kling v2.6 Pro</SelectItem>
                  <SelectItem value="kling-v2-6-std">Kling v2.6 Std</SelectItem>
                  <SelectItem value="kling-v2-5-turbo-pro">Kling v2.5 Turbo Pro</SelectItem>
                  <SelectItem value="kling-v2-5-turbo-std">Kling v2.5 Turbo Std</SelectItem>
                  <SelectItem value="kling-v2-1-pro">Kling v2.1 Pro</SelectItem>
                  <SelectItem value="kling-v2-1-std">Kling v2.1 Std</SelectItem>
                  <SelectItem value="kling-v2-master">Kling v2 Master</SelectItem>
                  <SelectItem value="kling-v1-6-pro">Kling v1.6 Pro</SelectItem>
                  <SelectItem value="kling-v1-6-std">Kling v1.6 Std</SelectItem>
                  <SelectItem value="kling-v1-5-pro">Kling v1.5 Pro</SelectItem>
                  <SelectItem value="kling-v1-5-std">Kling v1.5 Std</SelectItem>
                  <SelectItem value="kling-v1-pro">Kling v1 Pro</SelectItem>
                  <SelectItem value="kling-v1-std">Kling v1 Std</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">مرحله ۵</Badge>
          </div>
        </div>
      </div>

      {shots.length === 0 ? (
        <Card className="border-card-border flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">هنوز شاتی وجود ندارد</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              ابتدا در مرحله دکوپاژ بصری، شات‌ها و تصاویر را ایجاد کنید
            </p>
            <Button onClick={onBack} className="gap-2" data-testid="button-back-to-vision-empty">
              <ChevronRight className="w-4 h-4" />
              بازگشت به دکوپاژ بصری
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="overflow-x-auto pb-4 w-full scroll-smooth" style={{ direction: "ltr", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }} dir="ltr">
            <div className="flex items-stretch gap-0 px-2 sm:px-4" style={{ minWidth: "max-content" }}>
              {shots.map((shot, index) => {
                const isVideoGenerating = isGeneratingVideo[shot.id] || false;
                const hasLipSync = !!shot.lipSyncUrl;
                const hasVideo = !!shot.generatedVideoUrl;
                const hasImage = !!shot.generatedImageUrl;
                const isPlaying = playingVideoId === shot.id;
                const activeVideoUrl = hasLipSync ? shot.lipSyncUrl : shot.generatedVideoUrl;

                return (
                  <div key={shot.id} className="flex items-stretch">
                    {index === 0 && onInsertShot && (
                      <div className="flex items-center px-1 group">
                        <button
                          onClick={() => handleOpenInsertDialog(0)}
                          className="w-7 h-7 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary flex-shrink-0"
                          title="افزودن پلن"
                          data-testid="button-storyboard-insert-first"
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </div>
                    )}
                  <Card
                    className={cn(
                      "border-card-border flex-shrink-0 overflow-visible mx-1.5 sm:mx-2 transition-all duration-200 hover:border-border/60 hover:shadow-sm cursor-pointer",
                      selectedShotId === shot.id && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{ width: "clamp(252px, 80vw, 320px)", scrollSnapAlign: "start" }}
                    data-testid={`card-shot-${shot.id}`}
                    onClick={() => setSelectedShotId(shot.id)}
                  >
                    <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-primary">
                            {toPersianNumber(index + 1)}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {shot.title || `شات ${toPersianNumber(index + 1)}`}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] flex-shrink-0", statusColors[shot.status])}
                          data-testid={`badge-status-${shot.id}`}
                        >
                          {statusLabels[shot.status] || shot.status}
                        </Badge>
                      </div>

                      <div className={cn(
                        `${aspectRatioClass(projectAspectRatio)} rounded-lg overflow-hidden bg-muted relative transition-all duration-200`,
                        hasLipSync
                          ? "ring-1 ring-violet-500/50 shadow-[0_0_0_1px_hsl(260_90%_55%/0.2),0_2px_12px_hsl(260_90%_55%/0.10)]"
                          : hasVideo
                            ? "ring-1 ring-amber-500/50 shadow-[0_0_0_1px_hsl(43_90%_55%/0.2),0_2px_12px_hsl(43_90%_55%/0.10)]"
                            : "ring-1 ring-border/50",
                        selectedShotId === shot.id && "ring-2 ring-primary ring-offset-1"
                      )}>
                        {hasVideo && isPlaying ? (
                          <video
                            src={activeVideoUrl!}
                            className="w-full h-full object-cover"
                            controls
                            autoPlay
                            onEnded={() => setPlayingVideoId(null)}
                            data-testid={`video-player-${shot.id}`}
                          />
                        ) : hasImage ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedShotId(shot.id);
                                const version: GenerationVersion = {
                                  type: hasLipSync || hasVideo ? "video" : "image",
                                  imageUrl: shot.generatedImageUrl || undefined,
                                  videoUrl: activeVideoUrl || undefined,
                                  prompt: shot.prompt || shot.description || "",
                                  model: selectedVideoModel,
                                  timestamp: new Date().toISOString(),
                                };
                                setPreviewShotId(shot.id);
                    setPreviewVersion(version);
                              }}
                              className="w-full h-full"
                            >
                              <img
                                src={shot.generatedImageUrl!}
                                alt={shot.title || `Shot ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                            {(hasLipSync || hasVideo) && (
                              <button
                                onClick={() => setPlayingVideoId(shot.id)}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
                                data-testid={`button-play-video-${shot.id}`}
                              >
                                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-black ml-0.5" />
                                </div>
                              </button>
                            )}
                          </>
                        ) : isVideoGenerating ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            {(() => {
                              const elapsed = elapsedSeconds[shot.id] ?? 0;
                              const avgCompletionSec = 120;
                              const remaining = Math.max(0, avgCompletionSec - elapsed);
                              const phase = elapsed < 10 ? "در حال شروع..." : elapsed < 30 ? "در حال پردازش..." : "در حال رندر...";
                              return (
                                <>
                                  <p className="text-xs text-muted-foreground">{phase}</p>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-full">
                                      <Timer className="w-3 h-3" />
                                      {Math.floor(elapsed / 60) > 0
                                        ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} گذشته`
                                        : `${elapsed} ثانیه گذشته`}
                                    </div>
                                    {elapsed >= 10 && remaining > 0 && (
                                      <div className="text-[10px] text-muted-foreground/50">
                                        حدود {remaining < 60 ? `${remaining} ثانیه` : `${Math.ceil(remaining / 60)} دقیقه`} باقی‌مانده
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : shot.status === "failed" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 bg-destructive/5">
                            <AlertCircle className="w-8 h-8 text-destructive/70" />
                            <p className="text-xs text-destructive font-medium">تولید ناموفق</p>
                            <p className="text-[10px] text-muted-foreground text-center">سرویس در دسترس نبود یا زمان پاسخ تمام شد</p>
                            {hasImage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive mt-1"
                                onClick={() => onRetryVideo ? onRetryVideo(shot.id) : onGenerateVideo(shot.id)}
                                data-testid={`button-retry-video-${shot.id}`}
                              >
                                <RefreshCw className="w-3 h-3" />
                                تلاش مجدد
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">تصویری موجود نیست</p>
                          </div>
                        )}
                      </div>

                      {/* === Shot-level audio visibility === */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {shot.shotType && (
                          <Badge variant="outline" className="text-[10px]">
                            <Film className="w-3 h-3 ml-1" />
                            {shotTypeLabels[shot.shotType] || shot.shotType}
                          </Badge>
                        )}
                        {shot.cameraMovement && shot.cameraMovement !== "static" && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-700">
                            <Move className="w-3 h-3 ml-1" />
                            {cameraMovementLabels[shot.cameraMovement] || shot.cameraMovement}
                          </Badge>
                        )}
                        {shot.duration && (
                          <Badge variant="outline" className="text-[10px]">
                            {toPersianNumber(shot.duration)} ثانیه
                          </Badge>
                        )}
                      </div>

                      {/* Cinematography detail strip */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {shot.cameraModel && (
                          <Badge variant="outline" className="text-[10px]">
                            <Camera className="w-3 h-3 ml-1" />
                            {shot.cameraModel.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {shot.lensType && (
                          <Badge variant="outline" className="text-[10px]">
                            <Aperture className="w-3 h-3 ml-1" />
                            {shot.lensType.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {shot.focalLength && (
                          <Badge variant="outline" className="text-[10px]">
                            {shot.focalLength}
                          </Badge>
                        )}
                        {shot.keyLight && (
                          <Badge variant="outline" className="text-[10px]">
                            <Sun className="w-3 h-3 ml-1" />
                            {shot.keyLight.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {shot.shotFocus && (
                          <Badge variant="outline" className="text-[10px]">
                            {shot.shotFocus.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {shot.cameraAngle && shot.cameraAngle !== "eye_level" && (
                          <Badge variant="outline" className="text-[10px]">
                            {shot.cameraAngle.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>

                      {/* Audio badges per shot */}
                      {(() => {
                        const audioForShot = shotAudioMap.get(shot.id) || [];
                        const sfxTracks = audioForShot.filter((t: AudioTrack) => t.type === "sfx");
                        const musicTracks = audioForShot.filter((t: AudioTrack) => t.type === "music");
                        const dialogueTracks = audioForShot.filter((t: AudioTrack) => t.type === "dialogue" || t.type === "narration");
                        if (audioForShot.length === 0 && !shot.dialogueText) return null;
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sfxTracks.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/10 border-rose-500/30 text-rose-600">
                                <Volume2 className="w-3 h-3 ml-1" />
                                {toPersianNumber(sfxTracks.length)} افکت
                              </Badge>
                            )}
                            {musicTracks.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-600">
                                <Music className="w-3 h-3 ml-1" />
                                {toPersianNumber(musicTracks.length)} موزیک
                              </Badge>
                            )}
                            {(dialogueTracks.length > 0 || shot.dialogueText) && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                                <Mic className="w-3 h-3 ml-1" />
                                دیالوگ
                              </Badge>
                            )}
                          </div>
                        );
                      })()}

                      {/* Dialogue text excerpt + TTS CTA */}
                      {shot.dialogueText && (
                        <div className="text-[11px] text-emerald-700 bg-emerald-50/60 rounded-md px-2 py-1.5 border border-emerald-200/50 leading-relaxed">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium">دیالوگ:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/60 flex-shrink-0 -mt-0.5"
                              onClick={() => openTtsDialog(shot.id)}
                            >
                              <Headphones className="w-3 h-3" />
                              صدای دیالوگ
                            </Button>
                          </div>
                          <p className="mt-0.5">{shot.dialogueText.length > 80 ? shot.dialogueText.slice(0, 80) + "…" : shot.dialogueText}</p>
                        </div>
                      )}

                      {/* Inline audio track player list */}
                      {(() => {
                        const audioForShot = shotAudioMap.get(shot.id) || [];
                        if (audioForShot.length === 0) return null;
                        return (
                          <div className="space-y-1">
                            {audioForShot.map((track: AudioTrack) => (
                              <div
                                key={track.id}
                                className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2 py-1 border border-border/50"
                              >
                                <button
                                  onClick={() => toggleTrackPlayback(track.id, track.generatedUrl || track.url)}
                                  className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0"
                                  title={playingTrackId === track.id ? "موقت" : "پخش"}
                                >
                                  {playingTrackId === track.id ? (
                                    <Pause className="w-3 h-3 text-primary" />
                                  ) : (
                                    <Play className="w-3 h-3 text-primary ml-px" />
                                  )}
                                </button>
                                <span className="text-[10px] truncate flex-1 min-w-0">
                                  {track.label || track.name || "صدا"}
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                                  {track.type === "sfx" && <Waves className="w-2.5 h-2.5 ml-0.5" />}
                                  {track.type === "dialogue" && <Mic className="w-2.5 h-2.5 ml-0.5" />}
                                  {track.type === "narration" && <User className="w-2.5 h-2.5 ml-0.5" />}
                                  {track.type === "music" && <Music className="w-2.5 h-2.5 ml-0.5" />}
                                  {track.type}
                                </Badge>
                                <button
                                  onClick={() => deleteTrack(track.id)}
                                  className="w-5 h-5 rounded-full hover:bg-rose-100 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-colors flex-shrink-0"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Generation history gallery */}
                      {shot.generationVersions && (shot.generationVersions as GenerationVersion[]).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">تاریخچه تولید</span>
                            <span className="text-[10px] text-muted-foreground/60">{toPersianNumber((shot.generationVersions as GenerationVersion[]).length)} نسخه</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(shot.generationVersions as GenerationVersion[]).map((v, i) => {
                              const isImage = v.type === "image" || (!v.type && v.imageUrl);
                              const isActive = isImage
                                ? v.imageUrl === shot.generatedImageUrl
                                : v.videoUrl === shot.generatedVideoUrl;
                              const thumbUrl = isImage ? v.imageUrl : v.videoUrl;
                              return (
                                <div key={i} className="relative group">
                                  <button
                                    onClick={() => {
                                      if (isImage && v.imageUrl && onUpdateShot) {
                                        onUpdateShot(shot.id, { generatedImageUrl: v.imageUrl });
                                      } else if (v.videoUrl && onUpdateShot) {
                                        onUpdateShot(shot.id, { generatedVideoUrl: v.videoUrl });
                                      }
                                    }}
                                    className={cn(
                                      "relative w-full aspect-video rounded-md overflow-hidden flex-shrink-0 transition-all",
                                      isActive
                                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                        : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-primary/40"
                                    )}
                                    title={`${isImage ? "تصویر" : "ویدیو"} — ${v.model} — ${new Date(v.timestamp).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`}
                                  >
                                    <img src={thumbUrl} alt={`v${i + 1}`} className="w-full h-full object-cover" />
                                    {!isImage && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Video className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                    {isActive && (
                                      <div className="absolute top-0.5 right-0.5 bg-primary text-white text-[9px] px-1 py-px rounded-sm font-bold">
                                        فعال
                                      </div>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPreviewShotId(shot.id); setPreviewVersion(v); }}
                                    className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
                                    title="مشاهده کامل"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {hasVideo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => setPlayingVideoId(shot.id)}
                            data-testid={`button-view-video-${shot.id}`}
                          >
                            <Play className="w-4 h-4" />
                            مشاهده ویدیو
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className={cn(
                              "w-full gap-2",
                              shot.status === "failed" && !isVideoGenerating && "border-destructive/30 hover:bg-destructive/10"
                            )}
                            variant={shot.status === "failed" && !isVideoGenerating ? "outline" : "default"}
                            onClick={() => (shot.status === "failed" && onRetryVideo ? onRetryVideo : onGenerateVideo)(shot.id)}
                            disabled={isVideoGenerating || !hasImage}
                            data-testid={`button-generate-video-${shot.id}`}
                          >
                            {isVideoGenerating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                در حال تبدیل...
                                {elapsedSeconds[shot.id] !== undefined && elapsedSeconds[shot.id] > 5 && (
                                  <span className="text-[10px] opacity-70 mr-1">
                                    ({Math.floor(elapsedSeconds[shot.id] / 60) > 0
                                      ? `${Math.floor(elapsedSeconds[shot.id] / 60)}:${String(elapsedSeconds[shot.id] % 60).padStart(2, "0")}`
                                      : `${elapsedSeconds[shot.id]}s`})
                                  </span>
                                )}
                              </>
                            ) : shot.status === "failed" ? (
                              <>
                                <RefreshCw className="w-4 h-4 text-destructive" />
                                <span className="text-destructive">تلاش مجدد</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                تبدیل به ویدیو
                              </>
                            )}
                          </Button>
                        )}
                        {/* SFX available even without video (just needs storyboard) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full gap-2 text-xs text-muted-foreground hover:text-rose-500"
                          onClick={() => openSfxDialog(shot.id)}
                          disabled={sfxGenerating && activeShotId === shot.id}
                          data-testid={`button-sfx-${shot.id}`}
                        >
                            {generatedSfx[shot.id] ? (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-rose-500">افکت صوتی تولید شد</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                تولید افکت صوتی
                              </>
                            )}
                          </Button>
                        {hasVideo && shot.dialogueText && !shot.lipSyncUrl && (
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 gap-2 text-xs text-muted-foreground hover:text-violet-500"
                              onClick={() => handleAutoDialogue(shot.id)}
                              disabled={dialogueGenerating[shot.id] || lipSyncing[shot.id] || dialogueUploading[shot.id]}
                            >
                              {dialogueGenerating[shot.id] ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  در حال تولید...
                                </>
                              ) : (
                                <>
                                  <Speech className="w-3.5 h-3.5" />
                                  تولید خودکار
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 gap-2 text-xs text-muted-foreground hover:text-emerald-500"
                              onClick={() => setUploadTargetShotId(shot.id)}
                              disabled={dialogueGenerating[shot.id] || lipSyncing[shot.id] || dialogueUploading[shot.id]}
                            >
                              {dialogueUploading[shot.id] ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  آپلود...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  آپلود صدای دیالوگ
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {hasVideo && shot.dialogueText && (shot.dialogueAudioUrl || shot.lipSyncStatus) && !shot.lipSyncUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-2 text-xs text-muted-foreground hover:text-violet-500"
                            onClick={() => handleLipSync(shot.id)}
                            disabled={lipSyncing[shot.id]}
                          >
                            {lipSyncing[shot.id] ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {lipSyncStatusMap[shot.id] === "identifying"
                                  ? "شناسایی چهره..."
                                  : lipSyncStatusMap[shot.id] === "syncing"
                                    ? "هماهنگی لب..."
                                    : "در حال پردازش..."}
                              </>
                            ) : (
                              <>
                                <MonitorPlay className="w-3.5 h-3.5" />
                                هماهنگی لب با دیالوگ (LipSync)
                              </>
                            )}
                          </Button>
                        )}
                        {shot.lipSyncUrl && (
                          <Badge variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-600 w-full justify-center gap-1.5 py-1.5">
                            <FileAudio className="w-3 h-3" />
                            صدا و لب هماهنگ شده
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                    {onInsertShot && (
                      <div className="flex items-center px-1 group">
                        <button
                          onClick={() => handleOpenInsertDialog(index + 1)}
                          className="w-7 h-7 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary flex-shrink-0"
                          title="افزودن پلن"
                          data-testid={`button-storyboard-insert-${index}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-back-to-vision">
          <ChevronRight className="w-4 h-4" />
          بازگشت به دکوپاژ
        </Button>
        <Button onClick={onNext} className="gap-2" data-testid="button-next-to-assembly">
          مرحله مونتاژ
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={insertDialogOpen} onOpenChange={setInsertDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              افزودن پلن جدید
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                پلن جدید بین {insertIndex > 0 ? `پلن ${toPersianNumber(insertIndex)}` : "ابتدا"} و {insertIndex < shots.length ? `پلن ${toPersianNumber(insertIndex + 1)}` : "انتها"} با هماهنگی کامل تولید می‌شود.
              </span>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">توضیح پلن مورد نظر</label>
              <Textarea
                placeholder="مثال: نمای نزدیک از چهره شخصیت در حال فکر کردن..."
                className="min-h-[100px] resize-none"
                value={insertDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInsertDescription(e.target.value)}
                dir="rtl"
                disabled={insertGenerating}
                data-testid="input-storyboard-insert-description"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                هوش مصنوعی جزئیات فنی (دوربین، لنز، نور، رنگ) را از پلن‌های مجاور استخراج می‌کند
              </p>
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setInsertDialogOpen(false)}
              disabled={insertGenerating}
              data-testid="button-storyboard-cancel-insert"
            >
              انصراف
            </Button>
            <Button
              variant="aiGenerate"
              onClick={handleConfirmInsert}
              disabled={!insertDescription.trim() || insertGenerating}
              className="gap-2"
              data-testid="button-storyboard-confirm-insert"
            >
              {insertGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال تولید...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  تولید پلن هوشمند
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shot SFX Generation Dialog */}
      <Dialog open={sfxDialogOpen} onOpenChange={setSfxDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-rose-500" />
              تولید افکت صوتی برای شات
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Shot image preview */}
            {(() => {
              const activeShot = activeShotId ? shots.find(s => s.id === activeShotId) : null;
              const imgUrl = activeShot?.generatedImageUrl || activeShot?.thumbnailUrl;
              return imgUrl ? (
                <div className="rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={imgUrl}
                    alt={activeShot?.title || "شات"}
                    className="w-full h-32 object-cover"
                  />
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" />
                    <span>
                      {sfxVisionDetails?.visionUsed
                        ? "تحلیل تصویری: AI صداهای این فریم را می‌بیند"
                        : "فریم شات برای تحلیل معدول"}
                    </span>
                  </div>
                </div>
              ) : null;
            })()}
            <div>
              <label className="text-sm font-medium mb-2 block">توضیح افکت صوتی</label>
              <Textarea
                placeholder="مثال: صدای باد در جنگل، پرندگان، و صدای پا روی برگ‌های خشک"
                className="min-h-[80px] resize-none"
                value={sfxPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSfxPrompt(e.target.value)}
                dir="rtl"
                disabled={sfxAiLoading || sfxGenerating}
                data-testid="input-shot-sfx-prompt"
              />
              <div className="flex items-center justify-between mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                  onClick={handleAiGenerateSfxPrompt}
                  disabled={sfxAiLoading || sfxGenerating}
                >
                  {sfxAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  {sfxVisionDetails?.visionUsed ? "تحلیل تصویری دوباره" : "هوشمندسازی توضیح"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  مدت: {toPersianNumber(sfxDuration)} ثانیه
                </span>
              </div>
            </div>

            {/* Vision analysis details */}
            {sfxVisionDetails?.dominantSounds && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>رسید تحلیل تصویری AI</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {sfxVisionDetails.dominantSounds.map((sound) => (
                    <Badge key={sound} variant="outline" className="text-[10px]">{sound}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>امبیانت: {sfxVisionDetails.ambienceLevel}</span>
                  <span>احساس: {sfxVisionDetails.moodTag}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">مدت زمان (۰.۵ تا ۲۲ ثانیه)</label>
              <input
                type="range"
                min={0.5}
                max={22}
                step={0.5}
                value={sfxDuration}
                onChange={(e) => setSfxDuration(parseFloat(e.target.value))}
                className="w-full accent-primary"
                disabled={sfxGenerating}
              />
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setSfxDialogOpen(false)}
              disabled={sfxGenerating}
            >
              انصراف
            </Button>
            <Button
              variant="aiGenerate"
              onClick={handleGenerateShotSfx}
              disabled={!sfxPrompt.trim() || sfxGenerating}
              className="gap-2"
              data-testid="button-generate-shot-sfx"
            >
              {sfxGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال تولید...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  تولید افکت صوتی
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogue TTS Generation Dialog */}
      <Dialog open={ttsDialogOpen} onOpenChange={setTtsDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-emerald-500" />
              تولید صدای دیالوگ (ElevenLabs)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">متن دیالوگ</label>
              <Textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                className="min-h-[80px] resize-none"
                dir="rtl"
                disabled={ttsGenerating}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">گروه صدایی</label>
              <div className="flex items-center gap-3">
                <Button
                  variant={ttsVoicePreset === "persian_male" ? "default" : "outline"}
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => setTtsVoicePreset("persian_male")}
                  disabled={ttsGenerating}
                >
                  <User className="w-4 h-4" />
                  مرد فارسی
                </Button>
                <Button
                  variant={ttsVoicePreset === "persian_female" ? "default" : "outline"}
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => setTtsVoicePreset("persian_female")}
                  disabled={ttsGenerating}
                >
                  <User className="w-4 h-4" />
                  زن فارسی
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>مدل: ElevenLabs Multilingual v3</span>
              </div>
              <p>به صورت اتوماتیک ترجمه متن به صدا شده و در ادمه صدا ذخیره می‌شود. صدا را می‌توانید در مونتاژ ترکیب کنید.</p>
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setTtsDialogOpen(false)} disabled={ttsGenerating}>
              انصراف
            </Button>
            <Button
              variant="aiGenerate"
              onClick={handleGenerateTTS}
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
                  تولید صدای دیالوگ
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Full-size generation preview dialog */}
      <Dialog open={!!previewVersion} onOpenChange={(open) => { if (!open) setPreviewVersion(null); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="sr-only">
            <DialogTitle>پیش‌نمایش تولید</DialogTitle>
          </DialogHeader>
          {previewVersion && (
            <div className="space-y-3">
              <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
                {(previewVersion.type === "video" || previewVersion.videoUrl) ? (
                  <video src={previewVersion.videoUrl} className="w-full h-full object-contain" controls autoPlay />
                ) : (
                  <img src={previewVersion.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="px-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {previewVersion.type === "video" ? "ویدیو" : "تصویر"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">{previewVersion.model}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(previewVersion.timestamp).toLocaleString("fa-IR")}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{previewVersion.prompt}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" onClick={() => {
                    if (previewVersion.imageUrl && onUpdateShot && previewShotId) {
                      onUpdateShot(previewShotId, { generatedImageUrl: previewVersion.imageUrl });
                    } else if (previewVersion.videoUrl && onUpdateShot && previewShotId) {
                      onUpdateShot(previewShotId, { generatedVideoUrl: previewVersion.videoUrl });
                    }
                    setPreviewVersion(null);
                    setPreviewShotId(null);
                  }}>
                    <Check className="w-3.5 h-3.5 ml-1" />
                    انتخاب به عنوان فعال
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPreviewVersion(null)}>بستن</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
