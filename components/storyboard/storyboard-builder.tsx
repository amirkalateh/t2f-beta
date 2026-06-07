"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import SafeImage from "@/components/ui/safe-image";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Clock,
  Camera,
  Video,
  Wand2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getShotTypeIcon, getCameraMovementIcon } from "@/lib/cinema-icons";
import type { ShotType, CameraMovement } from "@/lib/types";

export interface StoryboardShot {
  id: string;
  orderIndex: number;
  description: string;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  duration: number;
  imageUrl: string | null;
}

const SHOT_TYPES: Record<ShotType, { label: string; labelFa: string }> = {
  extreme_close_up: { label: "Extreme Close-Up", labelFa: "کلوزآپ شدید" },
  close_up: { label: "Close-Up", labelFa: "کلوزآپ" },
  medium_close_up: { label: "Medium Close-Up", labelFa: "مدیوم کلوزآپ" },
  medium: { label: "Medium", labelFa: "نمای متوسط" },
  medium_wide: { label: "Medium Wide", labelFa: "مدیوم واید" },
  wide: { label: "Wide", labelFa: "نمای باز" },
  extreme_wide: { label: "Extreme Wide", labelFa: "نمای بسیار باز" },
  establishing: { label: "Establishing", labelFa: "استابلیشینگ" },
  insert: { label: "Insert", labelFa: "اینسرت" },
  cutaway: { label: "Cutaway", labelFa: "کات‌اوی" },
  two_shot: { label: "Two-Shot", labelFa: "دو نفره" },
  over_shoulder: { label: "Over-the-Shoulder", labelFa: "اور شولدر" },
};

const CAMERA_MOVEMENTS: Record<CameraMovement, { label: string; labelFa: string }> = {
  static: { label: "Static", labelFa: "ثابت" },
  pan: { label: "Pan", labelFa: "پن" },
  tilt: { label: "Tilt", labelFa: "تیلت" },
  dolly_in: { label: "Dolly In", labelFa: "دالی جلو" },
  dolly_out: { label: "Dolly Out", labelFa: "دالی عقب" },
  truck: { label: "Truck", labelFa: "تراک" },
  crane: { label: "Crane", labelFa: "کرین" },
  handheld: { label: "Handheld", labelFa: "دستی" },
  steadicam: { label: "Steadicam", labelFa: "استدی‌کم" },
  whip_pan: { label: "Whip Pan", labelFa: "ویپ پن" },
  zoom: { label: "Zoom", labelFa: "زوم" },
  push_in: { label: "Push In", labelFa: "پوش این" },
  pull_out: { label: "Pull Out", labelFa: "پول اوت" },
  arc: { label: "Arc", labelFa: "آرک" },
};

interface ShotFormData {
  description: string;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  duration: number;
}

const initialFormData: ShotFormData = {
  description: "",
  shotType: "medium",
  cameraMovement: "static",
  duration: 3,
};

interface StoryboardBuilderProps {
  scriptContent?: string;
  onGenerateFromScript?: () => void;
  isGeneratingScript?: boolean;
}

export function StoryboardBuilder({
  scriptContent,
  onGenerateFromScript,
  isGeneratingScript,
}: StoryboardBuilderProps) {
  const [shots, setShots] = useState<StoryboardShot[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShotFormData>(initialFormData);

  const totalDuration = useMemo(() => {
    return shots.reduce((sum, shot) => sum + shot.duration, 0);
  }, [shots]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCreateShot = () => {
    setEditingShotId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEditShot = (shot: StoryboardShot) => {
    setEditingShotId(shot.id);
    setFormData({
      description: shot.description,
      shotType: shot.shotType,
      cameraMovement: shot.cameraMovement,
      duration: shot.duration,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingShotId) {
      setShots((prev) =>
        prev.map((shot) =>
          shot.id === editingShotId
            ? { ...shot, ...formData }
            : shot
        )
      );
    } else {
      const newShot: StoryboardShot = {
        id: `shot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderIndex: shots.length,
        ...formData,
        imageUrl: null,
      };
      setShots((prev) => [...prev, newShot]);
      setSelectedShotId(newShot.id);
    }
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingShotId(null);
  };

  const handleDeleteShot = (id: string) => {
    setShots((prev) => {
      const filtered = prev.filter((shot) => shot.id !== id);
      return filtered.map((shot, index) => ({ ...shot, orderIndex: index }));
    });
    if (selectedShotId === id) {
      setSelectedShotId(null);
    }
  };

  const handleReorder = (reorderedShots: StoryboardShot[]) => {
    setShots(reorderedShots.map((shot, index) => ({ ...shot, orderIndex: index })));
  };

  const [isAutoPlanning, setIsAutoPlanning] = useState(false);

  const handleGenerateBreakdown = async () => {
    if (!scriptContent) return;
    setIsAutoPlanning(true);
    try {
      const res = await fetch('/api/ai/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptContent }),
      });
      const data = await res.json();
      if (data.shots && data.shots.length > 0) {
        const validShotTypes = Object.keys(SHOT_TYPES) as ShotType[];
        const validMovements = Object.keys(CAMERA_MOVEMENTS) as CameraMovement[];
        const mappedShots: StoryboardShot[] = data.shots.map((s: any, i: number) => ({
          id: `shot-${Date.now()}-${i}`,
          orderIndex: i,
          description: s.description || s.title || '',
          shotType: validShotTypes.includes(s.shotType) ? s.shotType : "medium",
          cameraMovement: validMovements.includes(s.cameraMovement) ? s.cameraMovement : "static",
          duration: Number(s.duration) || 3,
          imageUrl: null,
        }));
        setShots(mappedShots);
        if (mappedShots.length > 0) setSelectedShotId(mappedShots[0].id);
      }
    } catch (error) {
      console.error('Auto Plan AI failed:', error);
    } finally {
      setIsAutoPlanning(false);
    }
  };

  const selectedShot = shots.find((s) => s.id === selectedShotId);

  return (
    <div className="flex h-full">
      {/* Left Panel - Script & Tools */}
      <div className="w-80 border-l border-border/30 flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-border/30">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            فیلمنامه
          </h3>
          <Textarea
            placeholder="فیلمنامه یا ایده خود را اینجا بنویسید..."
            className="min-h-[150px] text-sm"
            dir="rtl"
            defaultValue={scriptContent}
            data-testid="input-script"
          />
        </div>
        <div className="p-4 space-y-3">
          <Button
            variant="aiGenerate"
            className="w-full gap-2"
            onClick={handleGenerateBreakdown}
            disabled={isGeneratingScript || isAutoPlanning || !scriptContent}
            data-testid="button-generate-breakdown"
          >
            {isAutoPlanning ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                در حال تحلیل...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                تبدیل به صحنه‌ها
              </>
            )}
          </Button>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>مدت کل:</span>
            <Badge variant="secondary">{formatDuration(totalDuration)}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>تعداد صحنه:</span>
            <Badge variant="secondary">{shots.length}</Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Shots Grid */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border/30">
          <h2 className="text-lg font-semibold">سازنده استوری‌بورد</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateShot} data-testid="button-add-shot">
              <Plus className="w-4 h-4 ml-1" />
              افزودن صحنه
            </Button>
            <Button size="sm" data-testid="button-save-storyboard">
              <Save className="w-4 h-4 ml-1" />
              ذخیره
            </Button>
          </div>
        </div>

        {/* Shots */}
        <ScrollArea className="flex-1 p-4">
          {shots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">هنوز صحنه‌ای وجود ندارد</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                صحنه‌های جدید اضافه کنید یا از فیلمنامه خود استوری‌بورد بسازید.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCreateShot}>
                  <Plus className="w-4 h-4 ml-1" />
                  افزودن دستی
                </Button>
                <Button variant="aiGenerate" onClick={handleGenerateBreakdown} disabled={isAutoPlanning || !scriptContent}>
                  <Sparkles className={cn("w-4 h-4 ml-1", isAutoPlanning && "animate-spin")} />
                  {isAutoPlanning ? "در حال ساخت..." : "ساخت خودکار"}
                </Button>
              </div>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={shots}
              onReorder={handleReorder}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {shots.map((shot, index) => (
                  <Reorder.Item
                    key={shot.id}
                    value={shot}
                    className="relative"
                    whileDrag={{ scale: 1.02, zIndex: 50 }}
                  >
                    <Card
                      className={cn(
                        "overflow-hidden cursor-pointer transition-all",
                        selectedShotId === shot.id
                          ? "ring-2 ring-primary"
                          : "hover-elevate"
                      )}
                      onClick={() => setSelectedShotId(shot.id)}
                      data-testid={`card-shot-${shot.id}`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-muted/30">
                        {shot.imageUrl ? (
                          <SafeImage
                            src={shot.imageUrl}
                            alt={shot.description}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                        {/* Shot Number */}
                        <Badge
                          variant="secondary"
                          className="absolute top-2 right-2 text-[10px] font-mono"
                        >
                          {index + 1}
                        </Badge>
                        {/* Duration */}
                        <Badge
                          variant="secondary"
                          className="absolute bottom-2 left-2 text-[10px] gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {shot.duration}s
                        </Badge>
                        {/* Drag Handle */}
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-white/70" />
                        </div>
                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute bottom-2 right-2 h-7 w-7 bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-shot-menu-${shot.id}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditShot(shot)}>
                              <Edit2 className="w-4 h-4 ml-2" />
                              ویرایش
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteShot(shot.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* Info */}
                      <div className="p-2">
                        <p className="text-xs line-clamp-2 min-h-[2rem]">
                          {shot.description || "بدون توضیحات"}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            {getShotTypeIcon(shot.shotType) && (
                              <img src={getShotTypeIcon(shot.shotType)} alt="" className="w-3.5 h-3.5 object-contain scale-90" />
                            )}
                            {SHOT_TYPES[shot.shotType].labelFa}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            {getCameraMovementIcon(shot.cameraMovement) && (
                              <img src={getCameraMovementIcon(shot.cameraMovement)} alt="" className="w-3.5 h-3.5 object-contain scale-90" />
                            )}
                            {CAMERA_MOVEMENTS[shot.cameraMovement].labelFa}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </ScrollArea>

        {/* Timeline Strip */}
        {shots.length > 0 && (
          <div className="h-16 border-t border-border/30 bg-card/30 flex items-center px-4 gap-2 overflow-x-auto">
            {shots.map((shot, index) => (
              <div
                key={shot.id}
                className={cn(
                  "flex-shrink-0 h-10 rounded bg-muted/50 border flex items-center justify-center text-xs cursor-pointer transition-colors",
                  selectedShotId === shot.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:bg-muted"
                )}
                style={{ width: `${Math.max(shot.duration * 20, 40)}px` }}
                onClick={() => setSelectedShotId(shot.id)}
              >
                {index + 1}
              </div>
            ))}
            <div className="flex-shrink-0 px-2 text-xs text-muted-foreground">
              {formatDuration(totalDuration)}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Shot Details */}
      {selectedShot && (
        <div className="w-72 border-r border-border/30 p-4 hidden xl:block">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            جزئیات صحنه {shots.findIndex((s) => s.id === selectedShot.id) + 1}
          </h3>
          <div className="space-y-4">
            <div className="aspect-video rounded-lg bg-muted/30 flex items-center justify-center">
              {selectedShot.imageUrl ? (
                <SafeImage
                  src={selectedShot.imageUrl}
                  alt={selectedShot.description}
                  fill
                  className="object-cover rounded-lg"
                />
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Wand2 className="w-4 h-4" />
                  تولید تصویر
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">توضیحات</label>
              <p className="text-sm">{selectedShot.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <label className="text-xs text-muted-foreground">نوع نما</label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getShotTypeIcon(selectedShot.shotType) && (
                    <img src={getShotTypeIcon(selectedShot.shotType)} alt="" className="w-5 h-5 object-contain scale-90" />
                  )}
                  <p>{SHOT_TYPES[selectedShot.shotType].labelFa}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">حرکت دوربین</label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getCameraMovementIcon(selectedShot.cameraMovement) && (
                    <img src={getCameraMovementIcon(selectedShot.cameraMovement)} alt="" className="w-5 h-5 object-contain scale-90" />
                  )}
                  <p>{CAMERA_MOVEMENTS[selectedShot.cameraMovement].labelFa}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">مدت</label>
                <p>{selectedShot.duration} ثانیه</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleEditShot(selectedShot)}
            >
              <Edit2 className="w-4 h-4 ml-1" />
              ویرایش صحنه
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingShotId ? "ویرایش صحنه" : "افزودن صحنه جدید"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">توضیحات صحنه</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="توضیح صحنه برای تولید تصویر..."
                rows={3}
                data-testid="input-shot-description"
              />
            </div>

            {/* Shot Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع نما</label>
              <Select
                value={formData.shotType}
                onValueChange={(v) => setFormData({ ...formData, shotType: v as ShotType })}
              >
                <SelectTrigger data-testid="select-shot-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHOT_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {getShotTypeIcon(key) && (
                          <img src={getShotTypeIcon(key)} alt="" className="w-4 h-4 object-contain scale-90" />
                        )}
                        {value.labelFa} ({value.label})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera Movement */}
            <div className="space-y-2">
              <label className="text-sm font-medium">حرکت دوربین</label>
              <Select
                value={formData.cameraMovement}
                onValueChange={(v) => setFormData({ ...formData, cameraMovement: v as CameraMovement })}
              >
                <SelectTrigger data-testid="select-camera-movement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMERA_MOVEMENTS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {getCameraMovementIcon(key) && (
                          <img src={getCameraMovementIcon(key)} alt="" className="w-4 h-4 object-contain scale-90" />
                        )}
                        {value.labelFa} ({value.label})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                مدت صحنه: {formData.duration} ثانیه
              </label>
              <Slider
                value={[formData.duration]}
                onValueChange={([v]) => setFormData({ ...formData, duration: v })}
                min={1}
                max={30}
                step={1}
                data-testid="slider-duration"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.description.trim()}
              data-testid="button-save-shot"
            >
              {editingShotId ? "ذخیره تغییرات" : "افزودن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
