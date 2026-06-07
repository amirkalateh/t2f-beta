/**
 * useAgentStream — React hook for consuming the LangGraph SSE stream.
 *
 * Features:
 *  - localStorage session persistence per project (thread_id + messages)
 *  - action_proposal event handling (shows what agent will do before interrupt)
 *  - db_updated event handling (triggers instant UI refresh)
 *  - Live token streaming with node attribution
 *  - Human-in-the-loop interrupt support
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  node?: string;
  timestamp: number;
}

export interface AgentInterrupt {
  thread_id: string;
  node: string;
  question: string;
  action_proposal?: string;
}

export interface ActionProposal {
  proposal: string;
  next_node: string;
  action_type: "write" | "generate" | "analyze" | "answer";
}

interface SessionData {
  threadId: string;
  messages: AgentMessage[];
  savedAt: number;
}

interface UseAgentStreamOptions {
  projectId: number;
  currentStage?: string;
  onMessage?: (msg: AgentMessage) => void;
  onNodeChange?: (node: string) => void;
  onDone?: (threadId: string) => void;
  onDbUpdated?: (node: string) => void;
}

function getSessionKey(projectId: number) {
  return `agent_session_${projectId}`;
}

function loadSession(projectId: number): SessionData | null {
  try {
    const raw = localStorage.getItem(getSessionKey(projectId));
    if (!raw) return null;
    const data: SessionData = JSON.parse(raw);
    // Expire sessions older than 24 hours
    if (Date.now() - data.savedAt > 86400000) {
      localStorage.removeItem(getSessionKey(projectId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveSession(projectId: number, threadId: string, messages: AgentMessage[]) {
  try {
    const data: SessionData = { threadId, messages, savedAt: Date.now() };
    localStorage.setItem(getSessionKey(projectId), JSON.stringify(data));
  } catch {}
}

function clearSession(projectId: number) {
  try {
    localStorage.removeItem(getSessionKey(projectId));
  } catch {}
}

export function useAgentStream({
  projectId,
  currentStage = "narrative",
  onMessage,
  onNodeChange,
  onDone,
  onDbUpdated,
}: UseAgentStreamOptions) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [tokenBuffer, setTokenBuffer] = useState("");
  const [nodeStatus, setNodeStatus] = useState<string>("");
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [interrupt, setInterrupt] = useState<AgentInterrupt | null>(null);
  const [actionProposal, setActionProposal] = useState<ActionProposal | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbUpdatedAt, setDbUpdatedAt] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);
  const tokenBufRef = useRef<string>("");
  const currentNodeRef = useRef<string>("");
  const messagesRef = useRef<AgentMessage[]>([]);
  const threadIdRef = useRef<string | null>(null);

  // Keep refs in sync
  messagesRef.current = messages;
  threadIdRef.current = threadId;

  // ── Session restoration on mount ─────────────────────────────────────────

  useEffect(() => {
    const session = loadSession(projectId);
    if (session) {
      setThreadId(session.threadId);
      setMessages(session.messages);
      threadIdRef.current = session.threadId;
    }
  }, [projectId]);

  // ── Auto-save session when messages or threadId changes ──────────────────

  useEffect(() => {
    if (threadId && messages.length > 0) {
      saveSession(projectId, threadId, messages);
    }
  }, [projectId, threadId, messages]);

  // ── Message helpers ───────────────────────────────────────────────────────

  const _addMessage = useCallback(
    (msg: AgentMessage) => {
      setMessages((prev) => {
        // Replace streaming buffer entry with final message when same node
        if (
          tokenBufRef.current &&
          prev.length > 0 &&
          prev[prev.length - 1].role === "assistant" &&
          prev[prev.length - 1].node === msg.node
        ) {
          return [...prev.slice(0, -1), msg];
        }
        return [...prev, msg];
      });
      tokenBufRef.current = "";
      setTokenBuffer("");
      onMessage?.(msg);
    },
    [onMessage]
  );

  // ── SSE event dispatcher ──────────────────────────────────────────────────

  const _handleEvent = useCallback(
    (event: any) => {
      const kind = event.event as string;

      switch (kind) {
        case "node_start":
          currentNodeRef.current = event.node;
          setNodeStatus(event.node);
          onNodeChange?.(event.node);
          break;

        case "token":
          tokenBufRef.current += event.token || "";
          setTokenBuffer((prev) => prev + (event.token || ""));
          break;

        case "node_end":
          if (event.message) {
            _addMessage({
              id: `ai-${event.node}-${Date.now()}`,
              role: "assistant",
              content: event.message,
              node: event.node,
              timestamp: Date.now(),
            });
          }
          if (event.node && event.node !== "supervisor") {
            setCompletedNodes((prev) =>
              prev.includes(event.node) ? prev : [...prev, event.node]
            );
          }
          currentNodeRef.current = "";
          setNodeStatus("");
          break;

        case "action_proposal":
          if (event.proposal) {
            setActionProposal({
              proposal: event.proposal,
              next_node: event.next_node || "",
              action_type: event.action_type || "write",
            });
          }
          break;

        case "interrupt":
          setIsInterrupted(true);
          setIsStreaming(false);
          setInterrupt({
            thread_id: event.thread_id,
            node: event.node,
            question: event.question,
            action_proposal: event.action_proposal,
          });
          break;

        case "db_updated":
          setDbUpdatedAt(Date.now());
          onDbUpdated?.(event.node);
          break;

        case "cancelled":
          setActionProposal(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: "system",
              content: event.message || "عملیات لغو شد. هر زمان که آماده بودی، دوباره بگو.",
              node: "system",
              timestamp: Date.now(),
            },
          ]);
          break;

        case "done":
          if (event.thread_id) {
            setThreadId(event.thread_id);
            threadIdRef.current = event.thread_id;
          }
          // Flush any remaining token buffer
          if (tokenBufRef.current) {
            _addMessage({
              id: `ai-done-${Date.now()}`,
              role: "assistant",
              content: tokenBufRef.current,
              node: currentNodeRef.current || "answer",
              timestamp: Date.now(),
            });
          }
          setActionProposal(null);
          onDone?.(event.thread_id);
          break;

        case "error":
          setError(event.message || "Unknown agent error");
          break;

        default:
          break;
      }
    },
    [_addMessage, onDone, onNodeChange, onDbUpdated]
  );

  // ── Generic SSE reader (shared by send + resume) ──────────────────────────

  const _consumeStream = useCallback(
    async (resp: Response, signal: AbortSignal) => {
      if (!resp.body) throw new Error("No response body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            _handleEvent(JSON.parse(raw));
          } catch {}
        }
      }
    },
    [_handleEvent]
  );

  // ── send ──────────────────────────────────────────────────────────────────

  const send = useCallback(
    async (userMessage: string, overrideThreadId?: string) => {
      if (isStreaming) return;

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setIsStreaming(true);
      setIsInterrupted(false);
      setInterrupt(null);
      setError(null);
      setActionProposal(null);
      tokenBufRef.current = "";
      setTokenBuffer("");

      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const useThreadId = overrideThreadId || threadIdRef.current;

      try {
        const resp = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            user_message: userMessage,
            thread_id: useThreadId,
            current_stage: currentStage,
          }),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${resp.status}`);
        }

        const tid = resp.headers.get("X-Thread-ID");
        if (tid) {
          setThreadId(tid);
          threadIdRef.current = tid;
        }

        await _consumeStream(resp, ctrl.signal);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Agent connection error");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, projectId, currentStage, _consumeStream]
  );

  // ── resume ────────────────────────────────────────────────────────────────

  const resume = useCallback(
    async (approved: boolean) => {
      if (!interrupt?.thread_id) return;

      const currentThreadId = interrupt.thread_id;
      setIsInterrupted(false);
      setInterrupt(null);
      setActionProposal(null);

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Always call the backend — even for rejection — so the LangGraph
      // checkpoint is explicitly resolved and the thread does not stay wedged.
      setIsStreaming(true);
      setError(null);
      tokenBufRef.current = "";
      setTokenBuffer("");

      try {
        const resp = await fetch("/api/agent/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: currentThreadId,
            project_id: projectId,
            approved,
          }),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${resp.status}`);
        }

        await _consumeStream(resp, ctrl.signal);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Resume failed");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [interrupt, projectId, _consumeStream]
  );

  // ── clearMessages / resetSession ──────────────────────────────────────────

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTokenBuffer("");
    setError(null);
    setActionProposal(null);
    setCompletedNodes([]);
    setNodeStatus("");
    tokenBufRef.current = "";
    currentNodeRef.current = "";
  }, []);

  const resetSession = useCallback(() => {
    clearSession(projectId);
    setThreadId(null);
    threadIdRef.current = null;
    clearMessages();
  }, [projectId, clearMessages]);

  return {
    messages,
    tokenBuffer,
    nodeStatus,
    completedNodes,
    isStreaming,
    isInterrupted,
    interrupt,
    actionProposal,
    threadId,
    error,
    dbUpdatedAt,
    send,
    resume,
    clearMessages,
    resetSession,
  };
}
