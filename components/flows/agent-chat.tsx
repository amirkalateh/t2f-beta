"use client";

/**
 * AgentChat — a fully alive, context-aware AI filmmaking assistant.
 *
 * Features:
 *  - Session persistence (localStorage) — survives page reloads
 *  - Live token streaming with blinking cursor
 *  - Thinking animation between node transitions
 *  - Action proposal cards (agent shows plan BEFORE writing anything)
 *  - Confirmation gate — user must approve all DB writes
 *  - Instant UI sync on db_updated events
 *  - Node progress timeline
 *  - Markdown-style rich text rendering
 *  - RTL Persian interface
 */

import { useEffect, useRef, useState } from "react";
import {
  Send, Loader2, Zap, ChevronRight, CheckCircle, XCircle,
  RotateCcw, Sparkles, Film, BookOpen, Camera, Clapperboard,
  Wand2, Video, AlertTriangle, Scissors, MessageSquare, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAgentStream, AgentMessage, AgentInterrupt, ActionProposal } from "@/hooks/useAgentStream";
import { useQueryClient } from "@tanstack/react-query";

// ── Node metadata ─────────────────────────────────────────────────────────────

const NODE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  supervisor:      { label: "ارزیابی",       icon: Sparkles,      color: "text-violet-300", bg: "bg-violet-500/20 border-violet-500/30" },
  narrative:       { label: "روایت",          icon: BookOpen,      color: "text-blue-300",   bg: "bg-blue-500/20 border-blue-500/30" },
  director_brief:  { label: "بریف کارگردانی", icon: Film,          color: "text-amber-300",  bg: "bg-amber-500/20 border-amber-500/30" },
  shot_breakdown:  { label: "شات‌لیست",        icon: Clapperboard,  color: "text-green-300",  bg: "bg-green-500/20 border-green-500/30" },
  prompt_builder:  { label: "پرامپت‌ساز",      icon: Wand2,         color: "text-cyan-300",   bg: "bg-cyan-500/20 border-cyan-500/30" },
  kling_image:     { label: "تصویرسازی",       icon: Camera,        color: "text-pink-300",   bg: "bg-pink-500/20 border-pink-500/30" },
  kling_video:     { label: "ویدیوسازی",       icon: Video,         color: "text-red-300",    bg: "bg-red-500/20 border-red-500/30" },
  continuity_check:{ label: "کنتینیوتی",       icon: AlertTriangle, color: "text-orange-300", bg: "bg-orange-500/20 border-orange-500/30" },
  assembly_advice: { label: "تدوین",           icon: Scissors,      color: "text-teal-300",   bg: "bg-teal-500/20 border-teal-500/30" },
  answer:          { label: "پاسخ",            icon: MessageSquare, color: "text-slate-300",  bg: "bg-slate-500/20 border-slate-500/30" },
  human_feedback:  { label: "بازبینی",         icon: CheckCircle,   color: "text-yellow-300", bg: "bg-yellow-500/20 border-yellow-500/30" },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  write:    "نوشتن در پروژه",
  generate: "تولید با هوش مصنوعی",
  analyze:  "بررسی و تحلیل",
  answer:   "پاسخ",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NodeBadge({ node, pulse }: { node: string; pulse?: boolean }) {
  const meta = NODE_META[node];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border font-mono",
      meta.bg, meta.color,
      pulse && "animate-pulse"
    )}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <span className="agent-dot w-1.5 h-1.5 rounded-full bg-violet-400 block" />
      <span className="agent-dot w-1.5 h-1.5 rounded-full bg-violet-400 block" />
      <span className="agent-dot w-1.5 h-1.5 rounded-full bg-violet-400 block" />
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    // List items
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-violet-400 flex-shrink-0 mt-0.5">•</span>
          <span>{parts}</span>
        </div>
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      return <div key={i} className="my-0.5 pr-1">{parts}</div>;
    }
    // Heading-like lines with ##
    if (line.trim().startsWith("## ")) {
      return <div key={i} className="font-semibold text-violet-200 mt-2 mb-1">{line.trim().slice(3)}</div>;
    }
    // Empty line = spacer
    if (!line.trim()) {
      return <div key={i} className="h-2" />;
    }
    return <div key={i}>{parts}</div>;
  });
}

function MessageBubble({ message, isStreaming }: { message: AgentMessage; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-500 italic bg-white/5 px-3 py-1 rounded-full border border-white/10">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xs text-white font-bold shadow-lg">
          AI
        </div>
      )}
      <div className={cn("max-w-[88%] space-y-1.5 min-w-0")}>
        {!isUser && message.node && message.node !== "system" && NODE_META[message.node] && (
          <div className="flex items-center gap-1">
            <NodeBadge node={message.node} />
          </div>
        )}
        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-violet-600 text-white rounded-tr-none shadow-md"
              : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none",
          )}
          dir="rtl"
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <div className="space-y-0.5">
              {renderMarkdown(message.content)}
              {isStreaming && (
                <span className="agent-cursor inline-block w-0.5 h-4 bg-violet-400 mr-0.5 align-middle" />
              )}
            </div>
          )}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold">
          تو
        </div>
      )}
    </div>
  );
}

function ActionProposalBanner({ proposal }: { proposal: ActionProposal }) {
  const actionLabel = ACTION_TYPE_LABELS[proposal.action_type] || "عملیات";
  const nodeInfo = NODE_META[proposal.next_node];

  return (
    <div className="mx-3 mb-2 p-3 rounded-lg border border-violet-500/30 bg-violet-500/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0" dir="rtl">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-medium text-violet-300">برنامه عملیاتی</span>
            {nodeInfo && <NodeBadge node={proposal.next_node} />}
            <span className="text-xs text-slate-400">{actionLabel}</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{proposal.proposal}</p>
        </div>
      </div>
    </div>
  );
}

function ConfirmCard({
  interrupt,
  actionProposal,
  onApprove,
  onReject,
}: {
  interrupt: AgentInterrupt;
  actionProposal: ActionProposal | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const nodeInfo = NODE_META[interrupt.node];
  const Icon = nodeInfo?.icon || Zap;

  const proposal = actionProposal?.proposal || interrupt.action_proposal || interrupt.question;

  return (
    <div className="mx-3 mb-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-start gap-2.5 mb-3" dir="rtl">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Icon className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-amber-200">تأیید عملیات</span>
            {nodeInfo && <NodeBadge node={interrupt.node} />}
          </div>
          <p className="text-sm text-amber-100/80 leading-relaxed">{proposal}</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-400 hover:text-white gap-1.5 h-8"
          onClick={onReject}
        >
          <XCircle className="h-3.5 w-3.5" />
          لغو
        </Button>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5 h-8 shadow-md"
          onClick={onApprove}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          تأیید و اجرا
        </Button>
      </div>
    </div>
  );
}

function DbUpdatedToast({ at }: { at: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!at) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [at]);

  if (!visible) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 bg-green-900/90 border border-green-500/40 text-green-300 text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
        <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: "1s", animationIterationCount: 1 }} />
        تغییرات در پروژه ذخیره شد
      </div>
    </div>
  );
}

// ── Suggested prompts for empty state ────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "ایده‌ام رو بهم کمک کن گسترش بدی",
  "بریف کارگردانی بنویس",
  "شات‌لیست بساز",
  "استایل بصری فیلمم چی باشه؟",
];

// ── Main component ────────────────────────────────────────────────────────────

interface AgentChatProps {
  projectId: number;
  currentStage?: string;
  className?: string;
  onRefreshProject?: () => void;
}

export function AgentChat({ projectId, currentStage = "narrative", className, onRefreshProject }: AgentChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const {
    messages,
    tokenBuffer,
    nodeStatus,
    completedNodes,
    isStreaming,
    isInterrupted,
    interrupt,
    actionProposal,
    error,
    dbUpdatedAt,
    send,
    resume,
    clearMessages,
    resetSession,
    threadId,
  } = useAgentStream({
    projectId,
    currentStage,
    onDone: (tid) => {
      onRefreshProject?.();
    },
    onDbUpdated: (node) => {
      // Instantly invalidate React Query caches so project UI updates
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["shots", projectId] });
      queryClient.invalidateQueries({ queryKey: ["narrative", projectId] });
      queryClient.invalidateQueries({ queryKey: ["director_brief", projectId] });
      onRefreshProject?.();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tokenBuffer, isInterrupted, actionProposal]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming || isInterrupted) return;
    setInput("");
    send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggest = (prompt: string) => {
    if (isStreaming || isInterrupted) return;
    send(prompt);
  };

  const isThinking = isStreaming && !tokenBuffer && !nodeStatus;
  const hasSession = messages.length > 0 && threadId;

  return (
    <div className={cn("flex flex-col h-full bg-black/20 rounded-xl border border-white/10 relative overflow-hidden", className)}>
      <DbUpdatedToast at={dbUpdatedAt} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white" dir="rtl">دستیار هوشمند فیلم‌سازی</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active node indicator */}
          {nodeStatus && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
              <NodeBadge node={nodeStatus} pulse />
            </div>
          )}
          {/* Reset session button */}
          {hasSession && !isStreaming && (
            <button
              onClick={resetSession}
              title="شروع مکالمه جدید"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Completed nodes mini-timeline ──────────────────────────────────── */}
      {completedNodes.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5 flex-wrap flex-shrink-0">
          {completedNodes.map((node, i) => (
            <div key={node} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                NODE_META[node]?.color || "text-slate-400",
              )}>
                {NODE_META[node]?.label || node}
              </span>
            </div>
          ))}
          {isStreaming && nodeStatus && (
            <>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <NodeBadge node={nodeStatus} pulse />
            </>
          )}
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {/* Empty state */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-purple-700/30 border border-violet-500/20 flex items-center justify-center">
              <Film className="h-7 w-7 text-violet-400" />
            </div>
            <div dir="rtl">
              <p className="text-sm font-medium text-slate-300 mb-1">آماده کمک به پروژه‌ات هستم</p>
              <p className="text-xs text-slate-500">
                از ایده تا شات‌لیست و تصویرسازی،<br />
                مثل یک همکار حرفه‌ای کنارت هستم.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggest(prompt)}
                  className="text-xs text-right px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                  dir="rtl"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Live streaming token buffer */}
        {tokenBuffer && (
          <MessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: tokenBuffer,
              node: nodeStatus,
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

        {/* Thinking dots — agent is processing but hasn't emitted tokens yet */}
        {isThinking && (
          <div className="flex gap-2 mb-4">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xs text-white font-bold">
              AI
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-none px-3 py-2">
              <ThinkingDots />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-2 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2" dir="rtl">
            <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Action proposal banner (shown before interrupt) ─────────────────── */}
      {actionProposal && !isInterrupted && (
        <ActionProposalBanner proposal={actionProposal} />
      )}

      {/* ── Confirmation gate (human-in-the-loop interrupt) ──────────────────── */}
      {isInterrupted && interrupt && (
        <ConfirmCard
          interrupt={interrupt}
          actionProposal={actionProposal}
          onApprove={() => resume(true)}
          onReject={() => resume(false)}
        />
      )}

      {/* ── Input area ──────────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInterrupted
                ? "لطفاً تأیید یا لغو کنید..."
                : isStreaming
                ? "دارم کار می‌کنم..."
                : "پیامت رو بنویس…"
            }
            className={cn(
              "flex-1 min-h-[44px] max-h-[120px] resize-none bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm transition-all",
              (isStreaming || isInterrupted) && "opacity-50"
            )}
            dir="rtl"
            disabled={isStreaming || isInterrupted}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isStreaming || isInterrupted || !input.trim()}
            className={cn(
              "h-11 w-11 flex-shrink-0 transition-all",
              isStreaming
                ? "bg-slate-700 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-500 hover:scale-105 shadow-md"
            )}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Send className="h-4 w-4 rotate-180" />
            )}
          </Button>
        </div>
        {isStreaming && nodeStatus && (
          <div className="flex items-center gap-1.5 mt-1.5 justify-end" dir="rtl">
            <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
            <span className="text-xs text-slate-500">
              در حال {NODE_META[nodeStatus]?.label || nodeStatus}...
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
