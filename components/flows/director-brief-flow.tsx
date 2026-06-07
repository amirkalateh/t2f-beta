"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { aiLogStore } from "@/lib/stores/ai-log-store";
import {
  Sparkles, Loader2, Wand2, ChevronLeft, ChevronRight,
  Film, Camera, Palette, SunMedium, Eye, Clapperboard,
  Globe, Aperture, RectangleHorizontal, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CAMERA_MODELS, LENS_TYPES, CINEMA_ASPECT_RATIOS,
} from "@/lib/constants";
import {
  FILM_STYLE_PRESETS, TEXTURE_PRESETS, LIGHTING_PRESETS_VISUAL, REFERENCE_FILM_PRESETS,
} from "@/lib/preset-data";
import { PresetPicker } from "@/components/ui/preset-picker";
import type { VisionBoard, DirectorBrief } from "@/lib/types";

interface DirectorBriefFlowProps {
  vision: VisionBoard | null;
  projectScript?: string;
  projectStyle?: string;
  onUpdateVision: (updates: Partial<VisionBoard>) => void;
  onNext: () => void;
  onBack: () => void;
}

const MOOD_FIELDS: {
  key: keyof DirectorBrief;
  label: string;
  labelEn: string;
  placeholder: string;
  icon: typeof Film;
  dir?: "ltr" | "rtl";
}[] = [
  {
    key: "overallMood",
    label: "حال‌وهوای کلی",
    labelEn: "Overall Mood",
    placeholder: "مثلا: تاریک و ساسپنس، رمانتیک و گرم",
    icon: Sparkles,
    dir: "rtl",
  },
  {
    key: "colorScience",
    label: "علم رنگ",
    labelEn: "Color Science",
    placeholder: "e.g. warm orange-teal, desaturated cool",
    icon: Palette,
    dir: "ltr",
  },
  {
    key: "era",
    label: "دوره زمانی",
    labelEn: "Era / Setting",
    placeholder: "e.g. contemporary Iran, 1960s Tehran",
    icon: Globe,
    dir: "ltr",
  },
];

export function DirectorBriefFlow({
  vision,
  projectScript,
  projectStyle,
  onUpdateVision,
  onNext,
  onBack,
}: DirectorBriefFlowProps) {
  const [briefSuggesting, setBriefSuggesting] = useState(false);

  const brief = vision?.directorBrief || {} as DirectorBrief;

  const filledCount = useMemo(() => {
    let count = 0;
    if (brief.filmStyle) count++;
    if (brief.filmTexture) count++;
    if (brief.lightingPhilosophy) count++;
    if (brief.referenceFilms) count++;
    if (brief.overallMood?.trim()) count++;
    if (brief.colorScience?.trim()) count++;
    if (brief.era?.trim()) count++;
    if (brief.cameraBody) count++;
    if (brief.lensFamily) count++;
    if (brief.baseAspectRatio) count++;
    return count;
  }, [brief]);

  const totalFields = 10;
  const hasBriefData = filledCount > 0;

  const handleBriefChange = (field: keyof DirectorBrief, value: string) => {
    onUpdateVision({ directorBrief: { ...brief, [field]: value } });
  };

  const handleAISuggestBrief = async () => {
    if (!projectScript) return;
    setBriefSuggesting(true);

    const logId = aiLogStore.addEntry({
      stage: "director_brief",
      route: "AI/director-brief",
      model: "openai/gpt-4o-mini",
      summary: "در حال تولید بریف کارگردان...",
      status: "running",
    });

    try {
      const res = await fetch("/api/ai/director-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: projectScript,
          style: projectStyle,
          logline: "",
        }),
      });
      const data = await res.json();
      if (res.ok && data) {
        onUpdateVision({ directorBrief: { ...brief, ...data } });
        aiLogStore.updateEntry(logId, {
          status: "success",
          model: data.model || "openai/gpt-4o-mini",
          durationMs: data.durationMs,
          summary: "بریف کارگردان تولید شد",
        });
      } else {
        aiLogStore.updateEntry(logId, {
          status: "error",
          summary: data?.error || "خطا در تولید بریف کارگردان",
          detail: data?.code,
        });
      }
    } catch (err) {
      console.error("Failed to suggest director brief:", err);
      aiLogStore.updateEntry(logId, {
        status: "error",
        summary: err instanceof Error ? err.message : "خطا در تولید بریف کارگردان",
      });
    } finally {
      setBriefSuggesting(false);
    }
  };

  const presetSections = [
    {
      key: "filmStyle" as keyof DirectorBrief,
      title: "سبک فیلم",
      titleEn: "Film Style",
      icon: <Film className="w-4 h-4 text-primary" />,
      presets: FILM_STYLE_PRESETS,
      columns: 7 as const,
      aspectRatio: "square" as const,
    },
    {
      key: "filmTexture" as keyof DirectorBrief,
      title: "بافت تصویر",
      titleEn: "Film Texture",
      icon: <Palette className="w-4 h-4 text-primary" />,
      presets: TEXTURE_PRESETS,
      columns: 6 as const,
      aspectRatio: "landscape" as const,
    },
    {
      key: "lightingPhilosophy" as keyof DirectorBrief,
      title: "فلسفه نورپردازی",
      titleEn: "Lighting Philosophy",
      icon: <SunMedium className="w-4 h-4 text-primary" />,
      presets: LIGHTING_PRESETS_VISUAL,
      columns: 5 as const,
      aspectRatio: "landscape" as const,
    },
    {
      key: "referenceFilms" as keyof DirectorBrief,
      title: "فیلم‌های مرجع",
      titleEn: "Reference Films",
      icon: <Clapperboard className="w-4 h-4 text-primary" />,
      presets: REFERENCE_FILM_PRESETS,
      columns: 5 as const,
      aspectRatio: "landscape" as const,
    },
  ];

  const gearSelects: {
    key: keyof DirectorBrief;
    label: string;
    labelEn: string;
    icon: typeof Camera;
    options: { id: string; label: string; labelEn?: string }[];
  }[] = [
    {
      key: "cameraBody",
      label: "بدنه دوربین",
      labelEn: "Camera Body",
      icon: Camera,
      options: CAMERA_MODELS.map(c => ({ id: c.id, label: c.label, labelEn: c.labelEn })),
    },
    {
      key: "lensFamily",
      label: "خانواده لنز",
      labelEn: "Lens Family",
      icon: Aperture,
      options: LENS_TYPES.map(l => ({ id: l.id, label: l.label, labelEn: l.labelEn })),
    },
    {
      key: "baseAspectRatio",
      label: "نسبت تصویر پایه",
      labelEn: "Aspect Ratio",
      icon: RectangleHorizontal,
      options: CINEMA_ASPECT_RATIOS.map(a => ({ id: a.id, label: a.label, labelEn: a.labelEn })),
    },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">کارگردان هوشمند</h2>
            <p className="text-xs text-muted-foreground">هویت بصری فیلم خود را تعریف کنید</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasBriefData && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {filledCount} از {totalFields} فیلد
            </Badge>
          )}
          <Badge variant="secondary">مرحله ۲ از ۷</Badge>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.02] to-transparent overflow-visible">
        <CardContent className="pt-6 pb-6">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto leading-relaxed">
              کارگردان هوشمند مثل DNA بصری فیلم شماست. این تنظیمات روی <strong>تمام</strong> تصاویری که تولید می‌کنید اعمال می‌شود
              و یکپارچگی بصری پروژه را تضمین می‌کند.
            </p>

            {projectScript ? (
              <Button
                onClick={handleAISuggestBrief}
                disabled={briefSuggesting}
                variant="aiGenerate"
                size="sm"
                className="gap-2 px-6"
                data-testid="button-ai-suggest-brief"
              >
                {briefSuggesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال تحلیل فیلمنامه...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    تولید خودکار از فیلمنامه
                  </>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground/70 italic">
                برای استفاده از تولید خودکار، ابتدا فیلمنامه را در مرحله روایت بنویسید
              </p>
            )}
          </div>

          {presetSections.map((section) => (
            <div key={section.key} className="mb-6 last:mb-0">
              <PresetPicker
                items={section.presets}
                value={brief[section.key] as string | null || null}
                onChange={(id) => handleBriefChange(section.key, brief[section.key] === id ? "" : id)}
                columns={section.columns}
                aspectRatio={section.aspectRatio}
                title={section.title}
                titleEn={section.titleEn}
                icon={section.icon}
                data-testid={`preset-${section.key}`}
              />
            </div>
          ))}

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-l from-primary/20 to-transparent" />
              <h3 className="text-sm font-semibold shrink-0">فضا و الهام</h3>
              <span className="text-[11px] text-muted-foreground/60 shrink-0">Mood & Inspiration</span>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MOOD_FIELDS.map((field) => {
                const val = brief[field.key] || "";
                const Icon = field.icon;
                const isFilled = typeof val === "string" && val.trim().length > 0;
                return (
                  <div key={field.key} className="group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={cn("w-3.5 h-3.5", isFilled ? "text-primary" : "text-muted-foreground/60")} />
                      <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                      <span className="text-[10px] text-muted-foreground/50">{field.labelEn}</span>
                      {isFilled && <Check className="w-3 h-3 text-primary ms-auto" />}
                    </div>
                    <Input
                      dir={field.dir || "ltr"}
                      className="text-sm"
                      placeholder={field.placeholder}
                      value={typeof val === "string" ? val : ""}
                      onChange={(e) => handleBriefChange(field.key, e.target.value)}
                      data-testid={`input-brief-${field.key}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-l from-primary/20 to-transparent" />
              <h3 className="text-sm font-semibold shrink-0">تجهیزات فنی</h3>
              <span className="text-[11px] text-muted-foreground/60 shrink-0">Technical Gear</span>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gearSelects.map((gear) => {
                const val = brief[gear.key] || "";
                const Icon = gear.icon;
                const isFilled = typeof val === "string" && val.trim().length > 0;
                return (
                  <div key={gear.key} className="group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={cn("w-3.5 h-3.5", isFilled ? "text-primary" : "text-muted-foreground/60")} />
                      <label className="text-xs font-medium text-muted-foreground">{gear.label}</label>
                      <span className="text-[10px] text-muted-foreground/50">{gear.labelEn}</span>
                      {isFilled && <Check className="w-3 h-3 text-primary ms-auto" />}
                    </div>
                    <Select
                      value={typeof val === "string" ? val : ""}
                      onValueChange={(v) => handleBriefChange(gear.key, v)}
                    >
                      <SelectTrigger className="text-sm" data-testid={`select-brief-${gear.key}`}>
                        <SelectValue placeholder={`انتخاب ${gear.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {gear.options.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label} {opt.labelEn ? `(${opt.labelEn})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasBriefData && (
        <Card className="border-card-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">پیش‌نمایش DNA بصری</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {brief.filmStyle && (() => {
                const p = FILM_STYLE_PRESETS.find(s => s.id === brief.filmStyle);
                return p ? <Badge key="filmStyle" variant="secondary" className="text-[11px]"><Film className="w-3 h-3 ml-1 opacity-60" />{p.labelEn}</Badge> : null;
              })()}
              {brief.filmTexture && (() => {
                const p = TEXTURE_PRESETS.find(s => s.id === brief.filmTexture);
                return <Badge key="filmTexture" variant="secondary" className="text-[11px]"><Palette className="w-3 h-3 ml-1 opacity-60" />{p ? p.labelEn : brief.filmTexture}</Badge>;
              })()}
              {brief.lightingPhilosophy && (() => {
                const p = LIGHTING_PRESETS_VISUAL.find(s => s.id === brief.lightingPhilosophy);
                return <Badge key="lighting" variant="secondary" className="text-[11px]"><SunMedium className="w-3 h-3 ml-1 opacity-60" />{p ? p.labelEn : brief.lightingPhilosophy}</Badge>;
              })()}
              {brief.referenceFilms && (() => {
                const p = REFERENCE_FILM_PRESETS.find(s => s.id === brief.referenceFilms);
                return <Badge key="ref" variant="secondary" className="text-[11px]"><Clapperboard className="w-3 h-3 ml-1 opacity-60" />{p ? p.labelEn : brief.referenceFilms}</Badge>;
              })()}
              {brief.overallMood?.trim() && <Badge variant="secondary" className="text-[11px]"><Sparkles className="w-3 h-3 ml-1 opacity-60" />{brief.overallMood}</Badge>}
              {brief.colorScience?.trim() && <Badge variant="secondary" className="text-[11px]"><Palette className="w-3 h-3 ml-1 opacity-60" />{brief.colorScience}</Badge>}
              {brief.era?.trim() && <Badge variant="secondary" className="text-[11px]"><Globe className="w-3 h-3 ml-1 opacity-60" />{brief.era}</Badge>}
              {brief.cameraBody && (() => {
                const cam = CAMERA_MODELS.find(c => c.id === brief.cameraBody);
                return cam ? <Badge variant="secondary" className="text-[11px]"><Camera className="w-3 h-3 ml-1 opacity-60" />{cam.labelEn}</Badge> : null;
              })()}
              {brief.lensFamily && (() => {
                const lens = LENS_TYPES.find(l => l.id === brief.lensFamily);
                return lens ? <Badge variant="secondary" className="text-[11px]"><Aperture className="w-3 h-3 ml-1 opacity-60" />{lens.labelEn}</Badge> : null;
              })()}
              {brief.baseAspectRatio && (() => {
                const ar = CINEMA_ASPECT_RATIOS.find(a => a.id === brief.baseAspectRatio);
                return ar ? <Badge variant="secondary" className="text-[11px]"><RectangleHorizontal className="w-3 h-3 ml-1 opacity-60" />{ar.labelEn}</Badge> : null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-brief-back">
          <ChevronRight className="w-4 h-4" />
          مرحله قبل
        </Button>
        <Button onClick={onNext} className="gap-2" data-testid="button-brief-next">
          {hasBriefData ? "تایید و رفتن به دکوپاژ" : "رد شدن"}
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
