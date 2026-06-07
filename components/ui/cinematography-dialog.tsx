"use client";

import { useState, useCallback } from "react";
import { Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CinemaIconGrid } from "@/components/ui/cinema-icon";
import { cn } from "@/lib/utils";
import {
  SHOT_TYPES, CAMERA_MOVEMENTS, SHOT_FOCUS_OPTIONS, CAMERA_MECHANISM_OPTIONS,
  CINEMATOGRAPHY_PRESETS,
} from "@/lib/constants";
import {
  MOTION_GRAPH_ICONS,
} from "@/lib/cinema-icons";
import SafeImage from "@/components/ui/safe-image";

interface CinematographyValues {
  shotType?: string | null;
  shotFraming?: string | null;
  cameraAngle?: string | null;
  shotFocus?: string | null;
  cameraMovement?: string | null;
  cameraMechanism?: string | null;
  motionGraph?: string | null;
}

interface CinematographyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: CinematographyValues;
  onApply: (values: CinematographyValues) => void;
}

const MOTION_GRAPH_OPTIONS = [
  { id: "linear", label: "خطی", labelEn: "Linear", icon: MOTION_GRAPH_ICONS.linear },
  { id: "ease_in", label: "ایز این", labelEn: "Ease-In", icon: MOTION_GRAPH_ICONS.ease_in },
  { id: "ease_out", label: "ایز اوت", labelEn: "Ease-Out", icon: MOTION_GRAPH_ICONS.ease_out },
  { id: "easy_ease", label: "ایزی ایز", labelEn: "Easy-Ease", icon: MOTION_GRAPH_ICONS.easy_ease },
  { id: "bounce", label: "بانس", labelEn: "Bounce", icon: MOTION_GRAPH_ICONS.bounce },
  { id: "hold", label: "هولد", labelEn: "Hold", icon: MOTION_GRAPH_ICONS.hold },
];

interface SectionProps {
  title: string;
  titleEn: string;
  children: JSX.Element | JSX.Element[];
}

function Section({ title, titleEn, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
        <h3 className="text-sm font-bold text-primary shrink-0">{title}</h3>
        <span className="text-[11px] text-primary/60 shrink-0">{titleEn}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
      </div>
      {children}
    </div>
  );
}

export function CinematographyDialog({
  open,
  onOpenChange,
  values,
  onApply,
}: CinematographyDialogProps) {
  const [local, setLocal] = useState<CinematographyValues>(values);

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setLocal(values);
    }
    onOpenChange(isOpen);
  }, [values, onOpenChange]);

  const handleApply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const selectionCount = Object.values(local).filter(v => v && v.trim?.()).length;

  const findLabel = (list: readonly { id: string; label: string }[], id?: string | null) => {
    if (!id) return null;
    return list.find(item => item.id === id)?.label || null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">تنظیمات سینماتوگرافی</DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">Cinematography Settings</DialogDescription>
              </div>
            </div>
            {selectionCount > 0 && (
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                {selectionCount} انتخاب
              </Badge>
            )}
          </div>

          {selectionCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {local.shotType && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {findLabel(SHOT_TYPES, local.shotType)}
                  <X className="w-2.5 h-2.5 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setLocal(p => ({ ...p, shotType: null }))} />
                </Badge>
              )}
              {local.cameraAngle && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {findLabel(CINEMATOGRAPHY_PRESETS.angle, local.cameraAngle)}
                  <X className="w-2.5 h-2.5 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setLocal(p => ({ ...p, cameraAngle: null }))} />
                </Badge>
              )}
              {local.cameraMovement && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {findLabel(CAMERA_MOVEMENTS, local.cameraMovement)}
                  <X className="w-2.5 h-2.5 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setLocal(p => ({ ...p, cameraMovement: null }))} />
                </Badge>
              )}
              {local.shotFocus && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {findLabel(SHOT_FOCUS_OPTIONS, local.shotFocus)}
                  <X className="w-2.5 h-2.5 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setLocal(p => ({ ...p, shotFocus: null }))} />
                </Badge>
              )}
              {local.cameraMechanism && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {findLabel(CAMERA_MECHANISM_OPTIONS, local.cameraMechanism)}
                  <X className="w-2.5 h-2.5 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setLocal(p => ({ ...p, cameraMechanism: null }))} />
                </Badge>
              )}
              {local.motionGraph && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {findLabel(MOTION_GRAPH_OPTIONS, local.motionGraph)}
                  <X className="w-2.5 h-2.5 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setLocal(p => ({ ...p, motionGraph: null }))} />
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-5 space-y-6">
            <Section title="اندازه شات" titleEn="Camera Shot Sizes">
              <CinemaIconGrid
                items={SHOT_TYPES}
                value={local.shotType}
                onChange={(id) => setLocal(p => ({ ...p, shotType: p.shotType === id ? null : id }))}
                columns={5}
                iconSize="md"
                data-testid="grid-shot-size"
              />
            </Section>

            <Section title="قاب‌بندی شات" titleEn="Camera Shot Framing">
              <CinemaIconGrid
                items={CINEMATOGRAPHY_PRESETS.shotType.filter(s =>
                  ["insert", "cutaway", "two_shot", "over_shoulder"].includes(s.id)
                ).length > 0 ? [
                  ...CINEMATOGRAPHY_PRESETS.shotType.filter(s => ["single", "two_shot", "over_shoulder", "insert", "cutaway"].includes(s.id)),
                ] : CINEMATOGRAPHY_PRESETS.shotType.slice(8)}
                value={local.shotFraming}
                onChange={(id) => setLocal(p => ({ ...p, shotFraming: p.shotFraming === id ? null : id }))}
                columns={5}
                iconSize="md"
                data-testid="grid-shot-framing"
              />
            </Section>

            <Section title="فوکوس شات" titleEn="Camera Shot Focus">
              <CinemaIconGrid
                items={SHOT_FOCUS_OPTIONS.map(o => ({ ...o }))}
                value={local.shotFocus}
                onChange={(id) => setLocal(p => ({ ...p, shotFocus: p.shotFocus === id ? null : id }))}
                columns={5}
                iconSize="md"
                data-testid="grid-shot-focus"
              />
            </Section>

            <Section title="زاویه دوربین" titleEn="Camera Shot Angles">
              <CinemaIconGrid
                items={CINEMATOGRAPHY_PRESETS.angle.map(a => ({ ...a }))}
                value={local.cameraAngle}
                onChange={(id) => setLocal(p => ({ ...p, cameraAngle: p.cameraAngle === id ? null : id }))}
                columns={5}
                iconSize="md"
                data-testid="grid-camera-angle"
              />
            </Section>

            <Section title="حرکت دوربین" titleEn="Camera Movement">
              <CinemaIconGrid
                items={CAMERA_MOVEMENTS.map(m => ({ ...m }))}
                value={local.cameraMovement}
                onChange={(id) => setLocal(p => ({ ...p, cameraMovement: p.cameraMovement === id ? null : id }))}
                columns={5}
                iconSize="md"
                data-testid="grid-camera-movement"
              />
            </Section>

            <Section title="مکانیزم دوربین" titleEn="Camera Mechanisms">
              <CinemaIconGrid
                items={CAMERA_MECHANISM_OPTIONS.map(m => ({ ...m }))}
                value={local.cameraMechanism}
                onChange={(id) => setLocal(p => ({ ...p, cameraMechanism: p.cameraMechanism === id ? null : id }))}
                columns={6}
                iconSize="md"
                data-testid="grid-camera-mechanism"
              />
            </Section>

            <Section title="گراف حرکت" titleEn="Value Graph Motion">
              <CinemaIconGrid
                items={MOTION_GRAPH_OPTIONS}
                value={local.motionGraph}
                onChange={(id) => setLocal(p => ({ ...p, motionGraph: p.motionGraph === id ? null : id }))}
                columns={6}
                iconSize="md"
                data-testid="grid-motion-graph"
              />
            </Section>
          </div>
        </ScrollArea>

        <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocal({})}
            className="text-muted-foreground text-xs"
            data-testid="button-cinema-clear"
          >
            پاک کردن همه
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid="button-cinema-cancel">
              انصراف
            </Button>
            <Button size="sm" onClick={handleApply} className="gap-1.5" data-testid="button-cinema-apply">
              <Check className="w-3.5 h-3.5" />
              اعمال تنظیمات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CinematographyTriggerProps {
  values: CinematographyValues;
  onClick: () => void;
  className?: string;
}

export function CinematographyTrigger({ values, onClick, className }: CinematographyTriggerProps) {
  const selectionCount = Object.values(values).filter(v => v && v.trim?.()).length;

  const selectedIcons: { src: string; label: string }[] = [];
  if (values.shotType) {
    const item = SHOT_TYPES.find(s => s.id === values.shotType);
    if (item?.icon) selectedIcons.push({ src: item.icon, label: item.label });
  }
  if (values.cameraAngle) {
    const item = CINEMATOGRAPHY_PRESETS.angle.find(a => a.id === values.cameraAngle);
    if (item?.icon) selectedIcons.push({ src: item.icon, label: item.label });
  }
  if (values.cameraMovement) {
    const item = CAMERA_MOVEMENTS.find(m => m.id === values.cameraMovement);
    if (item?.icon) selectedIcons.push({ src: item.icon, label: item.label });
  }
  if (values.shotFocus) {
    const item = SHOT_FOCUS_OPTIONS.find(f => f.id === values.shotFocus);
    if (item?.icon) selectedIcons.push({ src: item.icon, label: item.label });
  }
  if (values.cameraMechanism) {
    const item = CAMERA_MECHANISM_OPTIONS.find(m => m.id === values.cameraMechanism);
    if (item?.icon) selectedIcons.push({ src: item.icon, label: item.label });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full p-3 rounded-xl border transition-all duration-200",
        selectionCount > 0
          ? "border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.06]"
          : "border-border/50 bg-card/30 hover:bg-card/50",
        className,
      )}
      data-testid="button-open-cinematography"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Camera className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 text-start">
        <p className="text-xs font-medium">تنظیمات سینماتوگرافی</p>
        <p className="text-[10px] text-muted-foreground">
          {selectionCount > 0 ? `${selectionCount} پارامتر انتخاب شده` : "شات، زاویه، حرکت دوربین..."}
        </p>
      </div>
      {selectedIcons.length > 0 && (
        <div className="flex items-center -space-x-1 rtl:space-x-reverse">
          {selectedIcons.slice(0, 4).map((icon, i) => (
            <div key={i} className="relative w-7 h-7 rounded-md bg-card border border-border/50 overflow-hidden">
              <SafeImage src={icon.src} alt={icon.label} fill sizes="28px" className="object-contain p-0.5 cinema-icon pl-[1.875px] pr-[1.875px] border-t-[#1f1f1f00] border-r-[#1f1f1f00] border-b-[#1f1f1f00] border-l-[#1f1f1f00] opacity-[1]" />
            </div>
          ))}
          {selectedIcons.length > 4 && (
            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              +{selectedIcons.length - 4}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
