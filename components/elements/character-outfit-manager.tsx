"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wand2, Shirt, Loader2, Check, Trash2, Eye, X,
  ChevronDown, ChevronUp, Sparkles, History, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Asset, DirectorBrief } from "@/lib/types";

interface OutfitManagerProps {
  character: Asset;
  directorBrief?: DirectorBrief | null;
  onClose?: () => void;
}

const OUTFIT_CATEGORIES = [
  { id: "casual", label: "کژوال", icon: Shirt, color: "bg-blue-500/10 text-blue-400" },
  { id: "formal", label: "رسمی", icon: Shirt, color: "bg-amber-500/10 text-amber-400" },
  { id: "business", label: "بیزنس", icon: Shirt, color: "bg-emerald-500/10 text-emerald-400" },
  { id: "action", label: "اکشن", icon: Sparkles, color: "bg-red-500/10 text-red-400" },
  { id: "period", label: "تاریخی", icon: Layers, color: "bg-purple-500/10 text-purple-400" },
  { id: "costume", label: "فانتزی", icon: Sparkles, color: "bg-pink-500/10 text-pink-400" },
  { id: "ceremonial", label: "مراسم", icon: Shirt, color: "bg-cyan-500/10 text-cyan-400" },
  { id: "military", label: "نظامی", icon: Shirt, color: "bg-slate-500/10 text-slate-400" },
  { id: "sport", label: "ورزشی", icon: Shirt, color: "bg-green-500/10 text-green-400" },
  { id: "winter", label: "زمستانی", icon: Shirt, color: "bg-sky-500/10 text-sky-400" },
  { id: "summer", label: "تابستانی", icon: Shirt, color: "bg-yellow-500/10 text-yellow-400" },
  { id: "nightwear", label: "خواب", icon: Shirt, color: "bg-indigo-500/10 text-indigo-400" },
  { id: "swimwear", label: "ساحلی", icon: Shirt, color: "bg-teal-500/10 text-teal-400" },
  { id: "wedding", label: "عروسی", icon: Shirt, color: "bg-rose-500/10 text-rose-400" },
  { id: "undercover", label: "مخفی", icon: Eye, color: "bg-orange-500/10 text-orange-400" },
];

export function CharacterOutfitManager({ character, directorBrief, onClose }: OutfitManagerProps) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [sceneContext, setSceneContext] = useState("");
  const [generatingOutfitId, setGeneratingOutfitId] = useState<string | null>(null);
  const [showOutfits, setShowOutfits] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const metadata = (character.metadata as Record<string, unknown>) || {};
  const outfits = (metadata.outfits as Record<string, unknown>[] | null) || [];
  const versions = (metadata.versions as Record<string, unknown>[] | null) || [];
  const activeOutfitId = (metadata.activeOutfitId as string | null) || null;

  const generateOutfitMutation = useMutation({
    mutationFn: async (data: {
      characterId: number;
      outfitType: string;
      sceneContext?: string;
      outfitDescription?: string;
      directorBrief?: DirectorBrief | null;
    }) => {
      const res = await fetch("/api/ai/character-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-outfit",
          ...data,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate outfit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", character.projectId, "elements"] });
    },
  });

  const activateOutfitMutation = useMutation({
    mutationFn: async ({ characterId, outfitId }: { characterId: number; outfitId: string }) => {
      const res = await fetch("/api/ai/character-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "activate-outfit",
          characterId,
          outfitId,
        }),
      });
      if (!res.ok) throw new Error("Failed to activate outfit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", character.projectId, "elements"] });
    },
  });

  const deleteOutfitMutation = useMutation({
    mutationFn: async ({ characterId, outfitId }: { characterId: number; outfitId: string }) => {
      const res = await fetch("/api/ai/character-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-outfit",
          characterId,
          outfitId,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete outfit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", character.projectId, "elements"] });
    },
  });

  const handleGenerateOutfit = useCallback(async (categoryId: string) => {
    setGeneratingOutfitId(categoryId);
    try {
      await generateOutfitMutation.mutateAsync({
        characterId: character.id,
        outfitType: categoryId,
        sceneContext: sceneContext || undefined,
        outfitDescription: customDescription || undefined,
        directorBrief,
      });
    } catch {
      // error handled by mutation
    } finally {
      setGeneratingOutfitId(null);
    }
  }, [character.id, sceneContext, customDescription, directorBrief, generateOutfitMutation]);

  const handleActivateOutfit = useCallback(async (outfitId: string) => {
    await activateOutfitMutation.mutateAsync({ characterId: character.id, outfitId });
  }, [character.id, activateOutfitMutation]);

  const handleDeleteOutfit = useCallback(async (outfitId: string) => {
    await deleteOutfitMutation.mutateAsync({ characterId: character.id, outfitId });
  }, [character.id, deleteOutfitMutation]);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Character header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-border flex-shrink-0">
            {character.imageUrl ? (
              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Shirt className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{character.name}</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {character.description?.slice(0, 60) || "بدون توضیحات"}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Scene context */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground font-medium">بافت صحنه (اختیاری)</label>
            <input
              type="text"
              value={sceneContext}
              onChange={(e) => setSceneContext(e.target.value)}
              placeholder="مثلاً: شب بارانی، مهمانی رسمی، میدان نبرد..."
              className="w-full h-8 px-3 rounded-lg border border-border bg-muted/50 text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Custom outfit description */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground font-medium">توضیح دستی لباس (اختیاری)</label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="مثلاً: کت مخملی سبز، شلوار جین سوراخ‌دار..."
              className="w-full h-8 px-3 rounded-lg border border-border bg-muted/50 text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Outfit categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground font-medium">دسته‌بندی لباس</label>
              <span className="text-[10px] text-muted-foreground">{OUTFIT_CATEGORIES.length} دسته</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {OUTFIT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isGenerating = generatingOutfitId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleGenerateOutfit(cat.id)}
                    disabled={isGenerating}
                    className={cn(
                      "flex items-center gap-1.5 py-2 px-2 rounded-lg border text-[10px] font-medium transition-all",
                      selectedCategory === cat.id
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-border/80"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved outfits */}
          <div className="space-y-2">
            <button
              onClick={() => setShowOutfits(!showOutfits)}
              className="w-full flex items-center justify-between text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Shirt className="w-3 h-3" />
                لباس‌های ذخیره‌شده ({outfits.length})
              </span>
              {showOutfits ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showOutfits && (
              <div className="space-y-2">
                {outfits.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-muted-foreground">
                    هنوز لباسی تولید نشده
                  </div>
                ) : (
                  outfits.map((outfit) => {
                    const isActive = outfit.id === activeOutfitId;
                    return (
                      <div
                        key={outfit.id as string}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all",
                          isActive
                            ? "bg-blue-500/5 border-blue-500/30"
                            : "bg-muted/30 border-border hover:border-border/80"
                        )}
                      >
                        <div
                          className="w-10 h-14 rounded-lg overflow-hidden border border-border/60 flex-shrink-0 cursor-pointer"
                          onClick={() => setLightboxUrl((outfit.imageUrl as string) || null)}
                        >
                          {outfit.imageUrl ? (
                            <img
                              src={outfit.imageUrl as string}
                              alt={outfit.name as string}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Shirt className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-medium truncate">{outfit.name as string}</p>
                            {isActive && (
                              <Badge className="bg-blue-500/10 text-blue-400 text-[8px] px-1 py-0.5 border-0">
                                <Check className="w-2.5 h-2.5" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {(outfit.description as string)?.slice(0, 50) || "..."}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {((outfit.clothingTags as string[]) || []).map((tag) => (
                              <Badge key={tag} className="bg-muted text-muted-foreground text-[8px] px-1 py-0 border-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleActivateOutfit(outfit.id as string)}
                            className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                              isActive
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-muted hover:bg-blue-500/10 hover:text-blue-400"
                            )}
                            title={isActive ? "فعال" : "فعال کردن"}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteOutfit(outfit.id as string)}
                            className="w-6 h-6 rounded-md bg-muted hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Version history */}
          <div className="space-y-2">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="w-full flex items-center justify-between text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3 h-3" />
                تاریخچه نسخه‌ها ({versions.length})
              </span>
              {showVersions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showVersions && (
              <div className="space-y-2">
                {versions.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-muted-foreground">
                    هنوز نسخه‌ای ثبت نشده
                  </div>
                ) : (
                  versions.map((version, idx) => {
                    const isOutfit = version.type === "outfit";
                    return (
                      <div
                        key={version.id as string}
                        className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 border-border"
                      >
                        <div className="text-[10px] font-mono text-muted-foreground w-6 flex-shrink-0">
                          #{idx + 1}
                        </div>
                        {version.imageUrl ? (
                          <div
                            className="w-8 h-8 rounded overflow-hidden border border-border/60 cursor-pointer"
                            onClick={() => setLightboxUrl(version.imageUrl as string)}
                          >
                            <img src={version.imageUrl as string} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn(
                              "text-[8px] px-1 py-0 border-0",
                              isOutfit
                                ? "bg-purple-500/10 text-purple-400"
                                : "bg-blue-500/10 text-blue-400"
                            )}>
                              {isOutfit ? "لباس" : "تصویر"}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(version.timestamp as string).toLocaleDateString("fa-IR")}
                            </span>
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                            {(version.prompt as string)?.slice(0, 60) || "..."}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const versionImageUrl = version.imageUrl as string;
                            if (!versionImageUrl) return;
                            await fetch(`/api/assets/${character.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                imageUrl: versionImageUrl,
                                thumbnailUrl: versionImageUrl,
                              }),
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
                          }}
                          className="w-6 h-6 rounded-md bg-muted hover:bg-blue-500/10 hover:text-blue-400 flex items-center justify-center transition-colors flex-shrink-0"
                          title="بازگردانی"
                        >
                          <History className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" className="max-w-full max-h-[90vh] rounded-lg" />
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
