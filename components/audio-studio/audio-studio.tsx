"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Mic,
  Volume2,
  Wand2,
  Loader2,
  Plus,
  Play,
  Pause,
  Clock,
  Target,
  Layers,
  Film,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AudioWaveform,
  Scissors,
  Zap,
  GripHorizontal,
  Trash2,
  Download,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, toPersianNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { TimelineClip, MediaAsset } from "@/lib/media-types";
import type { Shot, AudioTrack, Narrative, DirectorBrief } from "@/lib/types";

export type AudioGenerationType = "music" | "tts" | "sfx";

export interface AudioStudioProps {
  projectId: string;
  projectTitle?: string;
  shots: Shot[];
  narrative?: Narrative | null;
  directorBrief?: DirectorBrief | null;
  onAddToTimeline: (audio: GeneratedAudio, placement?: AudioPlacement) => void;
  timelineTracks: { id: string; name: string; type: string; clips: TimelineClip[] }[];
  totalDurationSec: number;
}

export interface GeneratedAudio {
  id: string;
  label: string;
  type: "music" | "sfx" | "dialogue";
  audioUrl: string;
  duration: number;
  prompt?: string;
  shotId?: number | null;
  sceneNumber?: number | null;
  metadata?: Record<string, unknown>;
}

export interface AudioPlacement {
  startTime: number;
  trackIndex: number;
  autoMatchDuration?: boolean;
}

/* ──────────────────────────────── */
/*  Constants & Voice Presets       */
/* ──────────────────────────────── */

const VOICE_PRESETS = [
  { id: "persian_male", label: "مرد فارسی‌زبان", description: "صدايی گرم و رسمی" },
  { id: "persian_female", label: "زن فارسی‌زبان", description: "صدايی لطیف و حماسی" },
  { id: "tara", label: "تارا (انگلیسی)", description: "صدای زنانه جوان و پرانرژی" },
  { id: "narrator", label: "راوی (انگلیسی)", description: "صدای مردانه رسمی و مستند" },
  { id: "adam", label: "آدام (انگلیسی)", description: "صدای مردانه گرم و دوستانه" },
  { id: "rachel", label: "راشل (انگلیسی)", description: "صدای زنانه دلنشین و حرفه‌ای" },
];

const MUSIC_PRESETS = [
  { id: "cinematic_dramatic", label: "سینمایی دراماتیک", description: "ارکسترال، عمیق، احساسی" },
  { id: "cinematic_epic", label: "سینمایی حماسی", description: "گسترده، طبل و سازهای بادی" },
  { id: "ambient_emotional", label: "آمبیانتی احساسی", description: "پد سینتی‌سایزر، مینیمال" },
  { id: "tension_thriller", label: "تنش‌آفرین", description: "پالس‌های کم‌فرکانس، رازآلود" },
  { id: "lofi_chill", label: "لو-فای آرام", description: "پیانو، صدای وینیل، ریلکس" },
  { id: "electronic_pulse", label: "الکترونیک پالسی", description: "سینتی‌سایزر، ریتم مدرن" },
  { id: "orchestral_romance", label: "ارکسترال رمانتیک", description: "ویولن، ویولنسل، احساسی" },
  { id: "horror_atmosphere", label: "ترسناک", description: "صداهای غیرطبیعی، بیسنگ" },
];

const SFX_CATEGORIES = [
  { id: "ambient", label: "محیطی", examples: "باران، باد، شهر، جنگل" },
  { id: "foley", label: "فولی", examples: "قدم زدن، در، کلید" },
  { id: "impact", label: "ضربه", examples: "انفجار، تصادف، در هم کوبیدن" },
  { id: "sci-fi", label: "علمی-تخیلی", examples: "لیزر، فضاپیما، ربات" },
  { id: "nature", label: "طبیعت", examples: "رعد، برق، حیوانات" },
  { id: "ui", label: "رابط کاربری", examples: "بوق، کلیک، نوتیفیکیشن" },
];

const SFX_QUICK_PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  ambient: [
    { label: "باران شبانه", prompt: "heavy rain on glass windows at night, distant thunder rumble" },
    { label: "خیابان شهر", prompt: "busy city street ambience, traffic, distant voices, car horns" },
    { label: "جنگل آرام", prompt: "calm forest, wind through trees, birds chirping, leaves rustling" },
    { label: "دریا", prompt: "ocean waves crashing on rocky shore, seagulls, sea breeze" },
  ],
  foley: [
    { label: "قدم روی چوب", prompt: "slow footsteps on old wooden floor, creaking" },
    { label: "در قدیمی", prompt: "old door creaking open slowly, rusty hinges" },
    { label: "تایپ کردن", prompt: "typing on mechanical keyboard, fast and rhythmic" },
    { label: "شکستن شیشه", prompt: "glass shattering and falling to concrete floor" },
  ],
  impact: [
    { label: "انفجار", prompt: "large explosion with deep bass boom and distant rumble" },
    { label: "تصادف ماشین", prompt: "car crash, metal crunch, glass breaking, screeching tires" },
    { label: "رعد نزدیک", prompt: "thunder crack, very close lightning strike, powerful rumble" },
    { label: "مشت و لگد", prompt: "punch impact, body blow, combat hit with reverb" },
  ],
  "sci-fi": [
    { label: "فضاپیما", prompt: "large spaceship engine hum, deep bass vibration, mechanical" },
    { label: "تیر لیزر", prompt: "laser beam firing, electric zap, futuristic weapon" },
    { label: "در فضایی", prompt: "futuristic sliding door opening with pneumatic hiss" },
    { label: "ربات", prompt: "robot walking on metal floor, servo motors whirring" },
  ],
  nature: [
    { label: "طوفان", prompt: "heavy thunderstorm, pouring rain, thunder, strong wind" },
    { label: "پرنده‌ها", prompt: "flock of birds taking flight suddenly, wings flapping" },
    { label: "رودخانه", prompt: "rushing river water over rocks, babbling brook" },
    { label: "گرگ", prompt: "lone wolf howling in the distance at night, eerie" },
  ],
  ui: [
    { label: "نوتیفیکیشن", prompt: "soft notification chime, pleasant and subtle, short" },
    { label: "کلیک دکمه", prompt: "button click, clean and crisp, short tap" },
    { label: "خطا", prompt: "error sound, two short negative beeps" },
    { label: "موفقیت", prompt: "success sound, short cheerful ascending chime" },
  ],
};

const VOICE_MODELS = [
  { id: "eleven_multilingual_v2", label: "چندزبانه v2", description: "فارسی، عربی، انگلیسی و ۲۸ زبان دیگر" },
  { id: "eleven_v3", label: "ElevenLabs v3", description: "جدیدترین مدل، کیفیت بالا" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5", description: "سریع‌تر، ایده‌آل برای متن کوتاه" },
];

/* ──────────────────────────────── */
/*  Main AudioStudio Component      */
/* ──────────────────────────────── */

export default function AudioStudio({
  projectId,
  projectTitle,
  shots,
  narrative,
  directorBrief,
  onAddToTimeline,
  timelineTracks,
  totalDurationSec,
}: AudioStudioProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Active generation tab ──
  const [activeTab, setActiveTab] = useState<AudioGenerationType>("music");

  // ── Shot context ──
  const [selectedShotId, setSelectedShotId] = useState<number | null>(null);
  const selectedShot = useMemo(
    () => shots.find((s) => s.id === selectedShotId) || null,
    [shots, selectedShotId]
  );

  // ── Scene grouping ──
  const scenes = useMemo(() => {
    const map = new Map<number, Shot[]>();
    for (const shot of shots) {
      const sn = shot.sceneNumber || 1;
      if (!map.has(sn)) map.set(sn, []);
      map.get(sn)!.push(shot);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [shots]);

  // ── Generated audio library ──
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedAudio[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  // ── DB audio tracks ──
  const { data: dbTracks = [] } = useQuery<AudioTrack[]>({
    queryKey: ["/api/projects", projectId, "audio-tracks"],
    queryFn: () => fetch(`/api/projects/${projectId}/audio-tracks`).then((r) => r.json()),
    enabled: !!projectId,
  });

  // ── Music generation state ──
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicDuration, setMusicDuration] = useState(30);
  const [musicGenre, setMusicGenre] = useState("cinematic");
  const [musicMood, setMusicMood] = useState("dramatic");
  const [musicPreset, setMusicPreset] = useState("cinematic_dramatic");
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
    cueSheet?: { time: string; cue: string }[];
  } | null>(null);
  const [autoMatchMusicDuration, setAutoMatchMusicDuration] = useState(false);

  // ── TTS generation state ──
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("persian_male");
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsEmotion, setTtsEmotion] = useState("neutral");
  const [ttsModel, setTtsModel] = useState("eleven_multilingual_v2");
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [autoMatchTtsDuration, setAutoMatchTtsDuration] = useState(false);


  // ── SFX generation state ──
  const [sfxPrompt, setSfxPrompt] = useState("");
  const [sfxDuration, setSfxDuration] = useState(5);
  const [sfxCategory, setSfxCategory] = useState("ambient");
  const [sfxGenerating, setSfxGenerating] = useState(false);
  const [sfxAiLoading, setSfxAiLoading] = useState(false);
  const [autoMatchSfxDuration, setAutoMatchSfxDuration] = useState(false);
  const [sfxLayerMode, setSfxLayerMode] = useState(false);

  // ── Audio player ref ──
  const [audioPlayer] = useState(() => new Audio());

  // ── Play audio handler ──
  const togglePlay = useCallback(
    (audio: GeneratedAudio) => {
      if (isPlaying === audio.id) {
        audioPlayer.pause();
        setIsPlaying(null);
      } else {
        audioPlayer.src = audio.audioUrl;
        audioPlayer.play();
        setIsPlaying(audio.id);
        audioPlayer.onended = () => setIsPlaying(null);
      }
    },
    [audioPlayer, isPlaying]
  );

  // ── Auto-match duration helpers ──
  const getAutoDuration = useCallback(() => {
    if (selectedShot?.duration) return selectedShot.duration;
    if (selectedShot) {
      // Default to 5s if no shot duration available
      return 5;
    }
    return totalDurationSec;
  }, [selectedShot, totalDurationSec]);

  // ── AI Music Prompt Generator ──
  const handleAiGenerateMusicPrompt = async () => {
    setMusicAiLoading(true);
    try {
      const res = await fetch("/api/ai/music-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          logline: narrative?.logline || "",
          script: narrative?.script || "",
          directorBrief: directorBrief || {},
          filmDuration: totalDurationSec,
          sceneVisualIdentity: selectedShot
            ? {
                sceneNumber: selectedShot.sceneNumber,
                sceneName: selectedShot.sceneName,
                timeOfDay: selectedShot.keyLight,
                mood: selectedShot.notes,
                lightingStyle: selectedShot.mainLight,
                atmosphereDescription: selectedShot.description,
              }
            : directorBrief?.sceneVisualIdentities?.[0] || null,
          visualArc: directorBrief?.visualArc || null,
          selectedShotContext: selectedShot
            ? {
                shotTitle: selectedShot.title,
                shotType: selectedShot.shotType,
                description: selectedShot.description,
                duration: selectedShot.duration,
              }
            : null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      setMusicAiResult(data);
      setMusicPrompt(data.prompt || "");
      setMusicGenre(data.genre || "cinematic");
      setMusicMood(data.mood || "dramatic");
      if (autoMatchMusicDuration && selectedShot?.duration) {
        setMusicDuration(Math.min(selectedShot.duration, 60));
      } else {
        setMusicDuration(data.suggestedDuration || 30);
      }
      toast({ title: "پرامپت موسیقی آماده شد", description: data.sceneBreakdown || "" });
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید پرامپت",
        variant: "destructive",
      });
    } finally {
      setMusicAiLoading(false);
    }
  };

  // ── AI SFX Prompt Generator ──
  const handleAiGenerateSfxPrompt = async () => {
    setSfxAiLoading(true);
    try {
      const res = await fetch("/api/ai/sfx-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shotTitle: selectedShot?.title || "",
          description: selectedShot?.description || "",
          shotType: selectedShot?.shotType || "",
          cameraMovement: selectedShot?.cameraMovement || "",
          sceneName: selectedShot?.sceneName || "",
          category: sfxCategory,
          directorBrief: directorBrief || null,
          sceneVisualIdentity: selectedShot
            ? {
                timeOfDay: selectedShot.keyLight,
                mood: selectedShot.notes,
                lightingStyle: selectedShot.mainLight,
                atmosphereDescription: selectedShot.description,
              }
            : null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      setSfxPrompt(data.prompt || data.suggestions?.[0] || "");
      if (autoMatchSfxDuration && selectedShot?.duration) {
        setSfxDuration(Math.min(selectedShot.duration, 22));
      }
      toast({
        title: "پرامپت افکت صوتی آماده شد",
        description: data.suggestions?.slice(0, 3).join("، ") || "",
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید پرامپت",
        variant: "destructive",
      });
    } finally {
      setSfxAiLoading(false);
    }
  };

  // ── Generate Music ──
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) return;
    const duration = autoMatchMusicDuration && selectedShot?.duration
      ? Math.min(selectedShot.duration, 60)
      : musicDuration;
    setMusicGenerating(true);
    try {
      const res = await fetch("/api/audio/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt.trim(),
          musicLengthMs: duration * 1000,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;
      const newEntry: GeneratedAudio = {
        id: `music-${Date.now()}`,
        label: `موسیقی ${musicGenre} - ${musicMood} (${duration}s)`,
        type: "music",
        audioUrl,
        duration: data.duration || duration,
        prompt: musicPrompt,
        shotId: selectedShotId,
        sceneNumber: selectedShot?.sceneNumber,
        metadata: { genre: musicGenre, mood: musicMood, bpmRange: musicAiResult?.bpmRange },
      };
      setGeneratedAudio((prev) => [newEntry, ...prev]);
      setActiveAudioId(newEntry.id);
      // Persist to DB
      await fetch(`/api/projects/${projectId}/audio-tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "music",
          label: newEntry.label,
          textPrompt: musicPrompt,
          generatedUrl: audioUrl,
          duration: newEntry.duration,
          shotId: selectedShotId,
          metadata: { genre: musicGenre, mood: musicMood, sceneNumber: selectedShot?.sceneNumber },
          status: "completed",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "audio-tracks"] });
      toast({ title: "موسیقی تولید شد", description: `${toPersianNumber(duration)} ثانیه` });
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید موسیقی",
        variant: "destructive",
      });
    } finally {
      setMusicGenerating(false);
    }
  };

  // ── Generate TTS ──
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsGenerating(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ttsText,
          voicePreset: ttsVoice,
          speed: ttsSpeed,
          emotion: ttsEmotion,
          modelId: ttsModel,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;
      const newEntry: GeneratedAudio = {
        id: `tts-${Date.now()}`,
        label: ttsText.slice(0, 40) + (ttsText.length > 40 ? "..." : ""),
        type: "dialogue",
        audioUrl,
        duration: data.duration || 5,
        prompt: ttsText,
        shotId: selectedShotId,
        sceneNumber: selectedShot?.sceneNumber,
        metadata: { voice: ttsVoice, speed: ttsSpeed, emotion: ttsEmotion },
      };
      setGeneratedAudio((prev) => [newEntry, ...prev]);
      setActiveAudioId(newEntry.id);
      await fetch(`/api/projects/${projectId}/audio-tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dialogue",
          label: newEntry.label,
          textPrompt: ttsText,
          voiceId: ttsVoice,
          generatedUrl: audioUrl,
          duration: newEntry.duration,
          shotId: selectedShotId,
          metadata: { voice: ttsVoice, speed: ttsSpeed, emotion: ttsEmotion },
          status: "completed",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "audio-tracks"] });
      toast({ title: "صدای گویندگی تولید شد" });
      setTtsText("");
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید صدا",
        variant: "destructive",
      });
    } finally {
      setTtsGenerating(false);
    }
  };

  // ── Generate SFX ──
  const handleGenerateSFX = async () => {
    if (!sfxPrompt.trim()) return;
    const duration = autoMatchSfxDuration && selectedShot?.duration
      ? Math.min(selectedShot.duration, 22)
      : sfxDuration;
    setSfxGenerating(true);
    try {
      const res = await fetch("/api/ai/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sfxPrompt,
          durationSeconds: duration,
          directorBrief: directorBrief || null,
          category: sfxCategory,
          layerMode: sfxLayerMode,
          shotContext: selectedShot
            ? {
                shotType: selectedShot.shotType,
                cameraMovement: selectedShot.cameraMovement,
                duration: selectedShot.duration,
              }
            : null,
          sceneVisualIdentity: selectedShot
            ? {
                timeOfDay: selectedShot.keyLight,
                mood: selectedShot.notes,
                lightingStyle: selectedShot.mainLight,
                atmosphereDescription: selectedShot.description,
              }
            : null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;
      const newEntry: GeneratedAudio = {
        id: `sfx-${Date.now()}`,
        label: sfxPrompt.slice(0, 40) + (sfxPrompt.length > 40 ? "..." : ""),
        type: "sfx",
        audioUrl,
        duration: duration,
        prompt: sfxPrompt,
        shotId: selectedShotId,
        sceneNumber: selectedShot?.sceneNumber,
        metadata: { category: sfxCategory, layerMode: sfxLayerMode },
      };
      setGeneratedAudio((prev) => [newEntry, ...prev]);
      setActiveAudioId(newEntry.id);
      await fetch(`/api/projects/${projectId}/audio-tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sfx",
          label: newEntry.label,
          textPrompt: sfxPrompt,
          generatedUrl: audioUrl,
          duration,
          shotId: selectedShotId,
          metadata: { category: sfxCategory, layerMode: sfxLayerMode },
          status: "completed",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "audio-tracks"] });
      toast({ title: "افکت صوتی تولید شد", description: `${toPersianNumber(duration)} ثانیه` });
      setSfxPrompt("");
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید افکت",
        variant: "destructive",
      });
    } finally {
      setSfxGenerating(false);
    }
  };

  // ── Add to Timeline with placement ──
  const handleAddToTimeline = (audio: GeneratedAudio) => {
    const placement: AudioPlacement = {
      startTime: selectedShot
        ? shots
            .filter((s) => s.order < selectedShot.order)
            .reduce((sum, s) => sum + (s.duration || 5), 0)
        : 0,
      trackIndex: -1,
      autoMatchDuration: autoMatchMusicDuration || autoMatchSfxDuration || autoMatchTtsDuration,
    };
    onAddToTimeline(audio, placement);
    toast({
      title: "به تایم‌لاین اضافه شد",
      description: `${audio.label} در پوزیشن ${toPersianNumber(Math.round(placement.startTime))} ثانیه`,
    });
  };

  // ── Delete from library ──
  const handleDelete = (id: string) => {
    setGeneratedAudio((prev) => prev.filter((a) => a.id !== id));
    if (activeAudioId === id) setActiveAudioId(null);
    if (isPlaying === id) {
      audioPlayer.pause();
      setIsPlaying(null);
    }
  };

  // ── Render ──
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <AudioWaveform className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">استودیو صدا</h2>
            <p className="text-xs text-muted-foreground">
              {shots.length} شات در {scenes.length} صحنه
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedShot && (
            <Badge variant="secondary" className="gap-1.5">
              <Target className="w-3 h-3" />
              {selectedShot.title}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Sidebar — Shot Context */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 pt-4 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                صحنه‌ها و شات‌ها
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <ScrollArea className="h-full px-3 pb-3">
                <div className="space-y-3">
                  {/* Entire project option */}
                  <button
                    onClick={() => setSelectedShotId(null)}
                    className={cn(
                      "w-full text-right p-2.5 rounded-lg text-sm transition-all",
                      selectedShotId === null
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">کل پروژه</div>
                    <div className="text-xs text-muted-foreground">
                      {toPersianNumber(totalDurationSec)} ثانیه
                    </div>
                  </button>

                  {/* Scenes */}
                  {scenes.map(([sceneNumber, sceneShots]) => (
                    <div key={sceneNumber} className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground px-1">
                        صحنه {toPersianNumber(sceneNumber)} — {sceneShots[0]?.sceneName || "بدون نام"}
                      </div>
                      {sceneShots.map((shot) => (
                        <button
                          key={shot.id}
                          onClick={() => setSelectedShotId(shot.id)}
                          className={cn(
                            "w-full text-right p-2 rounded-md text-xs transition-all border",
                            selectedShotId === shot.id
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "border-transparent hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{shot.title}</span>
                            <span className="text-muted-foreground mr-auto">
                              {toPersianNumber(shot.duration || 5)}s
                            </span>
                          </div>
                          <div className="text-muted-foreground truncate mt-0.5">
                            {shot.description?.slice(0, 40)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Shot Info Card */}
          {selectedShot && (
            <Card className="p-3 space-y-2 shrink-0">
              <div className="text-xs font-semibold text-muted-foreground">اطلاعات شات</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-md p-2">
                  <div className="text-muted-foreground">نوع شات</div>
                  <div className="font-medium">{selectedShot.shotType || "—"}</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <div className="text-muted-foreground">مدت</div>
                  <div className="font-medium">{toPersianNumber(selectedShot.duration || 5)}s</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <div className="text-muted-foreground">نور</div>
                  <div className="font-medium">{selectedShot.mainLight || "—"}</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <div className="text-muted-foreground">حرکت</div>
                  <div className="font-medium">{selectedShot.cameraMovement || "—"}</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Center — Generation Area */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Generation Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AudioGenerationType)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="music" className="gap-1.5 text-xs">
                <Music className="w-3.5 h-3.5" />
                موسیقی
              </TabsTrigger>
              <TabsTrigger value="tts" className="gap-1.5 text-xs">
                <Mic className="w-3.5 h-3.5" />
                گویندگی
              </TabsTrigger>
              <TabsTrigger value="sfx" className="gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5" />
                افکت صوتی
              </TabsTrigger>
            </TabsList>

            {/* MUSIC TAB */}
            <TabsContent value="music" className="flex-1 flex-col gap-3 min-h-0 overflow-y-auto">
              {/* Preset Quick Select */}
              <div className="flex gap-2 flex-wrap">
                {MUSIC_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setMusicPreset(preset.id);
                      setMusicGenre(preset.id.split("_")[0]);
                      setMusicMood(preset.id.split("_")[1]);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs transition-all border",
                      musicPreset === preset.id
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-muted-foreground text-[10px]">{preset.description}</div>
                  </button>
                ))}
              </div>

              {/* AI Prompt Generator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">پرامپت موسیقی</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoMatchMusicDuration}
                        onChange={(e) => setAutoMatchMusicDuration(e.target.checked)}
                        className="w-3.5 h-3.5 rounded"
                      />
                      هماهنگ با مدت شات
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAiGenerateMusicPrompt}
                      disabled={musicAiLoading}
                      className="gap-1.5 text-xs h-8"
                    >
                      {musicAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      تولید با AI
                    </Button>
                  </div>
                </div>
                <AnimatePresence>
                  {musicAiResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1.5 border border-amber-200 dark:border-amber-900"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] bg-white/50">{musicAiResult.genre}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-white/50">{musicAiResult.mood}</Badge>
                        <span className="text-muted-foreground">{musicAiResult.bpmRange} BPM</span>
                      </div>
                      {musicAiResult.instrumentation.length > 0 && (
                        <p className="text-muted-foreground">سازها: {musicAiResult.instrumentation.join("، ")}</p>
                      )}
                      {musicAiResult.sceneBreakdown && (
                        <p className="text-muted-foreground/80 leading-relaxed">{musicAiResult.sceneBreakdown}</p>
                      )}
                      {musicAiResult.cueSheet && (
                        <div className="space-y-1 mt-2">
                          <div className="font-semibold text-amber-700">کیو شیت:</div>
                          {musicAiResult.cueSheet.map((cue, i) => (
                            <div key={i} className="flex gap-2 text-[10px]">
                              <span className="font-mono text-amber-600">{cue.time}</span>
                              <span>{cue.cue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Textarea
                  placeholder="توصیف موسیقی به انگلیسی..."
                  className="min-h-[80px] resize-none"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Controls */}
              <div className="flex gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[140px]">
                  <label className="text-xs text-muted-foreground">ژانر</label>
                  <Select value={musicGenre} onValueChange={setMusicGenre}>
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">سینمایی</SelectItem>
                      <SelectItem value="electronic">الکترونیک</SelectItem>
                      <SelectItem value="orchestral">ارکسترال</SelectItem>
                      <SelectItem value="ambient">آمبیانتی</SelectItem>
                      <SelectItem value="pop">پاپ</SelectItem>
                      <SelectItem value="jazz">جاز</SelectItem>
                      <SelectItem value="rock">راک</SelectItem>
                      <SelectItem value="classical">کلاسیک</SelectItem>
                      <SelectItem value="lofi">لو-فای</SelectItem>
                      <SelectItem value="horror">ترسناک</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1 min-w-[140px]">
                  <label className="text-xs text-muted-foreground">حال و هوا</label>
                  <Select value={musicMood} onValueChange={setMusicMood}>
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dramatic">دراماتیک</SelectItem>
                      <SelectItem value="romantic">رمانتیک</SelectItem>
                      <SelectItem value="epic">حماسی</SelectItem>
                      <SelectItem value="sad">غمگین</SelectItem>
                      <SelectItem value="happy">شاد</SelectItem>
                      <SelectItem value="tense">تنش</SelectItem>
                      <SelectItem value="mysterious">مرموز</SelectItem>
                      <SelectItem value="calm">آرام</SelectItem>
                      <SelectItem value="energetic">پرانرژی</SelectItem>
                      <SelectItem value="melancholic">ملانکولیک</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>مدت (ثانیه)</span>
                  <span className="font-mono">{toPersianNumber(musicDuration)}</span>
                </label>
                <Slider
                  value={[musicDuration]}
                  onValueChange={([v]) => setMusicDuration(v)}
                  min={5}
                  max={60}
                  step={5}
                  disabled={autoMatchMusicDuration}
                />
                {autoMatchMusicDuration && selectedShot?.duration && (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-md px-2 py-1">
                    خودکار: {toPersianNumber(selectedShot.duration)} ثانیه (مدت شات)
                  </div>
                )}
              </div>

              <Button
                variant="aiGenerate"
                onClick={handleGenerateMusic}
                disabled={musicGenerating || !musicPrompt.trim()}
                className="w-full gap-2"
              >
                {musicGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال تولید موسیقی...
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    تولید موسیقی با ElevenLabs
                  </>
                )}
              </Button>
            </TabsContent>

            {/* VOICE-OVER / گویندگی TAB */}
            <TabsContent value="tts" className="flex-1 flex-col gap-3 min-h-0 overflow-y-auto">
              {/* Voice Presets */}
              <div className="grid grid-cols-2 gap-2">
                {VOICE_PRESETS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setTtsVoice(voice.id)}
                    className={cn(
                      "p-2.5 rounded-lg text-xs text-right transition-all border",
                      ttsVoice === voice.id
                        ? "bg-violet-500/10 border-violet-500/30 text-violet-600"
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">{voice.label}</div>
                    <div className="text-muted-foreground text-[10px]">{voice.description}</div>
                  </button>
                ))}
              </div>

              {/* Model + Emotion + Speed in one compact row */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">مدل</label>
                <div className="flex gap-1.5">
                  {VOICE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setTtsModel(m.id)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md border text-[11px] text-center transition-colors",
                        ttsModel === m.id
                          ? "bg-violet-500/10 border-violet-500/30 text-violet-600 font-medium"
                          : "border-border/40 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs text-muted-foreground">احساس</label>
                  <Select value={ttsEmotion} onValueChange={setTtsEmotion}>
                    <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">خنثی</SelectItem>
                      <SelectItem value="dramatic">دراماتیک</SelectItem>
                      <SelectItem value="sad">غمگین</SelectItem>
                      <SelectItem value="happy">شاد</SelectItem>
                      <SelectItem value="whispering">آرام</SelectItem>
                      <SelectItem value="excited">هیجان‌زده</SelectItem>
                      <SelectItem value="angry">جدی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>سرعت</span><span className="font-mono text-[11px]">{ttsSpeed}x</span>
                  </label>
                  <Slider value={[ttsSpeed]} onValueChange={([v]) => setTtsSpeed(v)} min={0.5} max={2} step={0.1} className="mt-2" />
                </div>
              </div>

              {/* Text area */}
              <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">متن گویندگی / روایت</label>
                  <div className="flex items-center gap-2">
                    {narrative?.script && (
                      <button
                        onClick={() => setTtsText(narrative.script || "")}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        از فیلمنامه
                      </button>
                    )}
                    {selectedShot && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        {selectedShot.title}
                      </span>
                    )}
                  </div>
                </div>
                <Textarea
                  placeholder="متن گویندگی، روایت یا دیالوگ را اینجا بنویسید..."
                  className="flex-1 resize-none min-h-[110px]"
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  dir="rtl"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{toPersianNumber(ttsText.length)} کاراکتر</span>
                  {ttsText.length > 0 && (
                    <span>~{toPersianNumber(Math.ceil(ttsText.length / 15))} ثانیه تخمینی</span>
                  )}
                </div>
              </div>

              <Button variant="aiGenerate" onClick={handleGenerateTTS} disabled={ttsGenerating || !ttsText.trim()} className="w-full gap-2">
                {ttsGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />در حال تولید...</>
                ) : (
                  <><Mic className="w-4 h-4" />تولید گویندگی با ElevenLabs</>
                )}
              </Button>
            </TabsContent>

            {/* SFX TAB */}
            <TabsContent value="sfx" className="flex-1 flex-col gap-3 min-h-0 overflow-y-auto">
              {/* Category Quick Select */}
              <div className="grid grid-cols-3 gap-2">
                {SFX_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSfxCategory(cat.id); setSfxPrompt(""); }}
                    className={cn(
                      "p-2 rounded-lg text-xs text-right transition-all border",
                      sfxCategory === cat.id
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600"
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className="font-medium">{cat.label}</div>
                    <div className="text-muted-foreground text-[10px]">{cat.examples}</div>
                  </button>
                ))}
              </div>

              {/* Quick fill prompts */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-muted-foreground">افکت‌های آماده — کلیک کنید تا انتخاب شود:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(SFX_QUICK_PROMPTS[sfxCategory] || []).map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => setSfxPrompt(qp.prompt)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-[11px] transition-colors",
                        sfxPrompt === qp.prompt
                          ? "bg-rose-500/15 border-rose-500/40 text-rose-600 font-medium"
                          : "border-border/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">توصیف افکت صوتی</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={sfxLayerMode} onChange={(e) => setSfxLayerMode(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                      لایه‌ای
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={autoMatchSfxDuration} onChange={(e) => setAutoMatchSfxDuration(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                      هماهنگ با شات
                    </label>
                    <Button variant="outline" size="sm" onClick={handleAiGenerateSfxPrompt} disabled={sfxAiLoading} className="gap-1.5 text-xs h-7">
                      {sfxAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder="توصیف به انگلیسی — یا از افکت‌های آماده بالا انتخاب کنید"
                  className="min-h-[70px] resize-none font-mono text-xs"
                  value={sfxPrompt}
                  onChange={(e) => setSfxPrompt(e.target.value)}
                  dir="ltr"
                />
                {sfxLayerMode && (
                  <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 rounded-md px-2 py-1">
                    لایه‌ای: چند صدا همزمان ترکیب می‌شود
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>مدت (ثانیه)</span>
                  <span className="font-mono">{toPersianNumber(sfxDuration)}s</span>
                </label>
                <Slider value={[sfxDuration]} onValueChange={([v]) => setSfxDuration(v)} min={1} max={22} step={1} disabled={autoMatchSfxDuration} />
                <div className="flex justify-between text-[9px] text-muted-foreground/60">
                  <span>۱s</span><span>۵s</span><span>۱۰s</span><span>۱۵s</span><span>۲۲s</span>
                </div>
                {autoMatchSfxDuration && selectedShot?.duration && (
                  <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 rounded-md px-2 py-1">
                    خودکار: {toPersianNumber(Math.min(selectedShot.duration, 22))} ثانیه (مدت شات)
                  </div>
                )}
              </div>

              <Button
                variant="aiGenerate"
                onClick={handleGenerateSFX}
                disabled={sfxGenerating || !sfxPrompt.trim()}
                className="w-full gap-2"
              >
                {sfxGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />در حال تولید افکت...</>
                ) : (
                  <><Zap className="w-4 h-4" />تولید افکت صوتی با ElevenLabs</>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar — Audio Library */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 pt-4 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  کتابخانه صدا
                </span>
                <span className="text-muted-foreground">
                  {toPersianNumber(generatedAudio.length + dbTracks.length)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <ScrollArea className="h-full px-3 pb-3">
                <div className="space-y-2">
                  {/* Generated Audio */}
                  {generatedAudio.map((audio) => (
                    <AudioLibraryCard
                      key={audio.id}
                      audio={audio}
                      isActive={activeAudioId === audio.id}
                      isPlaying={isPlaying === audio.id}
                      onPlay={() => togglePlay(audio)}
                      onAdd={() => handleAddToTimeline(audio)}
                      onDelete={() => handleDelete(audio.id)}
                      onSelect={() => setActiveAudioId(audio.id)}
                    />
                  ))}

                  {/* DB Tracks */}
                  {dbTracks
                    .filter((t) => t.generatedUrl && !generatedAudio.find((g) => g.id === `db-${t.id}`))
                    .map((track) => {
                      const dbAudio: GeneratedAudio = {
                        id: `db-${track.id}`,
                        label: track.label || track.name || "Track",
                        type: (track.type as "music" | "sfx" | "dialogue") || "music",
                        audioUrl: track.generatedUrl || "",
                        duration: track.duration || 5,
                        shotId: track.shotId,
                        metadata: track.metadata as Record<string, unknown> | undefined,
                      };
                      return (
                        <AudioLibraryCard
                          key={dbAudio.id}
                          audio={dbAudio}
                          isActive={activeAudioId === dbAudio.id}
                          isPlaying={isPlaying === dbAudio.id}
                          onPlay={() => togglePlay(dbAudio)}
                          onAdd={() => handleAddToTimeline(dbAudio)}
                          onDelete={() => {}}
                          onSelect={() => setActiveAudioId(dbAudio.id)}
                          isDb
                        />
                      );
                    })}

                  {generatedAudio.length === 0 && dbTracks.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <AudioWaveform className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      صدایی تولید نشده
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Mini Timeline Preview */}
          <Card className="p-3 shrink-0">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              پیش‌نمایش تایم‌لاین
            </div>
            <div className="h-16 bg-muted/30 rounded-lg relative overflow-hidden">
              {/* Track strips */}
              {timelineTracks
                .filter((t) => t.type === "audio")
                .map((track, idx) => (
                  <div
                    key={track.id}
                    className="absolute left-0 right-0 h-4 flex gap-0.5"
                    style={{ top: idx * 18 + 4 }}
                  >
                    {track.clips.map((clip) => {
                      const left = (clip.startTime / totalDurationSec) * 100;
                      const width = (clip.duration / totalDurationSec) * 100;
                      const color = clip.asset?.tags?.includes("sfx")
                        ? "bg-rose-400"
                        : clip.asset?.tags?.includes("music")
                        ? "bg-amber-400"
                        : "bg-blue-400";
                      return (
                        <div
                          key={clip.id}
                          className={cn("h-full rounded-sm", color)}
                          style={{ left: `${left}%`, width: `${width}%`, position: "absolute" }}
                        />
                      );
                    })}
                  </div>
                ))}
              {/* Time markers */}
              <div className="absolute bottom-0 left-0 right-0 h-3 flex text-[8px] text-muted-foreground">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div key={pct} className="absolute" style={{ left: `${pct}%` }}>
                    {toPersianNumber(Math.round((pct / 100) * totalDurationSec))}s
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────── */
/*  Audio Library Card Component    */
/* ──────────────────────────────── */

function AudioLibraryCard({
  audio,
  isActive,
  isPlaying,
  onPlay,
  onAdd,
  onDelete,
  onSelect,
  isDb,
}: {
  audio: GeneratedAudio;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onSelect: () => void;
  isDb?: boolean;
}) {
  const typeConfig = {
    music: { color: "amber", icon: Music, label: "موسیقی" },
    sfx: { color: "rose", icon: Volume2, label: "افکت" },
    dialogue: { color: "blue", icon: Mic, label: "گویندگی" },
  };
  const config = typeConfig[audio.type] || typeConfig.music;
  const Icon = config.icon;
  const colorClass = {
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
    rose: "bg-rose-500/10 text-rose-600 border-rose-200",
    blue: "bg-blue-500/10 text-blue-600 border-blue-200",
  }[config.color];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group p-2.5 rounded-lg border transition-all cursor-pointer",
        isActive ? colorClass : "border-transparent hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
            config.color === "amber" && "bg-amber-500/20",
            config.color === "rose" && "bg-rose-500/20",
            config.color === "blue" && "bg-blue-500/20"
          )}
        >
          <Icon className={cn("w-4 h-4", config.color === "amber" && "text-amber-500", config.color === "rose" && "text-rose-500", config.color === "blue" && "text-blue-500")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{audio.label}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span>{config.label}</span>
            <span>•</span>
            <span>{toPersianNumber(audio.duration)}s</span>
            {audio.shotId && <span>• شات {audio.shotId}</span>}
            {isDb && <Badge variant="outline" className="text-[8px] px-1 py-0">DB</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); onAdd(); }}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
          {!isDb && (
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
