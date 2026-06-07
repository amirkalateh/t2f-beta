"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { FXLogo } from "@/components/layout/fx-logo";
import { NarrativeFlow } from "@/components/flows/narrative-flow";
import { DirectorBriefFlow } from "@/components/flows/director-brief-flow";
import { VisionFlow } from "@/components/flows/vision-flow";
import { StoryboardFlow } from "@/components/flows/storyboard-flow";
import { AssemblyFlow } from "@/components/flows/assembly-flow";
import { ExportFlow } from "@/components/flows/export-flow";
import { AssistantPanel } from "@/components/layout/assistant-panel";
import { ElementsPanel } from "@/components/elements/elements-panel";
import { ElementsOnboarding } from "@/components/elements/elements-onboarding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { STAGE_ORDER, STAGES } from "@/lib/constants";
import {
  buildCinematographyPrompt,
  buildNegativePrompt,
  getKlingAspectRatio,
  getElementReferenceImages,
  getElementIdsForShot,
  getSubjectImagesForShot,
  getSceneImageForShot,
  getPreviousShotImages,
} from "@/lib/kling/prompt-builder";
import { aiLogStore } from "@/lib/stores/ai-log-store";
import {
  Sparkles,
  Loader2,
  FileText,
  Eye,
  Film,
  Download,
  Check,
  ChevronLeft,
  Layers,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  PenLine,
  Aperture,
  Clapperboard,
  Rocket,
  MessageSquareMore,
  Wand2,
} from "lucide-react";
import type {
  FullProject,
  ProjectStage,
  Narrative,
  VisionBoard,
  Shot,
  Assembly,
  Asset,
  GenerationVersion,
  ShotType,
  CameraAngle,
  CameraMovement,
  LightingPreset,
  CameraModel,
  LensType,
  FocalLength,
  CinemaAspectRatio,
  ShotStatus,
} from "@/lib/types";

const stageIcons: Record<ProjectStage, typeof FileText> = {
  narrative: PenLine,
  director_brief: Sparkles,
  vision: Aperture,
  storyboard: Clapperboard,
  assembly: Layers,
  export: Rocket,
};

const stageNumbers: Record<ProjectStage, string> = {
  narrative: "۱",
  director_brief: "۲",
  vision: "۳",
  storyboard: "۴",
  assembly: "۵",
  export: "۶",
};

export default function StudioPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const projectId = params?.id as string;

  const [currentStage, setCurrentStage] = useState<ProjectStage>("narrative");
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showElements, setShowElements] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [storyboardGenerating, setStoryboardGenerating] = useState(false);
  const [pendingShotCount, setPendingShotCount] = useState<number | undefined>(
    undefined,
  );
  const [videoGenerating, setVideoGenerating] = useState<
    Record<number, boolean>
  >({});

  const [storyboardProgress, setStoryboardProgress] = useState<{
    saved: number;
    total: number;
  } | null>(null);
  const [storyboardError, setStoryboardError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [showElementsCheck, setShowElementsCheck] = useState(false);
  const [elementsCheckShotCount, setElementsCheckShotCount] = useState<
    number | undefined
  >(undefined);

  const storyboardGeneratingRef = useRef(false);
  const autoStoryboardFiredRef = useRef(false);
  const pendingVisionMutationRef = useRef<Promise<unknown> | null>(null);

  const {
    data: fullProject,
    isLoading,
    error,
  } = useQuery<FullProject>({
    queryKey: ["/api/projects", projectId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}`).then((r) => {
        if (!r.ok) throw new Error("Project not found");
        return r.json();
      }),
    enabled: !!projectId && projectId !== "new",
  });

  const { data: projectElements = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets", projectId],
    queryFn: () =>
      fetch(`/api/assets?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId && projectId !== "new",
  });

  useEffect(() => {
    if (fullProject?.currentStage) {
      setCurrentStage(fullProject.currentStage);
    }
  }, [fullProject?.currentStage]);

  const shots = fullProject?.shots || [];
  const hasScript = !!(
    fullProject?.narrative?.script &&
    fullProject.narrative.script.trim().length >= 20
  );

  // Auto-storyboard only fires when user explicitly confirms via the UI.
  // The auto-firing useEffect is intentionally removed to prevent storyboard
  // from running while elements onboarding is being set up.
  // If elements exist, the user can click "Generate Shots" in the vision flow.
  // If no elements exist, the UI shows a warning dialog before proceeding.

  const handleOnboardingClose = async () => {
    setShowOnboarding(false);
    setOnboardingDismissed(true);
    localStorage.setItem(`onboarding-dismissed-${projectId}`, "true");
    // Always ensure we're in vision stage after closing
    if (currentStage !== "vision") {
      await updateProjectMutation.mutateAsync({ currentStage: "vision" });
      setCurrentStage("vision");
    }
  };

  const handleOnboardingCreated = async () => {
    queryClient.invalidateQueries({ queryKey: ["/api/assets", projectId] });
    setOnboardingDismissed(true);
    localStorage.setItem(`onboarding-dismissed-${projectId}`, "true");
    setShowOnboarding(false);
    // Always ensure we're in vision stage after saving
    if (currentStage !== "vision") {
      await updateProjectMutation.mutateAsync({ currentStage: "vision" });
      setCurrentStage("vision");
    }
    // Auto-start storyboard generation after elements are created (non-blocking)
    handleAutoStoryboard().catch(() => {
      // Errors handled inside handleAutoStoryboard (toasts + state)
    });
  };

  const updateNarrativeMutation = useMutation({
    mutationFn: (updates: Partial<Narrative>) =>
      fetch(`/api/projects/${projectId}/narrative`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const updateVisionMutation = useMutation({
    mutationFn: async (updates: Partial<VisionBoard>) => {
      const r = await fetch(`/api/projects/${projectId}/vision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.error || `HTTP ${r.status}`;
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const addShotMutation = useMutation({
    mutationFn: (shot: Partial<Shot>) =>
      fetch(`/api/projects/${projectId}/shots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: shot.title || shot.description || "شات جدید",
          description: shot.description,
          prompt: shot.prompt,
          shotType: shot.shotType || "medium",
          cameraAngle: shot.cameraAngle || "eye_level",
          cameraMovement: shot.cameraMovement || "static",
          keyLight: shot.keyLight || "natural",
          duration: shot.duration || 3,
          dialogueText: shot.dialogueText,
          cameraModel: shot.cameraModel,
          lensType: shot.lensType,
          focalLength: shot.focalLength,
          cinemaAspectRatio: shot.cinemaAspectRatio,
          colorGrade: shot.colorGrade,
          cinematographyNotes: shot.cinematographyNotes,
          sceneNumber: shot.sceneNumber,
          sceneName: shot.sceneName,
          locationId: shot.locationId,
          characterIds: shot.characterIds || [],
          propIds: shot.propIds || [],
          order: shot.order,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const updateShotMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Shot> }) =>
      fetch(`/api/projects/${projectId}/shots`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId: id, ...updates }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const deleteShotMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/projects/${projectId}/shots?shotId=${id}`, {
        method: "DELETE",
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const updateAssemblyMutation = useMutation({
    mutationFn: (updates: Partial<Assembly>) =>
      fetch(`/api/projects/${projectId}/assembly`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const project = fullProject;
  const narrative = fullProject?.narrative;
  const vision = fullProject?.visionBoard;
  const assembly = fullProject?.assembly;

  useEffect(() => {
    if (assembly?.exportUrl) {
      setExportUrl(assembly.exportUrl);
      setExportProgress(100);
    }
  }, [assembly?.exportUrl]);

  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  const handleNextStage = async (shotCount?: number) => {
    if (currentIndex < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIndex + 1];

      if (
        nextStage === "vision" &&
        narrative?.script &&
        currentStage === "director_brief"
      ) {
        // Await any pending vision PATCH (e.g. AI-suggested director brief) before transitioning.
        if (pendingVisionMutationRef.current) {
          try {
            await pendingVisionMutationRef.current;
          } catch (visionErr) {
            console.error(
              "Vision save failed before stage transition:",
              visionErr,
            );
            setStoryboardError({
              message:
                "ذخیره اطلاعات بریف کارگردان با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
              code: "VISION_SAVE_FAILED",
            });
            return;
          } finally {
            pendingVisionMutationRef.current = null;
          }
        }
        // If no elements have been created yet, show onboarding dialog in vision
        if (projectElements.length === 0 && !onboardingDismissed) {
          const dismissed = localStorage.getItem(
            `onboarding-dismissed-${projectId}`,
          );
          if (!dismissed) {
            setShowOnboarding(true);
          }
        }
        await updateProjectMutation.mutateAsync({ currentStage: nextStage });
        setCurrentStage(nextStage);
        setPendingShotCount(shotCount);
        return;
      }

      setCurrentStage(nextStage);
      updateProjectMutation.mutate({ currentStage: nextStage });
    }
  };

  const handlePrevStage = () => {
    if (currentIndex > 0) {
      const prevStage = STAGE_ORDER[currentIndex - 1];
      setCurrentStage(prevStage);
      updateProjectMutation.mutate({ currentStage: prevStage });
    }
  };

  const handleStageClick = (stage: ProjectStage) => {
    const targetIndex = STAGE_ORDER.indexOf(stage);
    if (targetIndex <= currentIndex || targetIndex === currentIndex + 1) {
      setCurrentStage(stage);
      updateProjectMutation.mutate({ currentStage: stage });
    }
  };

  const handleUpdateNarrative = (updates: Partial<Narrative>) => {
    updateNarrativeMutation.mutate(updates);
  };

  const handleUpdateProject = (updates: Record<string, unknown>) => {
    updateProjectMutation.mutate(updates);
  };

  const handleUpdateVision = (updates: Partial<VisionBoard>) => {
    const promise = updateVisionMutation.mutateAsync(updates);
    // Store without swallowing — callers that await this (e.g. handleNextStage) will see failures.
    pendingVisionMutationRef.current = promise.catch((e) => {
      console.error("Vision mutation failed:", e);
      throw e;
    });

    // Sync director brief baseAspectRatio to project.aspectRatio so Kling pipeline uses it
    if (updates.directorBrief?.baseAspectRatio && project) {
      const briefRatio = updates.directorBrief.baseAspectRatio;
      if (briefRatio !== project.aspectRatio) {
        updateProjectMutation.mutate({ aspectRatio: briefRatio });
      }
    }
  };

  const handleAddShot = (shot: Partial<Shot>) => {
    addShotMutation.mutate(shot);
  };

  const handleUpdateShot = (id: number, updates: Partial<Shot>) => {
    updateShotMutation.mutate({ id, updates });
  };

  const handleDeleteShot = (id: number) => {
    deleteShotMutation.mutate(id);
  };

  const [selectedImageModel, setSelectedImageModel] =
    useState<string>("kling-v3-omni");
  const [selectedVideoModel, setSelectedVideoModel] =
    useState<string>("kling-v2-6-pro");
  const [humanFidelity, setHumanFidelity] = useState<number>(0.85);
  const [enableContinuity, setEnableContinuity] = useState<boolean>(true);
  const [continuityDepth, setContinuityDepth] = useState<number>(2);
  const [shotFidelityOverrides, setShotFidelityOverrides] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`gen-settings-${projectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.humanFidelity === "number")
          setHumanFidelity(parsed.humanFidelity);
        if (typeof parsed.enableContinuity === "boolean")
          setEnableContinuity(parsed.enableContinuity);
        if (typeof parsed.continuityDepth === "number")
          setContinuityDepth(parsed.continuityDepth);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(
      `gen-settings-${projectId}`,
      JSON.stringify({ humanFidelity, enableContinuity, continuityDepth }),
    );
  }, [projectId, humanFidelity, enableContinuity, continuityDepth]);

  const handleShotFidelityOverride = (shotId: number, value: number | null) => {
    setShotFidelityOverrides((prev) => {
      const next = { ...prev };
      if (value === null) {
        delete next[shotId];
      } else {
        next[shotId] = value;
      }
      return next;
    });
  };

  const handleGenerateImage = async (shotId: number) => {
    const currentShots =
      queryClient.getQueryData<FullProject>(["/api/projects", projectId])
        ?.shots || shots;
    const shot = currentShots.find((s) => s.id === shotId);
    if (!shot?.prompt && !shot?.description) return;

    updateShotMutation.mutate({
      id: shotId,
      updates: { status: "generating" },
    });

    try {
      const isOmni =
        selectedImageModel === "kling-v3-omni" ||
        selectedImageModel === "kling-image-o1";
      const sceneVisualIdentity =
        vision?.directorBrief?.sceneVisualIdentities?.find(
          (svi) => svi.sceneNumber === shot.sceneNumber,
        ) || null;
      const promptContext = {
        elements: projectElements,
        sceneDefaults: vision?.sceneDefaults,
        useOmniElementSyntax: isOmni,
        allShots: undefined,
        enableContinuity,
        directorBrief: vision?.directorBrief ?? undefined,
        sceneVisualIdentity,
      };
      const cinematographyPrompt = buildCinematographyPrompt(
        shot,
        promptContext,
      );
      const negativePrompt = buildNegativePrompt(vision?.directorBrief);
      const aspectRatio = getKlingAspectRatio(shot, project?.aspectRatio);
      const elementIds = getElementIdsForShot(shot, projectElements);
      const subjectImageUrls = getSubjectImagesForShot(shot, projectElements);
      const sceneImageUrl = getSceneImageForShot(shot, projectElements);
      const referenceImages = getElementReferenceImages(shot, projectElements);
      const previousShotImages = enableContinuity
        ? getPreviousShotImages(shot, currentShots, continuityDepth)
        : [];
      const hasCharacterImages = subjectImageUrls.length > 0;
      const effectiveFidelity = shotFidelityOverrides[shotId] ?? humanFidelity;

      const generateBody: Record<string, unknown> = {
        mode: "image",
        model: selectedImageModel,
        prompt: cinematographyPrompt,
        negativePrompt,
        aspectRatio,
      };

      if (elementIds.length > 0) {
        generateBody.elementIds = elementIds;
      }

      const hasContinuityRefs =
        enableContinuity && previousShotImages.length > 0;
      const continuityFidelity = hasContinuityRefs ? 0.65 : 0.5;

      if (isOmni) {
        const allRefImages = hasContinuityRefs
          ? [
              ...previousShotImages,
              ...referenceImages.filter((r) => !previousShotImages.includes(r)),
            ]
          : [...referenceImages];
        if (!hasContinuityRefs) {
          for (const prevImg of previousShotImages) {
            if (!allRefImages.includes(prevImg)) allRefImages.push(prevImg);
          }
        }
        const cappedRefs = allRefImages.slice(0, 10);
        if (cappedRefs.length > 0) {
          generateBody.referenceImages = cappedRefs;
          generateBody.imageFidelity = hasCharacterImages
            ? humanFidelity
            : continuityFidelity;
          if (hasCharacterImages) generateBody.humanFidelity = humanFidelity;
        }
      } else if (hasCharacterImages) {
        const totalMultiImages =
          subjectImageUrls.length + (sceneImageUrl ? 1 : 0);
        if (totalMultiImages >= 2) {
          generateBody.subjectImageUrls = subjectImageUrls;
          generateBody.humanFidelity = effectiveFidelity;
          if (sceneImageUrl) {
            generateBody.sceneImageUrl = sceneImageUrl;
          }
        } else {
          generateBody.referenceImageUrl = subjectImageUrls[0];
          generateBody.imageReference = "face";
          generateBody.imageFidelity = humanFidelity;
          generateBody.humanFidelity = humanFidelity;
          if (previousShotImages.length > 0)
            generateBody.styleImageUrl = previousShotImages[0];
        }
      } else if (referenceImages.length > 0) {
        if (isOmni) {
          const combined = hasContinuityRefs
            ? [
                ...previousShotImages,
                ...referenceImages.filter(
                  (r) => !previousShotImages.includes(r),
                ),
              ]
            : [
                ...referenceImages,
                ...previousShotImages.filter(
                  (p) => !referenceImages.includes(p),
                ),
              ];
          generateBody.referenceImages = combined.slice(0, 10);
          generateBody.imageFidelity = continuityFidelity;
        } else {
          const firstRef = hasContinuityRefs
            ? previousShotImages[0]
            : referenceImages[0] || previousShotImages[0];
          if (firstRef) {
            generateBody.referenceImageUrl = firstRef;
            generateBody.imageReference = "subject";
            generateBody.imageFidelity = continuityFidelity;
          }
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateBody),
      });
      const data = await res.json();

      if (data.error) {
        console.error("Generation API error:", data.error);
        updateShotMutation.mutate({
          id: shotId,
          updates: { status: "failed" },
        });
        return;
      }

      if (data.taskId) {
        let pollAttempts = 0;
        const maxPollAttempts = 100; // ~5 minutes at 3s intervals
        const checkStatus = async () => {
          pollAttempts++;
          if (pollAttempts > maxPollAttempts) {
            console.error("Image generation timed out");
            updateShotMutation.mutate({
              id: shotId,
              updates: { status: "failed" },
            });
            return;
          }
          try {
            const imageSource = data.imageSource || "generations";
            const statusRes = await fetch(
              `/api/generate/status?taskId=${data.taskId}&type=image&imageSource=${imageSource}`,
            );
            const statusData = await statusRes.json();
            if (statusData.isComplete && statusData.resultUrl) {
              const latestShot = queryClient
                .getQueryData<FullProject>(["/api/projects", projectId])
                ?.shots?.find((s) => s.id === shotId);
              const prevVersions: GenerationVersion[] =
                latestShot?.generationVersions ?? [];
              const newVersion: GenerationVersion = {
                type: "image",
                imageUrl: statusData.resultUrl,
                prompt: cinematographyPrompt,
                model: selectedImageModel,
                aspectRatio,
                elementIds: elementIds.length > 0 ? elementIds : undefined,
                timestamp: new Date().toISOString(),
              };
              updateShotMutation.mutate({
                id: shotId,
                updates: {
                  generatedImageUrl: statusData.resultUrl,
                  status: "generated",
                  generationVersions: [...prevVersions, newVersion],
                  endFrameUrl: null,
                },
              });
              // End-frame generation is disabled — user will generate video via i2v when ready
            } else if (statusData.isFailed) {
              console.error("Image generation failed:", statusData.message);
              updateShotMutation.mutate({
                id: shotId,
                updates: { status: "failed" },
              });
            } else {
              setTimeout(checkStatus, 3000);
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
            setTimeout(checkStatus, 5000);
          }
        };
        setTimeout(checkStatus, 5000);
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      updateShotMutation.mutate({ id: shotId, updates: { status: "failed" } });
    }
  };

  const handleGenerateEndFrame = async (shotId: number) => {
    const currentShots =
      queryClient.getQueryData<FullProject>(["/api/projects", projectId])
        ?.shots || shots;
    const shot = currentShots.find((s) => s.id === shotId);
    if (!shot?.generatedImageUrl) return;

    updateShotMutation.mutate({
      id: shotId,
      updates: { status: "generating" },
    });

    try {
      const sceneVisualIdentity =
        vision?.directorBrief?.sceneVisualIdentities?.find(
          (svi) => svi.sceneNumber === shot.sceneNumber,
        ) || null;

      const res = await fetch("/api/ai/end-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startFrameUrl: shot.generatedImageUrl,
          duration: shot.duration || 3,
          cameraMovement: shot.cameraMovement,
          description: shot.description || shot.prompt,
          shotType: shot.shotType,
          aspectRatio: getKlingAspectRatio(shot, project?.aspectRatio),
          shotId,
          directorBrief: vision?.directorBrief ?? null,
          sceneVisualIdentity,
          colorGrade: shot.colorGrade,
          keyLight: shot.keyLight,
          cameraModel: shot.cameraModel,
          lensType: shot.lensType,
          focalLength: shot.focalLength,
          shotFocus: shot.shotFocus,
          cameraMechanism: shot.cameraMechanism,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("End frame generation error:", data.error);
        updateShotMutation.mutate({ id: shotId, updates: { status: "draft" } });
        return;
      }
      if (data.taskId) {
        let pollAttempts = 0;
        const maxPollAttempts = 60;
        const checkStatus = async () => {
          pollAttempts++;
          if (pollAttempts > maxPollAttempts) {
            console.error("End frame generation timed out");
            updateShotMutation.mutate({
              id: shotId,
              updates: { status: "draft" },
            });
            return;
          }
          try {
            const imageSource = data.imageSource || "generations";
            const statusRes = await fetch(
              `/api/generate/status?taskId=${data.taskId}&type=image&imageSource=${imageSource}`,
            );
            const statusData = await statusRes.json();
            if (statusData.isComplete && statusData.resultUrl) {
              updateShotMutation.mutate({
                id: shotId,
                updates: {
                  endFrameUrl: statusData.resultUrl,
                  status: "generated",
                },
              });
            } else if (statusData.isFailed) {
              console.error("End frame generation failed:", statusData.message);
              updateShotMutation.mutate({
                id: shotId,
                updates: { status: "draft" },
              });
            } else {
              setTimeout(checkStatus, 3000);
            }
          } catch (pollErr) {
            console.error("End frame polling error:", pollErr);
            setTimeout(checkStatus, 5000);
          }
        };
        setTimeout(checkStatus, 5000);
      }
    } catch (error) {
      console.error("End frame generation failed:", error);
      updateShotMutation.mutate({ id: shotId, updates: { status: "draft" } });
    }
  };

  const handleGenerateAllImages = async () => {
    const currentShots =
      queryClient.getQueryData<FullProject>(["/api/projects", projectId])
        ?.shots || shots;
    const shotsToGenerate = currentShots.filter(
      (s) =>
        s.status !== "generating" &&
        s.status !== "generated" &&
        (s.prompt || s.description),
    );
    for (const shot of shotsToGenerate) {
      handleGenerateImage(shot.id);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  const handleGenerateVideo = async (shotId: number) => {
    const shot = shots.find((s) => s.id === shotId);
    if (!shot?.generatedImageUrl) return;

    setVideoGenerating((prev) => ({ ...prev, [shotId]: true }));

    try {
      const sceneVisualIdentity =
        vision?.directorBrief?.sceneVisualIdentities?.find(
          (svi) => svi.sceneNumber === shot.sceneNumber,
        ) || null;
      const promptContext = {
        elements: projectElements,
        sceneDefaults: vision?.sceneDefaults,
        directorBrief: vision?.directorBrief ?? undefined,
        allShots: undefined,
        enableContinuity: false,
        sceneVisualIdentity,
      };
      const cinematographyPrompt = buildCinematographyPrompt(
        shot,
        promptContext,
      );
      const negativePrompt = buildNegativePrompt(vision?.directorBrief);
      const aspectRatio = getKlingAspectRatio(shot, project?.aspectRatio);
      const elementIds = getElementIdsForShot(shot, projectElements);

      const generateBody: Record<string, unknown> = {
        mode: "video",
        model: selectedVideoModel,
        prompt: cinematographyPrompt,
        negativePrompt,
        referenceImageUrl: shot.generatedImageUrl,
        duration: (shot.duration || 5) >= 10 ? "10" : "5",
        aspectRatio,
      };
      if (elementIds.length > 0) {
        generateBody.elementIds = elementIds;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateBody),
      });
      const data = await res.json();

      if (data.error) {
        console.error("Video generation API error:", data.error);
        setVideoGenerating((prev) => ({ ...prev, [shotId]: false }));
        updateShotMutation.mutate({
          id: shotId,
          updates: { status: "failed" },
        });
        return;
      }

      if (data.taskId) {
        let pollAttempts = 0;
        const maxPollAttempts = 60; // ~5 minutes at 5s intervals
        const checkStatus = async () => {
          pollAttempts++;
          if (pollAttempts > maxPollAttempts) {
            console.error("Video generation timed out");
            setVideoGenerating((prev) => ({ ...prev, [shotId]: false }));
            updateShotMutation.mutate({
              id: shotId,
              updates: { status: "failed" },
            });
            return;
          }
          try {
            const videoSource = shot.generatedImageUrl
              ? "image2video"
              : "text2video";
            const statusRes = await fetch(
              `/api/generate/status?taskId=${data.taskId}&type=video&videoSource=${videoSource}`,
            );
            const statusData = await statusRes.json();
            if (statusData.isComplete && statusData.resultUrl) {
              const latestShot = queryClient
                .getQueryData<FullProject>(["/api/projects", projectId])
                ?.shots?.find((s) => s.id === shotId);
              const prevVersions: GenerationVersion[] =
                latestShot?.generationVersions ?? [];
              const videoVersion: GenerationVersion = {
                type: "video",
                videoUrl: statusData.resultUrl,
                prompt: cinematographyPrompt,
                model: selectedVideoModel,
                aspectRatio,
                elementIds: elementIds.length > 0 ? elementIds : undefined,
                duration: Number(shot.duration || 5),
                timestamp: new Date().toISOString(),
              };
              updateShotMutation.mutate({
                id: shotId,
                updates: {
                  generatedVideoUrl: statusData.resultUrl,
                  generationVersions: [...prevVersions, videoVersion],
                  status: "generated",
                },
              });
              setVideoGenerating((prev) => ({ ...prev, [shotId]: false }));
            } else if (statusData.isFailed) {
              console.error("Video generation failed:", statusData.message);
              setVideoGenerating((prev) => ({ ...prev, [shotId]: false }));
              updateShotMutation.mutate({
                id: shotId,
                updates: { status: "failed" },
              });
            } else {
              setTimeout(checkStatus, 5000);
            }
          } catch (pollErr) {
            console.error("Video polling error:", pollErr);
            setTimeout(checkStatus, 8000);
          }
        };
        setTimeout(checkStatus, 8000);
      }
    } catch (error) {
      console.error("Video generation failed:", error);
      setVideoGenerating((prev) => ({ ...prev, [shotId]: false }));
      updateShotMutation.mutate({ id: shotId, updates: { status: "failed" } });
    }
  };

  const handleUpdateAssembly = useCallback(
    (updates: Partial<Assembly>) => {
      updateAssemblyMutation.mutate(updates);
    },
    [updateAssemblyMutation],
  );

  const handleGenerateScript = async () => {
    if (!narrative?.idea) return;
    setScriptGenerating(true);
    const logId = aiLogStore.addEntry({
      stage: "narrative",
      route: "AI/script",
      model: "openai/gpt-4o-mini",
      summary: "تولید فیلمنامه...",
      status: "running",
    });
    try {
      const ideaWithLogline = narrative.logline
        ? `${narrative.idea}\n\nلاگ‌لاین: ${narrative.logline}`
        : narrative.idea;
      const res = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaWithLogline,
          style: project?.style || "cinematic",
          targetAudience: narrative.targetAudience || "general",
          duration: narrative.duration || "medium",
          type: "script",
        }),
      });
      const data = await res.json();
      if (data.result) {
        updateNarrativeMutation.mutate({ script: data.result });
        aiLogStore.updateEntry(logId, {
          status: "success",
          model: data.model || "openai/gpt-4o-mini",
          summary: `فیلمنامه تولید شد — ${Math.round(data.result.split(/\s+/).length)} کلمه`,
          durationMs: data.durationMs,
          tokensUsed: data.tokensUsed,
        });
      } else {
        const errMsg = data.error || "Script generation failed";
        if (data.code === "OPENROUTER_KEY_MISSING") setApiKeyMissing(true);
        aiLogStore.updateEntry(logId, {
          status: "error",
          summary: `خطا: ${errMsg}`,
          detail: data.code,
        });
      }
    } catch (error) {
      console.error("Script generation failed:", error);
      aiLogStore.updateEntry(logId, {
        status: "error",
        summary: `خطای شبکه در تولید فیلمنامه`,
      });
    } finally {
      setScriptGenerating(false);
    }
  };

  const handleAutoStoryboard = async (shotCount?: number) => {
    if (storyboardGeneratingRef.current) {
      console.warn("handleAutoStoryboard: already running, skipping");
      return;
    }

    const currentProject =
      queryClient.getQueryData<FullProject>(["/api/projects", projectId]) ||
      fullProject;
    const currentNarrative = currentProject?.narrative;
    const currentVision = currentProject?.visionBoard;
    const currentShots = currentProject?.shots || [];
    const scriptText = currentNarrative?.script;

    if (!scriptText || scriptText.trim().length < 20) {
      console.warn("Auto storyboard skipped: no script found");
      return;
    }

    if (currentShots.length > 0) {
      console.warn("Auto storyboard skipped: shots already exist");
      return;
    }

    storyboardGeneratingRef.current = true;
    setStoryboardGenerating(true);
    setStoryboardError(null);
    setStoryboardProgress(null);
    setApiKeyMissing(false);

    const validShotCount =
      typeof shotCount === "number" && !isNaN(shotCount)
        ? shotCount
        : undefined;

    const logId = aiLogStore.addEntry({
      stage: "vision",
      route: "AI/storyboard",
      model: "openai/gpt-4o-mini",
      summary: "در حال تولید دکوپاژ...",
      status: "running",
    });

    try {
      const freshElementsRes = await fetch(
        `/api/assets?projectId=${projectId}`,
      );
      const freshElements: Asset[] = freshElementsRes.ok
        ? await freshElementsRes.json()
        : projectElements || [];
      if (freshElements.length > 0) {
        queryClient.setQueryData(["/api/assets", projectId], freshElements);
      }

      // Fresh-fetch the project to guarantee the latest directorBrief is used,
      // not a potentially stale query-cache snapshot.
      const freshProjectRes = await fetch(`/api/projects/${projectId}`);
      const freshProject: FullProject | null = freshProjectRes.ok
        ? await freshProjectRes.json()
        : currentProject;
      const freshVision = freshProject?.visionBoard;
      const freshNarrative = freshProject?.narrative || currentNarrative;

      const res = await fetch("/api/ai/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptText,
          logline: freshNarrative?.logline || "",
          aspectRatio: project?.aspectRatio || "16:9",
          style: project?.style || "cinematic",
          projectId,
          maxShots: validShotCount,
          elements: freshElements.map((e: Asset) => ({
            id: e.id,
            type: e.type,
            name: e.name,
            description: e.description,
            age: e.age,
            sex: e.sex,
            metadata: e.metadata || {},
          })),
          directorBrief: freshVision?.directorBrief || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data.error || `HTTP ${res.status}`;
        const errCode = data.code;
        console.error("Auto storyboard API error:", errMsg, errCode);

        if (errCode === "OPENROUTER_KEY_MISSING") {
          setApiKeyMissing(true);
        }

        setStoryboardError({ message: errMsg, code: errCode });
        aiLogStore.updateEntry(logId, {
          status: "error",
          summary: `خطا: ${errMsg}`,
          detail: errCode,
        });
        return;
      }

      if (!data.shots || data.shots.length === 0) {
        setStoryboardError({
          message: "هوش مصنوعی هیچ شاتی تولید نکرد. لطفاً دوباره تلاش کنید.",
        });
        aiLogStore.updateEntry(logId, {
          status: "error",
          summary: "هیچ شاتی تولید نشد",
        });
        return;
      }

      aiLogStore.updateEntry(logId, {
        model: data.model || "openai/gpt-4o-mini",
        durationMs: data.durationMs,
        tokensUsed: data.tokensUsed,
        summary: `در حال ذخیره ${data.shots.length} شات...`,
      });

      const total = data.shots.length;
      setStoryboardProgress({ saved: 0, total });

      const BATCH_SIZE = 3;
      let savedCount = 0;
      const failedIndices: number[] = [];

      const SHOT_TYPES: readonly ShotType[] = [
        "extreme_close_up",
        "close_up",
        "medium_close_up",
        "medium",
        "medium_wide",
        "wide",
        "extreme_wide",
        "establishing",
        "insert",
        "cutaway",
        "two_shot",
        "over_shoulder",
      ];
      const CAMERA_ANGLES: readonly CameraAngle[] = [
        "eye_level",
        "high_angle",
        "low_angle",
        "birds_eye",
        "worms_eye",
        "dutch",
        "pov",
        "over_shoulder",
      ];
      const CAMERA_MOVEMENTS: readonly CameraMovement[] = [
        "static",
        "pan",
        "tilt",
        "dolly_in",
        "dolly_out",
        "truck",
        "crane",
        "handheld",
        "steadicam",
        "whip_pan",
        "zoom",
        "push_in",
        "pull_out",
        "arc",
      ];
      const LIGHTING_PRESETS: readonly LightingPreset[] = [
        "key_light",
        "fill_light",
        "backlight",
        "high_key",
        "low_key",
        "natural",
        "golden_hour",
        "blue_hour",
        "neon",
        "silhouette",
        "chiaroscuro",
        "soft_diffused",
        "hard_dramatic",
      ];
      const CAMERA_MODELS: readonly CameraModel[] = [
        "arri_alexa_mini_lf",
        "arri_alexa_35",
        "red_v_raptor",
        "red_komodo",
        "sony_venice_2",
        "sony_fx6",
        "blackmagic_ursa_g2",
        "blackmagic_pocket_6k",
        "canon_c70",
        "canon_r5c",
        "panasonic_s1h",
        "custom",
      ];
      const LENS_TYPES: readonly LensType[] = [
        "spherical",
        "anamorphic",
        "vintage_anamorphic",
        "vintage_spherical",
        "macro",
        "tilt_shift",
        "fisheye",
        "custom",
      ];
      const FOCAL_LENGTHS: readonly FocalLength[] = [
        "14mm",
        "18mm",
        "24mm",
        "28mm",
        "35mm",
        "40mm",
        "50mm",
        "65mm",
        "85mm",
        "100mm",
        "135mm",
        "200mm",
        "custom",
      ];
      const ASPECT_RATIOS: readonly CinemaAspectRatio[] = [
        "2.39:1",
        "2.35:1",
        "1.85:1",
        "1.66:1",
        "16:9",
        "4:3",
        "1:1",
        "9:16",
        "custom",
      ];

      const coerceShotType = (v: unknown): ShotType =>
        SHOT_TYPES.includes(v as ShotType) ? (v as ShotType) : "medium";
      const coerceCameraAngle = (v: unknown): CameraAngle =>
        CAMERA_ANGLES.includes(v as CameraAngle)
          ? (v as CameraAngle)
          : "eye_level";
      const coerceCameraMovement = (v: unknown): CameraMovement =>
        CAMERA_MOVEMENTS.includes(v as CameraMovement)
          ? (v as CameraMovement)
          : "static";
      const coerceLighting = (v: unknown): LightingPreset =>
        LIGHTING_PRESETS.includes(v as LightingPreset)
          ? (v as LightingPreset)
          : "natural";
      const coerceCameraModel = (v: unknown): CameraModel | null =>
        CAMERA_MODELS.includes(v as CameraModel) ? (v as CameraModel) : null;
      const coerceLensType = (v: unknown): LensType | null =>
        LENS_TYPES.includes(v as LensType) ? (v as LensType) : null;
      const coerceFocalLength = (v: unknown): FocalLength | null =>
        FOCAL_LENGTHS.includes(v as FocalLength) ? (v as FocalLength) : null;
      const coerceAspectRatio = (v: unknown): CinemaAspectRatio =>
        ASPECT_RATIOS.includes(v as CinemaAspectRatio)
          ? (v as CinemaAspectRatio)
          : ((project?.aspectRatio as CinemaAspectRatio | undefined) ?? "16:9");

      interface StoryboardShotDTO {
        title: string;
        description: string;
        prompt: string;
        order: number;
        shotType: ShotType;
        cameraAngle: CameraAngle;
        cameraMovement: CameraMovement;
        keyLight: LightingPreset;
        duration: number;
        dialogueText: string;
        notes: string;
        cameraModel: CameraModel | null;
        lensType: LensType | null;
        focalLength: FocalLength | null;
        cinemaAspectRatio: CinemaAspectRatio;
        colorGrade: string;
        sceneNumber: number | null;
        sceneName: string | null;
        locationId: number | null;
        characterIds: number[];
        propIds: number[];
        status: ShotStatus;
      }

      const shotsToSave: StoryboardShotDTO[] = (
        data.shots as Array<Record<string, unknown>>
      ).map((shot, idx) => ({
        title: typeof shot.title === "string" ? shot.title : `شات ${idx + 1}`,
        description:
          typeof shot.description === "string" ? shot.description : "",
        prompt: typeof shot.prompt === "string" ? shot.prompt : "",
        order: typeof shot.order === "number" ? shot.order : idx,
        shotType: coerceShotType(shot.shotType),
        cameraAngle: coerceCameraAngle(shot.cameraAngle),
        cameraMovement: coerceCameraMovement(shot.cameraMovement),
        keyLight: coerceLighting(shot.keyLight),
        duration:
          typeof shot.duration === "number"
            ? shot.duration
            : parseInt(String(shot.duration)) || 3,
        dialogueText:
          typeof shot.dialogueText === "string" ? shot.dialogueText : "",
        notes: typeof shot.notes === "string" ? shot.notes : "",
        cameraModel: coerceCameraModel(shot.cameraModel),
        lensType: coerceLensType(shot.lensType),
        focalLength: coerceFocalLength(shot.focalLength),
        cinemaAspectRatio: coerceAspectRatio(shot.cinemaAspectRatio),
        colorGrade: typeof shot.colorGrade === "string" ? shot.colorGrade : "",
        sceneNumber:
          typeof shot.sceneNumber === "number" ? shot.sceneNumber : null,
        sceneName: typeof shot.sceneName === "string" ? shot.sceneName : null,
        locationId: (() => {
          const lid =
            typeof shot.locationId === "number" ? shot.locationId : null;
          if (!lid) return null;
          return freshElements.some(
            (e: Asset) => e.id === lid && e.type === "location",
          )
            ? lid
            : null;
        })(),
        characterIds: Array.isArray(shot.characterIds)
          ? (shot.characterIds as number[]).filter((cid) =>
              freshElements.some(
                (e: Asset) => e.id === cid && e.type === "character",
              ),
            )
          : [],
        propIds: Array.isArray(shot.propIds)
          ? (shot.propIds as number[]).filter((pid) =>
              freshElements.some(
                (e: Asset) => e.id === pid && e.type === "property",
              ),
            )
          : [],
        status: "draft" as ShotStatus,
      }));

      for (let i = 0; i < shotsToSave.length; i += BATCH_SIZE) {
        const batch = shotsToSave.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (shot: StoryboardShotDTO, batchIdx: number) => {
            const globalIdx = i + batchIdx;
            try {
              await addShotMutation.mutateAsync({
                title: shot.title,
                description: shot.description,
                prompt: shot.prompt,
                order: shot.order,
                shotType: shot.shotType,
                cameraAngle: shot.cameraAngle,
                cameraMovement: shot.cameraMovement,
                keyLight: shot.keyLight,
                duration: shot.duration,
                dialogueText: shot.dialogueText,
                notes: shot.notes,
                cameraModel: shot.cameraModel,
                lensType: shot.lensType,
                focalLength: shot.focalLength,
                cinemaAspectRatio: shot.cinemaAspectRatio,
                colorGrade: shot.colorGrade,
                sceneNumber: shot.sceneNumber,
                sceneName: shot.sceneName,
                locationId: shot.locationId,
                characterIds: shot.characterIds,
                propIds: shot.propIds,
                status: shot.status,
              });
              savedCount++;
              setStoryboardProgress({ saved: savedCount, total });
            } catch (shotErr) {
              console.error(
                `Failed to save shot ${globalIdx}:`,
                shotErr instanceof Error ? shotErr.message : String(shotErr),
              );
              failedIndices.push(globalIdx);
            }
          }),
        );
      }

      const aiPalette = data.projectPalette || data.projectDefaults;
      if (aiPalette && !freshVision?.directorBrief) {
        const aiDefaults = aiPalette;
        const briefFromAI: Record<string, string> = {};
        if (aiDefaults.cameraModel)
          briefFromAI.cameraBody = aiDefaults.cameraModel;
        if (aiDefaults.lensFamily)
          briefFromAI.lensFamily = aiDefaults.lensFamily;
        if (aiDefaults.colorScience)
          briefFromAI.colorScience = aiDefaults.colorScience;
        if (aiDefaults.filmTexture)
          briefFromAI.filmTexture = aiDefaults.filmTexture;
        if (aiDefaults.lightingPhilosophy)
          briefFromAI.lightingPhilosophy = aiDefaults.lightingPhilosophy;
        if (aiDefaults.overallMood)
          briefFromAI.overallMood = aiDefaults.overallMood;
        if (aiDefaults.era) briefFromAI.era = aiDefaults.era;
        if (aiDefaults.visualStyle)
          briefFromAI.visualStyle = aiDefaults.visualStyle;
        if (aiDefaults.referenceFilms)
          briefFromAI.referenceFilms = aiDefaults.referenceFilms;
        if (aiDefaults.baseAspectRatio)
          briefFromAI.baseAspectRatio = aiDefaults.baseAspectRatio;
        handleUpdateVision({ directorBrief: briefFromAI });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });

      if (failedIndices.length > 0) {
        const errMsg = `${savedCount} از ${total} شات ذخیره شد — ${failedIndices.length} شات با خطا مواجه شد (${failedIndices.map((i) => i + 1).join(", ")}).`;
        setStoryboardError({ message: errMsg, code: "PARTIAL_SAVE" });
        aiLogStore.updateEntry(logId, {
          status: "error",
          summary: errMsg,
          durationMs: data.durationMs,
          tokensUsed: data.tokensUsed,
        });
        toast({
          title: "ذخیره ناقص دکوپاژ",
          description: errMsg,
          variant: "destructive",
        });
      } else {
        aiLogStore.updateEntry(logId, {
          status: "success",
          summary: `${savedCount} شات ذخیره شد`,
          durationMs: data.durationMs,
          tokensUsed: data.tokensUsed,
        });
        toast({
          title: "دکوپاژ با موفقیت ساخته شد",
          description: `${savedCount} شات با موفقیت ذخیره شد.`,
        });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Auto storyboard generation failed:", errMsg);
      setStoryboardError({ message: `خطا در تولید دکوپاژ: ${errMsg}` });
      aiLogStore.updateEntry(logId, {
        status: "error",
        summary: `خطا: ${errMsg}`,
      });
      toast({
        title: "خطا در تولید دکوپاژ",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      storyboardGeneratingRef.current = false;
      setStoryboardGenerating(false);
      setStoryboardProgress(null);
    }
  };

  const handleRetryAutoStoryboard = () => {
    setStoryboardError(null);
    autoStoryboardFiredRef.current = false;
    storyboardGeneratingRef.current = false;
    handleAutoStoryboard(pendingShotCount);
  };

  const handleInsertShot = async (
    insertIndex: number,
    userDescription: string,
  ) => {
    const beforeShot = insertIndex > 0 ? shots[insertIndex - 1] : null;
    const afterShot = insertIndex < shots.length ? shots[insertIndex] : null;

    try {
      const res = await fetch("/api/ai/storyboard/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeShot: beforeShot
            ? {
                title: beforeShot.title,
                description: beforeShot.description,
                prompt: beforeShot.prompt,
                shotType: beforeShot.shotType,
                cameraAngle: beforeShot.cameraAngle,
                cameraMovement: beforeShot.cameraMovement,
                cameraModel: beforeShot.cameraModel,
                lensType: beforeShot.lensType,
                focalLength: beforeShot.focalLength,
                keyLight: beforeShot.keyLight,
                colorGrade: beforeShot.colorGrade,
                duration: beforeShot.duration,
                dialogueText: beforeShot.dialogueText,
                sceneNumber: beforeShot.sceneNumber,
                sceneName: beforeShot.sceneName,
                locationId: beforeShot.locationId,
                characterIds: beforeShot.characterIds,
                cinemaAspectRatio: beforeShot.cinemaAspectRatio,
              }
            : null,
          afterShot: afterShot
            ? {
                title: afterShot.title,
                description: afterShot.description,
                prompt: afterShot.prompt,
                shotType: afterShot.shotType,
                cameraAngle: afterShot.cameraAngle,
                cameraMovement: afterShot.cameraMovement,
                cameraModel: afterShot.cameraModel,
                lensType: afterShot.lensType,
                focalLength: afterShot.focalLength,
                keyLight: afterShot.keyLight,
                colorGrade: afterShot.colorGrade,
                duration: afterShot.duration,
                dialogueText: afterShot.dialogueText,
                sceneNumber: afterShot.sceneNumber,
                sceneName: afterShot.sceneName,
                locationId: afterShot.locationId,
                characterIds: afterShot.characterIds,
                cinemaAspectRatio: afterShot.cinemaAspectRatio,
              }
            : null,
          userDescription,
          projectStyle: project?.style || "cinematic",
          aspectRatio: project?.aspectRatio || "16:9",
          script: narrative?.script || "",
          logline: narrative?.logline || "",
          elements: projectElements.map((e) => ({
            id: e.id,
            type: e.type,
            name: e.name,
            description: e.description,
            metadata: e.metadata || {},
          })),
        }),
      });
      const data = await res.json();
      if (data.shot) {
        const shot = data.shot;
        await addShotMutation.mutateAsync({
          title: shot.title || "شات جدید",
          description: shot.description || "",
          prompt: shot.prompt || "",
          order: insertIndex,
          shotType: shot.shotType || "medium",
          cameraAngle: shot.cameraAngle || "eye_level",
          cameraMovement: shot.cameraMovement || "static",
          keyLight: shot.keyLight || "natural",
          duration: shot.duration || 3,
          dialogueText: shot.dialogueText || "",
          notes: shot.notes || "",
          cameraModel: shot.cameraModel || "",
          lensType: shot.lensType || "",
          focalLength: shot.focalLength || "",
          cinemaAspectRatio:
            shot.cinemaAspectRatio || project?.aspectRatio || "16:9",
          colorGrade: shot.colorGrade || "",
          sceneNumber: shot.sceneNumber || null,
          sceneName: shot.sceneName || null,
          locationId: shot.locationId || null,
          characterIds: shot.characterIds || [],
          propIds: shot.propIds || [],
          status: "draft",
        } as any);
        queryClient.invalidateQueries({
          queryKey: ["/api/projects", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/projects", projectId, "shots"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/projects", projectId, "vision"],
        });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Shot insert failed:", error);
      return false;
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setExportUrl(data.url);
      } else {
        console.error("Export failed:", data.error);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      setExportProgress(100);
    }
  };

  const handleDownload = () => {
    if (exportUrl) {
      const a = document.createElement("a");
      a.href = exportUrl;
      a.download = `${project?.title || "film"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen bg-background"
        dir="rtl"
        data-testid="studio-loading"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">در حال بارگذاری پروژه...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div
        className="flex items-center justify-center h-screen bg-background"
        dir="rtl"
        data-testid="studio-error"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium">پروژه یافت نشد</p>
          <p className="text-muted-foreground">
            این پروژه وجود ندارد یا حذف شده است.
          </p>
          <Link href="/projects">
            <Button data-testid="button-back-to-projects">
              بازگشت به پروژه‌ها
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderStageContent = () => {
    switch (currentStage) {
      case "narrative":
        return (
          <NarrativeFlow
            narrative={narrative || null}
            projectStyle={project.style || undefined}
            projectTitle={project.title}
            projectDescription={project.description || undefined}
            projectCreativeIntent={project.creativeIntent || undefined}
            projectTone={project.tone || undefined}
            onUpdate={handleUpdateNarrative}
            onUpdateProject={handleUpdateProject}
            onNext={handleNextStage}
            isGenerating={scriptGenerating}
            onGenerate={handleGenerateScript}
          />
        );

      case "director_brief":
        return (
          <DirectorBriefFlow
            vision={vision || null}
            projectScript={narrative?.script || ""}
            projectStyle={project?.style || "cinematic"}
            onUpdateVision={handleUpdateVision}
            onNext={handleNextStage}
            onBack={handlePrevStage}
          />
        );

      case "vision":
        return (
          <div className="space-y-4">
            {apiKeyMissing && (
              <div
                className="flex items-start gap-3 p-4 rounded-lg border border-destructive/40 bg-destructive/5 text-sm"
                dir="rtl"
              >
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive mb-1">
                    کلید API هوش مصنوعی تنظیم نشده
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    برای استفاده از قابلیت‌های هوش مصنوعی، کلید{" "}
                    <code className="bg-muted px-1 rounded">
                      AI_INTEGRATIONS_OPENROUTER_API_KEY
                    </code>{" "}
                    را در تنظیمات Replit (Secrets) اضافه کنید.
                  </p>
                </div>
              </div>
            )}
            {storyboardError && !apiKeyMissing && (
              <div
                className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/5 text-sm"
                dir="rtl"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                    خطا در تولید دکوپاژ
                  </p>
                  <p className="text-muted-foreground text-xs mb-2">
                    {storyboardError.message}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryAutoStoryboard}
                    className="gap-2 h-7 text-xs border-yellow-500/40 hover:bg-yellow-500/10"
                  >
                    <RefreshCw className="w-3 h-3" />
                    تلاش مجدد
                  </Button>
                </div>
              </div>
            )}
            {storyboardGenerating && storyboardProgress && (
              <div
                className="p-4 rounded-lg border border-primary/20 bg-primary/5"
                dir="rtl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">
                    در حال ذخیره دکوپاژ... ({storyboardProgress.saved}/
                    {storyboardProgress.total})
                  </p>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(storyboardProgress.saved / storyboardProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <VisionFlow
              vision={vision || null}
              shots={shots}
              projectId={projectId}
              projectScript={narrative?.script || ""}
              projectStyle={project?.style || "cinematic"}
              projectAspectRatio={project?.aspectRatio || "16:9"}
              elements={projectElements}
              onUpdateVision={handleUpdateVision}
              onAddShot={handleAddShot}
              onUpdateShot={handleUpdateShot}
              onDeleteShot={handleDeleteShot}
              onGenerateImage={handleGenerateImage}
              onGenerateEndFrame={handleGenerateEndFrame}
              onGenerateAllImages={handleGenerateAllImages}
              onAutoStoryboard={(shotCount) => {
                handleAutoStoryboard(shotCount);
              }}
              defaultShotCount={pendingShotCount}
              onInsertShot={handleInsertShot}
              onNext={handleNextStage}
              onBack={handlePrevStage}
              isGenerating={storyboardGenerating}
              selectedImageModel={selectedImageModel}
              onImageModelChange={setSelectedImageModel}
              humanFidelity={humanFidelity}
              onHumanFidelityChange={setHumanFidelity}
              enableContinuity={enableContinuity}
              onEnableContinuityChange={setEnableContinuity}
              continuityDepth={continuityDepth}
              onContinuityDepthChange={setContinuityDepth}
              shotFidelityOverrides={shotFidelityOverrides}
              onShotFidelityOverride={handleShotFidelityOverride}
            />
          </div>
        );

      case "storyboard":
        return (
          <StoryboardFlow
            shots={shots}
            projectId={projectId}
            projectAspectRatio={project?.aspectRatio || "16:9"}
            onGenerateVideo={handleGenerateVideo}
            onRetryVideo={handleGenerateVideo}
            onInsertShot={handleInsertShot}
            onUpdateShot={handleUpdateShot}
            onNext={handleNextStage}
            onBack={handlePrevStage}
            isGeneratingVideo={videoGenerating}
            selectedVideoModel={selectedVideoModel}
            onVideoModelChange={setSelectedVideoModel}
          />
        );

      case "assembly":
        return (
          <AssemblyFlow
            assembly={assembly || null}
            shots={shots}
            projectId={projectId}
            projectAspectRatio={project?.aspectRatio || "16:9"}
            projectTitle={project?.title || ""}
            narrative={project?.narrative || null}
            directorBrief={project?.visionBoard?.directorBrief || null}
            onUpdate={handleUpdateAssembly}
            onNext={handleNextStage}
            onBack={handlePrevStage}
          />
        );

      case "export":
        return (
          <ExportFlow
            projectTitle={project.title}
            onBack={handlePrevStage}
            onExport={handleExport}
            onDownload={handleDownload}
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportUrl={exportUrl}
          />
        );

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div
        className="flex h-screen w-full bg-background overflow-hidden"
        dir="rtl"
      >
        <AssistantPanel
          isOpen={showAssistant}
          onClose={() => setShowAssistant(!showAssistant)}
          projectId={projectId}
          elements={projectElements}
          fullProject={fullProject || null}
          currentStage={currentStage}
          context={{
            section: currentStage,
            projectTitle: project.title,
            activeTab: currentStage,
            style: project.style || "cinematic",
            aspectRatio: project.aspectRatio || "16:9",
          }}
        />

        <div className="flex flex-col flex-1 min-w-0 h-screen">
          {/* Polished top header */}
          <header className="h-12 flex items-center justify-between px-3 border-b border-border/20 glass flex-shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/projects">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  data-testid="button-back-projects"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </Button>
              </Link>
              <div className="w-px h-4 bg-border/40 flex-shrink-0" />
              <FXLogo size="sm" showText={false} href="/projects" />
              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold truncate max-w-[180px] text-foreground">
                  {project.title}
                </span>
                <span className="text-border/70">·</span>
                <span className="text-xs text-muted-foreground hidden md:inline truncate">
                  {STAGES[currentStage]?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                variant={showElements ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs font-medium px-3 border transition-all",
                  showElements
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-foreground hover:border-primary/50 hover:text-primary",
                )}
                onClick={() => setShowElements(!showElements)}
                data-testid="button-elements-toggle"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">عناصر</span>
                {projectElements.length > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full min-w-[16px] h-[16px] text-[9px] font-bold px-1",
                      showElements
                        ? "bg-white/20 text-white"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {projectElements.length}
                  </span>
                )}
              </Button>
              <Button
                variant={showAssistant ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAssistant(!showAssistant)}
                title="دستیار هوشمند"
              >
                <MessageSquareMore className="w-4 h-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          {/* Stage pipeline strip */}
          <div className="flex-shrink-0 border-b border-border/30 bg-gradient-to-b from-card/60 to-card/20 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-3 py-2">
              <div className="flex items-center gap-1">
                {STAGE_ORDER.map((stageId, index, filtered) => {
                  const stage = STAGES[stageId];
                  const Icon = stageIcons[stageId];
                  const isActive = currentStage === stageId;
                  const stageIndex = STAGE_ORDER.indexOf(stageId);
                  const isCompleted = stageIndex < currentIndex;
                  const isAccessible = stageIndex <= currentIndex + 1;

                  return (
                    <div
                      key={stageId}
                      className="flex items-center flex-1 min-w-0 gap-1"
                    >
                      <button
                        onClick={() => handleStageClick(stageId)}
                        disabled={!isAccessible}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 w-full min-w-0 relative",
                          isActive
                            ? "bg-primary/12 text-primary ring-1 ring-primary/25 shadow-sm"
                            : isCompleted
                              ? "text-foreground/75 hover:text-foreground hover:bg-muted/50"
                              : isAccessible
                                ? "text-muted-foreground hover:text-foreground/70 hover:bg-muted/40"
                                : "text-muted-foreground/20 cursor-not-allowed",
                        )}
                        data-testid={`button-header-stage-${stageId}`}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-inner",
                            isActive
                              ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                              : isCompleted
                                ? "bg-primary/15 text-primary ring-1 ring-primary/15"
                                : "bg-muted text-muted-foreground/60",
                          )}
                        >
                          {isCompleted ? (
                            <Check className="w-2.5 h-2.5" />
                          ) : (
                            <Icon className="w-2.5 h-2.5" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "hidden sm:block text-[11px] font-medium truncate",
                            isActive && "font-semibold",
                          )}
                        >
                          {stage.label}
                        </span>
                      </button>

                      {index < filtered.length - 1 && (
                        <div
                          className={cn(
                            "flex-shrink-0 h-px w-2.5",
                            stageIndex < currentIndex
                              ? "bg-primary/30"
                              : "bg-border/25",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto px-3 py-4 sm:px-6 sm:py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[60vh]"
                >
                  {renderStageContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          <ElementsPanel
            projectId={projectId}
            isOpen={showElements}
            onClose={() => setShowElements(false)}
            onRequestAIGenerate={() => {
              setShowElements(false);
              setOnboardingDismissed(false);
              setShowOnboarding(true);
            }}
            hasScript={
              !!(narrative?.script && narrative.script.trim().length >= 20)
            }
            directorBrief={vision?.directorBrief ?? null}
          />

          <ElementsOnboarding
            isOpen={showOnboarding}
            onClose={handleOnboardingClose}
            projectId={parseInt(projectId)}
            projectTitle={project.title}
            projectDescription={project.description || undefined}
            logline={narrative?.logline || undefined}
            script={narrative?.script || undefined}
            style={project.style || undefined}
            directorBrief={vision?.directorBrief || undefined}
            onElementsCreated={handleOnboardingCreated}
          />

          {/* Warning dialog when user tries auto-storyboard with no elements */}
          <Dialog open={showElementsCheck} onOpenChange={setShowElementsCheck}>
            <DialogContent className="max-w-sm" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  عناصر پروژه تعریف نشده
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  هنوز هیچ عنصر (شخصیت، لوکیشن، یا پراپ) برای پروژه تعریف
                  نکرده‌اید. دکوپاژ بدون عناصر ممکن است کیفیت پایین‌تری داشته
                  باشد.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowElementsCheck(false);
                    setShowElements(true);
                  }}
                >
                  <Layers className="w-4 h-4 ml-1" />
                  تعریف عناصر
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setShowElementsCheck(false);
                    handleAutoStoryboard(elementsCheckShotCount);
                  }}
                >
                  <Wand2 className="w-4 h-4 ml-1" />
                  ادامه بدون عناصر
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}
