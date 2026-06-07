"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Megaphone, RefreshCw, Trash2, Edit2, Plus, Loader2, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  body: string;
  icon: string | null;
  priority: string | null;
  active: boolean | null;
  createdAt: string;
  updatedAt: string | null;
}

interface Props {
  onRefresh?: () => void;
}

export function AdminAnnouncements({ onRefresh }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("Megaphone");
  const [priority, setPriority] = useState("normal");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    if (res.ok) {
      const d = await res.json();
      setItems(d.announcements || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openNew = () => {
    setEditItem(null);
    setTitle("");
    setBody("");
    setIcon("Megaphone");
    setPriority("normal");
    setActive(true);
    setShowDialog(true);
  };

  const openEdit = (item: Announcement) => {
    setEditItem(item);
    setTitle(item.title);
    setBody(item.body);
    setIcon(item.icon || "Megaphone");
    setPriority(item.priority || "normal");
    setActive(item.active ?? true);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const payload = { title, body, icon, priority, active };
    const url = editItem ? `/api/admin/announcements/${editItem.id}` : "/api/admin/announcements";
    const method = editItem ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowDialog(false);
      await fetchAnnouncements();
      onRefresh?.();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/announcements/${deleteItem.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteItem(null);
      await fetchAnnouncements();
      onRefresh?.();
    }
    setDeleting(false);
  };

  const iconMap: Record<string, React.ReactNode> = {
    Megaphone: <Megaphone className="w-4 h-4" />,
    CheckCircle2: <CheckCircle2 className="w-4 h-4" />,
    AlertTriangle: <AlertTriangle className="w-4 h-4" />,
    Zap: <Zap className="w-4 h-4" />,
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "bg-destructive/10 text-destructive";
    if (p === "normal") return "bg-primary/10 text-primary";
    return "bg-muted text-muted-foreground";
  };

  const priorityLabel = (p: string) => {
    if (p === "high") return "مهم";
    if (p === "normal") return "عادی";
    return "کم";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">اطلاعیه‌ها</h3>
          <Badge variant="secondary" className="text-[10px]">{items.length} اطلاعیه</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnnouncements} disabled={loading} className="gap-1.5 h-8 text-xs">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            بارگزاری
          </Button>
          <Button variant="aiGenerate" size="sm" onClick={openNew} className="gap-1.5 h-8 text-xs">
            <Plus className="w-3 h-3" />
            جدید
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          هیچ اطلاعیه‌ای ثبت نشده
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className={cn("border-card-border", !item.active && "opacity-50")}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", priorityColor(item.priority || "normal"))}>
                  {iconMap[item.icon || "Megaphone"] || iconMap.Megaphone}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <Badge variant="outline" className={cn("text-[10px] h-5", priorityColor(item.priority || "normal"))}>
                      {priorityLabel(item.priority || "normal")}
                    </Badge>
                    {!item.active && <Badge variant="secondary" className="text-[10px] h-5">غیرفعال</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.body}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 w-7 p-0">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteItem(item)} className="h-7 w-7 p-0 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => !v && setShowDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "ویرایش اطلاعیه" : "اطلاعیه جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان اطلاعیه" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="متن اطلاعیه..." value={body} onChange={e => setBody(e.target.value)} rows={4} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="آیکون" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Megaphone">Megaphone</SelectItem>
                  <SelectItem value="CheckCircle2">CheckCircle2</SelectItem>
                  <SelectItem value="AlertTriangle">AlertTriangle</SelectItem>
                  <SelectItem value="Zap">Zap</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اولویت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">کم</SelectItem>
                  <SelectItem value="normal">عادی</SelectItem>
                  <SelectItem value="high">مهم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-xs text-muted-foreground">فعال</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              لغو
            </Button>
            <Button variant="aiGenerate" onClick={handleSave} disabled={saving || !title.trim() || !body.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editItem ? "ذخیره" : "ایجاد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      {deleteItem && (
        <Dialog open onOpenChange={() => setDeleteItem(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                حذف اطلاعیه
              </DialogTitle>
              <p className="text-sm text-muted-foreground">اطلاعیه «{deleteItem.title}» حذف می‌شود. این عمل غیرقابل بازگشت است.</p>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>لغو</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
