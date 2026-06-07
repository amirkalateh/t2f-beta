"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  ChevronDown,
  Upload,
  Plus,
  Wand2,
  Settings2,
  Folder,
  X,
  User,
  MapPin,
  Package,
  AtSign,
} from "lucide-react";
import SafeImage from "@/components/ui/safe-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Asset, AssetType } from "@/lib/types";

type GenerationMode = "image" | "video";
type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "3:2" | "2:3";
type Duration = "5s" | "10s";
type ImageRefType = "subject" | "face" | "none";
type Resolution = "1k" | "2k" | "4k";

interface ModelOption {
  id: string;
  name: string;
  badge?: string;
}

interface ReferenceAsset {
  id: string;
  url: string;
  name: string;
  type: "file" | "library";
}

const imageModels: ModelOption[] = [
  { id: "kling-v3-omni", name: "Kling v3 Omni", badge: "1K" },
  { id: "kling-image-o1", name: "Kling O1 Omni", badge: "O1" },
  { id: "kling-v3", name: "Kling v3", badge: "جدید" },
  { id: "kling-v2-1", name: "Kling v2.1" },
  { id: "kling-v2", name: "Kling v2" },
  { id: "kling-v1-5", name: "Kling v1.5" },
  { id: "kling-v1", name: "Kling v1" },
];

const videoModels: ModelOption[] = [
  { id: "kling-v2-6-pro", name: "Kling v2.6 Pro", badge: "جدید" },
  { id: "kling-v2-6-std", name: "Kling v2.6 Std" },
  { id: "kling-v2-5-turbo-pro", name: "Kling v2.5 Turbo Pro", badge: "سریع" },
  { id: "kling-v2-5-turbo-std", name: "Kling v2.5 Turbo Std" },
  { id: "kling-v2-1-pro", name: "Kling v2.1 Pro", badge: "Pro" },
  { id: "kling-v2-1-std", name: "Kling v2.1 Std" },
  { id: "kling-v2-master", name: "Kling v2 Master" },
  { id: "kling-v1-6-pro", name: "Kling v1.6 Pro" },
  { id: "kling-v1-6-std", name: "Kling v1.6 Std" },
  { id: "kling-v1-5-pro", name: "Kling v1.5 Pro" },
  { id: "kling-v1-5-std", name: "Kling v1.5 Std" },
  { id: "kling-v1-pro", name: "Kling v1 Pro" },
  { id: "kling-v1-std", name: "Kling v1 Std" },
];

const imageAspectRatios: AspectRatio[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"];
const videoAspectRatios: AspectRatio[] = ["16:9", "9:16", "1:1"];

const ELEMENT_ICONS: Record<string, typeof User> = {
  character: User,
  location: MapPin,
  property: Package,
};

const ELEMENT_COLORS: Record<string, string> = {
  character: "text-blue-400",
  location: "text-emerald-400",
  property: "text-amber-400",
};

interface FloatingPromptBarProps {
  onGenerate: (prompt: string, options: GenerationOptions) => void;
  isGenerating?: boolean;
  className?: string;
  elements?: Asset[];
}

interface GenerationOptions {
  mode: GenerationMode;
  model: string;
  aspectRatio: AspectRatio;
  duration?: Duration;
  resolution?: Resolution;
  imageReference?: ImageRefType;
  imageFidelity?: number;
  humanFidelity?: number;
  referenceImages?: File[];
  referenceAssets?: ReferenceAsset[];
}

export function FloatingPromptBar({
  onGenerate,
  isGenerating,
  className,
  elements = [],
}: FloatingPromptBarProps) {
  const [mode, setMode] = useState<GenerationMode>("image");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    mode === "image" ? imageModels[0] : videoModels[0],
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState<Duration>("5s");
  const [resolution, setResolution] = useState<Resolution>("1k");
  const [imageRefType, setImageRefType] = useState<ImageRefType>("none");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([]);
  const [showRefUpload, setShowRefUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const filteredMentions = useMemo(() => {
    if (!showMentions || !elements.length) return [];
    const query = mentionQuery.toLowerCase();
    return elements
      .filter((el) => !el.fileUrl && !el.mediaType)
      .filter((el) =>
        el.name.toLowerCase().includes(query) ||
        (el.description && el.description.toLowerCase().includes(query)) ||
        (el.tags && el.tags.some((t: string) => t.toLowerCase().includes(query)))
      ).slice(0, 8);
  }, [showMentions, mentionQuery, elements]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setPrompt(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textBetween = textBeforeCursor.slice(atIndex + 1);
      const hasWhitespace = /\s/.test(textBetween);

      if (!hasWhitespace && textBetween.length <= 30) {
        setShowMentions(true);
        setMentionStart(atIndex);
        setMentionQuery(textBetween);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
    setMentionQuery("");
  }, []);

  const handleSelectMention = useCallback((element: Asset) => {
    if (mentionStart === -1) return;

    const before = prompt.slice(0, mentionStart);
    const afterCursor = prompt.slice(mentionStart + 1 + mentionQuery.length);

    const elementDesc = element.description
      ? `[${element.name}: ${element.description}]`
      : `[${element.name}]`;

    const newPrompt = before + elementDesc + " " + afterCursor;
    setPrompt(newPrompt);
    setShowMentions(false);
    setMentionQuery("");
    setMentionStart(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + elementDesc.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [prompt, mentionStart, mentionQuery]);

  const handlePromptKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredMentions.length === 0) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < filteredMentions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredMentions.length - 1
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      handleSelectMention(filteredMentions[selectedMentionIndex]);
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  }, [showMentions, filteredMentions, selectedMentionIndex, handleSelectMention]);

  const models = mode === "image" ? imageModels : videoModels;
  const totalRefs = referenceImages.length + referenceAssets.length;
  const isOmni = model.id === "kling-v3-omni" || model.id === "kling-image-o1";
  const maxRefs = isOmni ? 10 : 4;
  const availableResolutions: Resolution[] = ["1k"];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxNew = maxRefs - totalRefs;
    const newAssets: ReferenceAsset[] = files
      .slice(0, maxNew)
      .map((file, i) => ({
        id: `file-${Date.now()}-${i}`,
        url: URL.createObjectURL(file),
        name: file.name,
        type: "file" as const,
      }));
    setReferenceAssets((prev) => [...prev, ...newAssets].slice(0, maxRefs));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleModeChange = (newMode: GenerationMode) => {
    setMode(newMode);
    setModel(newMode === "image" ? imageModels[0] : videoModels[0]);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt, {
      mode,
      model: model.id,
      aspectRatio,
      duration: mode === "video" ? duration : undefined,
      resolution: mode === "image" ? resolution : undefined,
      imageReference: mode === "image" && totalRefs > 0 && imageRefType !== "none" ? imageRefType : undefined,
      referenceImages,
      referenceAssets,
    });
  };

  const handleRemoveAsset = (id: string) => {
    setReferenceAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4",
        "z-50",
        className,
      )}
      data-testid="floating-prompt-bar"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="prompt-bar rounded-2xl p-3 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted/40">
            <button
              onClick={() => handleModeChange("image")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                mode === "image"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground",
              )}
              data-testid="mode-image"
            >
              <ImageIcon className="w-4 h-4" />
              <span>IMAGE</span>
            </button>
            <button
              onClick={() => handleModeChange("video")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                mode === "video"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground",
              )}
              data-testid="mode-video"
            >
              <Video className="w-4 h-4" />
              <span>VIDEO</span>
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRefUpload(!showRefUpload)}
            className={cn(
              "gap-1.5 text-muted-foreground",
              totalRefs > 0 && "text-primary",
            )}
            data-testid="button-ref-images"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">
              {totalRefs > 0 ? `${totalRefs} \u062A\u0635\u0648\u06CC\u0631 \u0645\u0631\u062C\u0639` : "\u062A\u0635\u0648\u06CC\u0631 \u0645\u0631\u062C\u0639"}
            </span>
            {totalRefs > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalRefs}/{maxRefs}
              </Badge>
            )}
          </Button>

          {elements.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => {
                if (textareaRef.current) {
                  const cursorPos = textareaRef.current.selectionStart;
                  const before = prompt.slice(0, cursorPos);
                  const after = prompt.slice(cursorPos);
                  setPrompt(before + "@" + after);
                  setMentionStart(cursorPos);
                  setMentionQuery("");
                  setShowMentions(true);
                  setSelectedMentionIndex(0);
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                      textareaRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
                    }
                  }, 0);
                }
              }}
              data-testid="button-mention"
            >
              <AtSign className="w-4 h-4" />
              <span className="hidden sm:inline">\u0639\u0646\u0627\u0635\u0631</span>
            </Button>
          )}

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                data-testid="model-selector"
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">{model.name}</span>
                {model.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1 bg-amber-500/20 text-amber-500 border-amber-500/20">
                    {model.badge}
                  </Badge>
                )}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel className="flex items-center gap-2">
                {mode === "image" ? (
                  <>
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span>مدل تصویر</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-primary" />
                    <span>مدل ویدیو</span>
                  </>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {models.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setModel(m)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer py-2.5",
                    model.id === m.id && "bg-primary/10"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("text-sm", model.id === m.id ? "font-bold text-primary" : "font-medium")}>
                      {m.name}
                    </span>
                    {m.id.includes("omni") && (
                      <span className="text-[10px] text-muted-foreground">Highest Quality • Multi-Reference</span>
                    )}
                  </div>
                  {m.badge && (
                    <Badge variant="secondary" className="text-[10px] px-1 bg-amber-500/20 text-amber-500 border-amber-500/20 shrink-0">
                      {m.badge}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AnimatePresence>
          {showRefUpload && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border space-y-3">
                {referenceAssets.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {referenceAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="relative w-16 h-16 rounded-md overflow-hidden bg-muted group"
                      >
                        <SafeImage
                          src={asset.url}
                          alt={asset.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                        <button
                          onClick={() => handleRemoveAsset(asset.id)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground flex-1">
                    {isOmni ? "تا ۱۰ تصویر مرجع می‌توانید اضافه کنید" : "تا ۴ تصویر مرجع می‌توانید اضافه کنید"}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={totalRefs >= maxRefs}
                  >
                    <Folder className="w-4 h-4" />
                    از کتابخانه
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={totalRefs >= maxRefs}
                    onClick={handleUploadClick}
                    data-testid="button-upload-ref"
                  >
                    <Upload className="w-4 h-4" />
                    \u0622\u067E\u0644\u0648\u062F
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handlePromptKeyDown}
              onBlur={() => {
                setTimeout(() => setShowMentions(false), 200);
              }}
              placeholder={
                mode === "image"
                  ? "\u062A\u0648\u0635\u06CC\u0641 \u062A\u0635\u0648\u06CC\u0631 \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u062E\u0648\u062F \u0631\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F... (\u0628\u0627 @ \u0639\u0646\u0627\u0635\u0631 \u0631\u0627 \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646\u06CC\u062F)"
                  : "\u0635\u062D\u0646\u0647 \u0648\u06CC\u062F\u06CC\u0648\u06CC\u06CC \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u062E\u0648\u062F \u0631\u0627 \u062A\u0648\u0635\u06CC\u0641 \u06A9\u0646\u06CC\u062F... (\u0628\u0627 @ \u0639\u0646\u0627\u0635\u0631 \u0631\u0627 \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646\u06CC\u062F)"
              }
              className={cn(
                "w-full min-h-[44px] max-h-32 px-4 py-3 rounded-2xl resize-none",
                "glass-surface",
                "text-sm placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                "transition-all",
              )}
              rows={1}
              data-testid="prompt-input"
            />

            <AnimatePresence>
              {showMentions && filteredMentions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full mb-2 left-0 right-0 z-[100]"
                >
                  <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-64" dir="rtl">
                    <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
                      <AtSign className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">\u0639\u0646\u0627\u0635\u0631 \u067E\u0631\u0648\u0698\u0647</span>
                      {mentionQuery && (
                        <Badge variant="secondary" className="text-[10px]">{mentionQuery}</Badge>
                      )}
                    </div>
                    <ScrollArea className="max-h-52">
                      {filteredMentions.map((element, index) => {
                        const Icon = ELEMENT_ICONS[element.type] || Package;
                        const color = ELEMENT_COLORS[element.type] || "text-muted-foreground";
                        return (
                          <button
                            key={element.id}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 text-right transition-colors",
                              index === selectedMentionIndex
                                ? "bg-primary/10 text-foreground"
                                : "text-foreground"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectMention(element);
                            }}
                            onMouseEnter={() => setSelectedMentionIndex(index)}
                            data-testid={`mention-item-${element.id}`}
                          >
                            {element.thumbnailUrl || element.imageUrl ? (
                              <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                <img
                                  src={element.thumbnailUrl || element.imageUrl || ""}
                                  alt={element.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                <Icon className={cn("w-4 h-4", color)} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium truncate">{element.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 flex-shrink-0">
                                  {element.type === "character" ? "\u0634\u062E\u0635\u06CC\u062A" : element.type === "location" ? "\u0644\u0648\u06A9\u06CC\u0634\u0646" : "\u0622\u06CC\u062A\u0645"}
                                </Badge>
                              </div>
                              {element.description && (
                                <p className="text-xs text-muted-foreground truncate">{element.description}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </ScrollArea>
                    <div className="px-3 py-1.5 border-t border-border/50 text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>\u2191\u2193 \u0646\u0627\u0648\u0628\u0631\u06CC</span>
                      <span>\u2022</span>
                      <span>Enter \u0627\u0646\u062A\u062E\u0627\u0628</span>
                      <span>\u2022</span>
                      <span>Esc \u0628\u0633\u062A\u0646</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            variant="aiGenerate"
            className="h-11 px-6 gap-2 rounded-lg"
            data-testid="button-generate"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">\u062A\u0648\u0644\u06CC\u062F</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            {(mode === "image" ? imageAspectRatios : videoAspectRatios).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200",
                  aspectRatio === ratio
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`aspect-${ratio}`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {mode === "video" && (
            <>
              <div className="w-px h-4 bg-border/30" />
              <div className="flex items-center gap-1.5">
                {(["5s", "10s"] as Duration[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200",
                      duration === d
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`duration-${d}`}
                  >
                    {d === "5s" ? "\u06F5 \u062B\u0627\u0646\u06CC\u0647" : "\u06F1\u06F0 \u062B\u0627\u0646\u06CC\u0647"}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "image" && (
            <>
              <div className="w-px h-4 bg-border/30" />
              <div className="flex items-center gap-1.5">
                {availableResolutions.map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200",
                      resolution === r
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`resolution-${r}`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "image" && totalRefs > 0 && (
            <>
              <div className="w-px h-4 bg-border/30" />
              <div className="flex items-center gap-1.5">
                {([
                  { value: "none" as ImageRefType, label: "\u0639\u0627\u062F\u06CC" },
                  { value: "subject" as ImageRefType, label: "\u0633\u0648\u0698\u0647" },
                  { value: "face" as ImageRefType, label: "\u0686\u0647\u0631\u0647" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setImageRefType(opt.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200",
                      imageRefType === opt.value
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`ref-type-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex-1" />
          <Badge variant="pill" className="text-[11px]">
            \u06F1 \u062A\u0635\u0648\u06CC\u0631
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}
