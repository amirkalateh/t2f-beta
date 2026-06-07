"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AudioPlayer, ImagePreview, VideoPlayer, TextPreview } from "@/components/admin/media-preview";
import { AdminAnnouncements } from "@/components/admin/admin-announcements";
import {
  Users,
  Folder,
  ToggleRight,
  Ticket,
  Send,
  Trash2,
  Search,
  CheckCircle2,
  MessageCircle,
  Shield,
  AlertTriangle,
  Edit2,
  RefreshCw,
  Crown,
  User,
  Mail,
  CreditCard,
  Lock,
  BarChart2,
  Film,
  Music,
  Volume2,
  Mic,
  Activity,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Eye,
  Key,
  Check,
  X,
  Zap,
  Database,
  ClipboardList,
  ImageIcon,
  VideoIcon,
  Clock,
  TrendingUp,
  Globe,
  Settings2,
  Save,
  Pencil,
  Wand2,
  Headphones,
  Plus,
  Megaphone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserItem {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  tier: string;
  credits: number;
  isAdmin: boolean;
  createdAt: string;
}

interface ProjectItem {
  id: number;
  title: string;
  currentStage: string;
  description: string | null;
  aspectRatio: string | null;
  progress: number | null;
  thumbnailUrl: string | null;
  username: string | null;
  displayName: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string | null;
  shotCount: number;
  audioCount: number;
  assembly: { status: string | null; exportUrl: string | null } | null;
}

interface ProjectDetail {
  project: ProjectItem;
  owner: { username: string; displayName: string | null; email: string | null; tier: string } | null;
  narrative: { idea: string | null; logline: string | null; script: string | null } | null;
  shots: Array<{
    id: number;
    order: number;
    title: string;
    shotType: string | null;
    status: string | null;
    duration: number | null;
    generatedImageUrl: string | null;
    generatedVideoUrl: string | null;
    sceneNumber: number | null;
  }>;
  shotStats: { total: number; generated: number; withVideo: number; draft: number };
  audio: Array<{ id: number; name: string; type: string | null; duration: number | null; url: string | null; createdAt: string }>;
  audioStats: { total: number; music: number; sfx: number; dialogue: number };
  assembly: { status: string | null; exportUrl: string | null } | null;
  visionBoard: Record<string, unknown> | null;
}

interface FlagItem {
  key: string;
  enabled: boolean;
  label: string | null;
}

interface TicketItem {
  id: number;
  subject: string;
  status: string;
  username: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string | null;
}

interface MessageItem {
  id: number;
  body: string;
  username: string | null;
  authorId: string;
  createdAt: string;
}

interface UsageLogItem {
  id: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  action: string;
  creditsUsed: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface StatsData {
  users: { total: number; byTier: Record<string, number> };
  projects: { total: number; byStage: Record<string, number> };
  shots: { total: number };
  audio: { total: number };
  tickets: { open: number; total: number };
  credits: { today: number };
  agents: { byStatus: Record<string, number> };
  assemblies: { byStatus: Record<string, number> };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  narrative: "داستان",
  director_brief: "بریف کارگردان",
  vision: "ویژن",
  storyboard: "استوری‌بورد",
  assembly: "مونتاژ",
  export: "خروجی",
};

const STAGE_COLORS: Record<string, string> = {
  narrative: "bg-blue-500/15 text-blue-600",
  director_brief: "bg-purple-500/15 text-purple-600",
  vision: "bg-violet-500/15 text-violet-600",
  storyboard: "bg-amber-500/15 text-amber-600",
  assembly: "bg-orange-500/15 text-orange-600",
  export: "bg-green-500/15 text-green-600",
};

const TIER_LABELS: Record<string, string> = {
  free: "رایگان",
  pro: "حرفه‌ای",
  studio: "استودیو",
  unlimited: "بی‌نهایت",
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-zinc-500/15 text-zinc-500",
  pro: "bg-blue-500/15 text-blue-600",
  studio: "bg-violet-500/15 text-violet-600",
  unlimited: "bg-amber-500/15 text-amber-600",
};

const FLAG_LABELS: Record<string, { label: string; desc: string; group: string; icon?: string }> = {
  kling_image: { label: "تصویر Kling", desc: "تولید تصویر با Kling AI", group: "تصویر و ویدیو" },
  kling_video: { label: "ویدیو Kling", desc: "تولید ویدیو با Kling AI", group: "تصویر و ویدیو" },
  elevenlabs_tts: { label: "گویندگی TTS", desc: "متن به صدا با ElevenLabs", group: "صدا و موسیقی" },
  elevenlabs_sfx: { label: "افکت صوتی SFX", desc: "جلوه‌های صوتی با ElevenLabs", group: "صدا و موسیقی" },
  elevenlabs_music: { label: "موسیقی پس‌زمینه", desc: "تولید موسیقی با ElevenLabs", group: "صدا و موسیقی" },
  elevenlabs_dialogue: { label: "دیالوگ شخصیت", desc: "صدای دیالوگ با ElevenLabs", group: "صدا و موسیقی" },
};

const AUDIO_TYPE_COLORS: Record<string, string> = {
  music: "bg-amber-500/15 text-amber-600",
  sfx: "bg-rose-500/15 text-rose-600",
  dialogue: "bg-blue-500/15 text-blue-600",
  narration: "bg-emerald-500/15 text-emerald-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("fa-IR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtCredits(n: number) {
  return n === -1 ? "∞" : n.toLocaleString("fa-IR");
}

function initials(name: string) {
  return name.charAt(0).toUpperCase();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="p-4 flex items-start gap-3 group hover:shadow-md transition-shadow">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</div>}
      </div>
    </Card>
  );
}

// ─── User Avatar ─────────────────────────────────────────────────────────────

function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={cn("rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0", sz)}>
      {initials(name)}
    </div>
  );
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>لغو</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Data state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User tab state
  const [userSearch, setUserSearch] = useState("");
  const [userTierFilter, setUserTierFilter] = useState("all");
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editDraft, setEditDraft] = useState<{ displayName: string; email: string; tier: string; credits: number; isAdmin: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // Project tab state
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStageFilter, setProjectStageFilter] = useState("all");
  const [deleteProject, setDeleteProject] = useState<ProjectItem | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);

  // Tickets state
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "closed">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // System tab state
  const [logType, setLogType] = useState<"usage" | "agent">("usage");
  const [logsLoading, setLogsLoading] = useState(false);

  // Media preview state
  const [mediaPreview, setMediaPreview] = useState<{ open: boolean; type: "image" | "video" | "audio" | "text"; src: string; title?: string } | null>(null);

  // Shot CRUD state
  const [editingShot, setEditingShot] = useState<number | null>(null);
  const [editShotTitle, setEditShotTitle] = useState("");
  const [deleteShot, setDeleteShot] = useState<{ id: number; title: string } | null>(null);
  const [deletingShot, setDeletingShot] = useState(false);

  // Audio CRUD state
  const [editingAudio, setEditingAudio] = useState<number | null>(null);
  const [editAudioName, setEditAudioName] = useState("");
  const [deleteAudio, setDeleteAudio] = useState<{ id: number; name: string } | null>(null);
  const [deletingAudio, setDeletingAudio] = useState(false);

  // Narrative CRUD state
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrativeDraft, setNarrativeDraft] = useState<{ idea: string; logline: string; script: string } | null>(null);
  const [savingNarrative, setSavingNarrative] = useState(false);

  // Feature flags CRUD state
  const [showNewFlag, setShowNewFlag] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagLabel, setNewFlagLabel] = useState("");
  const [newFlagEnabled, setNewFlagEnabled] = useState(true);
  const [creatingFlag, setCreatingFlag] = useState(false);
  const [deleteFlag, setDeleteFlag] = useState<string | null>(null);
  const [deletingFlag, setDeletingFlag] = useState(false);

  // Ticket delete state
  const [deleteTicket, setDeleteTicket] = useState<TicketItem | null>(null);
  const [deletingTicket, setDeletingTicket] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [sRes, uRes, pRes, fRes, tRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/users"),
      fetch("/api/admin/projects"),
      fetch("/api/admin/feature-flags"),
      fetch("/api/admin/tickets"),
    ]);

    if (sRes.ok) { const d = await sRes.json(); setStats(d); }
    if (uRes.ok) { const d = await uRes.json(); setUsers(d.users || []); }
    if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects || []); }
    if (fRes.ok) { const d = await fRes.json(); setFlags(d.flags || []); }
    if (tRes.ok) { const d = await tRes.json(); setTickets(d.tickets || []); }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const fetchLogs = useCallback(async (type: "usage" | "agent") => {
    setLogsLoading(true);
    const res = await fetch(`/api/admin/usage-logs?type=${type}&limit=200`);
    if (res.ok) {
      const d = await res.json();
      setUsageLogs(d.logs || []);
    }
    setLogsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeTab === "system") fetchLogs(logType);
  }, [activeTab, logType, fetchLogs]);

  useEffect(() => {
    if (!selectedTicket) { setMessages([]); return; }
    fetch(`/api/admin/tickets/${selectedTicket.id}/messages`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMessages(d.messages || []); });
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── User CRUD ──────────────────────────────────────────────────────────────

  const openEditUser = (u: UserItem) => {
    setEditUser(u);
    setEditDraft({ displayName: u.displayName || "", email: u.email || "", tier: u.tier, credits: u.credits, isAdmin: u.isAdmin });
    setNewPassword("");
    setPasswordMsg(null);
  };

  const saveUser = async () => {
    if (!editUser || !editDraft) return;
    setSavingUser(true);
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      const d = await res.json();
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...d.user, isAdmin: d.user.isAdmin ?? d.user.is_admin } : u));
      setEditUser(null);
      setEditDraft(null);
    }
    setSavingUser(false);
  };

  const resetPassword = async () => {
    if (!editUser || !newPassword.trim()) return;
    setSavingUser(true);
    const res = await fetch(`/api/admin/users/${editUser.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const d = await res.json();
    setPasswordMsg(res.ok ? { ok: true, msg: "رمز عبور تغییر کرد" } : { ok: false, msg: d.error || "خطا" });
    if (res.ok) setNewPassword("");
    setSavingUser(false);
  };

  const confirmDeleteUser = async () => {
    if (!deleteUser) return;
    setDeletingUser(true);
    await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
    setDeleteUser(null);
    setDeletingUser(false);
  };

  // ── Project CRUD ───────────────────────────────────────────────────────────

  const openProjectDetail = async (p: ProjectItem) => {
    setProjectDetailOpen(true);
    setProjectDetailLoading(true);
    const res = await fetch(`/api/admin/projects/${p.id}/detail`);
    if (res.ok) {
      const d = await res.json();
      setProjectDetail(d);
    }
    setProjectDetailLoading(false);
  };

  const confirmDeleteProject = async () => {
    if (!deleteProject) return;
    setDeletingProject(true);
    await fetch(`/api/admin/projects/${deleteProject.id}`, { method: "DELETE" });
    setProjects(prev => prev.filter(p => p.id !== deleteProject.id));
    setDeleteProject(null);
    setDeletingProject(false);
  };

  // ── Media Preview ────────────────────────────────────────────────────────

  const openMediaPreview = (type: "image" | "video" | "audio" | "text", src: string, title?: string) => {
    setMediaPreview({ open: true, type, src, title });
  };

  // ── Shot CRUD ──────────────────────────────────────────────────────────────

  const startEditingShot = (s: ProjectDetail["shots"][0]) => {
    setEditingShot(s.id);
    setEditShotTitle(s.title);
  };

  const saveShotTitle = async (shotId: number) => {
    if (!projectDetail) return;
    const res = await fetch(`/api/admin/shots/${shotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editShotTitle }),
    });
    if (res.ok) {
      setProjectDetail(prev => prev ? {
        ...prev,
        shots: prev.shots.map(s => s.id === shotId ? { ...s, title: editShotTitle } : s),
      } : null);
    }
    setEditingShot(null);
    setEditShotTitle("");
  };

  const confirmDeleteShot = async () => {
    if (!deleteShot) return;
    setDeletingShot(true);
    const res = await fetch(`/api/admin/shots/${deleteShot.id}`, { method: "DELETE" });
    if (res.ok && projectDetail) {
      setProjectDetail(prev => prev ? {
        ...prev,
        shots: prev.shots.filter(s => s.id !== deleteShot.id),
        shotStats: {
          ...prev.shotStats,
          total: prev.shotStats.total - 1,
        },
      } : null);
    }
    setDeleteShot(null);
    setDeletingShot(false);
  };

  // ── Audio CRUD ───────────────────────────────────────────────────────────────

  const startEditingAudio = (track: ProjectDetail["audio"][0]) => {
    setEditingAudio(track.id);
    setEditAudioName(track.name);
  };

  const saveAudioName = async (trackId: number) => {
    if (!projectDetail) return;
    const res = await fetch(`/api/admin/audio-tracks/${trackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editAudioName }),
    });
    if (res.ok) {
      setProjectDetail(prev => prev ? {
        ...prev,
        audio: prev.audio.map(t => t.id === trackId ? { ...t, name: editAudioName } : t),
      } : null);
    }
    setEditingAudio(null);
    setEditAudioName("");
  };

  const confirmDeleteAudio = async () => {
    if (!deleteAudio) return;
    setDeletingAudio(true);
    const res = await fetch(`/api/admin/audio-tracks/${deleteAudio.id}`, { method: "DELETE" });
    if (res.ok && projectDetail) {
      setProjectDetail(prev => prev ? {
        ...prev,
        audio: prev.audio.filter(t => t.id !== deleteAudio.id),
        audioStats: {
          ...prev.audioStats,
          total: prev.audioStats.total - 1,
        },
      } : null);
    }
    setDeleteAudio(null);
    setDeletingAudio(false);
  };

  // ── Narrative CRUD ───────────────────────────────────────────────────────────

  const startEditingNarrative = () => {
    if (!projectDetail?.narrative) return;
    setNarrativeDraft({
      idea: projectDetail.narrative.idea || "",
      logline: projectDetail.narrative.logline || "",
      script: projectDetail.narrative.script || "",
    });
    setEditingNarrative(true);
  };

  const saveNarrative = async () => {
    if (!narrativeDraft || !projectDetail) return;
    setSavingNarrative(true);
    const res = await fetch(`/api/admin/narratives/${projectDetail.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(narrativeDraft),
    });
    if (res.ok) {
      const d = await res.json();
      setProjectDetail(prev => prev ? {
        ...prev,
        narrative: d.narrative,
      } : null);
      setEditingNarrative(false);
      setNarrativeDraft(null);
    }
    setSavingNarrative(false);
  };

  // ── Feature Flags ──────────────────────────────────────────────────────────

  const toggleFlag = async (key: string, enabled: boolean) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f));
    await fetch("/api/admin/feature-flags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
  };

  // ── Tickets ────────────────────────────────────────────────────────────────

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSendingReply(true);
    const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply.trim() }),
    });
    if (res.ok) {
      const d = await res.json();
      setMessages(prev => [...prev, { ...d.message, username: currentUser?.username ?? "admin" }]);
      setReply("");
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: "open", updatedAt: new Date().toISOString() } : t));
    }
    setSendingReply(false);
  };

  const changeTicketStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selectedTicket?.id === id) setSelectedTicket(prev => prev ? { ...prev, status } : null);
  };

  const confirmDeleteTicket = async () => {
    if (!deleteTicket) return;
    setDeletingTicket(true);
    const res = await fetch(`/api/admin/tickets/${deleteTicket.id}`, { method: "DELETE" });
    if (res.ok) {
      setTickets(prev => prev.filter(t => t.id !== deleteTicket.id));
      if (selectedTicket?.id === deleteTicket.id) setSelectedTicket(null);
      setDeleteTicket(null);
    } else {
      alert("حذف تیکت با خطا مواجه شد.");
    }
    setDeletingTicket(false);
  };

  // ── Feature Flags CRUD ──────────────────────────────────────────────────────────────

  const createFlag = async () => {
    if (!newFlagKey.trim()) return;
    setCreatingFlag(true);
    const res = await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newFlagKey.trim(), enabled: newFlagEnabled, label: newFlagLabel.trim() || null }),
    });
    if (res.ok) {
      const d = await res.json();
      setFlags(prev => {
        const exists = prev.find(f => f.key === d.flag.key);
        if (exists) return prev.map(f => f.key === d.flag.key ? d.flag : f);
        return [...prev, d.flag];
      });
      setShowNewFlag(false);
      setNewFlagKey("");
      setNewFlagLabel("");
      setNewFlagEnabled(true);
    } else {
      alert("ساخت پرچم با خطا مواجه شد.");
    }
    setCreatingFlag(false);
  };

  const confirmDeleteFlag = async () => {
    if (!deleteFlag) return;
    setDeletingFlag(true);
    const res = await fetch(`/api/admin/feature-flags?key=${encodeURIComponent(deleteFlag)}`, { method: "DELETE" });
    if (res.ok) {
      setFlags(prev => prev.filter(f => f.key !== deleteFlag));
      setDeleteFlag(null);
    } else {
      alert("حذف پرچم با خطا مواجه شد.");
    }
    setDeletingFlag(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchSearch = !q || u.username.toLowerCase().includes(q) || (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    const matchTier = userTierFilter === "all" || u.tier === userTierFilter;
    return matchSearch && matchTier;
  });

  const filteredProjects = projects.filter(p => {
    const q = projectSearch.toLowerCase();
    const matchSearch = !q || (p.title || "").toLowerCase().includes(q) || (p.username || "").toLowerCase().includes(q) || (p.displayName || "").toLowerCase().includes(q);
    const matchStage = projectStageFilter === "all" || p.currentStage === projectStageFilter;
    return matchSearch && matchStage;
  });

  const filteredTickets = tickets.filter(t => ticketFilter === "all" || t.status === ticketFilter);

  const flagGroups = Object.entries(FLAG_LABELS).reduce<Record<string, string[]>>((acc, [key, info]) => {
    if (!acc[info.group]) acc[info.group] = [];
    acc[info.group].push(key);
    return acc;
  }, {});

  const openCount = tickets.filter(t => t.status === "open").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">در حال بارگزاری پنل مدیریت...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">پنل مدیریت سیستم</h1>
            <p className="text-sm text-muted-foreground">
              {users.length} کاربر · {projects.length} پروژه · {openCount} تیکت باز
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          به‌روزرسانی
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 h-10 flex-wrap gap-0.5">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BarChart2 className="w-3.5 h-3.5" />
            نمای کلی
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            کاربران
            <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px]">{users.length}</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5 text-xs">
            <Folder className="w-3.5 h-3.5" />
            پروژه‌ها
            <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px]">{projects.length}</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-1.5 text-xs">
            <Settings2 className="w-3.5 h-3.5" />
            مدل‌های AI
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5 text-xs">
            <Ticket className="w-3.5 h-3.5" />
            پشتیبانی
            {openCount > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[10px]">{openCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 text-xs">
            <Database className="w-3.5 h-3.5" />
            سیستم
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1.5 text-xs">
            <Megaphone className="w-3.5 h-3.5" />
            اطلاعیه‌ها
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stat cards row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="کاربران"
              value={stats?.users.total ?? users.length}
              sub={`${stats?.users.byTier?.unlimited ?? 0} بی‌نهایت · ${stats?.users.byTier?.pro ?? 0} حرفه‌ای`}
              icon={Users}
              color="bg-blue-500/10 text-blue-500"
            />
            <StatCard
              label="پروژه‌ها"
              value={stats?.projects.total ?? projects.length}
              sub={`${stats?.projects.byStage?.storyboard ?? 0} استوری‌بورد · ${stats?.projects.byStage?.export ?? 0} خروجی`}
              icon={Folder}
              color="bg-violet-500/10 text-violet-500"
            />
            <StatCard
              label="شات‌های تولید شده"
              value={stats?.shots.total ?? 0}
              icon={Film}
              color="bg-amber-500/10 text-amber-500"
            />
            <StatCard
              label="تیکت‌های باز"
              value={stats?.tickets.open ?? openCount}
              sub={`از ${stats?.tickets.total ?? tickets.length} کل`}
              icon={Ticket}
              color={openCount > 0 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="ترک‌های صوتی"
              value={stats?.audio.total ?? 0}
              icon={Music}
              color="bg-rose-500/10 text-rose-500"
            />
            <StatCard
              label="اعتبار مصرف‌شده (۲۴ ساعت)"
              value={stats?.credits.today?.toLocaleString("fa-IR") ?? 0}
              icon={CreditCard}
              color="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              label="اجرای ایجنت موفق"
              value={stats?.agents.byStatus?.completed ?? 0}
              icon={Zap}
              color="bg-cyan-500/10 text-cyan-500"
            />
            <StatCard
              label="فیلم‌های خروجی"
              value={stats?.assemblies.byStatus?.exported ?? 0}
              icon={VideoIcon}
              color="bg-orange-500/10 text-orange-500"
            />
          </div>

          {/* User breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="w-4 h-4 text-primary" />
                توزیع کاربران بر اساس پلن
              </div>
              {["free", "pro", "studio", "unlimited"].map(tier => {
                const count = stats?.users.byTier?.[tier] ?? users.filter(u => u.tier === tier).length;
                const total = stats?.users.total ?? users.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={tier} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {tier === "unlimited" && <Crown className="w-3 h-3 text-amber-500" />}
                        <span>{TIER_LABELS[tier]}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", {
                          "bg-zinc-400": tier === "free",
                          "bg-blue-500": tier === "pro",
                          "bg-violet-500": tier === "studio",
                          "bg-amber-500": tier === "unlimited",
                        })}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Folder className="w-4 h-4 text-primary" />
                توزیع پروژه‌ها بر اساس مرحله
              </div>
              {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                const count = stats?.projects.byStage?.[stage] ?? projects.filter(p => p.currentStage === stage).length;
                const total = stats?.projects.total ?? projects.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{label}</span>
                      <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* Recent projects */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Activity className="w-4 h-4 text-primary" />
              آخرین پروژه‌های به‌روزشده
            </div>
            <div className="space-y-2">
              {projects.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground shrink-0">
                    {p.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.username || "—"}</div>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STAGE_COLORS[p.currentStage] || "bg-muted text-muted-foreground")}>
                    {STAGE_LABELS[p.currentStage] || p.currentStage}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.updatedAt ? fmtDate(p.updatedAt) : "—"}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* USERS TAB                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی نام، ایمیل، یوزرنیم..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pr-10 h-9"
                dir="rtl"
              />
            </div>
            <Select value={userTierFilter} onValueChange={setUserTierFilter}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="پلن" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پلن‌ها</SelectItem>
                <SelectItem value="free">رایگان</SelectItem>
                <SelectItem value="pro">حرفه‌ای</SelectItem>
                <SelectItem value="studio">استودیو</SelectItem>
                <SelectItem value="unlimited">بی‌نهایت</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mr-auto">
              {filteredUsers.length} از {users.length} کاربر
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">کاربر</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">پلن</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">اعتبار</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">ایمیل</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">نقش</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">عضویت</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        کاربری یافت نشد
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={u.displayName || u.username} />
                          <div>
                            <div className="font-medium text-sm leading-none">{u.displayName || u.username}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", TIER_COLORS[u.tier] || TIER_COLORS.free)}>
                          {u.tier === "unlimited" && <Crown className="w-3 h-3" />}
                          {TIER_LABELS[u.tier] || u.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-mono text-sm tabular-nums", u.credits < 0 ? "text-amber-500" : u.credits < 10 ? "text-destructive" : "")}>
                          {fmtCredits(u.credits)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        {u.isAdmin
                          ? <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] gap-1"><Shield className="w-3 h-3" />ادمین</Badge>
                          : <span className="text-xs text-muted-foreground">کاربر</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => openEditUser(u)}
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="ویرایش"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteUser(u)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PROJECTS TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی عنوان یا صاحب پروژه..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                className="pr-10 h-9"
                dir="rtl"
              />
            </div>
            <Select value={projectStageFilter} onValueChange={setProjectStageFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="مرحله" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مراحل</SelectItem>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mr-auto">
              {filteredProjects.length} از {projects.length} پروژه
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">پروژه</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">صاحب</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">مرحله</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">شات</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">صدا</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">خروجی</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">آخرین ویرایش</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                        پروژه‌ای یافت نشد
                      </td>
                    </tr>
                  ) : filteredProjects.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => openProjectDetail(p)}>
                      <td className="px-4 py-3">
                        <div className="font-medium max-w-[180px] truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">#{p.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <UserAvatar name={p.displayName || p.username || "?"} size="sm" />
                          <span className="text-xs">{p.username || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STAGE_COLORS[p.currentStage] || "bg-muted text-muted-foreground")}>
                          {STAGE_LABELS[p.currentStage] || p.currentStage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Film className="w-3 h-3" />
                          {p.shotCount}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Music className="w-3 h-3" />
                          {p.audioCount}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.assembly?.exportUrl ? (
                          <a
                            href={p.assembly.exportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            دانلود
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.updatedAt ? fmtDate(p.updatedAt) : "—"}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => openProjectDetail(p)}
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="جزئیات"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteProject(p)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* FEATURE FLAGS TAB                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              غیرفعال کردن هر مدل باعث می‌شود آن قابلیت برای <strong className="mx-0.5">همه کاربران</strong> غیرقابل استفاده شود.
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowNewFlag(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              پرچم جدید
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(flagGroups).map(([group, keys]) => (
              <Card key={group} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-5 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {group === "تصویر و ویدیو" ? <VideoIcon className="w-4 h-4 text-primary" /> : <Music className="w-4 h-4 text-primary" />}
                    {group}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {keys.map(key => {
                      const flag = flags.find(f => f.key === key);
                      const info = FLAG_LABELS[key];
                      return (
                        <div key={key} className="flex items-center justify-between px-5 py-3.5 gap-4 hover:bg-muted/20 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{info?.label || key}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{info?.desc}</div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={cn("text-xs font-medium tabular-nums", flag?.enabled ? "text-emerald-500" : "text-destructive")}>
                              {flag?.enabled ? "فعال" : "غیرفعال"}
                            </span>
                            <Switch
                              checked={flag?.enabled ?? true}
                              onCheckedChange={v => toggleFlag(key, v)}
                            />
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteFlag(key)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Flags not in predefined list */}
          {flags.filter(f => !FLAG_LABELS[f.key]).length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  سایر پرچم‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {flags.filter(f => !FLAG_LABELS[f.key]).map(f => (
                    <div key={f.key} className="flex items-center justify-between px-5 py-3.5 gap-4">
                      <div>
                        <div className="text-sm font-medium font-mono">{f.key}</div>
                        <div className="text-xs text-muted-foreground">{f.label || "بدون توضیحات"}</div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={cn("text-xs font-medium", f.enabled ? "text-emerald-500" : "text-destructive")}>
                          {f.enabled ? "فعال" : "غیرفعال"}
                        </span>
                        <Switch checked={f.enabled} onCheckedChange={v => toggleFlag(f.key, v)} />
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteFlag(f.key)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TICKETS TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tickets">
          <div className="flex gap-4 h-[calc(100vh-300px)] min-h-[520px]">
            {/* Ticket List */}
            <div className="w-72 shrink-0 flex flex-col gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
                {(["all", "open", "closed"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTicketFilter(f)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                      ticketFilter === f ? "bg-background shadow-sm" : "hover:bg-background/50"
                    )}
                  >
                    {f === "all" ? `همه (${tickets.length})` : f === "open" ? `باز (${tickets.filter(t => t.status === "open").length})` : `بسته (${tickets.filter(t => t.status === "closed").length})`}
                  </button>
                ))}
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-0.5">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">تیکتی وجود ندارد</div>
                  ) : filteredTickets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={cn(
                        "w-full text-right p-3 rounded-lg border transition-all",
                        selectedTicket?.id === t.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-snug line-clamp-1">{t.subject}</span>
                        <span className={cn(
                          "shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          t.status === "open" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                        )}>
                          {t.status === "open" ? "باز" : "بسته"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {t.username || "ناشناس"}
                        <span className="mx-1">·</span>
                        {t.createdAt ? fmtDate(t.createdAt) : ""}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTicket(t); }}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col rounded-xl border overflow-hidden">
              {!selectedTicket ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                  <MessageCircle className="w-8 h-8 opacity-30" />
                  <span className="text-sm">یک تیکت انتخاب کنید</span>
                </div>
              ) : (
                <>
                  {/* Ticket header */}
                  <div className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{selectedTicket.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedTicket.username} · #{selectedTicket.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedTicket.status === "open" ? (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => changeTicketStatus(selectedTicket.id, "closed")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          بستن تیکت
                        </Button>
                      ) : (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => changeTicketStatus(selectedTicket.id, "open")}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          بازگشایی
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map(m => {
                        const isAdmin = m.authorId !== selectedTicket.userId;
                        return (
                          <div key={m.id} className={cn("flex", isAdmin ? "justify-start" : "justify-end")}>
                            <div className={cn("flex gap-2 max-w-[80%]", isAdmin ? "flex-row" : "flex-row-reverse")}>
                              {/* Avatar */}
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                                isAdmin
                                  ? "bg-emerald-500 text-white"
                                  : "bg-amber-500 text-amber-950"
                              )}>
                                {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              </div>
                              {/* Bubble */}
                              <div className={cn(
                                "rounded-2xl px-4 py-3 text-sm max-w-[calc(100%-2.5rem)]",
                                isAdmin
                                  ? "bg-emerald-500 text-white rounded-tl-sm shadow-lg shadow-emerald-500/30"
                                  : "bg-amber-400 text-amber-950 rounded-tr-sm shadow-lg shadow-amber-400/30"
                              )}>
                                {/* Header */}
                                <div className={cn("flex items-center gap-2 mb-1.5", isAdmin ? "justify-start" : "justify-end")}>
                                  <span className={cn("text-xs font-bold", isAdmin ? "text-white/90" : "text-amber-950/80")}>
                                    {isAdmin ? "پشتیبانی" : "کاربر"}
                                  </span>
                                  <span className={cn("text-[10px]", isAdmin ? "text-white/60" : "text-amber-950/60")}>
                                    {fmtDateTime(m.createdAt)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Reply box */}
                  {selectedTicket.status === "open" && (
                    <div className="p-3 border-t border-border/50 flex gap-2">
                      <Textarea
                        placeholder="پاسخ را بنویسید..."
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) sendReply(); }}
                        className="resize-none min-h-[70px] flex-1 text-sm"
                        dir="rtl"
                      />
                      <Button
                        size="sm"
                        onClick={sendReply}
                        disabled={!reply.trim() || sendingReply}
                        className="self-end gap-1.5"
                      >
                        {sendingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        ارسال
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SYSTEM TAB                                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="system" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
              {(["usage", "agent"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setLogType(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    logType === t ? "bg-background shadow-sm" : "hover:bg-background/50"
                  )}
                >
                  {t === "usage" ? "لاگ مصرف اعتبار" : "لاگ ایجنت"}
                </button>
              ))}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => fetchLogs(logType)}
              disabled={logsLoading}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", logsLoading && "animate-spin")} />
              بارگزاری
            </Button>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logType === "usage" ? (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">کاربر</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">عملیات</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">اعتبار</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">زمان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {usageLogs.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">لاگی وجود ندارد</td></tr>
                    ) : (usageLogs as UsageLogItem[]).map(log => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="text-xs font-medium">{log.displayName || log.username || "—"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">@{log.username}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono">{log.action}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs font-mono tabular-nums", log.creditsUsed > 0 ? "text-destructive" : "text-muted-foreground")}>
                            {log.creditsUsed > 0 ? `-${log.creditsUsed}` : log.creditsUsed}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Thread</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">پروژه</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Node</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">وضعیت</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">هزینه</th>
                      <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">زمان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {usageLogs.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">لاگی وجود ندارد</td></tr>
                    ) : (usageLogs as unknown as Array<{ id: number; threadId: string; projectId: number; nodeName: string; status: string; costCredits: number | null; error: string | null; createdAt: string }>).map(log => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{log.threadId?.slice(0, 8)}...</td>
                        <td className="px-4 py-2.5 text-xs">#{log.projectId}</td>
                        <td className="px-4 py-2.5 text-xs font-mono">{log.nodeName}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", log.status === "completed" ? "bg-emerald-500/15 text-emerald-600" : log.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600")}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono">{log.costCredits ?? 0}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ANNOUNCEMENTS TAB                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="announcements" className="space-y-4">
          <AdminAnnouncements />
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EDIT USER DIALOG                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={v => { if (!v) { setEditUser(null); setEditDraft(null); setPasswordMsg(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserAvatar name={editUser?.displayName || editUser?.username || "?"} size="sm" />
              ویرایش کاربر: {editUser?.username}
            </DialogTitle>
          </DialogHeader>

          {editDraft && (
            <div className="space-y-4 py-1">
              {/* Name & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نام نمایشی</label>
                  <Input
                    value={editDraft.displayName}
                    onChange={e => setEditDraft(d => d ? { ...d, displayName: e.target.value } : d)}
                    placeholder="نام نمایشی"
                    dir="rtl"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ایمیل</label>
                  <Input
                    value={editDraft.email}
                    onChange={e => setEditDraft(d => d ? { ...d, email: e.target.value } : d)}
                    placeholder="ایمیل"
                    dir="ltr"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Tier & Credits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">پلن</label>
                  <Select value={editDraft.tier} onValueChange={v => setEditDraft(d => d ? { ...d, tier: v } : d)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">رایگان</SelectItem>
                      <SelectItem value="pro">حرفه‌ای</SelectItem>
                      <SelectItem value="studio">استودیو</SelectItem>
                      <SelectItem value="unlimited">بی‌نهایت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">اعتبار</label>
                  <Input
                    type="number"
                    value={editDraft.credits}
                    onChange={e => setEditDraft(d => d ? { ...d, credits: parseInt(e.target.value) || 0 } : d)}
                    className="h-9 text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Credit presets */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">اعتبار سریع:</span>
                {[0, 50, 100, 500, 1000, -1].map(v => (
                  <button
                    key={v}
                    onClick={() => setEditDraft(d => d ? { ...d, credits: v } : d)}
                    className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors", editDraft.credits === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
                  >
                    {v === -1 ? "∞" : v.toLocaleString()}
                  </button>
                ))}
              </div>

              <Separator />

              {/* Admin toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Shield className="w-4 h-4 text-destructive" />دسترسی ادمین</div>
                  <div className="text-xs text-muted-foreground">دسترسی کامل به پنل مدیریت</div>
                </div>
                <Switch
                  checked={editDraft.isAdmin}
                  onCheckedChange={v => setEditDraft(d => d ? { ...d, isAdmin: v } : d)}
                  disabled={editUser?.id === currentUser?.id}
                />
              </div>

              <Separator />

              {/* Password reset */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  تغییر رمز عبور
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setPasswordMsg(null); }}
                    placeholder="رمز عبور جدید (حداقل ۶ کاراکتر)"
                    className="h-9 text-sm flex-1"
                    dir="ltr"
                  />
                  <Button
                    variant="outline" size="sm"
                    onClick={resetPassword}
                    disabled={savingUser || newPassword.length < 6}
                    className="h-9 px-3 text-xs gap-1.5 shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    اعمال
                  </Button>
                </div>
                {passwordMsg && (
                  <div className={cn("text-xs flex items-center gap-1.5 mt-1", passwordMsg.ok ? "text-emerald-600" : "text-destructive")}>
                    {passwordMsg.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {passwordMsg.msg}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditUser(null); setEditDraft(null); }}>لغو</Button>
            <Button onClick={saveUser} disabled={savingUser}>
              {savingUser ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROJECT DETAIL DIALOG                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={projectDetailOpen} onOpenChange={v => { if (!v) { setProjectDetailOpen(false); setProjectDetail(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Folder className="w-5 h-5 text-primary" />
              {projectDetailLoading ? "در حال بارگزاری..." : projectDetail?.project.title}
            </DialogTitle>
            {projectDetail && (
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <span>#{projectDetail.project.id}</span>
                <span>·</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STAGE_COLORS[projectDetail.project.currentStage])}>
                  {STAGE_LABELS[projectDetail.project.currentStage] || projectDetail.project.currentStage}
                </span>
                {projectDetail.owner && (
                  <>
                    <span>·</span>
                    <span>صاحب: {projectDetail.owner.displayName || projectDetail.owner.username}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", TIER_COLORS[projectDetail.owner.tier])}>
                      {TIER_LABELS[projectDetail.owner.tier] || projectDetail.owner.tier}
                    </span>
                  </>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          {projectDetailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : projectDetail ? (
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              <div className="space-y-5 py-2">

                {/* Stat row */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{projectDetail.shotStats.total}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">شات کل</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{projectDetail.shotStats.generated}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">تصویر تولید شده</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-violet-600">{projectDetail.shotStats.withVideo}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">ویدیو تولید شده</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-rose-600">{projectDetail.audioStats.total}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">ترک صوتی</div>
                  </div>
                </div>

                {/* Narrative with CRUD */}
                {projectDetail.narrative && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      داستان
                      <div className="mr-auto flex items-center gap-1">
                        {editingNarrative ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={saveNarrative} disabled={savingNarrative} className="h-7 text-xs gap-1">
                              {savingNarrative ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              ذخیره
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingNarrative(false); setNarrativeDraft(null); }} className="h-7 text-xs">
                              لغو
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={startEditingNarrative} className="h-7 text-xs gap-1">
                            <Edit2 className="w-3 h-3" />
                            ویرایش
                          </Button>
                        )}
                      </div>
                    </div>
                    {editingNarrative && narrativeDraft ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">لاگ‌لاین</label>
                          <Textarea value={narrativeDraft.logline} onChange={e => setNarrativeDraft(d => d ? { ...d, logline: e.target.value } : d)} className="min-h-[60px] text-sm" dir="rtl" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">ایده</label>
                          <Textarea value={narrativeDraft.idea} onChange={e => setNarrativeDraft(d => d ? { ...d, idea: e.target.value } : d)} className="min-h-[80px] text-sm" dir="rtl" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">فیلمنامه</label>
                          <Textarea value={narrativeDraft.script} onChange={e => setNarrativeDraft(d => d ? { ...d, script: e.target.value } : d)} className="min-h-[100px] text-sm" dir="rtl" />
                        </div>
                      </div>
                    ) : (
                      <>
                        {projectDetail.narrative.logline && (
                          <TextPreview text={projectDetail.narrative.logline} title="لاگ‌لاین" className="rounded-lg" />
                        )}
                        {projectDetail.narrative.idea && (
                          <TextPreview text={projectDetail.narrative.idea} title="ایده" className="rounded-lg" />
                        )}
                        {projectDetail.narrative.script && (
                          <TextPreview text={projectDetail.narrative.script} title="فیلمنامه" className="rounded-lg" />
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Shots list with CRUD */}
                {projectDetail.shots.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Film className="w-4 h-4 text-primary" />
                      شات‌ها ({projectDetail.shots.length})
                    </div>
                    <div className="space-y-2">
                      {/* Grid of image thumbnails */}
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {projectDetail.shots.filter(s => s.generatedImageUrl).map(s => (
                          <div key={s.id} className="relative group aspect-[3/4] rounded-lg border overflow-hidden">
                            <button
                              onClick={() => openMediaPreview("image", s.generatedImageUrl!, s.title)}
                              className="w-full h-full"
                            >
                              <img src={s.generatedImageUrl!} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                              {s.generatedVideoUrl && (
                                <button onClick={() => openMediaPreview("video", s.generatedVideoUrl!, s.title)} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40">
                                  <VideoIcon className="w-3.5 h-3.5 text-white" />
                                </button>
                              )}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur p-1 text-[9px] text-white truncate text-center">
                              {s.order + 1}. {s.title}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Detailed table */}
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="text-right px-3 py-2 font-medium">#</th>
                              <th className="text-right px-3 py-2 font-medium">عنوان</th>
                              <th className="text-right px-3 py-2 font-medium">نوع</th>
                              <th className="text-right px-3 py-2 font-medium">مدت</th>
                              <th className="text-right px-3 py-2 font-medium">تصویر</th>
                              <th className="text-right px-3 py-2 font-medium">ویدیو</th>
                              <th className="text-right px-3 py-2 font-medium">وضعیت</th>
                              <th className="text-right px-3 py-2 font-medium w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {projectDetail.shots.map(s => (
                              <tr key={s.id} className="hover:bg-muted/20 group/shot">
                                <td className="px-3 py-2 text-muted-foreground">{s.order + 1}</td>
                                <td className="px-3 py-2">
                                  {editingShot === s.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        value={editShotTitle}
                                        onChange={e => setEditShotTitle(e.target.value)}
                                        className="h-6 px-1.5 rounded border text-xs bg-background w-28"
                                        dir="rtl"
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === "Enter") saveShotTitle(s.id);
                                          if (e.key === "Escape") { setEditingShot(null); setEditShotTitle(""); }
                                        }}
                                      />
                                      <button onClick={() => saveShotTitle(s.id)} className="p-0.5 hover:bg-primary/10 rounded"><Save className="w-3 h-3 text-primary" /></button>
                                      <button onClick={() => { setEditingShot(null); setEditShotTitle(""); }} className="p-0.5 hover:bg-muted rounded"><X className="w-3 h-3" /></button>
                                    </div>
                                  ) : (
                                    <div className="max-w-[140px] truncate">{s.title}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{s.shotType || "—"}</td>
                                <td className="px-3 py-2 text-muted-foreground">{s.duration ? `${s.duration}s` : "—"}</td>
                                <td className="px-3 py-2">
                                  {s.generatedImageUrl ? (
                                    <button onClick={() => openMediaPreview("image", s.generatedImageUrl!, s.title)} className="hover:opacity-80">
                                      <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                                    </button>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {s.generatedVideoUrl ? (
                                    <button onClick={() => openMediaPreview("video", s.generatedVideoUrl!, s.title)} className="hover:opacity-80">
                                      <VideoIcon className="w-3.5 h-3.5 text-violet-500" />
                                    </button>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", s.status === "generated" ? "bg-emerald-500/15 text-emerald-600" : s.status === "generating" ? "bg-amber-500/15 text-amber-600" : s.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
                                    {s.status || "draft"}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover/shot:opacity-100 transition-opacity">
                                    <button onClick={() => startEditingShot(s)} className="p-0.5 hover:bg-muted rounded"><Edit2 className="w-3 h-3 text-muted-foreground" /></button>
                                    <button onClick={() => setDeleteShot({ id: s.id, title: s.title })} className="p-0.5 hover:bg-destructive/10 rounded text-destructive/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio tracks with CRUD */}
                {projectDetail.audio.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Music className="w-4 h-4 text-primary" />
                      ترک‌های صوتی ({projectDetail.audio.length})
                      <div className="flex gap-1 mr-auto">
                        {projectDetail.audioStats.music > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">{projectDetail.audioStats.music} موسیقی</span>}
                        {projectDetail.audioStats.sfx > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600">{projectDetail.audioStats.sfx} SFX</span>}
                        {projectDetail.audioStats.dialogue > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600">{projectDetail.audioStats.dialogue} دیالوگ</span>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {projectDetail.audio.map(a => (
                        <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 group/audio">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", AUDIO_TYPE_COLORS[a.type || "music"] || AUDIO_TYPE_COLORS.music)}>
                            {a.type || "music"}
                          </span>
                          {editingAudio === a.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                value={editAudioName}
                                onChange={e => setEditAudioName(e.target.value)}
                                className="h-6 px-1.5 rounded border text-xs bg-background w-28"
                                dir="rtl"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === "Enter") saveAudioName(a.id);
                                  if (e.key === "Escape") { setEditingAudio(null); setEditAudioName(""); }
                                }}
                              />
                              <button onClick={() => saveAudioName(a.id)} className="p-0.5 hover:bg-primary/10 rounded"><Save className="w-3 h-3 text-primary" /></button>
                              <button onClick={() => { setEditingAudio(null); setEditAudioName(""); }} className="p-0.5 hover:bg-muted rounded"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <span className="text-xs flex-1 truncate">{a.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground shrink-0">{a.duration ? `${a.duration}s` : "—"}</span>
                          {a.url && (
                            <button onClick={() => openMediaPreview("audio", a.url!, a.name)} className="shrink-0 p-0.5 hover:bg-muted rounded">
                              <Headphones className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/audio:opacity-100 transition-opacity">
                            <button onClick={() => startEditingAudio(a)} className="p-0.5 hover:bg-muted rounded"><Edit2 className="w-3 h-3 text-muted-foreground" /></button>
                            <button onClick={() => setDeleteAudio({ id: a.id, name: a.name })} className="p-0.5 hover:bg-destructive/10 rounded text-destructive/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assembly */}
                {projectDetail.assembly && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Activity className="w-4 h-4 text-primary" />
                      مونتاژ و خروجی
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", projectDetail.assembly.status === "exported" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                        {projectDetail.assembly.status || "draft"}
                      </span>
                      {projectDetail.assembly.exportUrl && (
                        <a
                          href={projectDetail.assembly.exportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          دانلود فیلم نهایی
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Open in studio link */}
                <div className="pt-1">
                  <a
                    href={`/studio/${projectDetail.project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    باز کردن پروژه در استودیو
                  </a>
                </div>
              </div>
            </ScrollArea>
          ) : null}

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => { setProjectDetailOpen(false); setProjectDetail(null); }}>
              بستن
            </Button>
            {projectDetail && (
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteProject(projects.find(p => p.id === projectDetail.project.id) || null);
                  setProjectDetailOpen(false);
                }}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                حذف پروژه
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Dialogs ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={confirmDeleteUser}
        title="حذف کاربر"
        description={`آیا مطمئن هستید که می‌خواهید کاربر "${deleteUser?.username}" را حذف کنید؟ تمام داده‌های این کاربر از جمله پروژه‌ها حذف می‌شوند.`}
        loading={deletingUser}
      />
      <ConfirmDialog
        open={!!deleteProject}
        onClose={() => setDeleteProject(null)}
        onConfirm={confirmDeleteProject}
        title="حذف پروژه"
        description={`آیا مطمئن هستید که می‌خواهید پروژه "${deleteProject?.title}" را حذف کنید؟ تمام شات‌ها، ترک‌های صوتی و مونتاژ این پروژه نیز حذف می‌شوند.`}
        loading={deletingProject}
      />
      <ConfirmDialog
        open={!!deleteShot}
        onClose={() => setDeleteShot(null)}
        onConfirm={confirmDeleteShot}
        title="حذف شات"
        description={`آیا مطمئن هستید که می‌خواهید شات "${deleteShot?.title}" را حذف کنید؟`}
        loading={deletingShot}
      />
      <ConfirmDialog
        open={!!deleteAudio}
        onClose={() => setDeleteAudio(null)}
        onConfirm={confirmDeleteAudio}
        title="حذف ترک صوتی"
        description={`آیا مطمئن هستید که می‌خواهید ترک صوتی "${deleteAudio?.name}" را حذف کنید؟`}
        loading={deletingAudio}
      />

      {/* Media preview dialog */}
      {mediaPreview && (
        <Dialog open={mediaPreview.open} onOpenChange={() => setMediaPreview(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <div className="bg-black rounded-lg overflow-hidden">
              {mediaPreview.type === "image" && (
                <img src={mediaPreview.src} alt={mediaPreview.title || "Preview"} className="w-full max-h-[70vh] object-contain" />
              )}
              {mediaPreview.type === "video" && (
                <video src={mediaPreview.src} controls className="w-full max-h-[70vh]" preload="metadata" />
              )}
              {mediaPreview.type === "audio" && (
                <div className="p-6 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Headphones className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-sm text-white font-medium">{mediaPreview.title || "Audio"}</div>
                  <audio src={mediaPreview.src} controls className="w-full" />
                </div>
              )}
              {mediaPreview.type === "text" && (
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="text-sm font-medium text-white mb-2">{mediaPreview.title || "Text"}</div>
                  <div className="text-sm text-white/80 whitespace-pre-wrap dir-rtl text-right">{mediaPreview.src}</div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete flag confirm */}
      <ConfirmDialog
        open={!!deleteFlag}
        onClose={() => setDeleteFlag(null)}
        onConfirm={confirmDeleteFlag}
        title="حذف پرچم"
        description={`آیا مطمئن هستید که می‌خواهید پرچم "${deleteFlag}" را حذف کنید؟`}
        loading={deletingFlag}
      />

      {/* New flag dialog */}
      <Dialog open={showNewFlag} onOpenChange={setShowNewFlag}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>پرچم جدید</DialogTitle>
            <DialogDescription>نام فنی پرچم را وارد کنید و وضعیت آن را تنظیم کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="نام پرچم (بدون فاصله)"
              value={newFlagKey}
              onChange={e => setNewFlagKey(e.target.value)}
              className="text-sm"
              dir="ltr"
            />
            <Input
              placeholder="توضیحات (اختیاری)"
              value={newFlagLabel}
              onChange={e => setNewFlagLabel(e.target.value)}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Switch checked={newFlagEnabled} onCheckedChange={setNewFlagEnabled} />
              <span className="text-sm">فعال</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFlag(false)}>انصراف</Button>
            <Button onClick={createFlag} disabled={!newFlagKey.trim() || creatingFlag}>
              {creatingFlag ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "ساخت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete ticket confirm */}
      <ConfirmDialog
        open={!!deleteTicket}
        onClose={() => setDeleteTicket(null)}
        onConfirm={confirmDeleteTicket}
        title="حذف تیکت"
        description={`آیا مطمئن هستید که می‌خواهید تیکت "${deleteTicket?.subject}" را حذف کنید؟ تمام پیام‌های مربوط به آن همچنین حذف می‌شوند.`}
        loading={deletingTicket}
      />
    </div>
  );
}
