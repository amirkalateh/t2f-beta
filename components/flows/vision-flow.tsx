"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  Eye, Plus, Sparkles, ChevronLeft, ChevronRight, Image as ImageIcon,
  Trash2, Loader2, Wand2, Check, Camera, Palette,
  Film, RefreshCw, Video, Clapperboard, Aperture, Focus, SunMedium, Layers,
  MapPin, Users, Package, Copy, ChevronDown, Hash, Upload, FolderOpen, X, Link2,
  Settings2, Lock, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn, toPersianNumber } from "@/lib/utils";
import {
  CAMERA_MODELS, LENS_TYPES,
  FOCAL_LENGTHS, CINEMA_ASPECT_RATIOS, CINEMATOGRAPHY_TEMPLATES,
  CINEMATOGRAPHY_PRESETS,
} from "@/lib/constants";
import { buildCinematographyPrompt, type PromptContext } from "@/lib/kling/prompt-builder";
import { MentionTextarea } from "@/components/elements/mention-textarea";
import { CinematographyDialog, CinematographyTrigger } from "@/components/ui/cinematography-dialog";
import SafeImage from "@/components/ui/safe-image";
import type {
  VisionBoard, Shot, ShotType, CameraMovement, CameraAngle,
  LightingPreset, CameraModel, LensType, FocalLength, CinemaAspectRatio,
  ShotFocus, CameraMechanism,
  Asset, SceneDefaults, GenerationVersion,
} from "@/lib/types";

interface VisionFlowProps {
  vision: VisionBoard | null;
  shots: Shot[];
  projectId?: string;
  projectScript?: string;
  projectStyle?: string;
  projectAspectRatio?: string;
  elements?: Asset[];
  onUpdateVision: (updates: Partial<VisionBoard>) => void;
  onAddShot: (shot: Partial<Shot>) => void;
  onUpdateShot: (id: number, updates: Partial<Shot>) => void;
  onDeleteShot: (id: number) => void;
  onGenerateImage: (shotId: number) => void;
  onGenerateEndFrame?: (shotId: number) => void;
  onGenerateAllImages?: () => void;
  onAutoStoryboard?: (shotCount?: number) => void;
  defaultShotCount?: number;
  onInsertShot?: (insertIndex: number, description: string) => Promise<boolean>;
  onOpenElements?: () => void;
  onNext: () => void;
  onBack: () => void;
  isGenerating?: boolean;
  selectedImageModel?: string;
  onImageModelChange?: (model: string) => void;
  humanFidelity?: number;
  onHumanFidelityChange?: (value: number) => void;
  enableContinuity?: boolean;
  onEnableContinuityChange?: (value: boolean) => void;
  continuityDepth?: number;
  onContinuityDepthChange?: (value: number) => void;
  shotFidelityOverrides?: Record<number, number>;
  onShotFidelityOverride?: (shotId: number, value: number | null) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  generated: "bg-green-500/10 text-green-600 border-green-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  approved: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  draft: "پیش‌نویس",
  generating: "در حال تولید",
  generated: "تولید شده",
  failed: "ناموفق",
  approved: "تایید شده",
  rejected: "رد شده",
};

const MODEL_LABELS: Record<string, string> = {
  "kling-v3-omni": "Kling v3 Omni",
  "kling-image-o1": "Kling O1 Omni",
  "kling-v3": "Kling v3",
  "kling-v2-1": "Kling v2.1",
  "kling-v2": "Kling v2",
  "kling-v1-5": "Kling v1.5",
  "kling-v1": "Kling v1",
};

const SCENE_COLORS = [
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-purple-500",
  "border-l-rose-500",
  "border-l-cyan-500",
  "border-l-orange-500",
  "border-l-indigo-500",
];

export function VisionFlow({
  vision,
  shots,
  projectId,
  projectScript,
  projectStyle,
  projectAspectRatio,
  elements = [],
  onUpdateVision,
  onAddShot,
  onUpdateShot,
  onDeleteShot,
  onGenerateImage,
  onGenerateEndFrame,
  onGenerateAllImages,
  onAutoStoryboard,
  defaultShotCount,
  onInsertShot,
  onOpenElements,
  onNext,
  onBack,
  isGenerating = false,
  selectedImageModel = "kling-v3-omni",
  onImageModelChange,
  humanFidelity = 0.85,
  onHumanFidelityChange,
  enableContinuity = true,
  onEnableContinuityChange,
  continuityDepth = 2,
  onContinuityDepthChange,
  shotFidelityOverrides = {},
  onShotFidelityOverride,
}: VisionFlowProps) {
  const [selectedShotId, setSelectedShotId] = useState<number | null>(
    shots.length > 0 ? shots[0].id : null
  );
  const [localShotCount, setLocalShotCount] = useState<number | undefined>(defaultShotCount);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [projectAssets, setProjectAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const shotFileInputRef = useRef<HTMLInputElement>(null);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const [insertDescription, setInsertDescription] = useState("");
  const [cinematographyOpen, setCinematographyOpen] = useState(false);
  const [insertGenerating, setInsertGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Full-size generation preview dialog
  const [previewVersion, setPreviewVersion] = useState<GenerationVersion | null>(null);

  useEffect(() => {
    if (shots.length > 0 && !selectedShotId) {
      setSelectedShotId(shots[0].id);
    }
  }, [shots]);

  const selectedShot = shots.find((s) => s.id === selectedShotId);
  const shotIndex = selectedShot ? shots.findIndex((s) => s.id === selectedShotId) : -1;

  const locationElements = useMemo(() => elements.filter(e => e.type === "location"), [elements]);
  const characterElements = useMemo(() => elements.filter(e => e.type === "character"), [elements]);
  const propElements = useMemo(() => elements.filter(e => e.type === "property"), [elements]);

  const scenesMap = useMemo(() => {
    const map = new Map<number, { name: string; shots: Shot[] }>();
    const unsorted: Shot[] = [];
    for (const shot of shots) {
      if (shot.sceneNumber != null) {
        if (!map.has(shot.sceneNumber)) {
          map.set(shot.sceneNumber, { name: shot.sceneName || `سکانس ${toPersianNumber(shot.sceneNumber)}`, shots: [] });
        }
        map.get(shot.sceneNumber)!.shots.push(shot);
      } else {
        unsorted.push(shot);
      }
    }
    return { scenes: map, unsorted };
  }, [shots]);

  const promptContext: PromptContext = useMemo(() => ({
    elements,
    sceneDefaults: vision?.sceneDefaults,
    allShots: undefined,
    enableContinuity,
    directorBrief: vision?.directorBrief,
  }), [elements, vision?.sceneDefaults, vision?.directorBrief, enableContinuity]);

  const finalPrompt = useMemo(() => {
    if (!selectedShot) return "";
    return buildCinematographyPrompt(selectedShot, promptContext);
  }, [selectedShot, promptContext]);

  const handleAddShot = () => {
    const maxScene = shots.reduce((max, s) => Math.max(max, s.sceneNumber || 0), 0);
    const currentScene = selectedShot?.sceneNumber || (maxScene > 0 ? maxScene : 1);
    onAddShot({
      title: "",
      description: "",
      prompt: "",
      order: shots.length,
      status: "draft",
      duration: 3,
      shotType: "medium",
      cameraMovement: "static",
      sceneNumber: currentScene,
      sceneName: selectedShot?.sceneName || `سکانس ${toPersianNumber(currentScene)}`,
    });
  };

  const handleAddScene = () => {
    const maxScene = shots.reduce((max, s) => Math.max(max, s.sceneNumber || 0), 0);
    const newSceneNum = maxScene + 1;
    onAddShot({
      title: "",
      description: "",
      prompt: "",
      order: shots.length,
      status: "draft",
      duration: 3,
      shotType: "establishing",
      cameraMovement: "static",
      sceneNumber: newSceneNum,
      sceneName: `سکانس ${toPersianNumber(newSceneNum)}`,
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!selectedShot) return;
    const template = CINEMATOGRAPHY_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    onUpdateShot(selectedShot.id, {
      cameraModel: template.cameraModel as CameraModel,
      lensType: template.lensType as LensType,
      focalLength: template.focalLength as FocalLength,
      cinemaAspectRatio: template.cinemaAspectRatio as CinemaAspectRatio,
      shotType: template.shotType as ShotType,
      cameraAngle: template.cameraAngle as CameraAngle,
      cameraMovement: template.cameraMovement as CameraMovement,
      keyLight: template.keyLight as LightingPreset,
      colorGrade: template.colorGrade,
    });
  };

  const handleApplySceneDefaults = () => {
    if (!selectedShot?.sceneNumber || !vision?.sceneDefaults) return;
    const defaults = vision.sceneDefaults[String(selectedShot.sceneNumber)];
    if (!defaults) return;
    const updates: Partial<Shot> = {};
    if (defaults.locationId) updates.locationId = defaults.locationId;
    if (defaults.keyLight) updates.keyLight = defaults.keyLight;
    if (defaults.colorGrade) updates.colorGrade = defaults.colorGrade;
    if (defaults.cameraModel) updates.cameraModel = defaults.cameraModel;
    if (defaults.lensType) updates.lensType = defaults.lensType;
    if (defaults.focalLength) updates.focalLength = defaults.focalLength;
    if (defaults.cameraMovement) updates.cameraMovement = defaults.cameraMovement;
    if (defaults.cameraAngle) updates.cameraAngle = defaults.cameraAngle;
    if (defaults.cinemaAspectRatio) updates.cinemaAspectRatio = defaults.cinemaAspectRatio;
    if (defaults.shotFocus) updates.shotFocus = defaults.shotFocus;
    if (defaults.cameraMechanism) updates.cameraMechanism = defaults.cameraMechanism;
    onUpdateShot(selectedShot.id, updates);
  };

  const handleSaveAsSceneDefault = () => {
    if (!selectedShot?.sceneNumber) return;
    const sceneKey = String(selectedShot.sceneNumber);
    const newDefaults: SceneDefaults = {
      locationId: selectedShot.locationId,
      keyLight: selectedShot.keyLight,
      colorGrade: selectedShot.colorGrade,
      cameraModel: selectedShot.cameraModel,
      lensType: selectedShot.lensType,
      focalLength: selectedShot.focalLength,
      cameraMovement: selectedShot.cameraMovement,
      cameraAngle: selectedShot.cameraAngle,
      cinemaAspectRatio: selectedShot.cinemaAspectRatio,
      shotFocus: selectedShot.shotFocus,
      cameraMechanism: selectedShot.cameraMechanism,
    };
    const existing = vision?.sceneDefaults || {};
    onUpdateVision({ sceneDefaults: { ...existing, [sceneKey]: newDefaults } });
  };

  const fetchProjectAssets = useCallback(async () => {
    if (!projectId) return;
    setAssetsLoading(true);
    try {
      const res = await fetch(`/api/assets?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const imageAssets = (data as Asset[]).filter(a => a.imageUrl || a.thumbnailUrl);
        setProjectAssets(imageAssets);
      }
    } catch (err) {
      console.error("Failed to fetch assets:", err);
    } finally {
      setAssetsLoading(false);
    }
  }, [projectId]);

  const handleOpenAssetPicker = () => {
    fetchProjectAssets();
    setShowAssetPicker(true);
  };

  const handleImportAssetImage = (asset: Asset) => {
    if (!selectedShot) return;
    const url = asset.imageUrl || asset.thumbnailUrl || asset.fileUrl;
    if (!url) return;
    onUpdateShot(selectedShot.id, { generatedImageUrl: url, status: "generated" });
    setShowAssetPicker(false);
  };

  const handleUploadShotImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedShot) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (projectId) formData.append("projectId", projectId);
      formData.append("folder", "shots");
      formData.append("name", selectedShot.title || `شات ${toPersianNumber(shotIndex + 1)}`);
      formData.append("type", "property");

      const res = await fetch("/api/blob/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.file?.url) {
          onUpdateShot(selectedShot.id, { generatedImageUrl: data.file.url, status: "generated" });
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
      if (shotFileInputRef.current) shotFileInputRef.current.value = "";
    }
  };

  const handleRemoveShotImage = () => {
    if (!selectedShot) return;
    onUpdateShot(selectedShot.id, { generatedImageUrl: null, status: "draft" });
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {}
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

  const handleToggleCharacter = (charId: number) => {
    if (!selectedShot) return;
    const current = (selectedShot.characterIds || []) as number[];
    const updated = current.includes(charId)
      ? current.filter(id => id !== charId)
      : [...current, charId];
    onUpdateShot(selectedShot.id, { characterIds: updated });
  };

  const handleToggleProp = (propId: number) => {
    if (!selectedShot) return;
    const current = (selectedShot.propIds || []) as number[];
    const updated = current.includes(propId)
      ? current.filter(id => id !== propId)
      : [...current, propId];
    onUpdateShot(selectedShot.id, { propIds: updated });
  };

  const getSceneColor = (sceneNum: number) => SCENE_COLORS[(sceneNum - 1) % SCENE_COLORS.length];

  const renderShotItem = (shot: Shot, index: number) => {
    const hasImage = !!shot.generatedImageUrl;
    const isGeneratingShot = shot.status === "generating";
    const canGenerate = !hasImage && !isGeneratingShot && !!(shot.prompt || shot.description);

    const hasPredecessorImage = enableContinuity && shots.some(
      (s) =>
        s.id !== shot.id &&
        (s.order ?? shots.indexOf(s)) < (shot.order ?? index) &&
        !!s.generatedImageUrl &&
        (shot.sceneNumber != null ? s.sceneNumber === shot.sceneNumber : true)
    );
    const hasCharacterRefs = (shot.characterIds as number[] || []).some((cid) => {
      const el = characterElements.find((c) => c.id === cid);
      return el && (el.imageUrl || el.thumbnailUrl);
    });
    const overrideFidelity = shotFidelityOverrides[shot.id];
    const effectiveShotFidelity = overrideFidelity ?? humanFidelity;
    const showFaceLock = effectiveShotFidelity >= 0.8 && hasCharacterRefs;

    return (
    <div
      key={shot.id}
      className={cn(
        "w-full rounded-lg text-right transition-all duration-200 border-r-0 overflow-hidden",
        shot.sceneNumber ? `border-l-[3px] ${getSceneColor(shot.sceneNumber)}` : "border-l-[3px] border-l-transparent",
        selectedShotId === shot.id
          ? "bg-primary/10 border border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_1px_6px_hsl(var(--primary)/0.12)]"
          : "hover-elevate border border-transparent hover:border-border/40"
      )}
    >
      <button
        onClick={() => setSelectedShotId(shot.id)}
        className="w-full px-2 py-1.5 text-right"
        data-testid={`button-select-shot-${shot.id}`}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-200 relative",
            hasImage ? "" : "bg-muted",
            selectedShotId === shot.id && hasImage && "ring-1 ring-primary/50"
          )}>
            {hasImage ? (
              <img src={shot.generatedImageUrl!} alt={`Shot ${index + 1}`} className="w-full h-full object-cover" />
            ) : isGeneratingShot ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {showFaceLock && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-violet-500/90 rounded-tl-md flex items-center justify-center">
                <Lock className="w-2 h-2 text-white" />
              </div>
            )}
            {hasPredecessorImage && !showFaceLock && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-sky-500/90 rounded-tl-md flex items-center justify-center">
                <Link2 className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {shot.title || `شات ${toPersianNumber(index + 1)}`}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {shot.description?.substring(0, 35) || "بدون توضیح"}
            </p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap overflow-hidden">
              <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shrink-0", statusColors[shot.status])}>
                {statusLabels[shot.status]}
              </Badge>
              {shot.locationId && locationElements.find(l => l.id === shot.locationId) && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 max-w-[80px] truncate">
                  <MapPin className="w-2 h-2 mr-0.5 shrink-0" />
                  <span className="truncate">{locationElements.find(l => l.id === shot.locationId)?.name?.substring(0, 8)}</span>
                </Badge>
              )}
              {(shot.characterIds || []).length > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 max-w-[80px] truncate">
                  <Users className="w-2 h-2 mr-0.5 shrink-0" />
                  <span className="truncate">{(shot.characterIds as number[]).map(cid => {
                    const c = characterElements.find(ch => ch.id === cid);
                    return c?.name?.substring(0, 5) || "";
                  }).filter(Boolean).join(", ")}</span>
                </Badge>
              )}
              {(shot.propIds || []).length > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 max-w-[80px] truncate">
                  <Package className="w-2 h-2 mr-0.5 shrink-0" />
                  <span className="truncate">{(shot.propIds as number[]).map(pid => {
                    const p = propElements.find(pr => pr.id === pid);
                    return p?.name?.substring(0, 5) || "";
                  }).filter(Boolean).join(", ")}</span>
                </Badge>
              )}
              {shot.transitionFromPrev && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400/40 bg-amber-500/10 text-amber-600 shrink-0">
                  {shot.transitionFromPrev === "cut" && "Cut"}
                  {shot.transitionFromPrev === "match_cut" && "MC"}
                  {shot.transitionFromPrev === "dissolve" && "Diss"}
                  {shot.transitionFromPrev === "fade" && "Fade"}
                  {shot.transitionFromPrev === "whip" && "Whip"}
                  {shot.transitionFromPrev === "j_cut" && "J-Cut"}
                  {shot.transitionFromPrev === "l_cut" && "L-Cut"}
                </Badge>
              )}
              {overrideFidelity !== undefined && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400/40 bg-amber-500/10 text-amber-600 shrink-0 font-mono">
                  {Math.round(overrideFidelity * 100)}٪
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>
      {canGenerate && (
        <div className="px-2 pb-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateImage(shot.id); }}
            className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/15 transition-colors"
            data-testid={`button-generate-first-frame-${shot.id}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            تولید فریم اول
          </button>
        </div>
      )}
      {onShotFidelityOverride && (
        <div className="px-2 pb-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-full flex items-center justify-center gap-1 py-0.5 rounded-md text-[10px] transition-colors",
                  overrideFidelity !== undefined
                    ? "text-amber-600 border border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/10"
                    : "text-muted-foreground/50 border border-dashed border-border/30 hover:text-muted-foreground hover:border-border/60"
                )}
              >
                <Settings2 className="w-2.5 h-2.5" />
                {overrideFidelity !== undefined
                  ? `وفاداری: ${Math.round(overrideFidelity * 100)}٪`
                  : "وفاداری شات"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 text-right" side="left" align="start">
              <div className="space-y-3" dir="rtl">
                <p className="text-xs font-medium">وفاداری این شات</p>
                <Slider
                  min={0.4}
                  max={1.0}
                  step={0.05}
                  value={[overrideFidelity ?? humanFidelity]}
                  onValueChange={([v]) => onShotFidelityOverride(shot.id, v)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>خلاق (۴۰٪)</span>
                  <span>دقیق (۱۰۰٪)</span>
                </div>
                {overrideFidelity !== undefined && (
                  <button
                    onClick={() => onShotFidelityOverride(shot.id, null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline w-full text-right"
                  >
                    بازنشانی به پیش‌فرض ({Math.round(humanFidelity * 100)}٪)
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
  };

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          <h2 className="text-base sm:text-lg font-bold">دکوپاژ و طراحی بصری</h2>
          <Badge variant="vision" className="text-[10px]">۳/۶</Badge>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {projectScript && (
            <div className="flex items-center gap-1">
              <Select
                value={localShotCount ? String(localShotCount) : "auto"}
                onValueChange={(v) => setLocalShotCount(v === "auto" ? undefined : parseInt(v))}
              >
                <SelectTrigger className="h-8 text-[11px] w-[65px] border-dashed" data-testid="select-shot-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">خودکار</SelectItem>
                  <SelectItem value="5">۵ شات</SelectItem>
                  <SelectItem value="8">۸ شات</SelectItem>
                  <SelectItem value="10">۱۰ شات</SelectItem>
                  <SelectItem value="12">۱۲ شات</SelectItem>
                  <SelectItem value="15">۱۵ شات</SelectItem>
                  <SelectItem value="20">۲۰ شات</SelectItem>
                  <SelectItem value="25">۲۵ شات</SelectItem>
                  <SelectItem value="30">۳۰ شات</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAutoStoryboard?.(localShotCount)}
                disabled={isGenerating}
                className="gap-1.5 h-8 text-xs px-2.5"
                data-testid="button-auto-storyboard"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">دکوپاژ خودکار</span>
                <span className="xs:hidden">خودکار</span>
              </Button>
            </div>
          )}
          {onOpenElements && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenElements}
              className="gap-1.5 h-8"
              data-testid="button-open-elements"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">عناصر</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs text-muted-foreground">
        {onImageModelChange && (
          <Select value={selectedImageModel} onValueChange={onImageModelChange}>
            <SelectTrigger className="h-7 text-[11px] w-[140px] border-dashed" data-testid="select-image-model">
              <SelectValue placeholder="مدل تصویر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kling-v3-omni">Kling v3 Omni (1K)</SelectItem>
              <SelectItem value="kling-image-o1">Kling O1 Omni</SelectItem>
              <SelectItem value="kling-v3">Kling v3</SelectItem>
              <SelectItem value="kling-v2-1">Kling v2.1</SelectItem>
              <SelectItem value="kling-v2">Kling v2</SelectItem>
              <SelectItem value="kling-v1-5">Kling v1.5</SelectItem>
              <SelectItem value="kling-v1">Kling v1</SelectItem>
            </SelectContent>
          </Select>
        )}
        {onHumanFidelityChange && (
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1 h-7 px-2 rounded-md border text-[11px] transition-colors",
              settingsOpen
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Settings2 className="w-3 h-3" />
            تنظیمات
            {settingsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {settingsOpen && onHumanFidelityChange && (
        <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 space-y-3 text-right" dir="rtl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium">وفاداری به چهره</span>
              <span className="text-[11px] font-mono text-primary">{Math.round(humanFidelity * 100)}٪</span>
            </div>
            <Slider
              min={0.4}
              max={1.0}
              step={0.05}
              value={[humanFidelity]}
              onValueChange={([v]) => onHumanFidelityChange(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/70 px-0.5">
              <span>خلاق</span>
              <span>متعادل</span>
              <span>دقیق</span>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={enableContinuity}
                onCheckedChange={onEnableContinuityChange}
                className="scale-90"
              />
              <span className="text-[11px] font-medium">پیوستگی شات‌ها</span>
            </div>
            {enableContinuity && onContinuityDepthChange && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-muted-foreground">عمق:</span>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => onContinuityDepthChange(d)}
                    className={cn(
                      "w-6 h-6 rounded border text-[10px] font-medium transition-colors",
                      continuityDepth === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isGenerating && shots.length === 0 && (
        <Card className="border-primary/30 bg-primary/5 mb-4">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">هوش مصنوعی در حال تحلیل فیلمنامه و ایجاد شات‌ها...</p>
              <p className="text-xs text-muted-foreground">این فرآیند ممکن است تا ۳۰ ثانیه طول بکشد</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-3" style={{ minHeight: "440px" }}>
        <div className={cn(
          "md:w-64 md:flex-shrink-0 md:block",
          selectedShotId ? "hidden md:block" : "block"
        )}>
          <Card className="h-full flex flex-col bg-[#03030300] text-[15px] text-right min-h-[280px] md:min-h-0">
            <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xs text-muted-foreground font-medium">شات‌ها · {toPersianNumber(shots.length)}</CardTitle>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" onClick={handleAddScene} title="سکانس جدید" data-testid="button-add-scene">
                    <Hash className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleAddShot} data-testid="button-add-shot">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 min-h-0">
              <ScrollArea className="h-full max-h-[40vh] md:max-h-full">
                <div className="space-y-1 px-1 py-1">
                  {shots.length === 0 && !isGenerating ? (
                    <div className="text-center py-8">
                      <Clapperboard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">هنوز شاتی ایجاد نشده</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {projectScript ? "از دکوپاژ خودکار استفاده کنید" : "شات‌ها را دستی اضافه کنید"}
                      </p>
                      <Button variant="outline" size="sm" onClick={handleAddShot} className="gap-2">
                        <Plus className="w-4 h-4" /> شات جدید
                      </Button>
                    </div>
                  ) : scenesMap.scenes.size > 0 ? (
                    <>
                      {Array.from(scenesMap.scenes.entries()).map(([sceneNum, scene]) => (
                        <div key={sceneNum} className="mb-2">
                          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md mb-1 bg-muted/50", `border-l-[3px] ${getSceneColor(sceneNum)}`)}>
                            <Hash className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-semibold text-muted-foreground truncate flex-1">
                              {scene.name}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {toPersianNumber(scene.shots.length)}
                            </Badge>
                          </div>
                          <div className="space-y-0">
                            {scene.shots.map((shot, idx) => {
                              const globalIdx = shots.indexOf(shot);
                              return (
                                <div key={shot.id}>
                                  {idx === 0 && onInsertShot && (
                                    <div className="flex justify-center py-0.5 group">
                                      <button
                                        onClick={() => handleOpenInsertDialog(globalIdx)}
                                        className="w-5 h-5 rounded-full border border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary"
                                        title="افزودن پلن"
                                        data-testid={`button-insert-before-${shot.id}`}
                                      >
                                        <Plus className="w-3 h-3 text-primary" />
                                      </button>
                                    </div>
                                  )}
                                  {renderShotItem(shot, globalIdx)}
                                  {onInsertShot && (
                                    <div className="flex justify-center py-0.5 group">
                                      <button
                                        onClick={() => handleOpenInsertDialog(globalIdx + 1)}
                                        className="w-5 h-5 rounded-full border border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary"
                                        title="افزودن پلن"
                                        data-testid={`button-insert-after-${shot.id}`}
                                      >
                                        <Plus className="w-3 h-3 text-primary" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {scenesMap.unsorted.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-1 bg-muted/50">
                            <span className="text-[10px] font-semibold text-muted-foreground">بدون سکانس</span>
                          </div>
                          <div className="space-y-0">
                            {scenesMap.unsorted.map((shot, idx) => {
                              const globalIdx = shots.indexOf(shot);
                              return (
                                <div key={shot.id}>
                                  {renderShotItem(shot, globalIdx)}
                                  {onInsertShot && (
                                    <div className="flex justify-center py-0.5 group">
                                      <button
                                        onClick={() => handleOpenInsertDialog(globalIdx + 1)}
                                        className="w-5 h-5 rounded-full border border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary"
                                        title="افزودن پلن"
                                        data-testid={`button-insert-after-unsorted-${shot.id}`}
                                      >
                                        <Plus className="w-3 h-3 text-primary" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    shots.map((shot, index) => (
                      <div key={shot.id}>
                        {index === 0 && onInsertShot && (
                          <div className="flex justify-center py-0.5 group">
                            <button
                              onClick={() => handleOpenInsertDialog(0)}
                              className="w-5 h-5 rounded-full border border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary"
                              title="افزودن پلن"
                              data-testid="button-insert-first"
                            >
                              <Plus className="w-3 h-3 text-primary" />
                            </button>
                          </div>
                        )}
                        {renderShotItem(shot, index)}
                        {onInsertShot && (
                          <div className="flex justify-center py-0.5 group">
                            <button
                              onClick={() => handleOpenInsertDialog(index + 1)}
                              className="w-5 h-5 rounded-full border border-dashed border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-primary/10 hover:border-primary"
                              title="افزودن پلن"
                              data-testid={`button-insert-flat-${index}`}
                            >
                              <Plus className="w-3 h-3 text-primary" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className={cn(
          "flex-1 min-w-0",
          !selectedShotId ? "hidden md:block" : "block"
        )}>
          {selectedShot ? (
            <Card className="h-full flex flex-col bg-[#05050500]">
              <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 md:hidden flex-shrink-0 -mr-1"
                      onClick={() => setSelectedShotId(null)}
                      aria-label="بازگشت به لیست"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <CardTitle className="text-sm truncate">
                      {selectedShot.title || `شات ${toPersianNumber(shotIndex + 1)}`}
                    </CardTitle>
                    {selectedShot.sceneNumber && (
                      <span className={cn("text-[10px] text-muted-foreground shrink-0 border-r-[2px] pr-1.5", getSceneColor(selectedShot.sceneNumber).replace("border-l-", "border-r-"))}>
                        {selectedShot.sceneName || `سکانس ${toPersianNumber(selectedShot.sceneNumber)}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onDeleteShot(selectedShot.id)} data-testid="button-delete-shot">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-4 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Start Frame */}
                      <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground/60 text-center font-medium tracking-wide uppercase">فریم شروع</p>
                        <div className={cn(
                          `${projectAspectRatio === "9:16" ? "aspect-[9/16]" : projectAspectRatio === "1:1" ? "aspect-square" : "aspect-video"} rounded-lg flex items-center justify-center relative overflow-hidden ring-1 ring-border/60`,
                          selectedShot.generatedImageUrl ? "bg-background" : "bg-muted/50 border border-dashed border-border/60"
                        )}>
                          {selectedShot.generatedImageUrl ? (
                            <>
                              <img src={selectedShot.generatedImageUrl} alt="Start Frame" className="w-full h-full object-cover" />
                              <div className="absolute top-1.5 left-1.5 border border-white/40 rounded px-1.5 py-0.5 bg-black/30">
                                <span className="text-[8px] text-white/80 font-medium tracking-wider">START FRAME</span>
                              </div>
                            </>
                          ) : selectedShot.status === "generating" || isUploading ? (
                            <div className="text-center p-2">
                              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-1" />
                              <p className="text-[9px] text-muted-foreground">{isUploading ? "آپلود..." : "تولید..."}</p>
                            </div>
                          ) : (
                            <div className="text-center p-2 space-y-1">
                              <ImageIcon className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                              <p className="text-[9px] text-muted-foreground/60">تصویری نیست</p>
                              <input type="file" ref={shotFileInputRef} className="hidden" accept="image/*" onChange={handleUploadShotImage} data-testid="input-shot-image-upload" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* End Frame */}
                      <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground/60 text-center font-medium tracking-wide uppercase">فریم پایان</p>
                        <div className={cn(
                          `${projectAspectRatio === "9:16" ? "aspect-[9/16]" : projectAspectRatio === "1:1" ? "aspect-square" : "aspect-video"} rounded-lg flex items-center justify-center relative overflow-hidden ring-1 ring-border/60`,
                          selectedShot.endFrameUrl ? "bg-background" : "bg-muted/50 border border-dashed border-border/60"
                        )}>
                          {selectedShot.endFrameUrl ? (
                            <>
                              <img src={selectedShot.endFrameUrl} alt="End Frame" className="w-full h-full object-cover" />
                              <div className="absolute top-1.5 right-1.5 border border-white/40 rounded px-1.5 py-0.5 bg-black/30">
                                <span className="text-[8px] text-white/80 font-medium tracking-wider">END FRAME</span>
                              </div>
                            </>
                          ) : selectedShot.status === "generating" ? (
                            <div className="text-center p-2">
                              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-1" />
                              <p className="text-[9px] text-muted-foreground">در حال تولید...</p>
                            </div>
                          ) : selectedShot.generatedImageUrl ? (
                            <div className="text-center p-2 space-y-1">
                              <Sparkles className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                              <p className="text-[9px] text-muted-foreground/60">فریم پایان ندارید</p>
                              <button
                                onClick={() => onGenerateEndFrame?.(selectedShot.id)}
                                className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/15 transition-colors"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                تولید فریم پایان
                              </button>
                            </div>
                          ) : (
                            <div className="text-center p-2 space-y-1">
                              <ImageIcon className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                              <p className="text-[9px] text-muted-foreground/60">ابتدا فریم شروع را تولید کنید</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedShot.generationVersions && (selectedShot.generationVersions as GenerationVersion[]).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground">تاریخچه تولید</span>
                          <span className="text-[10px] text-muted-foreground/60">{toPersianNumber((selectedShot.generationVersions as GenerationVersion[]).length)} نسخه</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(selectedShot.generationVersions as GenerationVersion[]).map((v, i) => {
                            const isImage = v.type === "image" || (!v.type && v.imageUrl);
                            const isActive = isImage
                              ? v.imageUrl === selectedShot.generatedImageUrl
                              : v.videoUrl === selectedShot.generatedVideoUrl;
                            const thumbUrl = isImage ? v.imageUrl : v.videoUrl;
                            return (
                              <div key={i} className="relative group">
                                <button
                                  onClick={() => {
                                    if (isImage && v.imageUrl) {
                                      onUpdateShot(selectedShot.id, { generatedImageUrl: v.imageUrl });
                                    } else if (v.videoUrl) {
                                      onUpdateShot(selectedShot.id, { generatedVideoUrl: v.videoUrl });
                                    }
                                  }}
                                  className={cn(
                                    "relative w-full aspect-video rounded-md overflow-hidden flex-shrink-0 transition-all",
                                    isActive
                                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                      : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-primary/40"
                                  )}
                                  data-testid={`button-version-thumbnail-${i}`}
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
                                {/* Preview eye — always visible, bottom-left */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewVersion(v); }}
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

                    <div className="flex gap-1.5">
                      <Button
                        className="flex-1 gap-1.5"
                        size="sm"
                        onClick={() => onGenerateImage(selectedShot.id)}
                        disabled={selectedShot.status === "generating" || (!selectedShot.prompt && !selectedShot.description)}
                        data-testid="button-generate-image"
                      >
                        {selectedShot.status === "generating" ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال تولید...</>
                        ) : selectedShot.generatedImageUrl ? (
                          <><RefreshCw className="w-3.5 h-3.5" /> تولید مجدد</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5" /> تولید تصویر</>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => shotFileInputRef.current?.click()} disabled={isUploading} data-testid="button-upload-shot-image-side">
                        <Upload className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleOpenAssetPicker} data-testid="button-import-from-assets-side">
                        <FolderOpen className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        MODEL_LABELS[selectedImageModel] || selectedImageModel,
                        selectedShot.cameraModel ? CAMERA_MODELS.find(c => c.id === selectedShot.cameraModel)?.labelEn : null,
                        selectedShot.lensType ? LENS_TYPES.find(l => l.id === selectedShot.lensType)?.labelEn : null,
                        selectedShot.keyLight ? CINEMATOGRAPHY_PRESETS.lighting.find(l => l.id === selectedShot.keyLight)?.labelEn : null,
                      ].filter(Boolean).map((tag, i) => (
                        <span key={i} className="text-[9px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">سکانس</label>
                        <Input
                          type="number" min={1}
                          value={selectedShot.sceneNumber || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || null;
                            onUpdateShot(selectedShot.id, {
                              sceneNumber: val,
                              sceneName: val ? `سکانس ${toPersianNumber(val)}` : null,
                            });
                          }}
                          className="h-7 text-xs"
                          data-testid="input-scene-number"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">نام سکانس</label>
                        <Input
                          value={selectedShot.sceneName || ""}
                          onChange={(e) => onUpdateShot(selectedShot.id, { sceneName: e.target.value })}
                          className="h-7 text-xs"
                          dir="rtl"
                          data-testid="input-scene-name"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">مدت (ثانیه)</label>
                        <Input
                          type="number" min={1} max={30}
                          value={selectedShot.duration || 3}
                          onChange={(e) => onUpdateShot(selectedShot.id, { duration: parseInt(e.target.value) || 3 })}
                          className="h-7 text-xs"
                          data-testid="input-shot-duration"
                        />
                      </div>
                    </div>

                    <CinematographyTrigger
                      values={{
                        shotType: selectedShot.shotType,
                        cameraAngle: selectedShot.cameraAngle,
                        cameraMovement: selectedShot.cameraMovement,
                        shotFocus: selectedShot.shotFocus,
                        cameraMechanism: selectedShot.cameraMechanism,
                      }}
                      onClick={() => setCinematographyOpen(true)}
                    />

                    <CinematographyDialog
                      open={cinematographyOpen}
                      onOpenChange={setCinematographyOpen}
                      values={{
                        shotType: selectedShot.shotType,
                        cameraAngle: selectedShot.cameraAngle,
                        cameraMovement: selectedShot.cameraMovement,
                        shotFocus: selectedShot.shotFocus,
                        cameraMechanism: selectedShot.cameraMechanism,
                      }}
                      onApply={(vals) => {
                        onUpdateShot(selectedShot.id, {
                          shotType: (vals.shotType as ShotType) || selectedShot.shotType,
                          cameraAngle: (vals.cameraAngle as CameraAngle) || selectedShot.cameraAngle,
                          cameraMovement: (vals.cameraMovement as CameraMovement) || selectedShot.cameraMovement,
                          shotFocus: (vals.shotFocus as ShotFocus) || selectedShot.shotFocus,
                          cameraMechanism: (vals.cameraMechanism as CameraMechanism) || selectedShot.cameraMechanism,
                        });
                      }}
                    />
                  </div>
                </div>

                {/* ━━━ عناصر صحنه — Visual Slot Grid ━━━ */}
                <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 shrink-0 overflow-visible">
                        <SafeImage src="/Deco/Camera.png" alt="Elements" fill sizes="28px" className="object-contain scale-90" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">عناصر صحنه (لوکیشن، شخصیت‌ها، پراپ‌ها)</span>
                    </div>
                    {onOpenElements && (
                      <button
                        onClick={onOpenElements}
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                        data-testid="button-manage-elements"
                      >
                        مدیریت
                      </button>
                    )}
                  </div>

                  <div className="p-2 space-y-1.5">
                    {/* ── Location Row ── */}
                    <div className="flex items-center gap-2">
                      {/* Category icon button */}
                      <button
                        onClick={onOpenElements}
                        className="w-11 h-11 rounded-xl border border-blue-500/30 flex items-center justify-center flex-shrink-0 hover:border-blue-500/60 hover:bg-blue-900/60 transition-all group mt-0.5 bg-[#ffffff00] opacity-[1] text-[#f2f2f2] border-t-[#3b82f600] border-r-[#3b82f600] border-b-[#3b82f600] border-l-[#3b82f600]"
                        title="لوکیشن"
                        data-testid="button-category-location"
                      >
                        <div className="relative w-7 h-7 overflow-visible">
                          <SafeImage src="/Deco/Location.png" alt="Location" fill sizes="32px" className="object-contain scale-90" />
                        </div>
                      </button>
                      {/* Slots */}
                      <div className="flex gap-1.5 flex-1 flex-wrap">
                        {(() => {
                          const assignedLoc = locationElements.find(l => l.id === selectedShot.locationId);
                          return (
                            <>
                              {/* Add slot */}
                              {!assignedLoc && (
                                <Select
                                  value={selectedShot.locationId ? String(selectedShot.locationId) : "none"}
                                  onValueChange={v => onUpdateShot(selectedShot.id, { locationId: v === "none" ? null : parseInt(v) })}
                                >
                                  <SelectTrigger
                                    className="w-11 h-11 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all [&>svg]:hidden p-0"
                                    data-testid="button-add-location"
                                  >
                                    <Plus className="w-4 h-4 text-muted-foreground/50" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locationElements.length === 0 ? (
                                      <SelectItem value="none">هنوز لوکیشنی ندارید</SelectItem>
                                    ) : (
                                      <>
                                        <SelectItem value="none">بدون لوکیشن</SelectItem>
                                        {locationElements.map(loc => (
                                          <SelectItem key={loc.id} value={String(loc.id)}>
                                            <div className="flex items-center gap-2">
                                              {loc.imageUrl && <img src={loc.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />}
                                              {loc.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                              {/* Assigned location */}
                              {assignedLoc && (
                                <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group text-right">
                                  {assignedLoc.imageUrl ? (
                                    <img src={assignedLoc.imageUrl} alt={assignedLoc.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0 border-t-[#e6e3e8] border-r-[#e6e3e8] border-b-[#e6e3e8] border-l-[#e6e3e8] opacity-[1] ml-[0px] mr-[0px]" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-md bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                  )}
                                  <span className="text-[10px] font-medium truncate max-w-[80px]">{assignedLoc.name}</span>
                                  <button
                                    onClick={() => onUpdateShot(selectedShot.id, { locationId: null })}
                                    className="ml-auto text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                    data-testid="button-remove-location"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {/* Empty second slot */}
                              <div className="w-11 h-11 rounded-lg border-2 border-dashed border-border/20 flex items-center justify-center opacity-40">
                                <span className="text-[10px] text-muted-foreground/30">—</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* ── Characters Row ── */}
                    <div className="flex items-start gap-2">
                      <button
                        onClick={onOpenElements}
                        className="w-11 h-11 rounded-xl border border-blue-500/30 flex items-center justify-center flex-shrink-0 hover:border-blue-500/60 hover:bg-blue-900/60 transition-all group mt-0.5 border-t-[#3b82f600] border-r-[#3b82f600] border-b-[#3b82f600] border-l-[#3b82f600] text-[#f2f2f2] bg-[#1e3a8a00]"
                        title="شخصیت‌ها"
                        data-testid="button-category-character"
                      >
                        <div className="relative w-7 h-7 overflow-visible">
                          <SafeImage src="/Deco/Character.png" alt="Character" fill sizes="32px" className="object-contain scale-90" />
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {/* Assigned characters */}
                        {characterElements.map(char => {
                          const isSelected = ((selectedShot.characterIds || []) as number[]).includes(char.id);
                          return (
                            <button
                              key={char.id}
                              onClick={() => handleToggleCharacter(char.id)}
                              className={cn(
                                "flex flex-col items-center gap-0.5 p-1 rounded-lg border transition-all",
                                isSelected
                                  ? "bg-blue-500/10 border-blue-500/40"
                                  : "border-dashed border-border/30 opacity-50 hover:opacity-80 hover:border-border/60"
                              )}
                              data-testid={`button-toggle-char-${char.id}`}
                              title={char.name}
                            >
                              {char.imageUrl ? (
                                <div className="w-9 h-9 rounded-md overflow-hidden bg-muted relative">
                                  <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                                  {isSelected && (
                                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-blue-500 border border-background flex items-center justify-center">
                                      <Check className="w-1.5 h-1.5 text-white" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="text-[9px] text-muted-foreground truncate w-9 text-center leading-none">{char.name.substring(0, 5)}</span>
                            </button>
                          );
                        })}
                        {/* Empty add slot */}
                        <button
                          onClick={onOpenElements}
                          className="w-11 h-11 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                          data-testid="button-add-character"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground/50" />
                        </button>
                      </div>
                    </div>

                    {/* ── Props Row ── */}
                    <div className="flex items-start gap-2">
                      <button
                        onClick={onOpenElements}
                        className="w-11 h-11 rounded-xl border border-blue-500/30 flex items-center justify-center flex-shrink-0 hover:border-blue-500/60 hover:bg-blue-900/60 transition-all group mt-0.5 border-t-[#6b565600] border-r-[#6b565600] border-b-[#6b565600] border-l-[#6b565600] bg-[#ffffff00]"
                        title="پراپ‌ها"
                        data-testid="button-category-prop"
                      >
                        <div className="relative w-7 h-7 overflow-visible">
                          <SafeImage src="/Deco/Prop.png" alt="Prop" fill sizes="32px" className="object-contain scale-90" />
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {propElements.map(prop => {
                          const isSelected = ((selectedShot.propIds || []) as number[]).includes(prop.id);
                          return (
                            <button
                              key={prop.id}
                              onClick={() => handleToggleProp(prop.id)}
                              className={cn(
                                "flex flex-col items-center gap-0.5 p-1 rounded-lg border transition-all",
                                isSelected
                                  ? "bg-amber-500/10 border-amber-500/40"
                                  : "border-dashed border-border/30 opacity-50 hover:opacity-80 hover:border-border/60"
                              )}
                              data-testid={`button-toggle-prop-${prop.id}`}
                              title={prop.name}
                            >
                              {prop.imageUrl ? (
                                <div className="w-9 h-9 rounded-md overflow-hidden bg-muted relative">
                                  <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover" />
                                  {isSelected && (
                                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-amber-500 border border-background flex items-center justify-center">
                                      <Check className="w-1.5 h-1.5 text-white" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="text-[9px] text-muted-foreground truncate w-9 text-center leading-none">{prop.name.substring(0, 5)}</span>
                            </button>
                          );
                        })}
                        {/* Empty add slot */}
                        <button
                          onClick={onOpenElements}
                          className="w-11 h-11 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                          data-testid="button-add-prop"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground/50" />
                        </button>
                      </div>
                    </div>

                    {/* ── Camera/Motion Icon Row ── */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                      <button
                        className="w-11 h-11 rounded-xl border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-[#f2f2f200] bg-[#f2f2f200] border-t-[#cfb6b600] border-r-[#cfb6b600] border-b-[#cfb6b600] border-l-[#cfb6b600]"
                        title="تجهیزات"
                      >
                        <div className="relative w-7 h-7 overflow-visible">
                          <SafeImage src="/Deco/Motion_Control.png" alt="Camera" fill sizes="32px" className="object-contain scale-90" />
                        </div>
                      </button>
                      {/* Cinema motion/crowd icon row */}
                      <div className="flex items-center gap-1.5 overflow-x-auto flex-1">
                        {[
                          { src: "/icons/cinema/motion-graph/ease-in.png", alt: "ease-in", title: "Ease In" },
                          { src: "/icons/cinema/motion-graph/ease-out.png", alt: "ease-out", title: "Ease Out" },
                          { src: "/icons/cinema/motion-graph/easy-ease.png", alt: "easy-ease", title: "Easy Ease" },
                          { src: "/icons/cinema/shot-size/medium.png", alt: "medium", title: "مدیوم" },
                          { src: "/icons/cinema/shot-size/close-up.png", alt: "close-up", title: "کلوزآپ" },
                          { src: "/icons/cinema/shot-size/extreme-long.png", alt: "extreme-long", title: "اکستریم لانگ" },
                        ].map((icon, i) => (
                          <button
                            key={i}
                            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border border-border/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                            title={icon.title}
                          >
                            <div className="relative w-5 h-5">
                              <SafeImage src={icon.src} alt={icon.alt} fill sizes="28px" className="object-contain opacity-60 hover:opacity-100 ml-[0px] mr-[0px]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Palette className="w-3 h-3" /> توضیح صحنه (فارسی)
                    </label>
                    <Textarea
                      placeholder="توضیح دقیق صحنه به فارسی..."
                      className="min-h-[60px] resize-none text-sm"
                      value={selectedShot.description || ""}
                      onChange={(e) => onUpdateShot(selectedShot.id, { description: e.target.value })}
                      dir="rtl"
                      data-testid="input-shot-description"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary/70" /> پرامپت تولید (انگلیسی)
                    </label>
                    <MentionTextarea
                      placeholder="English prompt... Use @ to mention elements"
                      className="min-h-[60px] resize-none font-mono text-xs"
                      value={selectedShot.prompt || ""}
                      onChange={(val) => onUpdateShot(selectedShot.id, { prompt: val })}
                      elements={elements}
                      dir="ltr"
                      data-testid="input-shot-prompt"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] text-muted-foreground h-5 px-1 gap-1"
                        onClick={() => setShowPromptPreview(!showPromptPreview)}
                        data-testid="button-toggle-prompt-preview"
                      >
                        <Eye className="w-3 h-3" />
                        پرامپت نهایی
                        <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", showPromptPreview && "rotate-180")} />
                      </Button>
                      {showPromptPreview && (
                        <Button variant="ghost" size="sm" className="text-[10px] text-primary h-5 px-1 gap-0.5" onClick={handleCopyPrompt} data-testid="button-copy-prompt">
                          {copiedPrompt ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          {copiedPrompt ? "کپی شد" : "کپی"}
                        </Button>
                      )}
                    </div>
                    {showPromptPreview && (
                      <div className="mt-1 p-2.5 rounded-md bg-muted/30">
                        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap" dir="ltr">
                          {finalPrompt || "پرامپت یا توضیح صحنه وارد کنید"}
                        </p>
                        {(() => {
                          const charIds = (selectedShot.characterIds || []) as number[];
                          const refCount = charIds.filter(id => characterElements.find(c => c.id === id && c.imageUrl)).length
                            + (selectedShot.locationId && locationElements.find(l => l.id === selectedShot.locationId && l.imageUrl) ? 1 : 0)
                            + ((selectedShot.propIds || []) as number[]).filter(id => propElements.find(p => p.id === id && p.imageUrl)).length;
                          return refCount > 0 ? (
                            <p className="text-[9px] text-primary/60 mt-1.5 pt-1.5 border-t border-border/30">
                              {toPersianNumber(refCount)} تصویر مرجع ارسال می‌شود
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="cinema" className="border-none">
                    <AccordionTrigger className="py-1.5 text-xs font-medium hover:no-underline text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7 shrink-0 overflow-visible">
                          <SafeImage src="/Deco/Motion_Control.png" alt="Cinema" fill sizes="28px" className="object-contain scale-90" />
                        </div>
                        تجهیزات و تنظیمات فنی
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-wrap gap-1">
                          {CINEMATOGRAPHY_TEMPLATES.map((template) => (
                            <Button
                              key={template.id}
                              variant="ghost"
                              size="sm"
                              className="text-[10px] text-muted-foreground h-6 px-2"
                              onClick={() => handleApplyTemplate(template.id)}
                              data-testid={`button-template-${template.id}`}
                            >
                              {template.label}
                            </Button>
                          ))}
                        </div>

                        {selectedShot.sceneNumber && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-6 px-2 gap-1" onClick={handleSaveAsSceneDefault} data-testid="button-save-scene-default">
                              <Check className="w-2.5 h-2.5" /> ذخیره پیش‌فرض سکانس
                            </Button>
                            {vision?.sceneDefaults?.[String(selectedShot.sceneNumber)] && (
                              <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-6 px-2 gap-1" onClick={handleApplySceneDefaults} data-testid="button-apply-scene-default">
                                <RefreshCw className="w-2.5 h-2.5" /> اعمال پیش‌فرض
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-muted-foreground">دوربین</label>
                            <Select value={selectedShot.cameraModel || ""} onValueChange={(v) => onUpdateShot(selectedShot.id, { cameraModel: v as CameraModel })}>
                              <SelectTrigger className="h-7 text-xs" data-testid="select-camera-model"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                              <SelectContent>{CAMERA_MODELS.map((c) => (<SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-muted-foreground">لنز</label>
                            <Select value={selectedShot.lensType || ""} onValueChange={(v) => onUpdateShot(selectedShot.id, { lensType: v as LensType })}>
                              <SelectTrigger className="h-7 text-xs" data-testid="select-lens-type"><SelectValue placeholder="نوع لنز" /></SelectTrigger>
                              <SelectContent>{LENS_TYPES.map((l) => (<SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-muted-foreground">فاصله کانونی</label>
                            <Select value={selectedShot.focalLength || ""} onValueChange={(v) => onUpdateShot(selectedShot.id, { focalLength: v as FocalLength })}>
                              <SelectTrigger className="h-7 text-xs" data-testid="select-focal-length"><SelectValue placeholder="فاصله" /></SelectTrigger>
                              <SelectContent>{FOCAL_LENGTHS.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-muted-foreground">نسبت تصویر</label>
                            <Select value={selectedShot.cinemaAspectRatio || ""} onValueChange={(v) => onUpdateShot(selectedShot.id, { cinemaAspectRatio: v as CinemaAspectRatio })}>
                              <SelectTrigger className="h-7 text-xs" data-testid="select-cinema-aspect"><SelectValue placeholder="نسبت" /></SelectTrigger>
                              <SelectContent>{CINEMA_ASPECT_RATIOS.map((a) => (<SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-muted-foreground">نورپردازی</label>
                            <Select value={selectedShot.keyLight || ""} onValueChange={(v) => onUpdateShot(selectedShot.id, { keyLight: v as LightingPreset })}>
                              <SelectTrigger className="h-7 text-xs" data-testid="select-key-light"><SelectValue placeholder="نور" /></SelectTrigger>
                              <SelectContent>{CINEMATOGRAPHY_PRESETS.lighting.map((l) => (<SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-muted-foreground">کالر گرید</label>
                            <Input
                              placeholder="e.g. warm golden tones"
                              className="h-7 text-xs"
                              value={selectedShot.colorGrade || ""}
                              onChange={(e) => onUpdateShot(selectedShot.id, { colorGrade: e.target.value })}
                              dir="ltr"
                              data-testid="input-color-grade"
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dialogue" className="border-none">
                    <AccordionTrigger className="py-1.5 text-xs font-medium hover:no-underline text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5" />
                        دیالوگ و یادداشت
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-1">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-muted-foreground">دیالوگ</label>
                          <Textarea
                            placeholder="دیالوگ این شات..."
                            className="min-h-[50px] resize-none text-sm"
                            value={selectedShot.dialogueText || ""}
                            onChange={(e) => onUpdateShot(selectedShot.id, { dialogueText: e.target.value })}
                            dir="rtl"
                            data-testid="input-dialogue"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-muted-foreground">یادداشت کارگردان</label>
                          <Textarea
                            placeholder="یادداشت‌ها..."
                            className="min-h-[50px] resize-none text-sm"
                            value={selectedShot.notes || ""}
                            onChange={(e) => onUpdateShot(selectedShot.id, { notes: e.target.value })}
                            dir="rtl"
                            data-testid="input-notes"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-8 max-w-sm">
                <Clapperboard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-sm font-medium mb-1">شاتی انتخاب نشده</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {shots.length > 0
                    ? "یک شات از لیست سمت راست انتخاب کنید"
                    : projectScript
                    ? "فیلمنامه آماده است. از دکوپاژ خودکار استفاده کنید یا شات جدید بسازید"
                    : "ابتدا فیلمنامه را بنویسید، سپس شات‌ها ساخته می‌شوند"}
                </p>
                <div className="flex items-center gap-2 justify-center flex-wrap">
                  {projectScript && (
                    <Button size="sm" onClick={() => onAutoStoryboard?.()} disabled={isGenerating} className="gap-1.5">
                      <Wand2 className="w-3.5 h-3.5" />
                      دکوپاژ خودکار
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleAddShot} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> شات دستی
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-3 mt-2 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground" data-testid="button-prev-stage">
          <ChevronRight className="w-3.5 h-3.5" />
          بازگشت
        </Button>
        <Button size="sm" onClick={onNext} className="gap-1.5" data-testid="button-next-stage">
          ذخیره و ادامه
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Dialog open={showAssetPicker} onOpenChange={setShowAssetPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              انتخاب تصویر از گالری پروژه
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            تصاویر تولید شده با Omni Agent، آپلود شده، یا دارایی‌های پروژه
          </p>
          <ScrollArea className="flex-1 max-h-[60vh]">
            {assetsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : projectAssets.length === 0 ? (
              <div className="text-center py-12 px-6">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">هیچ تصویری یافت نشد</p>
                <p className="text-xs text-muted-foreground">
                  ابتدا با Omni Agent تصویر بسازید یا از بخش عناصر تصویر آپلود کنید
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
                {projectAssets.map((asset) => (
                  <button
                    key={asset.id}
                    className="group rounded-lg overflow-hidden border border-border/50 hover-elevate transition-all text-right"
                    onClick={() => handleImportAssetImage(asset)}
                    data-testid={`asset-pick-${asset.id}`}
                  >
                    <div className={`${projectAspectRatio === "9:16" ? "aspect-[9/16]" : projectAspectRatio === "1:1" ? "aspect-square" : "aspect-video"} bg-muted relative`}>
                      <img
                        src={asset.thumbnailUrl || asset.imageUrl || ""}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                      {asset.source === "omni" && (
                        <Badge variant="secondary" className="absolute top-1 right-1 text-[9px] px-1 py-0">
                          Omni
                        </Badge>
                      )}
                      {asset.source === "uploaded" && (
                        <Badge variant="secondary" className="absolute top-1 right-1 text-[9px] px-1 py-0">
                          آپلود
                        </Badge>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[11px] font-medium truncate">{asset.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{asset.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="pt-3 border-t border-border flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { shotFileInputRef.current?.click(); setShowAssetPicker(false); }} data-testid="button-upload-from-picker">
              <Upload className="w-3.5 h-3.5" />
              آپلود از دستگاه
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAssetPicker(false)} data-testid="button-close-asset-picker">
              بستن
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                پلن جدید بین {insertIndex > 0 ? `پلن ${toPersianNumber(insertIndex)}` : "ابتدا"} و {insertIndex < shots.length ? `پلن ${toPersianNumber(insertIndex + 1)}` : "انتها"} قرار می‌گیرد و با رنگ، نور، لوکیشن و تنظیمات صحنه هماهنگ می‌شود.
              </span>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">توضیح پلن مورد نظر</label>
              <Textarea
                placeholder="مثال: نمای نزدیک از دست‌های شخصیت که در را باز می‌کند..."
                className="min-h-[100px] resize-none"
                value={insertDescription}
                onChange={(e) => setInsertDescription(e.target.value)}
                dir="rtl"
                disabled={insertGenerating}
                data-testid="input-insert-description"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                هوش مصنوعی تمام جزئیات فنی (دوربین، لنز، نور، رنگ) را از پلن‌های مجاور استخراج می‌کند
              </p>
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setInsertDialogOpen(false)}
              disabled={insertGenerating}
              data-testid="button-cancel-insert"
            >
              انصراف
            </Button>
            <Button
              variant="aiGenerate"
              onClick={handleConfirmInsert}
              disabled={!insertDescription.trim() || insertGenerating}
              className="gap-2"
              data-testid="button-confirm-insert"
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
                  <video
                    src={previewVersion.videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={previewVersion.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="px-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {previewVersion.type === "video" ? "ویدیو" : "تصویر"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {MODEL_LABELS[previewVersion.model] || previewVersion.model}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(previewVersion.timestamp).toLocaleString("fa-IR")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{previewVersion.prompt}</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (selectedShot) {
                        if (previewVersion.imageUrl) {
                          onUpdateShot(selectedShot.id, { generatedImageUrl: previewVersion.imageUrl });
                        } else if (previewVersion.videoUrl) {
                          onUpdateShot(selectedShot.id, { generatedVideoUrl: previewVersion.videoUrl });
                        }
                      }
                      setPreviewVersion(null);
                    }}
                  >
                    <Check className="w-3.5 h-3.5 ml-1" />
                    انتخاب به عنوان فعال
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPreviewVersion(null)}>
                    بستن
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
