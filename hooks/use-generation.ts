"use client";

import { useState, useCallback, useRef } from "react";
import type { GenerationTask } from "@/components/generation/generation-result";

interface GenerationOptions {
  mode: "image" | "video";
  model: string;
  aspectRatio: string;
  duration?: string;
  referenceImageUrl?: string;
}

export function useGeneration() {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startPolling = useCallback((taskId: string, type: "image" | "video", internalId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/generate/status?taskId=${taskId}&type=${type}`
        );
        const data = await response.json();

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === internalId) {
              if (data.isComplete) {
                const interval = pollIntervals.current.get(internalId);
                if (interval) {
                  clearInterval(interval);
                  pollIntervals.current.delete(internalId);
                }
                return {
                  ...t,
                  status: "completed" as const,
                  progress: 100,
                  resultUrl: data.resultUrl,
                };
              } else if (data.isFailed) {
                const interval = pollIntervals.current.get(internalId);
                if (interval) {
                  clearInterval(interval);
                  pollIntervals.current.delete(internalId);
                }
                return {
                  ...t,
                  status: "failed" as const,
                  error: data.message || "Generation failed",
                };
              } else {
                return {
                  ...t,
                  status: "processing" as const,
                  progress: Math.min(t.progress + Math.random() * 10, 95),
                };
              }
            }
            return t;
          })
        );
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    const intervalId = setInterval(poll, 3000);
    pollIntervals.current.set(internalId, intervalId);
    poll();
  }, []);

  const generate = useCallback(
    async (prompt: string, options: GenerationOptions) => {
      setIsGenerating(true);

      const internalId = `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newTask: GenerationTask = {
        id: internalId,
        taskId: "",
        type: options.mode,
        prompt,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
      };

      setTasks((prev) => [newTask, ...prev]);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: options.mode,
            model: options.model,
            prompt,
            aspectRatio: options.aspectRatio,
            duration: options.duration,
            referenceImageUrl: options.referenceImageUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Generation request failed");
        }

        const data = await response.json();

        setTasks((prev) =>
          prev.map((t) =>
            t.id === internalId
              ? { ...t, taskId: data.taskId, status: "processing" as const, progress: 5 }
              : t
          )
        );

        startPolling(data.taskId, options.mode, internalId);
      } catch (error) {
        console.error("Generation error:", error);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === internalId
              ? {
                  ...t,
                  status: "failed" as const,
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : t
          )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [startPolling]
  );

  const retryTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        generate(task.prompt, {
          mode: task.type,
          model: "kling-2.1",
          aspectRatio: "16:9",
        });
      }
    },
    [tasks, generate]
  );

  const clearTasks = useCallback(() => {
    pollIntervals.current.forEach((interval) => clearInterval(interval));
    pollIntervals.current.clear();
    setTasks([]);
  }, []);

  return {
    tasks,
    isGenerating,
    generate,
    retryTask,
    clearTasks,
  };
}
