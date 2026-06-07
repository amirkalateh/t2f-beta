"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download, Loader2, Film, X, ChevronDown, SlidersHorizontal, Video, ImagePlus, Play } from "lucide-react";
import { MegaNav } from "@/components/layout/mega-nav";
import { FXLogo } from "@/components/layout/fx-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import SafeImage from "@/components/ui/safe-image";
import { useToast } from "@/hooks/use-toast";

interface VideoTask {
  id: string;
  taskId: string;
  prompt: string;
  model: string;
  status: "processing" | "succeed" | "failed";
  videos?: Array<{ index: number; url: string }>;
  error?: string;
  createdAt: number;
}

const VIDEO_MODELS = [
  { value: "kling-v2-6-pro", label: "Kling v2.6 Pro", badge: "BEST" },
  { value: "kling-v2-6-std", label: "Kling v2.6 Standard" },
  { value: "kling-v2-5-turbo-pro", label: "Kling v2.5 Turbo Pro" },
  { value: "kling-v2-5-turbo-std", label: "Kling v2.5 Turbo Std" },
  { value: "kling-v2-1-pro", label: "Kling v2.1 Pro" },
  { value: "kling-v2-1-std", label: "Kling v2.1 Standard" },
  { value: "kling-v2-master", label: "Kling v2 Master" },
];

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];

type VideoMode = "t2v" | "i2v";

export default function VideoStudioPage() {
  const { toast } = useToast();

  const [mode, setMode] = useState<VideoMode>("t2v");
  const [model, setModel] = useState("kling-v2-6-pro");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [prompt, setPrompt] = useState("");
  const [startFrameUrl, setStartFrameUrl] = useState("");
  const [endFrameUrl, setEndFrameUrl] = useState("");
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const pollTaskStatus = useCallback(async (task: VideoTask) => {
    try {
      const params = new URLSearchParams({ taskId: task.taskId, type: "video" });
      const res = await fetch(`/api/generate/status?${params}`);
      if (!res.ok) throw new Error("Status check failed");
      const data = await res.json();

      if (data.isComplete) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "succeed", videos: data.videos || [] }
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
      }, 5000);
      return { id: task.id, interval };
    });

    return () => {
      intervals.forEach(({ interval }) => clearInterval(interval));
    };
  }, [tasks, pollTaskStatus]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "\u062E\u0637\u0627", description: "\u0644\u0637\u0641\u0627 \u06CC\u06A9 \u062A\u0648\u0635\u06CC\u0641 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const body: Record<string, unknown> = {
        mode: "video",
        prompt: prompt.trim(),
        model,
        aspectRatio,
        duration,
      };

      if (mode === "i2v" && startFrameUrl.trim()) {
        body.referenceImageUrl = startFrameUrl.trim();
      }
      if (mode === "i2v" && endFrameUrl.trim()) {
        body.endFrameUrl = endFrameUrl.trim();
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

      const newTask: VideoTask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        taskId: data.taskId,
        prompt: prompt.trim(),
        model,
        status: "processing",
        createdAt: Date.now(),
      };

      setTasks((prev) => [newTask, ...prev]);
      toast({ title: "\u062F\u0631 \u062D\u0627\u0644 \u062A\u0648\u0644\u06CC\u062F", description: "\u0648\u06CC\u062F\u06CC\u0648\u06CC \u0634\u0645\u0627 \u062F\u0631 \u062D\u0627\u0644 \u0633\u0627\u062E\u062A \u0627\u0633\u062A..." });
    } catch (error) {
      toast({
        title: "\u062E\u0637\u0627 \u062F\u0631 \u062A\u0648\u0644\u06CC\u062F",
        description: error instanceof Error ? error.message : "\u062E\u0637\u0627\u06CC \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647",
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
      toast({ title: "\u062E\u0637\u0627", description: "\u062F\u0627\u0646\u0644\u0648\u062F \u0628\u0627 \u0645\u0634\u06A9\u0644 \u0645\u0648\u0627\u062C\u0647 \u0634\u062F", variant: "destructive" });
    }
  };

  const controlsContent = (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{"\u062D\u0627\u0644\u062A \u062A\u0648\u0644\u06CC\u062F"}</Label>
        <div className="flex gap-1.5">
          <Button
            variant={mode === "t2v" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("t2v")}
            className="flex-1 gap-1.5 text-xs"
            data-testid="button-mode-t2v"
          >
            <Video className="w-3.5 h-3.5" />
            {"\u0633\u0627\u062E\u062A \u0648\u06CC\u062F\u06CC\u0648"}
          </Button>
          <Button
            variant={mode === "i2v" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("i2v")}
            className="flex-1 gap-1.5 text-xs"
            data-testid="button-mode-i2v"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {"\u062A\u0635\u0648\u06CC\u0631 \u0628\u0647 \u0648\u06CC\u062F\u06CC\u0648"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{"\u0645\u062F\u0644"}</Label>
        <Select value={model} onValueChange={setModel} data-testid="select-video-model">
          <SelectTrigger data-testid="select-video-model-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value} data-testid={`select-video-model-${m.value}`}>
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
        <Label className="text-xs text-muted-foreground">{"\u0646\u0633\u0628\u062A \u062A\u0635\u0648\u06CC\u0631"}</Label>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((ratio) => (
            <Button
              key={ratio}
              variant={aspectRatio === ratio ? "default" : "outline"}
              size="sm"
              onClick={() => setAspectRatio(ratio)}
              data-testid={`button-video-ratio-${ratio.replace(":", "-")}`}
              className="text-xs"
            >
              {ratio}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{"\u0645\u062F\u062A \u0648\u06CC\u062F\u06CC\u0648"}</Label>
        <div className="flex gap-1.5">
          <Button
            variant={duration === "5" ? "default" : "outline"}
            size="sm"
            onClick={() => setDuration("5")}
            className="flex-1 text-xs"
            data-testid="button-duration-5"
          >
            {"\u06F5 \u062B\u0627\u0646\u06CC\u0647"}
          </Button>
          <Button
            variant={duration === "10" ? "default" : "outline"}
            size="sm"
            onClick={() => setDuration("10")}
            className="flex-1 text-xs"
            data-testid="button-duration-10"
          >
            {"\u06F1\u06F0 \u062B\u0627\u0646\u06CC\u0647"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mode === "i2v" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{"\u0641\u0631\u06CC\u0645 \u0634\u0631\u0648\u0639"}</Label>
              <Input
                value={startFrameUrl}
                onChange={(e) => setStartFrameUrl(e.target.value)}
                placeholder="URL \u062A\u0635\u0648\u06CC\u0631 \u0641\u0631\u06CC\u0645 \u0634\u0631\u0648\u0639"
                className="text-xs"
                data-testid="input-start-frame-url"
              />
              {startFrameUrl.trim() && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                  <SafeImage src={startFrameUrl} alt="Start frame" fill className="object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">{"\u0641\u0631\u06CC\u0645 \u067E\u0627\u06CC\u0627\u0646 (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)"}</Label>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{"\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC"}</Badge>
              </div>
              <Input
                value={endFrameUrl}
                onChange={(e) => setEndFrameUrl(e.target.value)}
                placeholder="URL \u062A\u0635\u0648\u06CC\u0631 \u0641\u0631\u06CC\u0645 \u067E\u0627\u06CC\u0627\u0646"
                className="text-xs"
                data-testid="input-end-frame-url"
              />
              {endFrameUrl.trim() && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                  <SafeImage src={endFrameUrl} alt="End frame" fill className="object-cover" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 relative">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{"\u06A9\u0646\u062A\u0631\u0644 \u062D\u0631\u06A9\u062A"}</Label>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{"\u0628\u0647\u200C\u0632\u0648\u062F\u06CC"}</Badge>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center opacity-50 pointer-events-none">
          <p className="text-xs text-muted-foreground">{"\u06A9\u0646\u062A\u0631\u0644 \u067E\u06CC\u0634\u0631\u0641\u062A\u0647 \u062D\u0631\u06A9\u062A \u062F\u0648\u0631\u0628\u06CC\u0646"}</p>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full gap-2"
        data-testid="button-generate-video"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isGenerating ? "\u062F\u0631 \u062D\u0627\u0644 \u062A\u0648\u0644\u06CC\u062F..." : "\u062A\u0648\u0644\u06CC\u062F \u0648\u06CC\u062F\u06CC\u0648"}
      </Button>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <MegaNav />

      <div className="pt-14 max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
          <aside className="hidden lg:block w-80 shrink-0 border-e border-border/40 glass-surface overflow-y-auto scrollbar-thin rounded-xl my-4 me-4" data-testid="panel-video-controls">
            <div className="sticky top-0 p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{"\u0633\u0627\u062E\u062A \u0648\u06CC\u062F\u06CC\u0648"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{"\u0627\u06CC\u062F\u0647 \u062E\u0648\u062F \u0631\u0627 \u0628\u0647 \u0648\u06CC\u062F\u06CC\u0648\u06CC \u0633\u06CC\u0646\u0645\u0627\u06CC\u06CC \u062A\u0628\u062F\u06CC\u0644 \u06A9\u0646\u06CC\u062F"}</p>
            </div>
            {controlsContent}
          </aside>

          <div className="lg:hidden sticky top-14 z-30 glass border-b border-border/40">
            <button
              onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
              data-testid="button-video-mobile-controls-toggle"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span>{"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0648\u06CC\u062F\u06CC\u0648"}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {mode === "t2v" ? "\u0645\u062A\u0646" : "\u062A\u0635\u0648\u06CC\u0631"}
                </Badge>
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
                  data-testid="panel-video-mobile-controls"
                >
                  {controlsContent}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <main className="flex-1 flex flex-col min-w-0" data-testid="panel-video-main">
            <div className="p-4 lg:p-6 border-b border-border/40 space-y-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === "t2v" ? "\u0635\u062D\u0646\u0647 \u0648\u06CC\u062F\u06CC\u0648\u06CC\u06CC \u062E\u0648\u062F \u0631\u0627 \u062A\u0648\u0635\u06CC\u0641 \u06A9\u0646\u06CC\u062F..." : "\u062D\u0631\u06A9\u062A \u0648 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u0631\u0627 \u062A\u0648\u0635\u06CC\u0641 \u06A9\u0646\u06CC\u062F..."}
                className="min-h-[100px] resize-none text-base border-border/50 bg-muted/20"
                data-testid="textarea-video-prompt"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="lg:hidden">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    size="sm"
                    className="gap-2"
                    data-testid="button-generate-video-mobile"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isGenerating ? "\u062A\u0648\u0644\u06CC\u062F..." : "\u062A\u0648\u0644\u06CC\u062F"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 lg:p-6 overflow-y-auto scrollbar-thin">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center" data-testid="video-empty-state">
                  <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">{"\u0648\u06CC\u062F\u06CC\u0648\u0647\u0627\u06CC \u062A\u0648\u0644\u06CC\u062F \u0634\u062F\u0647 \u0627\u06CC\u0646\u062C\u0627 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F"}</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">{"\u06CC\u06A9 \u062A\u0648\u0635\u06CC\u0641 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F \u0648 \u062F\u06A9\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} data-testid={`video-task-card-${task.id}`}>
                      {task.status === "processing" && (
                        <Card className="overflow-visible p-0 rounded-xl border-border/50 glass-card">
                          <div className="aspect-video shimmer rounded-t-xl" />
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              <span className="text-xs text-muted-foreground">{"\u062F\u0631 \u062D\u0627\u0644 \u062A\u0648\u0644\u06CC\u062F \u0648\u06CC\u062F\u06CC\u0648..."}</span>
                            </div>
                            <p className="text-xs text-muted-foreground/70 truncate" data-testid={`video-task-prompt-${task.id}`}>{task.prompt}</p>
                            <Badge variant="secondary" className="text-[10px]" data-testid={`video-task-model-${task.id}`}>
                              {VIDEO_MODELS.find((m) => m.value === task.model)?.label || task.model}
                            </Badge>
                          </div>
                        </Card>
                      )}

                      {task.status === "failed" && (
                        <Card className="overflow-visible p-0 rounded-xl border-border/50 glass-card">
                          <div className="aspect-video bg-destructive/10 rounded-t-xl flex items-center justify-center">
                            <X className="w-8 h-8 text-destructive/50" />
                          </div>
                          <div className="p-3 space-y-2">
                            <span className="text-xs text-destructive">{"\u062E\u0637\u0627 \u062F\u0631 \u062A\u0648\u0644\u06CC\u062F \u0648\u06CC\u062F\u06CC\u0648"}</span>
                            <p className="text-xs text-muted-foreground/70 truncate">{task.prompt}</p>
                            {task.error && (
                              <p className="text-[10px] text-destructive/70 truncate">{task.error}</p>
                            )}
                          </div>
                        </Card>
                      )}

                      {task.status === "succeed" && task.videos && task.videos.length > 0 && (
                        <div className="space-y-2">
                          {task.videos.map((vid, idx) => (
                            <Card key={idx} className="overflow-visible p-0 group relative rounded-xl border-border/50 glass-card" data-testid={`video-result-${task.id}-${idx}`}>
                              <div className="relative aspect-video rounded-t-xl overflow-hidden bg-black">
                                <video
                                  src={vid.url}
                                  controls
                                  className="w-full h-full object-contain"
                                  data-testid={`video-player-${task.id}-${idx}`}
                                />
                              </div>
                              <div className="p-3 space-y-2">
                                <p className="text-xs text-muted-foreground/70 truncate">{task.prompt}</p>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {VIDEO_MODELS.find((m) => m.value === task.model)?.label || task.model}
                                  </Badge>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDownload(vid.url, `video-${task.id}-${idx}.mp4`)}
                                    data-testid={`button-download-video-${task.id}-${idx}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
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
    </div>
  );
}
