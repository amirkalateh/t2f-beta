"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Send,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Download,
  Check,
  RotateCcw,
  Paperclip,
  AtSign,
  Package,
  Plus,
  ChevronRight,
  MessageSquare,
  Trash2,
  Clock,
  ChevronDown,
  Activity,
  AlertCircle,
  CheckCircle2,
  Zap,
  FilePen,
  Clapperboard,
  Layers,
  User,
  MapPin,
  GripHorizontal,
  Pin,
  PinOff,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { aiLogStore, type AiLogEntry } from "@/lib/stores/ai-log-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SafeImage from "@/components/ui/safe-image";
import type {
  Asset,
  ProjectStage,
  Narrative,
  VisionBoard,
  Shot,
} from "@/lib/types";
import type { FullProject } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { buildStageHints } from "@/lib/agent/system-prompt";
import { serializeProjectState } from "@/lib/agent/state-serializer";

interface ImageGeneration {
  taskId: string;
  prompt: string;
  titleFa: string;
  aspectRatio: string;
  status: "pending" | "generating" | "complete" | "failed";
  resultUrl?: string;
  savedAsAsset?: boolean;
}

interface ToolResult {
  tool: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface Message {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  imageGeneration?: ImageGeneration;
  toolResults?: ToolResult[];
  attachedImages?: string[];
  createdAt?: string;
}

interface ChatSession {
  id: number;
  title: string;
  projectId?: number | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: string;
  hasImages?: boolean;
}

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  elements?: Asset[];
  fullProject?: FullProject | null;
  currentStage?: ProjectStage;
  context?: {
    section: string;
    projectTitle: string;
    activeTab: string;
    style?: string;
    aspectRatio?: string;
  };
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "همین الان";
  if (diffMins < 60) return `${diffMins} دقیقه پیش`;
  if (diffHours < 24) return `${diffHours} ساعت پیش`;
  if (diffDays < 7) return `${diffDays} روز پیش`;
  return date.toLocaleDateString("fa-IR");
}

export function AssistantPanel({
  isOpen,
  onClose,
  projectId,
  elements = [],
  fullProject,
  currentStage = "vision",
  context,
}: AssistantPanelProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"sessions" | "chat">("sessions");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [imageMode, setImageMode] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState("16:9");
  const [aiLogs, setAiLogs] = useState<AiLogEntry[]>(() =>
    aiLogStore.getEntries(),
  );
  const [aiLogsOpen, setAiLogsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [expandedToolCards, setExpandedToolCards] = useState<Set<string>>(
    new Set(),
  );
  const viewDirectionRef = useRef<1 | -1>(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const numericProjectId = projectId ? parseInt(projectId, 10) : 0;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const unsub = aiLogStore.subscribe(() => {
      setAiLogs(aiLogStore.getEntries());
    });
    return unsub;
  }, []);

  const filteredMentions = useMemo(() => {
    if (!showMentions || !elements.length) return [];
    const query = mentionQuery.toLowerCase();
    return elements
      .filter(
        (el) =>
          el.name.toLowerCase().includes(query) ||
          (el.description && el.description.toLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [showMentions, mentionQuery, elements]);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearTimeout);
    };
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const url = projectId
        ? `/api/omni-chat?projectId=${projectId}`
        : "/api/omni-chat";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/omni-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSessionId(session.id);
        setMessages(
          session.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            attachedImages: m.attachedImages,
            imageGeneration: m.imageGeneration,
            createdAt: m.createdAt,
          })),
        );
        viewDirectionRef.current = 1;
        setView("chat");
        fetchSessions();
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/omni-chat/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSessionId(sessionId);
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            attachedImages: m.attachedImages,
            imageGeneration: m.imageGeneration
              ? {
                  ...m.imageGeneration,
                  status:
                    m.imageGeneration.status === "pending" ||
                    m.imageGeneration.status === "generating"
                      ? "failed"
                      : m.imageGeneration.status,
                }
              : undefined,
            createdAt: m.createdAt,
          })),
        );
        viewDirectionRef.current = 1;
        setView("chat");
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const deleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/omni-chat/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        viewDirectionRef.current = -1;
        setView("sessions");
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const updateMessageInDb = async (
    messageId: number,
    imageGeneration: ImageGeneration,
  ) => {
    if (!activeSessionId) return;
    try {
      await fetch(`/api/omni-chat/${activeSessionId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, imageGeneration }),
      });
    } catch (err) {
      console.error("Failed to update message:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textBetween = textBeforeCursor.slice(atIndex + 1);
      if (!/\s/.test(textBetween) && textBetween.length <= 30) {
        setShowMentions(true);
        setMentionStart(atIndex);
        setMentionQuery(textBetween);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
    setMentionQuery("");
  };

  const handleSelectMention = (element: Asset) => {
    if (mentionStart === -1) return;
    const before = input.slice(0, mentionStart);
    const afterCursor = input.slice(mentionStart + 1 + mentionQuery.length);
    const elementTag = `[${element.name}]`;
    setInput(before + elementTag + " " + afterCursor);
    if (element.imageUrl) {
      setAttachedImages((prev) => {
        if (prev.includes(element.imageUrl!)) return prev;
        return [...prev, element.imageUrl!];
      });
    }
    setShowMentions(false);
    setMentionQuery("");
    setMentionStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImages((prev) => [
            ...prev,
            event.target?.result as string,
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const pollImageStatus = useCallback(
    (
      taskId: string,
      messageIndex: number,
      imageSource: string = "generations",
    ) => {
      let attempts = 0;
      const maxAttempts = 60;

      const check = async () => {
        attempts++;
        if (attempts > maxAttempts) {
          setMessages((prev) => {
            const updated = prev.map((m, i) =>
              i === messageIndex && m.imageGeneration?.taskId === taskId
                ? {
                    ...m,
                    imageGeneration: {
                      ...m.imageGeneration!,
                      status: "failed" as const,
                    },
                  }
                : m,
            );
            const msg = updated[messageIndex];
            if (msg?.id && msg.imageGeneration)
              updateMessageInDb(msg.id, msg.imageGeneration);
            return updated;
          });
          return;
        }

        try {
          const res = await fetch(
            `/api/generate/status?taskId=${taskId}&type=image&imageSource=${imageSource}`,
          );
          const data = await res.json();

          if (data.isComplete && data.resultUrl) {
            setMessages((prev) => {
              const updated = prev.map((m, i) =>
                i === messageIndex && m.imageGeneration?.taskId === taskId
                  ? {
                      ...m,
                      imageGeneration: {
                        ...m.imageGeneration!,
                        status: "complete" as const,
                        resultUrl: data.resultUrl,
                      },
                    }
                  : m,
              );
              const msg = updated[messageIndex];
              if (msg?.id && msg.imageGeneration)
                updateMessageInDb(msg.id, msg.imageGeneration);
              return updated;
            });
          } else if (data.isFailed) {
            setMessages((prev) => {
              const updated = prev.map((m, i) =>
                i === messageIndex && m.imageGeneration?.taskId === taskId
                  ? {
                      ...m,
                      imageGeneration: {
                        ...m.imageGeneration!,
                        status: "failed" as const,
                      },
                    }
                  : m,
              );
              const msg = updated[messageIndex];
              if (msg?.id && msg.imageGeneration)
                updateMessageInDb(msg.id, msg.imageGeneration);
              return updated;
            });
          } else {
            pollingRef.current[taskId] = setTimeout(check, 3000);
          }
        } catch {
          pollingRef.current[taskId] = setTimeout(check, 5000);
        }
      };

      pollingRef.current[taskId] = setTimeout(check, 5000);
    },
    [activeSessionId],
  );

  const handleGenerateImage = async (
    prompt: string,
    aspectRatio: string,
    titleFa: string,
    messageIndex: number,
  ) => {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "image",
          model: "kling-v2",
          prompt,
          aspectRatio,
          resolution: "1k",
        }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === messageIndex && m.imageGeneration
              ? {
                  ...m,
                  imageGeneration: {
                    ...m.imageGeneration,
                    status: "failed" as const,
                  },
                }
              : m,
          ),
        );
        return;
      }

      if (data.taskId) {
        setMessages((prev) => {
          const updated = prev.map((m, i) =>
            i === messageIndex && m.imageGeneration
              ? {
                  ...m,
                  imageGeneration: {
                    ...m.imageGeneration,
                    taskId: data.taskId,
                    status: "generating" as const,
                  },
                }
              : m,
          );
          const msg = updated[messageIndex];
          if (msg?.id && msg.imageGeneration)
            updateMessageInDb(msg.id, msg.imageGeneration);
          return updated;
        });
        pollImageStatus(
          data.taskId,
          messageIndex,
          data.imageSource || "generations",
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === messageIndex && m.imageGeneration
            ? {
                ...m,
                imageGeneration: {
                  ...m.imageGeneration,
                  status: "failed" as const,
                },
              }
            : m,
        ),
      );
    }
  };

  const handleSaveAsAsset = async (messageIndex: number) => {
    const msg = messages[messageIndex];
    if (!msg?.imageGeneration?.resultUrl || !projectId) return;

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          name: msg.imageGeneration.titleFa || "تصویر تولید شده",
          type: "property",
          description: msg.imageGeneration.prompt,
          imageUrl: msg.imageGeneration.resultUrl,
          thumbnailUrl: msg.imageGeneration.resultUrl,
          source: "omni",
        }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === messageIndex && m.imageGeneration
              ? {
                  ...m,
                  imageGeneration: { ...m.imageGeneration, savedAsAsset: true },
                }
              : m,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to save asset:", err);
    }
  };

  const sendMessageToSession = async (
    sessionId: number,
    userMessage: string,
    currentAttached: string[],
    existingMessages: Message[],
  ) => {
    const userMsg: Message = {
      role: "user",
      content: userMessage,
      attachedImages: currentAttached.length > 0 ? currentAttached : undefined,
      createdAt: new Date().toISOString(),
    };

    const localMessages = [...existingMessages, userMsg];
    setMessages(localMessages);
    setIsLoading(true);

    const savedId = await saveMessageToSession(sessionId, userMsg);
    if (savedId) {
      userMsg.id = savedId;
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, id: savedId } : m)),
      );
    }

    try {
      const projectStateStr = fullProject
        ? serializeProjectState({
            project: fullProject,
            elements,
            currentStage,
          })
        : undefined;

      const response = await fetch("/api/ai/omni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: localMessages
            .filter((m) => !m.imageGeneration || m.role !== "assistant")
            .map((m) => ({
              role: m.role,
              content: m.content,
              attachedImages: m.attachedImages,
            })),
          projectState: projectStateStr,
          projectId,
          currentStage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در ارتباط");
      }

      const data = await response.json();

      const hasToolResults = data.toolResults && data.toolResults.length > 0;
      const nonImageToolResults = hasToolResults
        ? data.toolResults.filter(
            (tr: ToolResult) => tr.tool !== "generate_image",
          )
        : [];

      if (hasToolResults) {
        const mutatingTools = [
          "add_shots",
          "update_shot",
          "delete_shot",
          "update_director_brief",
          "update_narrative",
          "create_element",
          "generate_storyboard",
        ];
        const needsInvalidation = data.toolResults.some(
          (tr: ToolResult) => mutatingTools.includes(tr.tool) && tr.success,
        );
        if (needsInvalidation && projectId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/projects", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["/api/assets", projectId],
          });
        }
      }

      if (data.imageRequest) {
        const requestedAspectRatio = data.imageRequest.aspectRatio || "16:9";
        const imgGen: ImageGeneration = {
          taskId: "",
          prompt: data.imageRequest.prompt,
          titleFa: data.imageRequest.titleFa,
          aspectRatio: requestedAspectRatio,
          status: "pending",
        };

        const assistantMsg: Message = {
          role: "assistant",
          content:
            data.message || `در حال تولید تصویر: ${data.imageRequest.titleFa}`,
          imageGeneration: imgGen,
          toolResults:
            nonImageToolResults.length > 0 ? nonImageToolResults : undefined,
          createdAt: new Date().toISOString(),
        };

        const assistantSavedId = await saveMessageToSession(
          sessionId,
          assistantMsg,
        );
        const newMsgIndex = localMessages.length;
        setMessages((prev) => [
          ...prev,
          { ...assistantMsg, id: assistantSavedId || undefined },
        ]);

        handleGenerateImage(
          data.imageRequest.prompt,
          requestedAspectRatio,
          data.imageRequest.titleFa,
          newMsgIndex,
        );
      } else {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.message,
          toolResults:
            nonImageToolResults.length > 0 ? nonImageToolResults : undefined,
          createdAt: new Date().toISOString(),
        };
        const assistantSavedId = await saveMessageToSession(
          sessionId,
          assistantMsg,
        );
        setMessages((prev) => [
          ...prev,
          { ...assistantMsg, id: assistantSavedId || undefined },
        ]);
      }
    } catch (error) {
      console.error("Omni chat error:", error);
      const errMsg: Message = {
        role: "assistant",
        content:
          "متاسفانه در برقراری ارتباط مشکلی پیش آمد. لطفا دوباره تلاش کنید.",
      };
      await saveMessageToSession(sessionId, errMsg);
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      fetchSessions();
    }
  };

  const saveMessageToSession = async (sessionId: number, msg: Message) => {
    try {
      const res = await fetch(`/api/omni-chat/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: msg.role,
          content: msg.content,
          attachedImages: msg.attachedImages || null,
          imageGeneration: msg.imageGeneration || null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        return saved.id as number;
      }
    } catch (err) {
      console.error("Failed to save message:", err);
    }
    return null;
  };

  const handleDirectImageGeneration = async (
    sessionId: number,
    prompt: string,
    aspectRatio: string,
    existingMessages: Message[],
  ) => {
    const userMsg: Message = { role: "user", content: prompt };
    const localMessages = [...existingMessages, userMsg];
    setMessages(localMessages);
    setIsLoading(true);

    const savedId = await saveMessageToSession(sessionId, userMsg);
    if (savedId) {
      userMsg.id = savedId;
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, id: savedId } : m)),
      );
    }

    const imgGen: ImageGeneration = {
      taskId: "",
      prompt,
      titleFa: prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt,
      aspectRatio,
      status: "pending",
    };
    const assistantMsg: Message = {
      role: "assistant",
      content: `در حال تولید تصویر...`,
      imageGeneration: imgGen,
    };
    const assistantSavedId = await saveMessageToSession(
      sessionId,
      assistantMsg,
    );
    const newMsgIndex = localMessages.length;
    setMessages((prev) => [
      ...prev,
      { ...assistantMsg, id: assistantSavedId || undefined },
    ]);
    setIsLoading(false);

    handleGenerateImage(prompt, aspectRatio, imgGen.titleFa, newMsgIndex);
    fetchSessions();
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage = input.trim();
    const currentAttached = [...attachedImages];
    setInput("");
    setAttachedImages([]);

    const ensureSession = async (): Promise<{
      id: number;
      msgs: Message[];
    } | null> => {
      if (activeSessionId) return { id: activeSessionId, msgs: messages };
      try {
        const res = await fetch("/api/omni-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (res.ok) {
          const session = await res.json();
          const welcomeMsgs: Message[] = session.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }));
          setActiveSessionId(session.id);
          viewDirectionRef.current = 1;
          setView("chat");
          return { id: session.id, msgs: welcomeMsgs };
        }
      } catch (err) {
        console.error("Failed to create session:", err);
      }
      return null;
    };

    const session = await ensureSession();
    if (!session) return;

    if (imageMode) {
      await handleDirectImageGeneration(
        session.id,
        userMessage,
        imageAspectRatio,
        session.msgs,
      );
      setImageMode(false);
    } else {
      await sendMessageToSession(
        session.id,
        userMessage,
        currentAttached,
        session.msgs,
      );
    }
  };

  const handleRetryGeneration = (messageIndex: number) => {
    const msg = messages[messageIndex];
    if (!msg?.imageGeneration) return;

    setMessages((prev) =>
      prev.map((m, i) =>
        i === messageIndex && m.imageGeneration
          ? {
              ...m,
              imageGeneration: {
                ...m.imageGeneration,
                status: "pending" as const,
              },
            }
          : m,
      ),
    );

    handleGenerateImage(
      msg.imageGeneration.prompt,
      msg.imageGeneration.aspectRatio || "16:9",
      msg.imageGeneration.titleFa,
      messageIndex,
    );
  };

  const renderAiLogEntry = (entry: AiLogEntry) => {
    const statusIcon =
      entry.status === "running" ? (
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
      ) : entry.status === "success" ? (
        <CheckCircle2 className="w-3 h-3 text-green-500" />
      ) : (
        <AlertCircle className="w-3 h-3 text-destructive" />
      );

    const stageLabel: Record<string, string> = {
      narrative: "روایت",
      director_brief: "بریف کارگردان",
      elements: "عناصر بصری",
      vision: "دکوپاژ",
      storyboard: "استوری‌بورد",
      assembly: "مونتاژ",
      export: "خروجی",
    };

    return (
      <div
        key={entry.id}
        className="flex items-start gap-2 py-2 px-3 border-b border-border/20 last:border-0"
      >
        <div className="mt-0.5 flex-shrink-0">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {entry.stage && (
              <Badge variant="outline" className="text-[8px] py-0 px-1 h-4">
                {stageLabel[entry.stage] || entry.stage}
              </Badge>
            )}
            {entry.model && (
              <span className="text-[9px] text-muted-foreground/50 font-mono truncate max-w-[80px]">
                {entry.model.includes("/")
                  ? entry.model.split("/").pop()
                  : entry.model}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 mr-auto">
              {new Date(entry.timestamp).toLocaleTimeString("fa-IR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-[11px] text-foreground/80 leading-tight">
            {entry.summary}
          </p>
          {(entry.durationMs || entry.tokensUsed) && (
            <div className="flex items-center gap-2 mt-0.5">
              {entry.durationMs && (
                <span className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {(entry.durationMs / 1000).toFixed(1)}s
                </span>
              )}
              {entry.tokensUsed && (
                <span className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  {entry.tokensUsed.toLocaleString()} token
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSessionsList = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border/30">
        <Button
          onClick={createNewSession}
          className="w-full gap-2"
          data-testid="button-new-session"
        >
          <Plus className="w-4 h-4" />
          گفتگوی جدید
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">هنوز گفتگویی ندارید</p>
            <p className="text-xs text-muted-foreground/70">
              با کلیک روی "گفتگوی جدید" شروع کنید
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-right transition-colors group",
                  activeSessionId === session.id
                    ? "bg-primary/10"
                    : "hover-elevate",
                )}
                data-testid={`session-${session.id}`}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    session.hasImages ? "bg-blue-500/10" : "bg-muted/50",
                  )}
                >
                  {session.hasImages ? (
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {session.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={(e) => deleteSession(session.id, e)}
                      data-testid={`delete-session-${session.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                  {session.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {session.lastMessage}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(session.updatedAt)}
                    </span>
                    {session.messageCount && session.messageCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0"
                      >
                        {session.messageCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {aiLogs.length > 0 && (
          <div className="mx-2 mb-2 rounded-lg border border-border/30 overflow-hidden">
            <button
              onClick={() => setAiLogsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  لاگ هوش مصنوعی
                </span>
                {aiLogs.some((e) => e.status === "running") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                  {aiLogs.length}
                </Badge>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform",
                    aiLogsOpen && "rotate-180",
                  )}
                />
              </div>
            </button>
            {aiLogsOpen && (
              <div className="divide-y divide-border/20">
                {aiLogs.map(renderAiLogEntry)}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const toolIcons: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    add_shots: Clapperboard,
    update_shot: Clapperboard,
    delete_shot: Clapperboard,
    update_director_brief: Wand2,
    update_narrative: FilePen,
    create_element: User,
    generate_storyboard: Layers,
  };

  const renderToolResultCard = (
    tr: ToolResult,
    idx: number,
    cardKey: string,
  ) => {
    const Icon = toolIcons[tr.tool] || Zap;
    const isExpanded = expandedToolCards.has(cardKey);
    const toggleExpand = () =>
      setExpandedToolCards((prev) => {
        const next = new Set(prev);
        if (next.has(cardKey)) next.delete(cardKey);
        else next.add(cardKey);
        return next;
      });
    const label = (() => {
      if (!tr.success) return tr.error || "خطا در اجرای عملیات";
      if (tr.tool === "add_shots") return `${tr.data?.count || 0} شات اضافه شد`;
      if (tr.tool === "update_shot")
        return `شات #${tr.data?.shotId} بروزرسانی شد`;
      if (tr.tool === "delete_shot") return "شات حذف شد";
      if (tr.tool === "update_director_brief")
        return "بریف کارگردان بروزرسانی شد";
      if (tr.tool === "update_narrative")
        return tr.data?.mode === "appended"
          ? "متن به روایت افزوده شد"
          : "روایت جایگزین شد";
      if (tr.tool === "create_element")
        return `عنصر "${tr.data?.name}" ایجاد شد`;
      if (tr.tool === "generate_storyboard")
        return `${tr.data?.count || 0} شات استوری‌بورد تولید شد`;
      return tr.tool;
    })();

    const allShots: Array<{
      id: number;
      title: string;
      imageUrl?: string | null;
    }> = tr.data?.shots || [];
    const hasExpandableContent = tr.success && allShots.length > 2;
    const visibleShots = isExpanded ? allShots : allShots.slice(0, 2);

    return (
      <div
        key={idx}
        className={cn(
          "rounded-xl px-3 py-2 text-xs flex flex-col gap-1 mt-2",
          tr.success
            ? "bg-emerald-500/[0.07] border border-emerald-500/20"
            : "bg-destructive/[0.07] border border-destructive/20",
        )}
        data-testid={`tool-result-${tr.tool}-${idx}`}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0",
              tr.success ? "bg-emerald-500/15" : "bg-destructive/15",
            )}
          >
            {tr.success ? (
              <Icon className="w-3 h-3 text-emerald-400" />
            ) : (
              <X className="w-3 h-3 text-destructive" />
            )}
          </div>
          <span
            className={cn(
              "font-medium flex-1 min-w-0",
              tr.success ? "text-emerald-400" : "text-destructive",
            )}
          >
            {label}
          </span>
          {tr.success && !hasExpandableContent && (
            <CheckCircle2 className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />
          )}
          {hasExpandableContent && (
            <button
              onClick={toggleExpand}
              className="flex items-center gap-0.5 text-emerald-400/70 hover:text-emerald-400 transition-colors flex-shrink-0"
            >
              <span className="text-[10px]">
                {isExpanded ? "بستن" : `+${allShots.length - 2} بیشتر`}
              </span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )}
              />
            </button>
          )}
        </div>
        {tr.tool === "update_shot" && tr.success && tr.data?.updatedFields && (
          <p className="mr-7 text-[10px] text-emerald-400/60">
            فیلدها: {(tr.data.updatedFields as string[]).join("، ")}
          </p>
        )}
        {(tr.tool === "add_shots" || tr.tool === "generate_storyboard") &&
          tr.success &&
          visibleShots.length > 0 && (
            <AnimatePresence initial={false}>
              <motion.div
                className="mr-7 space-y-0.5 overflow-hidden"
                initial={false}
                animate={{ height: "auto" }}
              >
                {visibleShots.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    {s.imageUrl && (
                      <img
                        src={s.imageUrl}
                        alt={s.title}
                        className="w-8 h-8 rounded object-cover flex-shrink-0 border border-emerald-500/20"
                      />
                    )}
                    <p className="text-[10px] text-emerald-400/70 truncate">
                      — {s.title}
                    </p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex gap-2 max-w-[93%]",
                msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto",
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground px-4 py-2.5 rounded-tr-sm"
                      : "bg-muted/40 border border-border/20 px-4 py-2.5 rounded-tl-sm",
                  )}
                >
                  {msg.attachedImages && msg.attachedImages.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {msg.attachedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="w-16 h-16 rounded-lg overflow-hidden"
                        >
                          <img
                            src={img}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" ? (
                    <div className="text-sm leading-relaxed space-y-1.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-1.5 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic opacity-90">{children}</em>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pr-4 space-y-1 mb-2">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pr-4 space-y-1 mb-2">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm">{children}</li>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-sm font-bold mb-1">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xs font-bold mb-1 opacity-90">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xs font-semibold mb-1 opacity-80">
                              {children}
                            </h3>
                          ),
                          code: ({ children, className }) =>
                            className ? (
                              <code className="block bg-black/20 rounded p-2 text-xs overflow-x-auto my-1">
                                {children}
                              </code>
                            ) : (
                              <code className="bg-black/20 rounded px-1 text-xs">
                                {children}
                              </code>
                            ),
                          pre: ({ children }) => (
                            <pre className="bg-black/20 rounded p-2 overflow-x-auto my-1 text-xs">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-r-2 border-current/30 pr-2 opacity-80 italic my-1">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="border-current/20 my-2" />,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="underline opacity-80 hover:opacity-100"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>

                {msg.toolResults && msg.toolResults.length > 0 && (
                  <div className="space-y-0">
                    {msg.toolResults.map((tr, idx) =>
                      renderToolResultCard(tr, idx, `${msg.id || i}-${idx}`),
                    )}
                  </div>
                )}

                {msg.imageGeneration && (
                  <div className="mt-3 space-y-2">
                    {msg.imageGeneration.status === "pending" ||
                    msg.imageGeneration.status === "generating" ? (
                      <div className="rounded-lg bg-background/50 border border-border/30 p-4 flex flex-col items-center gap-3">
                        <div className="w-full aspect-video bg-muted/30 rounded-md flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                            <span className="text-xs text-muted-foreground">
                              {msg.imageGeneration.status === "pending"
                                ? "در حال ارسال..."
                                : "در حال تولید تصویر..."}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center truncate w-full">
                          {msg.imageGeneration.titleFa}
                        </p>
                      </div>
                    ) : msg.imageGeneration.status === "complete" &&
                      msg.imageGeneration.resultUrl ? (
                      <div className="rounded-lg bg-background/50 border border-border/30 overflow-hidden">
                        <div className="relative w-full aspect-video">
                          <SafeImage
                            src={msg.imageGeneration.resultUrl}
                            alt={msg.imageGeneration.titleFa}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {msg.imageGeneration.titleFa}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {projectId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] gap-1"
                                onClick={() => handleSaveAsAsset(i)}
                                disabled={msg.imageGeneration?.savedAsAsset}
                                data-testid={`button-save-asset-${i}`}
                              >
                                {msg.imageGeneration.savedAsAsset ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    ذخیره شد
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3 h-3" />
                                    ذخیره در پروژه
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : msg.imageGeneration.status === "failed" ? (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-destructive">
                          خطا در تولید تصویر
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] gap-1"
                          onClick={() => handleRetryGeneration(i)}
                          data-testid={`button-retry-${i}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          تلاش مجدد
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
                {msg.createdAt && (
                  <p
                    className={cn(
                      "text-[9px] mt-1 text-muted-foreground/50",
                      msg.role === "user" ? "text-right" : "text-left",
                    )}
                  >
                    {formatRelativeTime(msg.createdAt)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}

          {/* Three-dot typing indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2 max-w-[93%] ml-auto"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                </div>
                <div className="bg-muted/40 border border-border/20 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: dot * 0.18,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Quick-action chips — shown when chat is empty and user hasn't started typing */}
      <AnimatePresence>
        {messages.length <= 1 && !input.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-border/15 pt-2"
          >
            {buildStageHints(currentStage).map((hint, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(hint);
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-muted/40 border border-border/25 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-150 whitespace-nowrap text-muted-foreground"
                data-testid={`suggestion-${i}`}
              >
                {hint}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-3 pb-3 pt-2 border-t border-border/15 bg-card/20">
        {imageMode && (
          <div
            className="flex items-center gap-2 mb-2 p-2 bg-blue-500/8 border border-blue-500/20 rounded-xl"
            dir="rtl"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-400 flex-shrink-0">
              حالت تصویر
            </span>
            <div className="flex gap-1 mr-auto">
              {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setImageAspectRatio(ratio)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors",
                    imageAspectRatio === ratio
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  data-testid={`button-aspect-${ratio}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
            <button
              onClick={() => setImageMode(false)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-close-image-mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 mb-2 p-1.5 bg-muted/20 rounded-xl overflow-x-auto border border-border/20">
            {attachedImages.map((img, idx) => (
              <div
                key={idx}
                className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
              >
                <img src={img} className="w-full h-full object-cover" />
                <button
                  onClick={() =>
                    setAttachedImages((prev) =>
                      prev.filter((_, i) => i !== idx),
                    )
                  }
                  className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-0.5"
                  data-testid={`button-remove-attached-${idx}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <AnimatePresence>
            {showMentions && filteredMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full mb-2 left-0 right-0 z-[100] bg-popover border border-border rounded-xl shadow-xl overflow-hidden max-h-64"
              >
                <div
                  className="px-3 py-2 border-b border-border/40 flex items-center gap-2"
                  dir="rtl"
                >
                  <AtSign className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    انتخاب عنصر
                  </span>
                </div>
                <ScrollArea className="max-h-52">
                  {filteredMentions.map((element, index) => (
                    <button
                      key={element.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-right transition-colors",
                        index === selectedMentionIndex
                          ? "bg-primary/10"
                          : "hover:bg-muted/30",
                      )}
                      onClick={() => handleSelectMention(element)}
                      onMouseEnter={() => setSelectedMentionIndex(index)}
                    >
                      {element.imageUrl ? (
                        <img
                          src={element.imageUrl}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{element.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {element.type}
                        </p>
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pill Textarea with action buttons */}
          <div className="flex items-end gap-2 rounded-2xl bg-muted/30 border border-border/25 focus-within:border-primary/30 focus-within:bg-muted/40 transition-all duration-200 px-3 py-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
              multiple
            />
            <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="پیوست تصویر"
                data-testid="button-attach-image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors",
                  showMentions
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  const ta = textareaRef.current;
                  if (ta) {
                    const pos = ta.selectionStart ?? ta.value.length;
                    const newVal =
                      ta.value.slice(0, pos) + "@" + ta.value.slice(pos);
                    setInput(newVal);
                    setTimeout(() => {
                      ta.focus();
                      ta.setSelectionRange(pos + 1, pos + 1);
                    }, 0);
                  }
                }}
                title="منشن عنصر"
                data-testid="button-context-mention"
              >
                @
              </button>
            </div>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                handleInputChange(e);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (showMentions && filteredMentions[selectedMentionIndex]) {
                    e.preventDefault();
                    handleSelectMention(filteredMentions[selectedMentionIndex]);
                  } else {
                    e.preventDefault();
                    handleSend();
                  }
                }
                if (showMentions) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedMentionIndex(
                      (prev) => (prev + 1) % filteredMentions.length,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedMentionIndex(
                      (prev) =>
                        (prev - 1 + filteredMentions.length) %
                        filteredMentions.length,
                    );
                  }
                }
              }}
              placeholder={
                imageMode
                  ? "توصیف تصویر مورد نظر..."
                  : "پیام به دستیار... (Enter برای ارسال)"
              }
              className="flex-1 resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 text-sm min-h-[24px] max-h-[112px] p-0 leading-relaxed placeholder:text-muted-foreground/50"
              rows={1}
              dir="rtl"
              disabled={isLoading}
              data-testid="input-omni-chat"
            />
            <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
              <button
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                  imageMode
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setImageMode(!imageMode)}
                title="حالت تصویر"
                data-testid="button-image-mode"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSend}
                disabled={
                  (!input.trim() && attachedImages.length === 0) || isLoading
                }
                className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200",
                  (input.trim() || attachedImages.length > 0) && !isLoading
                    ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_14px_hsl(var(--primary)/0.6)] hover:scale-105"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
                data-testid="button-send-omni"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          {input.length > 280 && (
            <p className="text-[10px] text-muted-foreground/60 mt-1 text-left">
              {input.length} کاراکتر
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: integrated edge tab strip (in flex layout — pushes content, never overlays) */}
      {!isOpen && (
        <div
          onClick={onClose}
          className="hidden lg:flex flex-col items-center justify-center gap-2 h-full bg-background/80 border-r border-border/30 flex-shrink-0 cursor-pointer hover:bg-muted/10 transition-colors select-none"
          style={{ width: "36px", minWidth: "36px" }}
          data-testid="button-omni-tab"
          title="Omni Agent"
        >
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center hover:from-blue-500/30 hover:to-purple-500/30 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span
            className="text-[9px] font-medium text-muted-foreground"
            style={{ writingMode: "vertical-lr" }}
          >
            Omni
          </span>
        </div>
      )}

      {/* Mobile: fixed overlay tab when closed */}
      {!isOpen && (
        <button
          onClick={onClose}
          className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-[55] flex flex-col items-center gap-1.5 px-1.5 py-3 bg-card/80 backdrop-blur-sm border border-l-0 border-border/30 rounded-r-lg shadow-lg hover:bg-card transition-colors group"
          data-testid="button-omni-tab-mobile"
        >
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span
            className="text-[9px] font-medium text-muted-foreground"
            style={{ writingMode: "vertical-lr" }}
          >
            Omni
          </span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop overlay */}
            <motion.div
              className="lg:hidden fixed inset-0 z-[59] bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (!isPinned) onClose();
              }}
            />
            <motion.div
              initial={
                isDesktop ? { x: 24, opacity: 0 } : { y: 40, opacity: 0 }
              }
              animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
              exit={isDesktop ? { x: 24, opacity: 0 } : { y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl z-[60] lg:relative lg:bottom-auto lg:inset-x-auto lg:max-h-full lg:rounded-none lg:z-auto lg:h-full lg:w-[380px] lg:max-w-[380px] bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border lg:border-t-0 lg:border-r flex flex-col overflow-hidden flex-shrink-0 shadow-[0_-4px_32px_hsl(0_0%_0%/0.18)] lg:shadow-[4px_0_32px_hsl(0_0%_0%/0.18)]"
              style={{ minWidth: 0 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center py-1.5 cursor-grab active:cursor-grabbing flex-shrink-0">
                <GripHorizontal className="w-5 h-5 text-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="px-3 pb-3 border-b border-sidebar-border flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {view === "chat" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        viewDirectionRef.current = -1;
                        setView("sessions");
                      }}
                      data-testid="button-back-sessions"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/25 to-purple-600/25 border border-blue-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight text-sidebar-foreground">
                      Omni Agent
                    </h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {view === "sessions"
                        ? `${sessions.length} گفتگو`
                        : "دستیار هوشمند سینمایی"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {view === "chat" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        createNewSession();
                      }}
                      data-testid="button-new-chat-header"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", isPinned && "text-primary")}
                    onClick={() => setIsPinned((p) => !p)}
                    title={isPinned ? "رها کردن پنل" : "سنجاق کردن پنل"}
                    data-testid="button-pin-omni"
                  >
                    {isPinned ? (
                      <Pin className="w-3.5 h-3.5" />
                    ) : (
                      <PinOff className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-7 w-7"
                    data-testid="button-close-omni"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {context && view === "chat" && (
                <div className="px-3 py-1.5 bg-muted/20 border-b border-border/30 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] py-0">
                    {context.section}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {context.projectTitle}
                  </span>
                </div>
              )}

              <AnimatePresence mode="wait" custom={viewDirectionRef.current}>
                <motion.div
                  key={view}
                  custom={viewDirectionRef.current}
                  variants={{
                    enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({ x: -dir * 24, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {view === "sessions" ? renderSessionsList() : renderChat()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
