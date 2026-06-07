"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Bell, Megaphone, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  icon: string | null;
  priority: string | null;
  isRead: boolean;
  createdAt: string;
}

const iconMap: Record<string, React.ReactNode> = {
  Megaphone: <Megaphone className="w-3.5 h-3.5" />,
  CheckCircle2: <CheckCircle2 className="w-3.5 h-3.5" />,
  AlertTriangle: <AlertTriangle className="w-3.5 h-3.5" />,
  Zap: <Zap className="w-3.5 h-3.5" />,
};

const priorityDot = (p: string | null) => {
  if (p === "high") return "bg-destructive";
  if (p === "normal") return "bg-primary";
  return "bg-muted-foreground";
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/announcements");
    if (res.ok) {
      const d = await res.json();
      setItems(d.announcements || []);
      setUnreadCount(d.unreadCount || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 60000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: number) => {
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId: id }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const markAllRead = async () => {
    await Promise.all(
      items
        .filter((i) => !i.isRead)
        .map((i) =>
          fetch("/api/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ announcementId: i.id }),
          })
        )
    );
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchItems(); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">اطلاعیه‌ها</span>
          {unreadCount > 0 && (
            <button
              className="text-[11px] text-primary hover:underline"
              onClick={markAllRead}
            >
              همه رو خونده‌ها
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              هیچ اطلاعیه‌ای وجود ندارد
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-2 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50",
                  !item.isRead && "bg-primary/5"
                )}
                onClick={() => {
                  if (!item.isRead) markRead(item.id);
                }}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    priorityDot(item.priority)
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {iconMap[item.icon || "Megaphone"] || iconMap.Megaphone}
                    <span className="text-xs font-semibold truncate">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {item.body}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("fa-IR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {!item.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
