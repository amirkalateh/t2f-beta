"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { aiLogStore } from "@/lib/stores/ai-log-store";
import {
  Users, MapPin, Package, Sparkles, Loader2, ChevronLeft, ChevronRight,
  Plus, X, Wand2, Check, SkipForward, Palette, Image as ImageIcon,
  ArrowLeft, ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn, toPersianNumber } from "@/lib/utils";
import type { Asset } from "@/lib/types";
import { FILM_STYLE_PRESETS } from "@/lib/preset-data";

interface ElementDraft {
  id: string;
  name: string;
  type: "character" | "location" | "property";
  description: string;
  imagePrompt: string;
  age?: string;
  sex?: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  isGeneratingDesc?: boolean;
  isAnalyzingCostume?: boolean;
  costume?: { clothing?: string; hair?: string; build?: string; distinguishing?: string; ethnicity?: string };
}

interface ElementsOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle?: string;
  projectDescription?: string;
  logline?: string;
  script?: string;
  style?: string;
  directorBrief?: {
    filmStyle?: string | null;
    filmTexture?: string | null;
    colorScience?: string | null;
    lightingPhilosophy?: string | null;
    overallMood?: string | null;
    referenceFilms?: string | null;
    era?: string | null;
    visualStyle?: string | null;
    cameraBody?: string | null;
    lensFamily?: string | null;
    baseAspectRatio?: string | null;
  } | null;
  onElementsCreated: () => void;
}

const STYLE_PROMPT_MAP: Record<string, string> = Object.fromEntries(
  FILM_STYLE_PRESETS.map((p) => [p.id, p.promptTag]),
);

const STEPS = [
  { key: "intro", label: "شروع", icon: Sparkles },
  { key: "characters", label: "شخصیت‌ها", icon: Users },
  { key: "locations", label: "لوکیشن‌ها", icon: MapPin },
  { key: "props", label: "اشیاء", icon: Package },
  { key: "review", label: "بررسی", icon: Check },
] as const;

type StepKey = typeof STEPS[number]["key"];

const TYPE_LABELS: Record<string, string> = {
  character: "شخصیت",
  location: "لوکیشن",
  property: "شیء / پراپ",
};

const TYPE_ICONS: Record<string, typeof Users> = {
  character: Users,
  location: MapPin,
  property: Package,
};

export function ElementsOnboarding({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectDescription,
  logline,
  script,
  style,
  directorBrief,
  onElementsCreated,
}: ElementsOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>("intro");
  const [elements, setElements] = useState<ElementDraft[]>([]);
  const [newItemInput, setNewItemInput] = useState("");
  const [isSuggestingAll, setIsSuggestingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mood, setMood] = useState("");
  const [colorPalette, setColorPalette] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const closeGuardRef = useRef(false);

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const currentTypeElements = (type: string) => elements.filter(e => e.type === type);

  const generateId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAISuggestAll = useCallback(async () => {
    setIsSuggestingAll(true);
    const logId = aiLogStore.addEntry({
      stage: "elements",
      route: "AI/elements",
      model: "openai/gpt-4o-mini",
      summary: "در حال پیشنهاد المان‌های پروداکشن...",
      status: "running",
    });
    try {
      const res = await fetch("/api/ai/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          projectTitle,
          projectDescription,
          logline,
          script,
          style,
          directorBrief: directorBrief || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        aiLogStore.updateEntry(logId, {
          status: "error",
          summary: errData?.error || "خطا در پیشنهاد المان‌ها",
          detail: errData?.code,
        });
        throw new Error(errData?.error || "Failed");
      }
      const data = await res.json();

      const styleTag = directorBrief?.filmStyle ? (STYLE_PROMPT_MAP[directorBrief.filmStyle] || "") : "";
      const styleSuffix = styleTag ? `, ${styleTag}` : "";
      const drafts: ElementDraft[] = [];
      if (data.characters) {
        for (const c of data.characters) {
          drafts.push({
            id: generateId(),
            name: c.name,
            type: "character",
            description: c.description || "",
            imagePrompt: `Portrait photo of ${c.name}, ${c.description || ""}, ${c.age ? `age ${c.age}` : ""}, ${c.sex || ""}${styleSuffix}, studio lighting, high detail`.trim(),
            age: c.age,
            sex: c.sex,
          });
        }
      }
      if (data.locations) {
        for (const l of data.locations) {
          drafts.push({
            id: generateId(),
            name: l.name,
            type: "location",
            description: l.description || "",
            imagePrompt: `Cinematic establishing shot of ${l.name}, ${l.description || ""}${styleSuffix}, atmospheric, high detail`.trim(),
          });
        }
      }
      if (data.props) {
        for (const p of data.props) {
          drafts.push({
            id: generateId(),
            name: p.name,
            type: "property",
            description: p.description || "",
            imagePrompt: `Product photography of ${p.name}, ${p.description || ""}${styleSuffix}, clean background, studio lighting, detailed`.trim(),
          });
        }
      }
      if (data.mood) setMood(data.mood);
      if (data.colorPalette) setColorPalette(data.colorPalette);

      setElements(drafts);
      setCurrentStep("characters");
      aiLogStore.updateEntry(logId, {
        status: "success",
        summary: `${drafts.length} المان پروداکشن پیشنهاد شد`,
      });
    } catch (err) {
      console.error("AI suggest error:", err);
      // Error was already logged to aiLogStore if it came from the fetch
    } finally {
      setIsSuggestingAll(false);
    }
  }, [projectTitle, projectDescription, logline, script, style, directorBrief]);

  const handleAddCustomElement = async (type: "character" | "location" | "property") => {
    if (!newItemInput.trim()) return;
    const input = newItemInput.trim();
    setNewItemInput("");

    const draftId = generateId();
    const draft: ElementDraft = {
      id: draftId,
      name: input,
      type,
      description: "",
      imagePrompt: "",
      isGeneratingDesc: true,
    };
    setElements(prev => [...prev, draft]);

    try {
      const res = await fetch("/api/ai/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-description",
          userInput: input,
          elementType: type,
          projectTitle,
          style,
          directorBrief: directorBrief || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setElements(prev =>
          prev.map(e =>
            e.id === draftId
              ? {
                  ...e,
                  name: data.name || e.name,
                  description: data.description || "",
                  imagePrompt: data.imagePrompt || "",
                  age: data.age || undefined,
                  sex: data.sex || undefined,
                  isGeneratingDesc: false,
                }
              : e
          )
        );
      } else {
        setElements(prev =>
          prev.map(e => e.id === draftId ? { ...e, isGeneratingDesc: false } : e)
        );
      }
    } catch {
      setElements(prev =>
        prev.map(e => e.id === draftId ? { ...e, isGeneratingDesc: false } : e)
      );
    }
  };

  const analyzeCharacterCostume = async (draftId: string, imageUrl: string, name: string, description: string) => {
    try {
      const res = await fetch("/api/ai/analyze-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, name, description }),
      });
      if (res.ok) {
        const costume = await res.json();
        setElements(prev =>
          prev.map(e => e.id === draftId ? { ...e, costume, isAnalyzingCostume: false } : e)
        );
      } else {
        setElements(prev =>
          prev.map(e => e.id === draftId ? { ...e, isAnalyzingCostume: false } : e)
        );
      }
    } catch {
      setElements(prev =>
        prev.map(e => e.id === draftId ? { ...e, isAnalyzingCostume: false } : e)
      );
    }
  };

  const handleGenerateImage = async (draftId: string) => {
    const draft = elements.find(e => e.id === draftId);
    if (!draft || !draft.imagePrompt) return;

    setElements(prev =>
      prev.map(e => e.id === draftId ? { ...e, isGeneratingImage: true } : e)
    );

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: draft.imagePrompt,
          mode: "image",
          model: "kling-v2",
          aspectRatio: draft.type === "character" ? "3:4" : "16:9",
          resolution: "1k",
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();

      if (data.taskId) {
        const imageUrl = await pollForResult(data.taskId, data.imageSource || "generations");
        if (imageUrl) {
          setElements(prev =>
            prev.map(e => e.id === draftId ? {
              ...e,
              imageUrl,
              isGeneratingImage: false,
              isAnalyzingCostume: draft.type === "character",
            } : e)
          );
          if (draft.type === "character") {
            analyzeCharacterCostume(draftId, imageUrl, draft.name, draft.description);
          }
          return;
        }
      }
      setElements(prev =>
        prev.map(e => e.id === draftId ? { ...e, isGeneratingImage: false } : e)
      );
    } catch {
      setElements(prev =>
        prev.map(e => e.id === draftId ? { ...e, isGeneratingImage: false } : e)
      );
    }
  };

  const pollForResult = async (taskId: string, imageSource: string): Promise<string | null> => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/generate/status?taskId=${taskId}&imageSource=${imageSource}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.isComplete && data.resultUrl) return data.resultUrl;
        if (data.isFailed) return null;
      } catch {
        continue;
      }
    }
    return null;
  };

  const handleRemoveElement = (draftId: string) => {
    setElements(prev => prev.filter(e => e.id !== draftId));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const el of elements) {
        const hasCostume = el.costume && Object.values(el.costume).some(v => v);
        await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: el.name,
            type: el.type,
            description: el.description,
            age: el.age || null,
            sex: el.sex || null,
            imageUrl: el.imageUrl || null,
            thumbnailUrl: el.imageUrl || null,
            source: "ai-generated",
            tags: [],
            metadata: hasCostume ? el.costume : undefined,
          }),
        });
      }
      await onElementsCreated();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = () => {
    const nextIdx = Math.min(stepIndex + 1, STEPS.length - 1);
    setCurrentStep(STEPS[nextIdx].key);
    setNewItemInput("");
  };

  const goBack = () => {
    const prevIdx = Math.max(stepIndex - 1, 0);
    setCurrentStep(STEPS[prevIdx].key);
    setNewItemInput("");
  };

  const renderElementCard = (el: ElementDraft) => {
    const Icon = TYPE_ICONS[el.type] || Package;
    return (
      <Card key={el.id} className="border-card-border p-3 space-y-2" data-testid={`card-element-draft-${el.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{el.name}</p>
              {el.isGeneratingDesc ? (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  در حال تولید توضیحات...
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground line-clamp-2">{el.description}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveElement(el.id)}
            className="flex-shrink-0"
            data-testid={`button-remove-element-${el.id}`}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {el.age && (
          <div className="flex gap-2">
            {el.age && <Badge variant="outline" className="text-[10px]">سن: {el.age}</Badge>}
            {el.sex && <Badge variant="outline" className="text-[10px]">{el.sex === "male" ? "مرد" : el.sex === "female" ? "زن" : el.sex}</Badge>}
          </div>
        )}

        <div className="flex items-center gap-2">
          {el.imageUrl ? (
            <div className="flex items-center gap-2">
              <div
                className="relative w-16 h-16 rounded-md overflow-hidden border border-border flex-shrink-0 cursor-zoom-in group"
                onClick={() => setLightboxUrl(el.imageUrl!)}
                data-testid={`img-element-thumb-${el.id}`}
              >
                <img src={el.imageUrl} alt={el.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGenerateImage(el.id)}
                disabled={el.isGeneratingImage || el.isGeneratingDesc || !el.imagePrompt}
                className="gap-1 text-[10px] h-6 px-2 text-muted-foreground"
                data-testid={`button-regenerate-image-${el.id}`}
              >
                {el.isGeneratingImage ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                بازتولید
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateImage(el.id)}
              disabled={el.isGeneratingImage || el.isGeneratingDesc || !el.imagePrompt}
              className="gap-1.5"
              data-testid={`button-generate-image-${el.id}`}
            >
              {el.isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  تولید تصویر...
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  تولید تصویر
                </>
              )}
            </Button>
          )}
        </div>

        {el.type === "character" && (el.isAnalyzingCostume || el.costume) && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px]",
            el.isAnalyzingCostume
              ? "bg-blue-500/10 text-blue-400"
              : "bg-emerald-500/10 text-emerald-400"
          )}>
            {el.isAnalyzingCostume ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                <span>در حال تحلیل لباس و ظاهر...</span>
              </>
            ) : el.costume?.clothing ? (
              <>
                <Palette className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{el.costume.clothing}</span>
              </>
            ) : null}
          </div>
        )}
      </Card>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "intro":
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">استخراج عناصر از فیلمنامه</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                {script
                  ? "هوش مصنوعی فیلمنامه شما را تحلیل کرده و شخصیت‌ها، لوکیشن‌ها و اشیاء کلیدی را استخراج می‌کند. این عناصر باعث یکپارچگی بصری در تمام پلن‌ها خواهند شد."
                  : "برای اینکه تصاویر و پلن‌های تولید شده در کل پروژه یکپارچه و هماهنگ باشند، شخصیت‌ها، لوکیشن‌ها و اشیاء کلیدی پروژه‌تان را تعریف کنید."}
              </p>
            </div>

            {(mood || colorPalette) && (
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                {mood && (
                  <div className="flex items-start gap-2">
                    <Palette className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">فضای بصری</p>
                      <p className="text-[11px] text-muted-foreground">{mood}</p>
                    </div>
                  </div>
                )}
                {colorPalette && (
                  <div className="flex items-start gap-2">
                    <Palette className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">پالت رنگی</p>
                      <p className="text-[11px] text-muted-foreground">{colorPalette}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAISuggestAll}
                disabled={isSuggestingAll}
                className="gap-2 w-full"
                data-testid="button-ai-suggest-elements"
              >
                {isSuggestingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {script ? "در حال تحلیل فیلمنامه..." : "هوش مصنوعی در حال تحلیل پروژه..."}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {script ? "استخراج عناصر از فیلمنامه" : "پیشنهاد هوشمند عناصر"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep("characters")}
                className="gap-2 w-full"
                data-testid="button-manual-elements"
              >
                <Plus className="w-4 h-4" />
                اضافه کردن دستی
              </Button>
            </div>
          </div>
        );

      case "characters":
      case "locations":
      case "props": {
        const typeMap: Record<string, "character" | "location" | "property"> = {
          characters: "character",
          locations: "location",
          props: "property",
        };
        const type = typeMap[currentStep];
        const typeLabel = TYPE_LABELS[type];
        const Icon = TYPE_ICONS[type];
        const items = currentTypeElements(type);

        const placeholders: Record<string, string> = {
          character: "مثال: یک مرد ۴۰ ساله با ریش بلند و کت چرمی...",
          location: "مثال: یک کافه قدیمی با نورپردازی گرم...",
          property: "مثال: یک چتر قرمز رنگ قدیمی...",
        };

        return (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{typeLabel}‌ها</h3>
                <p className="text-[11px] text-muted-foreground">
                  {type === "character" && "شخصیت‌های اصلی داستان را اضافه کنید"}
                  {type === "location" && "مکان‌های کلیدی داستان را تعریف کنید"}
                  {type === "property" && "اشیاء مهم صحنه‌ها را اضافه کنید"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={placeholders[type]}
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newItemInput.trim()) {
                    handleAddCustomElement(type);
                  }
                }}
                dir="rtl"
                className="flex-1"
                data-testid={`input-new-${type}`}
              />
              <Button
                onClick={() => handleAddCustomElement(type)}
                disabled={!newItemInput.trim()}
                size="icon"
                data-testid={`button-add-${type}`}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-6">
                  <Icon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    هنوز {typeLabel}ی اضافه نشده
                  </p>
                </div>
              ) : (
                items.map(renderElementCard)
              )}
            </div>
          </div>
        );
      }

      case "review":
        return (
          <div className="space-y-4 py-2">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-sm font-bold">بررسی نهایی عناصر</h3>
              <p className="text-[11px] text-muted-foreground">
                این عناصر در تمام پلن‌ها و تصاویر تولیدی استفاده خواهند شد
              </p>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {(["character", "location", "property"] as const).map(type => {
                const items = currentTypeElements(type);
                if (items.length === 0) return null;
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold">{TYPE_LABELS[type]}‌ها ({toPersianNumber(items.length)})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(el => (
                        <div key={el.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          {el.imageUrl ? (
                            <img src={el.imageUrl} alt={el.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{el.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{el.description?.substring(0, 40)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {elements.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">هیچ عنصری اضافه نشده</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            عناصر پروژه
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === stepIndex;
            const isDone = idx < stepIndex;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => idx <= stepIndex && setCurrentStep(step.key)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors w-full justify-center",
                    isActive ? "bg-primary/10 text-primary" :
                    isDone ? "text-primary/70" : "text-muted-foreground"
                  )}
                  disabled={idx > stepIndex}
                  data-testid={`button-step-${step.key}`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "w-4 h-px flex-shrink-0",
                    isDone ? "bg-primary/50" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border mt-2">
          {currentStep === "intro" ? (
            <>
              <Button variant="ghost" onClick={onClose} data-testid="button-skip-onboarding">
                <SkipForward className="w-4 h-4 ml-1" />
                رد کردن
              </Button>
              <div />
            </>
          ) : currentStep === "review" ? (
            <>
              <Button variant="outline" onClick={goBack} className="gap-1" data-testid="button-review-back">
                <ChevronRight className="w-4 h-4" />
                قبلی
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} data-testid="button-close-onboarding">
                  انصراف
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={isSaving || elements.length === 0}
                  className="gap-2"
                  data-testid="button-save-elements"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ذخیره‌سازی...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      ذخیره و ادامه ({toPersianNumber(elements.length)} عنصر)
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={goBack} className="gap-1" data-testid="button-step-back">
                <ChevronRight className="w-4 h-4" />
                قبلی
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={goNext} data-testid="button-skip-step">
                  رد کردن
                </Button>
                <Button onClick={goNext} className="gap-1" data-testid="button-step-next">
                  بعدی
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-[9999] bg-black/92 flex items-center justify-center cursor-zoom-out"
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt="preview"
              className="max-w-[88vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={() => setLightboxUrl(null)}
              data-testid="button-close-lightbox"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
