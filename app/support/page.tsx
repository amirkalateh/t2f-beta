"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MegaNav } from "@/components/layout/mega-nav";
import {
  Ticket,
  Send,
  Plus,
  MessageCircle,
  CheckCircle2,
  User,
  Shield,
  X,
  RefreshCw,
  Lock,
  Headphones,
  ChevronLeft,
} from "lucide-react";

interface TicketItem {
  id: number;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

interface MessageItem {
  id: number;
  body: string;
  authorId: string;
  username: string | null;
  createdAt: string;
}

export default function SupportPage() {
  const { user, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // New ticket dialog
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async (silent = false) => {
    if (silent) setRefreshing(true);
    const res = await fetch("/api/tickets");
    if (res.ok) {
      const data = await res.json();
      setTickets(data.tickets || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const fetchMessages = async (ticketId: number) => {
    const res = await fetch(`/api/tickets/${ticketId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  };

  const handleCreate = async () => {
    if (!newSubject.trim() || !newBody.trim()) return;
    setCreating(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject.trim(), body: newBody.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewSubject("");
      setNewBody("");
      setShowNew(false);
      const newTicket = data.ticket;
      setTickets(prev => [newTicket, ...prev]);
      setSelectedTicket(newTicket);
      await fetchMessages(newTicket.id);
    }
    setCreating(false);
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(prev => [...prev, { ...data.message, username: user?.username ?? null }]);
      setReply("");
      setTickets(prev =>
        prev.map(t => t.id === selectedTicket.id ? { ...t, updatedAt: new Date().toISOString() } : t)
      );
    }
    setSending(false);
  };

  useEffect(() => {
    if (isAuthenticated) fetchTickets();
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedTicket) fetchMessages(selectedTicket.id);
    else setMessages([]);
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <div className="text-center">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground">برای دسترسی به پشتیبانی وارد حساب کاربری شوید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <MegaNav />
      <div className="pt-14 container py-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">پشتیبانی</h1>
            <p className="text-sm text-muted-foreground">{tickets.length} تیکت · معمولاً در کمتر از ۲۴ ساعت پاسخ می‌دهیم</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTickets(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            تیکت جدید
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[500px]">
          {/* Ticket list sidebar */}
          <div className="w-72 shrink-0 flex flex-col gap-2">
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl p-6">
                  <Ticket className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">هنوز تیکتی ندارید</p>
                  <p className="text-xs mt-1 mb-4">اولین تیکت پشتیبانی خود را ایجاد کنید</p>
                  <Button size="sm" onClick={() => setShowNew(true)} className="gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    تیکت جدید
                  </Button>
                </div>
              ) : (
                tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={cn(
                      "w-full text-right p-3 rounded-xl border transition-all",
                      selectedTicket?.id === t.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm leading-snug line-clamp-2">{t.subject}</span>
                      {t.status === "open" ? (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-green-500 mt-1" />
                      ) : (
                        <CheckCircle2 className="shrink-0 w-4 h-4 text-muted-foreground/60 mt-0.5" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        t.status === "open" ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                      )}>
                        {t.status === "open" ? "باز" : "بسته"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(t.updatedAt || t.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat pane */}
          {selectedTicket ? (
            <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-card">
              {/* Ticket header */}
              <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/20">
                <div>
                  <h3 className="font-semibold text-sm">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      selectedTicket.status === "open"
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {selectedTicket.status === "open" ? "باز" : "بسته"}
                    </span>
                    <span className="text-xs text-muted-foreground">تیکت #{selectedTicket.id}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setSelectedTicket(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">در انتظار پاسخ پشتیبانی...</p>
                    <p className="text-xs mt-1 opacity-70">معمولاً ظرف ۲۴ ساعت پاسخ می‌دهیم</p>
                  </div>
                ) : (
                  [...messages].reverse().map(m => {
                    const isMe = m.authorId === user.id;
                    return (
                      <div key={m.id} className={cn("flex", isMe ? "justify-start" : "justify-end")}>
                        <div className={cn("flex gap-2 max-w-[80%]", isMe ? "flex-row" : "flex-row-reverse")}>
                          {/* Avatar */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                            isMe
                              ? "bg-amber-500 text-amber-950"
                              : "bg-emerald-500 text-white"
                          )}>
                            {isMe ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </div>
                          {/* Bubble */}
                          <div className={cn(
                            "rounded-2xl px-4 py-3 text-sm max-w-[calc(100%-2.5rem)]",
                            isMe
                              ? "bg-amber-400 text-amber-950 rounded-tl-sm shadow-lg shadow-amber-400/30"
                              : "bg-emerald-500 text-white rounded-tr-sm shadow-lg shadow-emerald-500/30"
                          )}>
                            {/* Header row */}
                            <div className={cn("flex items-center gap-2 mb-1.5", isMe ? "justify-start" : "justify-end")}>
                              <span className={cn("text-xs font-bold", isMe ? "text-amber-950/80" : "text-white/90")}>
                                {isMe ? "شما" : "پشتیبانی Tex2Film"}
                              </span>
                              <span className={cn("text-[10px]", isMe ? "text-amber-950/60" : "text-white/60")}>
                                {new Date(m.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="border-t p-3 bg-muted/10">
                {selectedTicket.status === "closed" ? (
                  <div className="text-center text-sm text-muted-foreground py-2 flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    این تیکت بسته شده است. برای مشکل جدید یک تیکت جدید باز کنید.
                    <Button size="sm" variant="outline" onClick={() => setShowNew(true)} className="gap-1.5 h-7 text-xs">
                      <Plus className="w-3 h-3" />
                      تیکت جدید
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <Textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="پیام خود را بنویسید..."
                      dir="rtl"
                      rows={2}
                      className="flex-1 resize-none text-sm bg-background"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply();
                      }}
                    />
                    <Button
                      onClick={handleReply}
                      disabled={sending || !reply.trim()}
                      className="shrink-0 self-end"
                      title="Ctrl+Enter برای ارسال"
                    >
                      {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground">
              <Ticket className="w-12 h-12 mb-3 opacity-25" />
              <p className="text-sm font-medium">یک تیکت انتخاب کنید</p>
              <p className="text-xs mt-1 opacity-70">یا یک تیکت جدید ایجاد کنید</p>
            </div>
          )}
        </div>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={showNew} onOpenChange={open => { if (!open) setShowNew(false); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              تیکت پشتیبانی جدید
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">عنوان مشکل</label>
              <Input
                placeholder="مثال: مشکل در تولید ویدیو"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                dir="rtl"
                maxLength={150}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">توضیحات</label>
              <Textarea
                placeholder="مشکل را با جزئیات کامل شرح دهید..."
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                dir="rtl"
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
              <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>پس از ارسال تیکت، تیم پشتیبانی Tex2Film معمولاً ظرف ۲۴ ساعت پاسخ می‌دهد. می‌توانید پیشرفت تیکت را از همین صفحه دنبال کنید.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setNewSubject(""); setNewBody(""); }}>
              انصراف
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newSubject.trim() || !newBody.trim()}
              className="gap-2"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ارسال تیکت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
