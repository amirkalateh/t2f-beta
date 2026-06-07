"use client";
//signs of amir
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  ChevronLeft,
  Lightbulb,
  Target,
  Users,
  Clock,
  Loader2,
  Check,
  Wand2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Zap,
  Film,
  Minus,
  Plus,
  Upload,
  Headphones,
  Mic,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn, toPersianNumber } from "@/lib/utils";
import type { Narrative } from "@/lib/types";

interface NarrativeFlowProps {
  narrative: Narrative | null;
  projectStyle?: string;
  projectTitle?: string;
  projectDescription?: string;
  projectCreativeIntent?: string;
  projectTone?: string;
  onUpdate: (updates: Partial<Narrative>) => void;
  onUpdateProject?: (updates: Record<string, unknown>) => void;
  onNext: (shotCount?: number) => void;
  isGenerating?: boolean;
  onGenerate?: () => void;
}

const videoStyles = [
  { id: "cinematic", label: "سینمایی" },
  { id: "documentary", label: "مستند" },
  { id: "commercial", label: "تبلیغاتی" },
  { id: "educational", label: "آموزشی" },
  { id: "social", label: "شبکه اجتماعی" },
];

const targetAudiences = [
  { id: "general", label: "عموم" },
  { id: "business", label: "کسب‌وکارها" },
  { id: "youth", label: "جوانان" },
  { id: "professional", label: "متخصصین" },
  { id: "children", label: "کودکان" },
];

const durations = [
  { id: "short", label: "کوتاه (۱۵-۳۰ ثانیه)" },
  { id: "medium", label: "متوسط (۱-۲ دقیقه)" },
  { id: "long", label: "بلند (۳-۵ دقیقه)" },
];

type NarrativeStep = "idea" | "logline" | "script";

const steps: { id: NarrativeStep; label: string; icon: typeof Lightbulb }[] = [
  { id: "idea", label: "ایده", icon: Lightbulb },
  { id: "logline", label: "لاگ‌لاین", icon: Zap },
  { id: "script", label: "فیلمنامه", icon: FileText },
];

export function NarrativeFlow({
  narrative,
  projectStyle,
  projectTitle,
  projectDescription,
  projectCreativeIntent,
  projectTone,
  onUpdate,
  onUpdateProject,
  onNext,
  isGenerating = false,
  onGenerate,
}: NarrativeFlowProps) {
  const [activeStep, setActiveStep] = useState<NarrativeStep>("idea");
  const [localIdea, setLocalIdea] = useState(narrative?.idea || "");
  const [localStyle, setLocalStyle] = useState(projectStyle || "cinematic");
  const [localAudience, setLocalAudience] = useState(
    narrative?.targetAudience || "general",
  );
  const [localDuration, setLocalDuration] = useState(
    narrative?.duration || "medium",
  );
  const [localLogline, setLocalLogline] = useState(narrative?.logline || "");
  const [localScript, setLocalScript] = useState(narrative?.script || "");
  const [loglineGenerating, setLoglineGenerating] = useState(false);
  const [showShotCountDialog, setShowShotCountDialog] = useState(false);
  const [shotCount, setShotCount] = useState(8);
  const [isImporting, setIsImporting] = useState(false);
  const [ideaRefining, setIdeaRefining] = useState(false);
  const [isAutoComposed, setIsAutoComposed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compose a nice idea from project metadata
  const composeIdeaFromProject = () => {
    const parts: string[] = [];
    if (projectTitle?.trim()) parts.push(`عنوان: ${projectTitle.trim()}`);
    if (projectDescription?.trim()) parts.push(projectDescription.trim());
    if (projectCreativeIntent?.trim()) parts.push(projectCreativeIntent.trim());
    const styleLabel = videoStyles.find(
      (s) => s.id === (projectStyle || localStyle),
    )?.label;
    if (styleLabel) parts.push(`سبک: ${styleLabel}`);
    if (projectTone?.trim()) parts.push(`حال و حس: ${projectTone.trim()}`);
    return parts.join("\u2003—\u2003");
  };

  // Auto-advance to the furthest completed step on load
  useEffect(() => {
    if (narrative?.script) setActiveStep("script");
    else if (narrative?.logline) setActiveStep("logline");
    else setActiveStep("idea");
  }, []);

  // Auto-fill idea from project metadata if both are empty
  useEffect(() => {
    const composed = composeIdeaFromProject();
    if (!localIdea && !narrative?.idea && composed.length >= 5) {
      setLocalIdea(composed);
      setIsAutoComposed(true);
    }
  }, [
    projectTitle,
    projectDescription,
    projectCreativeIntent,
    projectTone,
    projectStyle,
  ]);

  // Sync from props when data changes
  useEffect(() => {
    if (narrative?.idea && !localIdea) setLocalIdea(narrative.idea);
    if (narrative?.logline && !localLogline) setLocalLogline(narrative.logline);
    if (narrative?.script && narrative.script !== localScript)
      setLocalScript(narrative.script);
  }, [narrative?.idea, narrative?.logline, narrative?.script]);

  const hasIdea = localIdea.trim().length >= 5;
  const hasLogline = localLogline.trim().length > 0;
  const hasScript = localScript.trim().length > 0;

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);

  const [scriptGenerating, setScriptGenerating] = useState(false);

  // Narration TTS state
  const [narrationAudio, setNarrationAudio] = useState<string | null>(null);
  const [narrationGenerating, setNarrationGenerating] = useState(false);
  const [narrationVoice, setNarrationVoice] = useState<
    "tara" | "persian_male" | "persian_female" | "narrator"
  >("tara");
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [narrationText, setNarrationText] = useState(narrative?.script || "");
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);

  const readSSEStream = async (
    res: Response,
    onToken: (text: string) => void,
    onDone: (accumulated: string) => void,
    onError: (msg: string) => void,
  ) => {
    const reader = res.body?.getReader();
    if (!reader) {
      onError("No stream");
      return;
    }
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";
    let finished = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.error) {
            onError(data.error);
            return;
          }
          if (data.token) {
            accumulated += data.token;
            onToken(accumulated);
          }
          if (data.done) {
            finished = true;
          }
        } catch {}
      }
    }
    if (buffer.trim().startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.trim().slice(6));
        if (data.token) {
          accumulated += data.token;
          onToken(accumulated);
        }
        if (data.done) {
          finished = true;
        }
        if (data.error) {
          onError(data.error);
          return;
        }
      } catch {}
    }
    onDone(accumulated);
  };

  const handleGenerateLogline = async () => {
    if (!hasIdea) return;
    setLoglineGenerating(true);
    setLocalLogline("");
    setActiveStep("logline");

    onUpdate({
      idea: localIdea,
      targetAudience: localAudience,
      duration: localDuration,
    });
    onUpdateProject?.({ style: localStyle });

    try {
      const res = await fetch("/api/ai/script/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: localIdea,
          style: localStyle,
          targetAudience: localAudience,
          duration: localDuration,
          type: "logline",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed");
      }

      await readSSEStream(
        res,
        (text) => setLocalLogline(text),
        (final) => onUpdate({ logline: final, idea: localIdea }),
        (err) => console.error("Logline stream error:", err),
      );
    } catch (error) {
      console.error("Logline generation failed:", error);
    } finally {
      setLoglineGenerating(false);
    }
  };

  const handleRefineIdea = async () => {
    if (!hasIdea) return;
    setIdeaRefining(true);
    try {
      const res = await fetch("/api/ai/script/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: localIdea,
          style: localStyle,
          targetAudience: localAudience,
          duration: localDuration,
          type: "refineIdea",
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed");
      }
      await readSSEStream(
        res,
        (text) => setLocalIdea(text),
        (final) => {
          setLocalIdea(final);
          setIsAutoComposed(false);
          onUpdate({
            idea: final,
            targetAudience: localAudience,
            duration: localDuration,
          });
        },
        (err) => console.error("Refine idea stream error:", err),
      );
    } catch (error) {
      console.error("Idea refinement failed:", error);
    } finally {
      setIdeaRefining(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!hasLogline && !localLogline) return;
    setScriptGenerating(true);
    setLocalScript("");
    setActiveStep("script");

    onUpdate({
      logline: localLogline,
      idea: localIdea,
      targetAudience: localAudience,
      duration: localDuration,
    });
    onUpdateProject?.({ style: localStyle });

    try {
      const res = await fetch("/api/ai/script/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: localIdea,
          style: localStyle,
          targetAudience: localAudience,
          duration: localDuration,
          logline: localLogline,
          type: "script",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed");
      }

      await readSSEStream(
        res,
        (text) => setLocalScript(text),
        (final) =>
          onUpdate({ script: final, logline: localLogline, idea: localIdea }),
        (err) => console.error("Script stream error:", err),
      );
    } catch (error) {
      console.error("Script generation failed:", error);
    } finally {
      setScriptGenerating(false);
    }
  };

  // Sync narration text with script when it changes
  useEffect(() => {
    setNarrationText(localScript);
  }, [localScript]);

  // Cleanup narration audio on unmount
  useEffect(() => {
    return () => {
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
      }
    };
  }, []);

  const handleGenerateNarration = async () => {
    const text = narrationText.trim() || localScript.trim();
    if (!text || text.length < 2) return;
    setNarrationGenerating(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voicePreset: narrationVoice,
          modelId: "eleven_multilingual_v2_5",
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Narration TTS error:", data.error);
        return;
      }
      if (data.audioBase64) {
        setNarrationAudio(`data:audio/mpeg;base64,${data.audioBase64}`);
      }
    } catch (error) {
      console.error("Narration generation failed:", error);
    } finally {
      setNarrationGenerating(false);
    }
  };

  const toggleNarrationPlayback = () => {
    if (!narrationAudio) return;
    if (narrationPlaying && narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      setNarrationPlaying(false);
    } else {
      if (!narrationAudioRef.current) {
        narrationAudioRef.current = new Audio(narrationAudio);
        narrationAudioRef.current.onended = () => setNarrationPlaying(false);
      }
      narrationAudioRef.current.play().catch(console.error);
      setNarrationPlaying(true);
    }
  };

  const handleSaveAndContinue = () => {
    onUpdate({
      idea: localIdea,
      logline: localLogline,
      targetAudience: localAudience,
      duration: localDuration,
      script: localScript,
    });
    onUpdateProject?.({ style: localStyle });
    if (hasScript) {
      setShowShotCountDialog(true);
    } else {
      onNext();
    }
  };

  const handleConfirmShotCount = () => {
    setShowShotCountDialog(false);
    onNext(shotCount);
  };

  const handleStepClick = (step: NarrativeStep) => {
    const targetIndex = steps.findIndex((s) => s.id === step);
    // Can go back freely, or forward if previous step is complete
    if (targetIndex <= currentStepIndex) {
      setActiveStep(step);
    } else if (step === "logline" && hasIdea) {
      setActiveStep(step);
    } else if (step === "script" && hasLogline) {
      setActiveStep(step);
    }
  };

  const handleImportScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 200 * 1024;
    if (file.size > maxSize) {
      alert("حجم فایل نباید بیشتر از ۲۰۰ کیلوبایت باشد");
      return;
    }

    const validTypes = ["text/plain", "application/pdf", "text/markdown"];
    const validExts = [".txt", ".md", ".pdf"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      alert("فرمت فایل باید txt، md یا pdf باشد");
      return;
    }

    setIsImporting(true);
    try {
      let text = "";
      if (file.type === "application/pdf" || ext === ".pdf") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("style", localStyle);
        formData.append("targetAudience", localAudience);
        formData.append("duration", localDuration);
        if (localIdea) formData.append("idea", localIdea);

        const res = await fetch("/api/ai/script/import", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.script) {
          setLocalScript(data.script);
          if (data.logline) setLocalLogline(data.logline);
          if (data.idea) setLocalIdea(data.idea);
          onUpdate({
            script: data.script,
            logline: data.logline || localLogline,
            idea: data.idea || localIdea,
          });
          setActiveStep("script");
        }
      } else {
        text = await file.text();
        if (text.length > 50000) {
          text = text.substring(0, 50000);
        }

        const res = await fetch("/api/ai/script/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText: text,
            style: localStyle,
            targetAudience: localAudience,
            duration: localDuration,
            idea: localIdea || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.script) {
          setLocalScript(data.script);
          if (data.logline) setLocalLogline(data.logline);
          if (data.idea) setLocalIdea(data.idea);
          onUpdate({
            script: data.script,
            logline: data.logline || localLogline,
            idea: data.idea || localIdea,
          });
          setActiveStep("script");
        }
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("خطا در وارد کردن فیلمنامه. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl stage-icon-narrative flex items-center justify-center shadow-glow-narrative">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">روایت داستان</h2>
              <p className="text-sm text-muted-foreground">
                ایده خود را بنویسید و با هوش مصنوعی بسازید
              </p>
            </div>
          </div>
          <Badge variant="narrative">مرحله ۱ از ۷</Badge>
        </div>
      </div>

      {/* Internal step progress */}
      <div className="flex items-center gap-2 mb-6 bg-card/50 rounded-xl p-3 border border-border/30">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = activeStep === step.id;
          const isCompleted =
            (step.id === "idea" && hasIdea) ||
            (step.id === "logline" && hasLogline) ||
            (step.id === "script" && hasScript);

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => handleStepClick(step.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full",
                  isActive
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : isCompleted
                      ? "text-foreground cursor-pointer hover-elevate"
                      : "text-muted-foreground/50 cursor-default",
                )}
                data-testid={`button-narrative-step-${step.id}`}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <StepIcon className="w-3 h-3" />
                  )}
                </div>
                <span className="text-sm font-medium">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <ArrowLeft className="w-4 h-4 text-muted-foreground/30 mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto space-y-6">
        <AnimatePresence mode="wait">
          {activeStep === "idea" && (
            <motion.div
              key="idea"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Card className="border-card-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="w-4 h-4 text-golden" />
                    ایده اصلی
                  </CardTitle>
                  <CardDescription>
                    ایده ویدیوی خود را بنویسید و با هوش مصنوعی لاگ‌لاین و
                    فیلمنامه بسازید
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="مثال: یک ویدیوی سینمایی درباره سفر یک عکاس به کویر لوت و کشف زیبایی‌های پنهان طبیعت ایران..."
                    className={cn(
                      "min-h-[160px] resize-none text-base leading-relaxed",
                      ideaRefining && "animate-pulse",
                    )}
                    value={localIdea}
                    onChange={(e) => {
                      setLocalIdea(e.target.value);
                      if (isAutoComposed) setIsAutoComposed(false);
                    }}
                    readOnly={ideaRefining}
                    dir="rtl"
                    data-testid="input-idea"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{localIdea.length} کاراکتر</span>
                    {!hasIdea && <span>حداقل ۵ کاراکتر</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isAutoComposed && (
                        <Badge variant="secondary" className="text-[10px] h-6">
                          <Zap className="w-3 h-3 mr-1" />
                          از اطلاعات پروژه ساخته شد
                        </Badge>
                      )}
                      <Button
                        variant="aiGenerate"
                        size="sm"
                        onClick={handleRefineIdea}
                        disabled={!hasIdea || ideaRefining}
                        className="gap-1.5 h-8 text-xs"
                        data-testid="button-refine-idea"
                      >
                        {ideaRefining ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {ideaRefining ? "در حال پالایش..." : "پالایش ایده"}
                      </Button>
                    </div>
                    <Button
                      variant="aiGenerate"
                      size="sm"
                      onClick={handleGenerateLogline}
                      disabled={!hasIdea || loglineGenerating}
                      className="gap-1.5 h-8 text-xs"
                      data-testid="button-generate-logline"
                    >
                      {loglineGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {loglineGenerating
                        ? "در حال تولید لاگ‌لاین..."
                        : "تولید لاگ‌لاین"}
                      <ArrowLeft className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeStep === "logline" && (
            <motion.div
              key="logline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Card className="border-card-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="w-4 h-4 text-golden" />
                    لاگ‌لاین
                  </CardTitle>
                  <CardDescription>
                    خلاصه یک‌خطی داستان - قابل ویرایش
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="لاگ‌لاین داستان..."
                    className={cn(
                      "min-h-[100px] resize-none text-base leading-relaxed",
                      loglineGenerating && "animate-pulse",
                    )}
                    value={localLogline}
                    onChange={(e) => setLocalLogline(e.target.value)}
                    readOnly={loglineGenerating}
                    dir="rtl"
                    data-testid="input-logline"
                  />
                  <div className="flex items-center gap-2">
                    <Card className="border-card-border bg-muted/30 flex-1">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-golden flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium mb-0.5">ایده</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {localIdea}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveStep("idea")}
                      className="gap-1.5 h-8 text-xs"
                      data-testid="button-back-to-idea"
                    >
                      <ArrowRight className="w-3 h-3" />
                      بازگشت
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateLogline}
                      disabled={loglineGenerating}
                      className="gap-1.5 h-8 text-xs"
                      data-testid="button-regenerate-logline"
                    >
                      {loglineGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      تولید مجدد
                    </Button>
                    <Button
                      variant="aiGenerate"
                      size="sm"
                      onClick={handleGenerateScript}
                      disabled={!hasLogline || scriptGenerating}
                      className="gap-1.5 h-8 text-xs"
                      data-testid="button-generate-script"
                    >
                      {scriptGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {scriptGenerating
                        ? "\u062f\u0631 \u062d\u0627\u0644 \u062a\u0648\u0644\u06cc\u062f \u0641\u06cc\u0644\u0645\u0646\u0627\u0645\u0647..."
                        : "\u062a\u0648\u0644\u06cc\u062f \u0641\u06cc\u0644\u0645\u0646\u0627\u0645\u0647"}
                      <ArrowLeft className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeStep === "script" && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf"
                onChange={handleImportScript}
                className="hidden"
                data-testid="input-import-script-file"
              />
              <Card className="border-card-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wand2 className="w-4 h-4 text-primary" />
                    فیلمنامه
                  </CardTitle>
                  <CardDescription>فیلمنامه کامل - قابل ویرایش</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="border-card-border bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-golden flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium mb-0.5">ایده</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {localIdea}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-card-border bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-golden flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium mb-0.5">
                              لاگ‌لاین
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {localLogline}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Textarea
                    placeholder="فیلمنامه و متن روایت ویدیو..."
                    className={cn(
                      "min-h-[300px] resize-none leading-relaxed text-base",
                      scriptGenerating && "animate-pulse",
                    )}
                    value={localScript}
                    onChange={(e) => setLocalScript(e.target.value)}
                    readOnly={scriptGenerating || isImporting}
                    dir="rtl"
                    data-testid="input-script"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="aiGenerate"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting || scriptGenerating}
                        className="gap-1.5 h-8 text-xs"
                        data-testid="button-import-script"
                      >
                        {isImporting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        وارد
                      </Button>
                      <Button
                        variant="aiGenerate"
                        size="sm"
                        onClick={handleGenerateScript}
                        disabled={scriptGenerating || isImporting}
                        className="gap-1.5 h-8 text-xs"
                        data-testid="button-regenerate-script"
                      >
                        {scriptGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        تولید مجدد
                      </Button>
                    </div>
                    <Button
                      variant="aiGenerate"
                      size="sm"
                      onClick={handleSaveAndContinue}
                      disabled={!hasIdea}
                      className="gap-2 h-8 text-xs"
                      data-testid="button-next-stage"
                    >
                      {hasScript ? (
                        <>
                          <Check className="w-3 h-3" />
                          ذخیره و ادامه به بصری
                        </>
                      ) : (
                        <>ادامه</>
                      )}
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showShotCountDialog} onOpenChange={setShowShotCountDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              تعداد پلن‌ها (شات‌ها)
            </DialogTitle>
            <DialogDescription>
              چند پلن (شات) برای دکوپاژ خودکار فیلمنامه می‌خواهید؟ بعدا
              می‌توانید پلن‌ها را اضافه یا حذف کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShotCount((prev) => Math.max(2, prev - 1))}
                disabled={shotCount <= 2}
                data-testid="button-shot-count-minus"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex flex-col items-center min-w-[80px]">
                <span
                  className="text-4xl font-bold text-primary"
                  data-testid="text-shot-count"
                >
                  {toPersianNumber(shotCount)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">پلن</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShotCount((prev) => Math.min(16, prev + 1))}
                disabled={shotCount >= 16}
                data-testid="button-shot-count-plus"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="px-4">
              <Slider
                value={[shotCount]}
                onValueChange={([v]) => setShotCount(v)}
                min={2}
                max={16}
                step={1}
                className="w-full"
                data-testid="slider-shot-count"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {toPersianNumber(2)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  حداکثر {toPersianNumber(16)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 4, label: "کوتاه" },
                { count: 8, label: "متوسط" },
                { count: 12, label: "بلند" },
              ].map((preset) => (
                <Button
                  key={preset.count}
                  variant={shotCount === preset.count ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShotCount(preset.count)}
                  className="gap-1"
                  data-testid={`button-preset-${preset.count}`}
                >
                  {toPersianNumber(preset.count)} پلن
                  <span className="text-[10px] opacity-70">
                    ({preset.label})
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowShotCountDialog(false);
                onNext();
              }}
              data-testid="button-skip-shot-count"
            >
              بدون دکوپاژ خودکار
            </Button>
            <Button
              variant="aiGenerate"
              onClick={handleConfirmShotCount}
              className="gap-2"
              data-testid="button-confirm-shot-count"
            >
              <Sparkles className="w-4 h-4" />
              ادامه با {toPersianNumber(shotCount)} پلن
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
