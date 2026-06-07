"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  MapPin,
  Package,
  Plus,
  Trash2,
  X,
  Search,
  Loader2,
  Upload,
  Wand2,
  CheckCircle2,
  Zap,
  Sparkles,
  ZoomIn,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Shirt,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Asset, AssetType, DirectorBrief } from "@/lib/types";
import { FILM_STYLE_PRESETS } from "@/lib/preset-data";
import { CharacterOutfitManager } from "@/components/elements/character-outfit-manager";

interface ElementsPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectElement?: (element: Asset) => void;
  onRequestAIGenerate?: () => void;
  hasScript?: boolean;
  directorBrief?: DirectorBrief | null;
}

const TYPE_CONFIG: Record<
  AssetType,
  {
    icon: typeof User;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    decoSrc: string;
    aspect: string;
  }
> = {
  character: {
    icon: User,
    label: "شخصیت",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    decoSrc: "/Deco/Character.png",
    aspect: "aspect-[3/4]",
  },
  location: {
    icon: MapPin,
    label: "لوکیشن",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    decoSrc: "/Deco/Location.png",
    aspect: "aspect-[16/9]",
  },
  property: {
    icon: Package,
    label: "آیتم/پراپ",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    decoSrc: "/Deco/Prop.png",
    aspect: "aspect-square",
  },
};

const ANGLE_VIEWS = [
  { key: "face", label: "Face" },
  { key: "back", label: "Back" },
  { key: "left", label: "Left" },
  { key: "front", label: "Front" },
  { key: "perspective", label: "Persp." },
] as const;

type AngleKey = (typeof ANGLE_VIEWS)[number]["key"];

interface ElementFormData {
  name: string;
  type: AssetType;
  description: string;
  age: string;
  imageFile: File | null;
  imagePreview: string | null;
  angleImages: Partial<Record<AngleKey, string>>;
}

const initialFormData: ElementFormData = {
  name: "",
  type: "character",
  description: "",
  age: "",
  imageFile: null,
  imagePreview: null,
  angleImages: {},
};

export function ElementsPanel({
  projectId,
  isOpen,
  onClose,
  onSelectElement,
  onRequestAIGenerate,
  hasScript,
  directorBrief,
}: ElementsPanelProps) {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"list" | "edit">("list");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [formData, setFormData] = useState<ElementFormData>(initialFormData);
  const [activeFilter, setActiveFilter] = useState<AssetType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [charGenPrompt, setCharGenPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [registeringElementId, setRegisteringElementId] = useState<
    number | null
  >(null);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [uploadingAngle, setUploadingAngle] = useState<AngleKey | null>(null);
  const [uploadingElementId, setUploadingElementId] = useState<number | null>(
    null,
  );
  const [showAngles, setShowAngles] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [analyzedMetadata, setAnalyzedMetadata] = useState<{
    clothing?: string;
    hair?: string;
    build?: string;
    distinguishing?: string;
    ethnicity?: string;
  } | null>(null);
  const [isAnalyzingAppearance, setIsAnalyzingAppearance] = useState(false);
  const [remixImageUrl, setRemixImageUrl] = useState<string | null>(null);
  const [isUploadingRemix, setIsUploadingRemix] = useState(false);
  const [showOutfitPanel, setShowOutfitPanel] = useState(false);
  const [selectedOutfitCharacter, setSelectedOutfitCharacter] =
    useState<Asset | null>(null);

  const mainImageRef = useRef<HTMLInputElement>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const remixImageRef = useRef<HTMLInputElement>(null);
  const angleRefs = useRef<Partial<Record<AngleKey, HTMLInputElement | null>>>(
    {},
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: elements = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets", projectId, "elements"],
    queryFn: async () => {
      const res = await fetch(`/api/assets?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
    enabled: isOpen && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Asset>) => {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create asset");
      return res.json();
    },
    onSuccess: (newEl) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setEditingId(newEl.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Asset>;
    }) => {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update element");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setViewMode("list");
      setEditingId(null);
    },
  });

  const pollForCompletion = useCallback(
    async (
      taskId: string,
      type: string,
      signal: AbortSignal,
      maxAttempts = 40,
    ): Promise<Record<string, unknown> | null> => {
      for (let i = 0; i < maxAttempts; i++) {
        if (signal.aborted) return null;
        await new Promise((r) => setTimeout(r, 3000));
        if (signal.aborted) return null;
        const res = await fetch(
          `/api/generate/status?taskId=${taskId}&type=${type}`,
          { signal },
        );
        const data = await res.json();
        if (data.isFailed) throw new Error(`${type} task failed`);
        if (data.isComplete) return data;
      }
      throw new Error("Task timed out");
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      form.append("folder", "elements");
      form.append("saveToDb", "false");
      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || data.file?.url || null;
    },
    [projectId],
  );

  const analyzeCharacterAppearance = useCallback(
    async (imageUrl: string, name?: string) => {
      if (formData.type !== "character") return;
      setIsAnalyzingAppearance(true);
      try {
        const res = await fetch("/api/ai/analyze-character", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            name: name || formData.name,
            description: formData.description,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAnalyzedMetadata(data);
        }
      } catch {}
      setIsAnalyzingAppearance(false);
    },
    [formData.type, formData.name, formData.description],
  );

  const handleMainImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: preview,
      }));
      if (mainImageRef.current) mainImageRef.current.value = "";

      setIsRecognizing(true);
      try {
        const imageUrl = await uploadFile(file);
        if (imageUrl) {
          if (formData.type === "character") {
            analyzeCharacterAppearance(imageUrl);
          }
          const recognizeRes = await fetch("/api/ai/elements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "image-recognize", imageUrl }),
          });
          if (recognizeRes.ok) {
            const recognizeData = await recognizeRes.json();
            if (recognizeData.taskId) {
              for (let i = 0; i < 20; i++) {
                await new Promise((r) => setTimeout(r, 3000));
                const statusRes = await fetch(
                  `/api/generate/status?taskId=${recognizeData.taskId}&type=image-recognize`,
                );
                const statusData = await statusRes.json();
                if (statusData.isComplete && statusData.subjects) {
                  const desc = statusData.subjects
                    .map((s: { label: string }) => s.label)
                    .join(", ");
                  if (desc)
                    setFormData((prev) => ({
                      ...prev,
                      description: prev.description || desc,
                    }));
                  break;
                }
                if (statusData.isFailed) break;
              }
            }
          }
        }
      } catch {}
      setIsRecognizing(false);
    },
    [uploadFile, formData.type, analyzeCharacterAppearance],
  );

  const handleAngleImageSelect = useCallback(
    async (angle: AngleKey, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (angleRefs.current[angle]) angleRefs.current[angle]!.value = "";
      setUploadingAngle(angle);
      try {
        const url = await uploadFile(file);
        if (url) {
          setFormData((prev) => ({
            ...prev,
            angleImages: { ...prev.angleImages, [angle]: url },
          }));
          if (editingId && typeof editingId === "number") {
            const el = elements.find((e) => e.id === editingId);
            const angles = (el?.angleImages as Record<string, string>) || {};
            await updateMutation.mutateAsync({
              id: editingId,
              updates: { angleImages: { ...angles, [angle]: url } },
            });
          }
        }
      } catch {}
      setUploadingAngle(null);
    },
    [uploadFile, editingId, elements, updateMutation],
  );

  const handleQuickUploadChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (quickUploadRef.current) quickUploadRef.current.value = "";
      if (!file || !uploadingElementId) {
        setUploadingElementId(null);
        return;
      }
      try {
        const url = await uploadFile(file);
        if (url) {
          await updateMutation.mutateAsync({
            id: uploadingElementId,
            updates: { imageUrl: url, thumbnailUrl: url },
          });
        }
      } catch {}
      setUploadingElementId(null);
    },
    [uploadingElementId, uploadFile, updateMutation],
  );

  const handleGenerateImage = useCallback(async () => {
    if (!charGenPrompt.trim()) return;
    const isLocation = formData.type === "location";
    const isCharacter = formData.type === "character";
    const aspectRatio = isLocation ? "16:9" : isCharacter ? "3:4" : "1:1";
    const styleTag = directorBrief?.filmStyle
      ? FILM_STYLE_PRESETS.find((p) => p.id === directorBrief.filmStyle)
          ?.promptTag
      : null;
    const styleSuffix = styleTag ? `, ${styleTag}` : "";
    const hasRemix = remixImageUrl && remixImageUrl.trim();

    setIsGeneratingChar(true);
    try {
      // Step 1: LLM-optimize the user prompt via generate-description
      const descRes = await fetch("/api/ai/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-description",
          userInput: charGenPrompt,
          elementType: formData.type || "character",
          projectTitle: "",
          style: "cinematic",
          directorBrief: directorBrief || undefined,
        }),
      });
      let optimizedPrompt = charGenPrompt;
      let optimizedDescription = "";
      if (descRes.ok) {
        const descData = await descRes.json();
        if (descData.imagePrompt) {
          optimizedPrompt = descData.imagePrompt;
        }
        if (descData.description) {
          optimizedDescription = descData.description;
        }
      }

      // Step 2: Send optimized prompt to Kling
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "image",
          model: hasRemix ? "kling-v3-omni" : "kling-v2",
          prompt: `${optimizedPrompt}${styleSuffix}`,
          aspectRatio,
          resolution: "1k",
          n: 1,
          ...(hasRemix ? { referenceImageUrl: remixImageUrl } : {}),
          ...(hasRemix ? { imageFidelity: 0.7 } : {}),
        }),
      });
      const data = await res.json();
      if (data.taskId) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const imageSource = data.imageSource || "generations";
          const statusRes = await fetch(
            `/api/generate/status?taskId=${data.taskId}&type=image&imageSource=${imageSource}`,
          );
          const statusData = await statusRes.json();
          if (statusData.isComplete && statusData.resultUrl) {
            const persistRes = await fetch("/api/blob/persist-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: statusData.resultUrl,
                projectId,
                folder: "elements",
                filename: `gen_${Date.now()}.png`,
              }),
            });
            let finalUrl = statusData.resultUrl;
            if (persistRes.ok) {
              const pd = await persistRes.json();
              finalUrl = pd.url || finalUrl;
            }
            setFormData((prev) => ({
              ...prev,
              imageFile: null,
              imagePreview: finalUrl,
              description: optimizedDescription || prev.description,
            }));
            setGeneratedImageUrl(finalUrl);
            analyzeCharacterAppearance(finalUrl);
            // Save version to asset metadata
            if (editingId && typeof editingId === "number") {
              const el = elements.find((e) => e.id === editingId);
              if (el) {
                const existingMeta = (el.metadata as Record<string, unknown>) || {};
                const existingVersions = (existingMeta.versions as Record<string, unknown>[] | null) || [];
                const newVersion = {
                  id: `version_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  type: "image",
                  imageUrl: finalUrl,
                  prompt: `${optimizedPrompt}${styleSuffix}`,
                  timestamp: new Date().toISOString(),
                  model: hasRemix ? "kling-v3-omni" : "kling-v2",
                };
                updateMutation.mutate({
                  id: editingId,
                  updates: {
                    metadata: {
                      ...existingMeta,
                      versions: [...existingVersions, newVersion],
                    },
                  },
                });
              }
            }
            break;
          }
          if (statusData.isFailed) break;
        }
      }
    } catch {}
    setIsGeneratingChar(false);
  }, [
    charGenPrompt,
    projectId,
    formData.type,
    analyzeCharacterAppearance,
    remixImageUrl,
    directorBrief,
  ]);

  const registerKlingElement = useCallback(
    async (element: Asset) => {
      if (!element.imageUrl || registeringElementId === element.id) return;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setRegisteringElementId(element.id);
      setRegistrationStatus("در حال ساخت تصاویر چند زاویه...");
      try {
        const shotRes = await fetch("/api/ai/elements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ai-multi-shot",
            imageUrl: element.imageUrl,
          }),
          signal: controller.signal,
        });
        if (!shotRes.ok) throw new Error("Multi-shot failed");
        const shotData = await shotRes.json();
        const shotResult = await pollForCompletion(
          shotData.taskId,
          "ai-multi-shot",
          controller.signal,
        );
        if (!shotResult) return;
        const shotImages = (
          (shotResult.images as Array<{ url: string }>) || []
        ).map((img) => img.url);
        if (shotImages.length === 0) throw new Error("No images");
        setRegistrationStatus("در حال ذخیره تصاویر...");
        const persistedUrls: string[] = [];
        for (const url of shotImages) {
          if (controller.signal.aborted) return;
          if (!url || url.trim().length < 10) {
            console.warn(
              "[Elements] Skipping invalid/empty multi-shot URL:",
              url,
            );
            continue;
          }
          const pr = await fetch("/api/blob/persist-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url,
              projectId,
              folder: "elements",
              filename: `multishot_${element.id}_${Date.now()}.png`,
            }),
            signal: controller.signal,
          });
          if (pr.ok) {
            const pd = await pr.json();
            persistedUrls.push(pd.url);
          } else {
            console.warn(
              "[Elements] persist-url failed for url:",
              url.slice(0, 50),
            );
          }
        }
        const additionalImages =
          persistedUrls.length > 0
            ? persistedUrls
            : shotImages.filter(
                (u) => typeof u === "string" && u.trim().length > 10,
              );
        setRegistrationStatus("در حال ثبت در Kling...");
        const klingType = element.type === "character" ? "character" : "object";
        // Validate base image URL before sending to Kling
        const baseImage = element.imageUrl;
        if (
          !baseImage ||
          typeof baseImage !== "string" ||
          baseImage.trim().length < 10
        ) {
          throw new Error(
            "تصویر اصلی المان نامعتبر است. لطفاً تصویر المان را آپلود کنید.",
          );
        }
        const allImageUrls = [baseImage, ...additionalImages]
          .filter((u) => typeof u === "string" && u.trim().length > 10)
          .slice(0, 5);
        const createRes = await fetch("/api/ai/elements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-kling-element",
            assetId: element.id,
            imageUrls: allImageUrls,
            elementName: element.name,
            elementKlingType: klingType,
          }),
          signal: controller.signal,
        });
        if (!createRes.ok) throw new Error("Creation failed");
        const createData = await createRes.json();
        const elementResult = await pollForCompletion(
          createData.taskId,
          "element",
          controller.signal,
        );
        if (!elementResult) return;
        if (elementResult.elementId) {
          await fetch("/api/ai/elements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "store-element-id",
              assetId: element.id,
              klingElementId: elementResult.elementId,
              multiShotUrls: persistedUrls,
            }),
            signal: controller.signal,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
          setRegistrationStatus("");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setRegistrationStatus(`خطا: ${(err as Error).message}`);
        setTimeout(() => setRegistrationStatus(""), 5000);
      } finally {
        setRegisteringElementId(null);
        abortControllerRef.current = null;
      }
    },
    [projectId, queryClient, registeringElementId, pollForCompletion],
  );

  const handleOpenNew = useCallback((type: AssetType = "character") => {
    setEditingId("new");
    setFormData({ ...initialFormData, type });
    setGeneratedImageUrl(null);
    setCharGenPrompt("");
    setShowAngles(false);
    setAnalyzedMetadata(null);
    setIsAnalyzingAppearance(false);
    setRemixImageUrl(null);
    setViewMode("edit");
  }, []);

  const handleOpenEdit = useCallback((element: Asset) => {
    setEditingId(element.id);
    const elMeta = (element.metadata as Record<string, string> | null) || {};
    setFormData({
      name: element.name,
      type: element.type,
      description: element.description || "",
      age: elMeta.age || "",
      imageFile: null,
      imagePreview: null,
      angleImages:
        (element.angleImages as Partial<Record<AngleKey, string>>) || {},
    });
    setGeneratedImageUrl(null);
    setCharGenPrompt("");
    setShowAngles(false);
    const existingMeta = element.metadata as Record<string, string> | null;
    setAnalyzedMetadata(
      existingMeta?.clothing ? (existingMeta as typeof analyzedMetadata) : null,
    );
    setIsAnalyzingAppearance(false);
    setRemixImageUrl(null);
    setViewMode("edit");
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode("list");
    setEditingId(null);
    setFormData(initialFormData);
    setGeneratedImageUrl(null);
    setCharGenPrompt("");
    setAnalyzedMetadata(null);
    setIsAnalyzingAppearance(false);
    setRegistrationStatus("");
    setRemixImageUrl(null);
  }, []);

  const handleRemixImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (remixImageRef.current) remixImageRef.current.value = "";
      setIsUploadingRemix(true);
      try {
        const url = await uploadFile(file);
        if (url) setRemixImageUrl(url);
      } catch {}
      setIsUploadingRemix(false);
    },
    [uploadFile],
  );

  const handleSubmitNew = useCallback(async () => {
    if (!formData.name.trim()) return;
    setIsUploading(true);
    let imageUrl: string | null = null;
    try {
      if (formData.imageFile) imageUrl = await uploadFile(formData.imageFile);
      if (!imageUrl && generatedImageUrl) imageUrl = generatedImageUrl;
    } catch {}
    setIsUploading(false);
    const metadata: Record<string, unknown> = {
      ...(analyzedMetadata || {}),
      ...(formData.age?.trim() ? { age: formData.age.trim() } : {}),
    };
    createMutation.mutate({
      projectId: parseInt(projectId),
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description.trim() || null,
      imageUrl,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    });
    handleBackToList();
  }, [
    formData,
    generatedImageUrl,
    projectId,
    uploadFile,
    createMutation,
    handleBackToList,
    analyzedMetadata,
  ]);

  const handleSaveEdit = useCallback(
    async (elementId: number) => {
      const el = elements.find((e) => e.id === elementId);
      if (!el) return;
      setIsUploading(true);
      let imageUrl = el.imageUrl;
      try {
        if (formData.imageFile) {
          const uploaded = await uploadFile(formData.imageFile);
          if (uploaded) imageUrl = uploaded;
        } else if (generatedImageUrl) {
          imageUrl = generatedImageUrl;
        }
      } catch {}
      setIsUploading(false);
      const metadata: Record<string, unknown> = {
        ...((el.metadata as Record<string, unknown> | null) || {}),
        ...(analyzedMetadata || {}),
        ...(formData.age?.trim() ? { age: formData.age.trim() } : {}),
      };
      await updateMutation.mutateAsync({
        id: elementId,
        updates: {
          name: formData.name,
          description: formData.description,
          imageUrl,
          angleImages: {
            ...((el.angleImages as object) || {}),
            ...formData.angleImages,
          },
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        },
      });
      handleBackToList();
    },
    [
      elements,
      formData,
      generatedImageUrl,
      uploadFile,
      updateMutation,
      handleBackToList,
      analyzedMetadata,
    ],
  );

  const filteredElements = useMemo(() => {
    const elementsList = elements.filter((el) => !el.fileUrl && !el.mediaType);
    let result =
      activeFilter === "all"
        ? elementsList
        : elementsList.filter((el) => el.type === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (el) =>
          el.name.toLowerCase().includes(q) ||
          (el.description && el.description.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [elements, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    const list = elements.filter((el) => !el.fileUrl && !el.mediaType);
    return {
      all: list.length,
      character: list.filter((el) => el.type === "character").length,
      location: list.filter((el) => el.type === "location").length,
      property: list.filter((el) => el.type === "property").length,
    };
  }, [elements]);

  const editingElement =
    editingId && editingId !== "new"
      ? elements.find((e) => e.id === editingId)
      : undefined;
  const mainImagePreview =
    formData.imagePreview ||
    generatedImageUrl ||
    editingElement?.imageUrl ||
    null;
  const currentTypeConfig = TYPE_CONFIG[formData.type];

  const isSaving =
    createMutation.isPending || updateMutation.isPending || isUploading;

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-w-3xl w-full h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-card border border-border"
        dir="rtl"
        data-testid="dialog-elements-panel"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <input
          ref={mainImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleMainImageSelect}
        />
        <input
          ref={quickUploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleQuickUploadChange}
        />
        {ANGLE_VIEWS.map(({ key }) => (
          <input
            key={key}
            ref={(el) => {
              angleRefs.current[key] = el;
            }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAngleImageSelect(key, e)}
          />
        ))}

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center cursor-zoom-out"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {viewMode === "list" ? (
          <>
            {/* List Header */}
            <DialogHeader className="flex-shrink-0 px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  کتابخانه عناصر
                </DialogTitle>
                <Button
                  size="sm"
                  onClick={() => handleOpenNew()}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 h-8 text-xs px-3"
                  data-testid="button-add-element"
                >
                  <Plus className="w-3.5 h-3.5" />
                  عنصر جدید
                </Button>
              </div>

              {/* Search + Filters */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="جستجو..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 h-8 text-xs bg-muted/50 border-border focus:border-blue-500/50"
                    dir="rtl"
                    data-testid="input-search-elements"
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(
                    [
                      { key: "all", label: "همه", count: counts.all },
                      {
                        key: "character",
                        label: "شخصیت",
                        count: counts.character,
                      },
                      {
                        key: "location",
                        label: "لوکیشن",
                        count: counts.location,
                      },
                      {
                        key: "property",
                        label: "پراپ",
                        count: counts.property,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() =>
                        setActiveFilter(tab.key as AssetType | "all")
                      }
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        activeFilter === tab.key
                          ? "bg-blue-600 text-white"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted",
                      )}
                      data-testid={`filter-${tab.key}`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full min-w-[16px] h-4 text-[10px] px-1",
                            activeFilter === tab.key
                              ? "bg-white/20"
                              : "bg-muted",
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </DialogHeader>

            {/* Grid */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5">
                {isLoading ? (
                  <div className="flex flex-col items-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      در حال بارگذاری...
                    </p>
                  </div>
                ) : filteredElements.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Package className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">
                        {searchQuery
                          ? "نتیجه‌ای یافت نشد"
                          : "هنوز عنصری تعریف نشده"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery
                          ? "جستجوی دیگری امتحان کنید"
                          : "شخصیت‌ها، لوکیشن‌ها و آیتم‌ها را اضافه کنید"}
                      </p>
                    </div>
                    {!searchQuery && onRequestAIGenerate && hasScript && (
                      <button
                        onClick={onRequestAIGenerate}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50"
                        data-testid="button-ai-generate-elements"
                      >
                        <Sparkles className="w-4 h-4" />
                        استخراج خودکار از فیلمنامه
                      </button>
                    )}
                    {!searchQuery && (
                      <div className="flex gap-3 mt-1">
                        {(Object.keys(TYPE_CONFIG) as AssetType[]).map(
                          (type) => {
                            const config = TYPE_CONFIG[type];
                            return (
                              <button
                                key={type}
                                onClick={() => handleOpenNew(type)}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-xs group"
                                data-testid={`button-create-${type}`}
                              >
                                <img
                                  src={config.decoSrc}
                                  alt={config.label}
                                  className="w-8 h-8 object-contain scale-90 opacity-60 group-hover:opacity-90 transition-opacity"
                                />
                                {config.label}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* Add new card */}
                    <button
                      onClick={() => handleOpenNew()}
                      className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:bg-muted/50 hover:border-blue-500/30 transition-all group min-h-[160px]"
                      data-testid="button-add-new-element"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Plus className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        عنصر جدید
                      </span>
                    </button>

                    {filteredElements.map((element) => {
                      const config =
                        TYPE_CONFIG[element.type] || TYPE_CONFIG.property;
                      const Icon = config.icon;
                      const multiShot =
                        (element.multiShotUrls as string[] | null) || [];

                      return (
                        <div
                          key={element.id}
                          className="group relative rounded-2xl overflow-hidden border border-border bg-card hover:border-border/80 hover:shadow-md transition-all cursor-pointer"
                          data-testid={`card-element-${element.id}`}
                        >
                          {/* Image zone */}
                          <div
                            className={cn(
                              "relative w-full overflow-hidden bg-muted/60",
                              config.aspect,
                            )}
                            onClick={() =>
                              element.imageUrl
                                ? setLightboxUrl(element.imageUrl)
                                : handleOpenEdit(element)
                            }
                          >
                            {element.imageUrl ? (
                              <>
                                <img
                                  src={element.imageUrl}
                                  alt={element.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn className="w-6 h-6 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 group-hover:bg-blue-500/5 transition-colors">
                                <img
                                  src={config.decoSrc}
                                  alt={config.label}
                                  className="w-10 h-10 object-contain scale-90 opacity-30 group-hover:opacity-50 transition-opacity"
                                />
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-blue-400">
                                  <Wand2 className="w-3 h-3" />
                                  ساخت تصویر
                                </div>
                              </div>
                            )}

                            {/* Type badge */}
                            <div className="absolute top-2 right-2">
                              <div
                                className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-sm",
                                  config.bgColor,
                                  config.color,
                                )}
                              >
                                <Icon className="w-2.5 h-2.5" />
                                {config.label}
                              </div>
                            </div>

                            {/* Kling badge */}
                            {element.klingElementId && (
                              <div className="absolute top-2 left-2">
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/20 text-emerald-400 backdrop-blur-sm">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                </div>
                              </div>
                            )}

                            {/* Active outfit badge */}
                            {element.type === "character" &&
                              (() => {
                                const meta =
                                  (element.metadata as Record<
                                    string,
                                    unknown
                                  >) || {};
                                const outfits =
                                  (meta.outfits as
                                    | Record<string, unknown>[]
                                    | null) || [];
                                const activeOutfitId =
                                  (meta.activeOutfitId as string | null) ||
                                  null;
                                const activeOutfit = activeOutfitId
                                  ? outfits.find((o) => o.id === activeOutfitId)
                                  : null;
                                if (activeOutfit)
                                  return (
                                    <div className="absolute bottom-2 left-2">
                                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] bg-purple-500/20 text-purple-300 backdrop-blur-sm border border-purple-500/20">
                                        <Shirt className="w-2.5 h-2.5" />
                                        <span className="truncate max-w-[80px]">
                                          {activeOutfit.name as string}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                return null;
                              })()}

                            {/* Multi-shot strip */}
                            {multiShot.length > 0 && (
                              <div className="absolute bottom-2 left-2 flex gap-1">
                                {multiShot.slice(0, 3).map((url, i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded overflow-hidden border border-border/60 shadow"
                                  >
                                    <img
                                      src={url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Bottom bar */}
                          <div className="p-2.5 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {element.name}
                              </p>
                              {element.description && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {element.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {element.type === "character" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOutfitCharacter(element);
                                    setShowOutfitPanel(true);
                                  }}
                                  className="w-6 h-6 rounded-md bg-muted hover:bg-purple-500/20 hover:text-purple-400 flex items-center justify-center transition-colors"
                                  title="لباس‌ها"
                                >
                                  <Shirt className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(element);
                                }}
                                className="w-6 h-6 rounded-md bg-muted hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                title="ویرایش"
                                data-testid={`button-edit-element-${element.id}`}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(element.id);
                                }}
                                className="w-6 h-6 rounded-md bg-muted hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                                title="حذف"
                                data-testid={`button-delete-element-${element.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Edit Header */}
            <div className="flex-shrink-0 px-5 py-3 border-b border-border flex items-center gap-3">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-list"
              >
                <ArrowRight className="w-4 h-4" />
                بازگشت
              </button>
              <div className="w-px h-4 bg-border" />
              <h2 className="text-sm font-semibold">
                {editingId === "new"
                  ? "عنصر جدید"
                  : `ویرایش: ${editingElement?.name || ""}`}
              </h2>
              {editingElement && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] mr-auto",
                    currentTypeConfig.color,
                    currentTypeConfig.borderColor,
                  )}
                >
                  {currentTypeConfig.label}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-5">
                {/* Type selector (new only) */}
                {editingId === "new" && (
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(TYPE_CONFIG) as AssetType[]).map((type) => {
                      const config = TYPE_CONFIG[type];
                      const Icon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setFormData((p) => ({ ...p, type }))}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all",
                            formData.type === type
                              ? `${config.bgColor} ${config.color} ${config.borderColor}`
                              : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-border/80",
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Main content: image + fields side by side */}
                <div className="grid grid-cols-[160px_1fr] gap-5 items-start">
                  {/* Image zone */}
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "w-full rounded-xl border-2 overflow-hidden relative transition-all",
                        formData.type === "character"
                          ? "aspect-[3/4]"
                          : formData.type === "location"
                            ? "aspect-[4/3]"
                            : "aspect-square",
                        mainImagePreview
                          ? "border-border cursor-zoom-in"
                          : "border-dashed border-border hover:border-blue-500/30 cursor-pointer hover:bg-blue-500/5",
                      )}
                      onClick={() =>
                        mainImagePreview
                          ? setLightboxUrl(mainImagePreview)
                          : mainImageRef.current?.click()
                      }
                      data-testid="button-upload-main-image"
                    >
                      {mainImagePreview ? (
                        <>
                          <img
                            src={mainImagePreview}
                            alt="reference"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white" />
                          </div>
                          {isRecognizing && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                              <span className="text-[10px] text-blue-300">
                                در حال آنالیز...
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          {isRecognizing ? (
                            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 opacity-40" />
                              <span className="text-[10px] text-center px-2 opacity-60">
                                آپلود تصویر مرجع
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Upload button */}
                    <button
                      onClick={() => mainImageRef.current?.click()}
                      className="w-full py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors text-[11px] text-muted-foreground flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />
                      آپلود فایل
                    </button>

                    {/* Kling register */}
                    {editingElement?.imageUrl &&
                      !editingElement.klingElementId && (
                        <button
                          onClick={() => registerKlingElement(editingElement)}
                          disabled={registeringElementId === editingElement.id}
                          className="w-full py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors text-[11px] text-amber-400 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          data-testid="button-register-kling"
                        >
                          {registeringElementId === editingElement.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          ثبت در Kling
                        </button>
                      )}
                    {editingElement?.klingElementId && (
                      <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ثبت شده در Kling
                      </div>
                    )}
                    {registrationStatus && (
                      <p className="text-[10px] text-amber-400 text-center">
                        {registrationStatus}
                      </p>
                    )}

                    {formData.type === "character" && isAnalyzingAppearance && (
                      <div className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        تحلیل لباس...
                      </div>
                    )}
                    {formData.type === "character" &&
                      !isAnalyzingAppearance &&
                      analyzedMetadata?.clothing && (
                        <div className="p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 space-y-1">
                          <p className="text-[9px] font-semibold text-emerald-400 text-center">
                            ظاهر ثبت شد
                          </p>
                          <p className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">
                            {analyzedMetadata.clothing}
                          </p>
                          {analyzedMetadata.hair && (
                            <p className="text-[9px] text-muted-foreground/70">
                              {analyzedMetadata.hair}
                            </p>
                          )}
                        </div>
                      )}

                    {/* Wardrobe button in character edit form */}
                    {formData.type === "character" && editingElement && (
                      <button
                        onClick={() => {
                          setSelectedOutfitCharacter(editingElement);
                          setShowOutfitPanel(true);
                        }}
                        className="w-full py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors text-[11px] text-purple-400 flex items-center justify-center gap-1.5"
                      >
                        <Shirt className="w-3 h-3" />
                        کمد لباس
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1.5 block">
                        نام
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder={`نام ${currentTypeConfig.label}...`}
                        className="h-9 text-sm bg-muted/50 border-border focus:border-blue-500/50"
                        dir="rtl"
                        data-testid="input-element-name"
                      />
                    </div>

                    {formData.type === "character" && (
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1.5 block">
                          سن / ویژگی‌ها
                        </label>
                        <Input
                          value={formData.age}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, age: e.target.value }))
                          }
                          placeholder="مثلا: ۳۵ ساله، مو بلند تیره..."
                          className="h-9 text-sm bg-muted/50 border-border focus:border-blue-500/50"
                          dir="rtl"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1.5 block">
                        توضیحات
                      </label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder={`توصیف ${currentTypeConfig.label} برای هوش مصنوعی...`}
                        rows={3}
                        className="resize-none text-sm bg-muted/50 border-border focus:border-blue-500/50 focus-visible:ring-blue-500/20"
                        dir="rtl"
                        data-testid="input-element-description"
                      />
                    </div>

                    {/* AI Generate section */}
                    <div className="space-y-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <label className="text-[11px] font-medium text-blue-400">
                          ساخت تصویر با هوش مصنوعی
                        </label>
                      </div>
                      <Textarea
                        value={charGenPrompt}
                        onChange={(e) => setCharGenPrompt(e.target.value)}
                        placeholder="توصیف تصویر مورد نظر به فارسی یا انگلیسی..."
                        rows={2}
                        className="resize-none text-xs bg-muted/50 border-blue-500/20 focus:border-blue-500/40 focus-visible:ring-blue-500/10"
                        dir="rtl"
                      />

                      {/* Remix Image Upload */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground">
                          تصویر رفرنس (اختیاری — ریمیکس)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            ref={remixImageRef}
                            onChange={handleRemixImageUpload}
                            className="hidden"
                            data-testid="input-remix-image"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remixImageRef.current?.click()}
                            disabled={isUploadingRemix}
                            className="h-7 text-[10px] px-2 border-dashed border-blue-500/30 hover:border-blue-500/50"
                          >
                            {isUploadingRemix ? (
                              <Loader2 className="w-3 h-3 animate-spin ml-1" />
                            ) : (
                              <Upload className="w-3 h-3 ml-1" />
                            )}
                            آپلود تصویر
                          </Button>
                          {remixImageUrl && (
                            <div className="flex items-center gap-1.5">
                              <img
                                src={remixImageUrl}
                                alt="remix"
                                className="w-8 h-8 rounded object-cover border"
                              />
                              <button
                                onClick={() => setRemixImageUrl(null)}
                                className="text-[10px] text-red-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleGenerateImage}
                        disabled={!charGenPrompt.trim() || isGeneratingChar}
                        className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 border-0"
                        data-testid="button-generate-image"
                      >
                        {isGeneratingChar ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                            در حال تولید...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3.5 h-3.5 ml-1.5" />
                            {remixImageUrl ? "ریمیکس تصویر" : "تولید تصویر"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Angle views — collapsible */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAngles(!showAngles)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    data-testid="button-toggle-angles"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">تصاویر چند زاویه</span>
                      <span className="text-[10px] opacity-60">(اختیاری)</span>
                    </span>
                    {showAngles ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showAngles && (
                    <div className="px-4 pb-4 border-t border-border">
                      <p className="text-[10px] text-muted-foreground mt-3 mb-3">
                        تصاویر از زوایای مختلف برای ثبت دقیق‌تر در Kling استفاده
                        می‌شود.
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {ANGLE_VIEWS.map(({ key, label }) => {
                          const url =
                            formData.angleImages[key] ||
                            (
                              editingElement?.angleImages as Record<
                                string,
                                string
                              > | null
                            )?.[key] ||
                            null;
                          return (
                            <div
                              key={key}
                              className="flex flex-col items-center gap-1.5"
                            >
                              <div
                                className={cn(
                                  "w-full aspect-square rounded-lg border overflow-hidden relative cursor-pointer group transition-all",
                                  url
                                    ? "border-blue-500/30"
                                    : "border-dashed border-border hover:border-blue-500/20 bg-muted/40",
                                )}
                                onClick={() =>
                                  url
                                    ? setLightboxUrl(url)
                                    : angleRefs.current[key]?.click()
                                }
                              >
                                {url ? (
                                  <>
                                    <img
                                      src={url}
                                      alt={label}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </div>
                                  </>
                                ) : uploadingAngle === key ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Upload className="w-3.5 h-3.5 text-white/20 group-hover:text-blue-400 transition-colors" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Edit Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border flex items-center gap-3 bg-muted/30">
              <Button
                onClick={() =>
                  editingId === "new"
                    ? handleSubmitNew()
                    : handleSaveEdit(editingId as number)
                }
                disabled={!formData.name.trim() || isSaving}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 border-0"
                data-testid="button-save-element"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    در حال ذخیره...
                  </>
                ) : (
                  "ذخیره"
                )}
              </Button>

              {editingElement && (
                <Button
                  variant="outline"
                  className="h-9 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                  onClick={() => deleteMutation.mutate(editingElement.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-element-edit"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                className="h-9 text-muted-foreground"
                onClick={handleBackToList}
                data-testid="button-cancel-edit"
              >
                انصراف
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      {/* Outfit Panel Slide-over — rendered outside dialog to avoid z-index trapping */}
      {showOutfitPanel && selectedOutfitCharacter && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={() => {
              setShowOutfitPanel(false);
              setSelectedOutfitCharacter(null);
            }}
          />
          <div
            className="fixed inset-y-0 left-0 z-[70] w-[420px] max-w-full border-r border-border bg-background shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CharacterOutfitManager
              character={selectedOutfitCharacter}
              directorBrief={directorBrief}
              onClose={() => {
                setShowOutfitPanel(false);
                setSelectedOutfitCharacter(null);
              }}
            />
          </div>
        </>
      )}
    </Dialog>
  );
}
