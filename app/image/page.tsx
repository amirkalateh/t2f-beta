"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, Loader2, ImagePlus, X, ChevronDown, SlidersHorizontal, Copy, Maximize2 } from "lucide-react";
import { MegaNav } from "@/components/layout/mega-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import SafeImage from "@/components/ui/safe-image";
import { useToast } from "@/hooks/use-toast";

interface GenerateRequest {
  mode: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  n: number;
  negativePrompt?: string;
  referenceImageUrl?: string;
  imageReference?: "subject" | "face";
  imageFidelity?: number;
  humanFidelity?: number;
}

interface GenerationTask {
  id: string;
  taskId: string;
  imageSource: string;
  prompt: string;
  model: string;
  status: "processing" | "succeed" | "failed";
  images?: Array<{ index: number; url: string }>;
  error?: string;
  createdAt: number;
}

const MODELS = [
  { value: "kling-v3-omni", label: "Kling v3 Omni", badge: "1K" },
  { value: "kling-image-o1", label: "Kling O1 Omni", badge: "O1" },
  { value: "kling-v3", label: "Kling v3" },
  { value: "kling-v2-1", label: "Kling v2.1" },
  { value: "kling-v2", label: "Kling v2" },
];

const BASE_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"];
const OMNI_EXTRA_RATIOS = ["21:9", "9:21"];

function getAspectRatios(model: string) {
  if (model === "kling-v3-omni" || model === "kling-image-o1") {
    return [...BASE_RATIOS, ...OMNI_EXTRA_RATIOS];
  }
  return BASE_RATIOS;
}

function getResolutions(model: string) {
  return ["1k"];
}

export default function ImageStudioPage() {
  const { toast } = useToast();

  const [model, setModel] = useState("kling-v3-omni");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("1k");
  const [imageCount, setImageCount] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceType, setReferenceType] = useState<"subject" | "face">("subject");
  const [imageFidelity, setImageFidelity] = useState(0.5);
  const [humanFidelity, setHumanFidelity] = useState(0.5);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    const ratios = getAspectRatios(model);
    if (!ratios.includes(aspectRatio)) {
      setAspectRatio("16:9");
    }
    const resolutions = getResolutions(model);
    if (!resolutions.includes(resolution)) {
      setResolution("1k");
    }
  }, [model, aspectRatio, resolution]);

  const pollTaskStatus = useCallback(async (task: GenerationTask) => {
    try {
      const params = new URLSearchParams({
        taskId: task.taskId,
        type: "image",
        imageSource: task.imageSource,
      });
      const res = await fetch(`/api/generate/status?${params}`);
      if (!res.ok) throw new Error("Status check failed");
      const data = await res.json();

      if (data.isComplete) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "succeed", images: data.images || [] }
              : t
          )
        );
      } else if (data.isFailed) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "failed", error: data.message || "Generation failed" }
              : t
          )
        );
      }

      return data.isComplete || data.isFailed;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const processingTasks = tasks.filter((t) => t.status === "processing");
    if (processingTasks.length === 0) return;

    const intervals = processingTasks.map((task) => {
      const interval = setInterval(async () => {
        const done = await pollTaskStatus(task);
        if (done) clearInterval(interval);
      }, 3000);
      return { id: task.id, interval };
    });

    return () => {
      intervals.forEach(({ interval }) => clearInterval(interval));
    };
  }, [tasks, pollTaskStatus]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "خطا", description: "لطفا یک توصیف وارد کنید", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const body: GenerateRequest = {
        mode: "image",
        prompt: prompt.trim(),
        model,
        aspectRatio,
        resolution,
        n: imageCount,
      };

      if (negativePrompt.trim() && showNegativePrompt) {
        body.negativePrompt = negativePrompt.trim();
      }

      if (referenceImageUrl.trim()) {
        body.referenceImageUrl = referenceImageUrl.trim();
        body.imageReference = referenceType;
        body.imageFidelity = imageFidelity;
        if (referenceType === "face") {
          body.humanFidelity = humanFidelity;
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();

      const newTask: GenerationTask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        taskId: data.taskId,
        imageSource: data.imageSource || "generations",
        prompt: prompt.trim(),
        model,
        status: "processing",
        createdAt: Date.now(),
      };

      setTasks((prev) => [newTask, ...prev]);
      toast({ title: "در حال تولید", description: "تصویر شما در حال ساخت است..." });
    } catch (error) {
      toast({
        title: "خطا در تولید",
        description: error instanceof Error ? error.message : "خطای ناشناخته",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast({ title: "خطا", description: "دانلود با مشکل مواجه شد", variant: "destructive" });
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "کپی شد", description: "متن پرامپت کپی شد" });
  };

  const availableRatios = getAspectRatios(model);
  const availableResolutions = getResolutions(model);

  const controlsContent = (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground" data-testid="label-model">مدل</Label>
        <Select value={model} onValueChange={setModel} data-testid="select-model">
          <SelectTrigger data-testid="select-model-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value} data-testid={`select-model-${m.value}`}>
                <span className="flex items-center gap-2">
                  {m.label}
                  {m.badge && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">{m.badge}</Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground" data-testid="label-aspect-ratio">نسبت تصویر</Label>
        <div className="flex flex-wrap gap-1.5">
          {availableRatios.map((ratio) => (
            <Button
              key={ratio}
              variant={aspectRatio === ratio ? "default" : "outline"}
              size="sm"
              onClick={() => setAspectRatio(ratio)}
              data-testid={`button-ratio-${ratio.replace(":", "-")}`}
              className="text-xs"
            >
              {ratio}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground" data-testid="label-resolution">رزولوشن</Label>
        <div className="flex flex-wrap gap-1.5">
          {availableResolutions.map((res) => (
            <Button
              key={res}
              variant={resolution === res ? "default" : "outline"}
              size="sm"
              onClick={() => setResolution(res)}
              data-testid={`button-resolution-${res}`}
              className="text-xs"
            >
              {res}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground" data-testid="label-count">تعداد تصویر</Label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <Button
              key={n}
              variant={imageCount === n ? "default" : "outline"}
              size="sm"
              onClick={() => setImageCount(n)}
              data-testid={`button-count-${n}`}
              className="text-xs flex-1"
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground" data-testid="label-reference">تصویر مرجع (اختیاری)</Label>
        <Input
          value={referenceImageUrl}
          onChange={(e) => setReferenceImageUrl(e.target.value)}
          placeholder="URL تصویر مرجع"
          className="text-xs"
          data-testid="input-reference-url"
        />
        {referenceImageUrl.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground" data-testid="label-reference-type">نوع مرجع</Label>
              <Select value={referenceType} onValueChange={(v) => setReferenceType(v as "subject" | "face")} data-testid="select-reference-type">
                <SelectTrigger data-testid="select-reference-type-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject" data-testid="select-reference-type-subject">سوژه</SelectItem>
                  <SelectItem value="face" data-testid="select-reference-type-face">چهره</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground" data-testid="label-image-fidelity">وفاداری تصویر</Label>
                <span className="text-xs text-muted-foreground" data-testid="text-image-fidelity-value">{imageFidelity.toFixed(1)}</span>
              </div>
              <Slider
                value={[imageFidelity]}
                onValueChange={([v]) => setImageFidelity(v)}
                min={0}
                max={1}
                step={0.1}
                data-testid="slider-image-fidelity"
              />
            </div>

            {referenceType === "face" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground" data-testid="label-human-fidelity">وفاداری چهره</Label>
                  <span className="text-xs text-muted-foreground" data-testid="text-human-fidelity-value">{humanFidelity.toFixed(1)}</span>
                </div>
                <Slider
                  value={[humanFidelity]}
                  onValueChange={([v]) => setHumanFidelity(v)}
                  min={0}
                  max={1}
                  step={0.1}
                  data-testid="slider-human-fidelity"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full gap-2"
        data-testid="button-generate"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isGenerating ? "در حال تولید..." : "تولید تصویر"}
      </Button>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <MegaNav />

      <div className="pt-14 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
        <aside className="hidden lg:block w-72 shrink-0 border-e border-border/40 glass-surface rounded-xl overflow-y-auto scrollbar-thin" data-testid="panel-controls">
          <div className="sticky top-0 p-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">تنظیمات تولید</span>
            </div>
          </div>
          {controlsContent}
        </aside>

        <div className="lg:hidden sticky top-14 z-30 glass border-b border-border/40">
          <button
            onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
            data-testid="button-mobile-controls-toggle"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span>تنظیمات تولید</span>
              <Badge variant="secondary" className="text-[10px]">{model === "kling-v3-omni" ? "Omni" : model === "kling-image-o1" ? "O1" : model.replace("kling-", "v")}</Badge>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileControlsOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {mobileControlsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-border/40"
                data-testid="panel-mobile-controls"
              >
                {controlsContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <main className="flex-1 flex flex-col min-w-0" data-testid="panel-main">
          <div className="p-4 lg:p-6 border-b border-border/40 space-y-3 glass-card rounded-xl m-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="صحنه‌ای را توصیف کنید..."
              className="min-h-[100px] resize-none text-base bg-muted/20"
              data-testid="textarea-prompt"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showNegativePrompt}
                  onCheckedChange={setShowNegativePrompt}
                  data-testid="switch-negative-prompt"
                />
                <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setShowNegativePrompt(!showNegativePrompt)} data-testid="label-negative-prompt">
                  پرامپت منفی
                </Label>
              </div>
              <div className="lg:hidden">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  size="sm"
                  className="gap-2"
                  data-testid="button-generate-mobile"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isGenerating ? "تولید..." : "تولید"}
                </Button>
              </div>
            </div>
            <AnimatePresence>
              {showNegativePrompt && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="عناصری که نمی‌خواهید در تصویر باشند..."
                    className="min-h-[60px] resize-none text-sm border-border/50 bg-muted/20"
                    data-testid="textarea-negative-prompt"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 p-4 lg:p-6 overflow-y-auto scrollbar-thin">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center" data-testid="empty-state">
                <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">تصاویر تولید شده اینجا نمایش داده می‌شوند</p>
                <p className="text-muted-foreground/60 text-xs mt-1">یک توصیف وارد کنید و دکمه تولید را بزنید</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {tasks.map((task) => (
                  <div key={task.id} data-testid={`task-card-${task.id}`}>
                    {task.status === "processing" && (
                      <Card className="overflow-visible p-0 rounded-xl border-border/50 glass-card">
                        <div className="aspect-square shimmer rounded-t-xl" />
                        <div className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">در حال تولید...</span>
                          </div>
                          <p className="text-xs text-muted-foreground/70 truncate" data-testid={`task-prompt-${task.id}`}>{task.prompt}</p>
                          <Badge variant="secondary" className="text-[10px]" data-testid={`task-model-${task.id}`}>
                            {MODELS.find((m) => m.value === task.model)?.label || task.model}
                          </Badge>
                        </div>
                      </Card>
                    )}

                    {task.status === "failed" && (
                      <Card className="overflow-visible p-0 rounded-xl border-border/50 glass-card">
                        <div className="aspect-square bg-destructive/10 rounded-t-xl flex items-center justify-center">
                          <X className="w-8 h-8 text-destructive/50" />
                        </div>
                        <div className="p-3 space-y-2">
                          <span className="text-xs text-destructive">خطا در تولید</span>
                          <p className="text-xs text-muted-foreground/70 truncate" data-testid={`task-prompt-${task.id}`}>{task.prompt}</p>
                          {task.error && (
                            <p className="text-[10px] text-destructive/70 truncate" data-testid={`task-error-${task.id}`}>{task.error}</p>
                          )}
                        </div>
                      </Card>
                    )}

                    {task.status === "succeed" && task.images && task.images.length > 0 && (
                      <div className="space-y-2">
                        {task.images.map((img, idx) => (
                          <Card key={idx} className="overflow-visible p-0 rounded-xl border-border/50 glass-card group relative" data-testid={`task-image-${task.id}-${idx}`}>
                            <div className="relative aspect-square rounded-t-xl overflow-hidden">
                              <SafeImage
                                src={img.url}
                                alt={task.prompt}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity p-3">
                                <div className="flex gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="bg-black/50 text-white"
                                    onClick={() => handleDownload(img.url, `image-${task.id}-${idx}.png`)}
                                    data-testid={`button-download-${task.id}-${idx}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="bg-black/50 text-white"
                                    onClick={() => handleCopyPrompt(task.prompt)}
                                    data-testid={`button-copy-prompt-${task.id}-${idx}`}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="bg-black/50 text-white"
                                    onClick={() => setExpandedImage(img.url)}
                                    data-testid={`button-expand-${task.id}-${idx}`}
                                  >
                                    <Maximize2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-1.5">
                              <p className="text-xs text-muted-foreground truncate" data-testid={`task-prompt-${task.id}`}>{task.prompt}</p>
                              <Badge variant="secondary" className="text-[10px]" data-testid={`task-model-${task.id}`}>
                                {MODELS.find((m) => m.value === task.model)?.label || task.model}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        </div>
      </div>

      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
            data-testid="modal-expanded-image"
          >
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 end-4 text-white"
              onClick={() => setExpandedImage(null)}
              data-testid="button-close-expanded"
            >
              <X className="w-5 h-5" />
            </Button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <SafeImage
                src={expandedImage}
                alt="Expanded image"
                className="max-w-full max-h-[90vh] rounded-md object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
