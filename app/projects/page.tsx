"use client";

import { useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/ui/safe-image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Film,
  Video,
  Sparkles,
  Scissors,
  Search,
  LayoutGrid,
  List,
  Clock,
  Folder,
  MoreVertical,
  Trash2,
  Edit3,
  Copy,
  UserPlus,
  LogIn,
  Wand2,
  FileText,
  Camera,
  Mic,
  Box,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FXLogo } from "@/components/layout/fx-logo";
import { MegaNav } from "@/components/layout/mega-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const projectTemplates = [
  {
    icon: Film,
    title: "فیلم کوتاه",
    desc: "داستان‌گویی سینمایی",
    style: "cinematic",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: Video,
    title: "ویدیوی تبلیغاتی",
    desc: "معرفی محصول یا خدمات",
    style: "commercial",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: Camera,
    title: "مستند",
    desc: "روایت واقعی با تصاویر",
    style: "documentary",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Mic,
    title: "پادکست تصویری",
    desc: "محتوای آموزشی",
    style: "educational",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Box,
    title: "دنیای لگو",
    desc: "انیمیشن مینیاتوری",
    style: "lego",
    gradient: "from-yellow-400 to-amber-500",
  },
  {
    icon: PenTool,
    title: "انیمه",
    desc: "سبک انیمیشن ژاپنی",
    style: "anime",
    gradient: "from-purple-500 to-violet-600",
  },
];

const stageLabels: Record<string, string> = {
  narrative: "روایت",
  vision: "بصری",
  storyboard: "استوری‌بورد",
  assembly: "مونتاژ",
  export: "خروجی",
};

const stageColors: Record<string, string> = {
  narrative: "bg-blue-500/10 text-blue-500",
  vision: "bg-cyan-500/10 text-cyan-500",
  storyboard: "bg-indigo-500/10 text-indigo-500",
  assembly: "bg-amber-500/10 text-amber-500",
  export: "bg-emerald-500/10 text-emerald-500",
};

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("16:9");

  const ASPECT_RATIOS = [
    { id: "16:9", label: "16:9", desc: "ویدیویی / یوتیوب" },
    { id: "9:16", label: "9:16", desc: "ریلز / استوری" },
    { id: "1:1", label: "1:1", desc: "مربعی / اینستاگرام" },
    { id: "4:3", label: "4:3", desc: "کلاسیک" },
    { id: "3:4", label: "3:4", desc: "پرتره" },
  ];

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; style?: string; aspectRatio?: string }) =>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsNewProjectOpen(false);
      setNewProjectTitle("");
      setNewProjectDescription("");
      setSelectedTemplate(null);
      setSelectedAspectRatio("16:9");
      router.push(`/studio/${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/projects/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  const filteredProjects = projects.filter(
    (p: any) =>
      p.title.includes(searchQuery) ||
      (p.description && p.description.includes(searchQuery))
  );

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    createMutation.mutate({
      title: newProjectTitle,
      description: newProjectDescription || undefined,
      style: selectedTemplate || undefined,
      aspectRatio: selectedAspectRatio,
    });
  };

  const handleDeleteProject = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <MegaNav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-[1100px] mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold">پروژه‌های اخیر</h2>
              <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-new-project">
                    <Plus className="w-4 h-4" />
                    پروژه جدید
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{"\u0627\u06CC\u062C\u0627\u062F \u067E\u0631\u0648\u0698\u0647 \u062C\u062F\u06CC\u062F"}</DialogTitle>
                    <DialogDescription>
                      {"\u06CC\u06A9 \u0642\u0627\u0644\u0628 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u06CC\u0627 \u067E\u0631\u0648\u0698\u0647 \u062E\u0627\u0644\u06CC \u0628\u0633\u0627\u0632\u06CC\u062F"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-2 py-3">
                    {projectTemplates.map((template) => {
                      const Icon = template.icon;
                      const isSelected = selectedTemplate === template.style;
                      return (
                        <button
                          key={template.style}
                          onClick={() => setSelectedTemplate(isSelected ? null : template.style)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-right ${
                            isSelected
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/50 hover:border-border"
                          }`}
                          data-testid={`template-${template.style}`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-primary/10" : "bg-muted"
                          }`}>
                            <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{template.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{template.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <Label>{"\u0646\u0633\u0628\u062A \u062A\u0635\u0648\u06cc\u0631"}</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {ASPECT_RATIOS.map((ratio) => {
                        const isSelected = selectedAspectRatio === ratio.id;
                        return (
                          <button
                            key={ratio.id}
                            onClick={() => setSelectedAspectRatio(ratio.id)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-right ${
                              isSelected
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/50 hover:border-border"
                            }`}
                            data-testid={`aspect-ratio-${ratio.id}`}
                          >
                            <div
                              className="border-2 border-muted-foreground/30 rounded-sm"
                              style={{
                                width: ratio.id === "9:16" ? 18 : ratio.id === "3:4" ? 20 : ratio.id === "1:1" ? 24 : 32,
                                height: ratio.id === "9:16" ? 32 : ratio.id === "3:4" ? 28 : ratio.id === "1:1" ? 24 : 18,
                              }}
                            />
                            <span className="text-[11px] font-medium">{ratio.label}</span>
                            <span className="text-[9px] text-muted-foreground">{ratio.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">{"\u0639\u0646\u0648\u0627\u0646 \u067E\u0631\u0648\u0698\u0647"}</Label>
                      <Input
                        id="title"
                        placeholder={"\u0645\u062B\u0627\u0644: \u0648\u06CC\u062F\u06CC\u0648\u06CC \u0645\u0639\u0631\u0641\u06CC \u0645\u062D\u0635\u0648\u0644"}
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        dir="rtl"
                        data-testid="input-project-title"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="description">{"\u062A\u0648\u0636\u06CC\u062D\u0627\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)"}</Label>
                      <Textarea
                        id="description"
                        placeholder={"\u062A\u0648\u0636\u06CC\u062D \u0645\u062E\u062A\u0635\u0631\u06CC \u062F\u0631\u0628\u0627\u0631\u0647 \u067E\u0631\u0648\u0698\u0647..."}
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        dir="rtl"
                        className="min-h-[70px]"
                        data-testid="input-project-description"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>
                      {"\u0627\u0646\u0635\u0631\u0627\u0641"}
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectTitle.trim() || createMutation.isPending}
                      className="gap-1.5"
                      data-testid="button-create-project"
                    >
                      <Sparkles className="w-4 h-4" />
                      {"\u0627\u06CC\u062C\u0627\u062F \u067E\u0631\u0648\u0698\u0647"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto glass-card rounded-xl p-3 opacity-[1] bg-[#0f0f0f00] border-t-[#2759aa] border-r-[#2759aa] border-b-[#2759aa] border-l-[#2759aa]">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={"\u062C\u0633\u062A\u062C\u0648..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 border-t-[#02438b] border-r-[#02438b] border-b-[#02438b] border-l-[#02438b]"
                  data-testid="input-search"
                />
              </div>
              <div className="flex border border-border/50 rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {!isLoading && filteredProjects.length === 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Film className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{"\u0647\u0646\u0648\u0632 \u067E\u0631\u0648\u0698\u0647\u200C\u0627\u06CC \u0646\u0633\u0627\u062E\u062A\u06CC\u062F"}</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                {"\u0627\u0648\u0644\u06CC\u0646 \u067E\u0631\u0648\u0698\u0647 \u0633\u06CC\u0646\u0645\u0627\u06CC\u06CC \u062E\u0648\u062F \u0631\u0627 \u0628\u0633\u0627\u0632\u06CC\u062F \u0648 \u0641\u06CC\u0644\u0645\u200C\u0633\u0627\u0632\u06CC \u0628\u0627 \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC \u0631\u0627 \u062A\u062C\u0631\u0628\u0647 \u06A9\u0646\u06CC\u062F"}
              </p>
              <Button
                variant="aiGenerate"
                onClick={() => setIsNewProjectOpen(true)}
                className="gap-2"
                data-testid="button-empty-new-project"
              >
                <Plus className="w-4 h-4" />
                {"\u0633\u0627\u062E\u062A \u0627\u0648\u0644\u06CC\u0646 \u067E\u0631\u0648\u0698\u0647"}
              </Button>
            </motion.div>
          )}

          {!isLoading && filteredProjects.length === 0 && searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{"\u0646\u062A\u06CC\u062C\u0647\u200C\u0627\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F"}</h3>
              <p className="text-muted-foreground text-sm">
                {"\u067E\u0631\u0648\u0698\u0647\u200C\u0627\u06CC \u0628\u0627 \u0639\u0628\u0627\u0631\u062A"} &ldquo;{searchQuery}&rdquo; {"\u067E\u06CC\u062F\u0627 \u0646\u0634\u062F"}
              </p>
            </motion.div>
          )}

          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            : "space-y-2"
          }>
            {(isLoading || filteredProjects.length > 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <button
                  onClick={() => setIsNewProjectOpen(true)}
                  className={viewMode === "grid"
                    ? "group flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 bg-muted/10 hover:bg-muted/20 transition-all w-full"
                    : "group flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/30 bg-muted/10 hover:bg-muted/20 transition-all w-full"
                  }
                  data-testid="button-new-project-card"
                >
                  <div className="w-12 h-12 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {viewMode === "list" && (
                    <span className="font-medium">{"\u067E\u0631\u0648\u0698\u0647 \u062C\u062F\u06CC\u062F"}</span>
                  )}
                </button>
              </motion.div>
            )}

            {isLoading && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    data-testid={`skeleton-project-${i}`}
                    className="rounded-xl border border-border/40 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-video bg-muted/50" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-muted/50 rounded w-3/4" />
                      <div className="h-3 bg-muted/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {!isLoading && filteredProjects.map((project: any, index: number) => {
              const thumb = project.thumbnailUrl || "/frames/fx-art-1767282683866_1767713197615.png";
              const stageLabel = stageLabels[project.currentStage] || project.currentStage;
              const stageColor = stageColors[project.currentStage] || "bg-muted text-muted-foreground";
              const timeAgo = project.updatedAt
                ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })
                : "";

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <div className="group relative rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 glass-card transition-all hover-elevate" data-testid={`card-project-${project.id}`}>
                      <Link href={`/studio/${project.id}`}>
                        <div className="aspect-video relative">
                          <SafeImage
                            src={thumb}
                            alt={project.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute top-2 right-2">
                            <Badge className={`text-[10px] ${stageColor}`}>
                              {stageLabel}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link href={`/studio/${project.id}`}>
                            <h3 className="font-medium truncate hover:text-primary transition-colors text-sm">{project.title}</h3>
                          </Link>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Edit3 className="w-4 h-4" />
                              {"\u0648\u06CC\u0631\u0627\u06CC\u0634"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Copy className="w-4 h-4" />
                              {"\u06A9\u067E\u06CC"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteProject(Number(project.id))}>
                              <Trash2 className="w-4 h-4" />
                              {"\u062D\u0630\u0641"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/30 glass-card transition-all hover-elevate" data-testid={`row-project-${project.id}`}>
                      <Link href={`/studio/${project.id}`} className="w-20 h-12 rounded-lg overflow-hidden relative flex-shrink-0">
                        <SafeImage
                          src={thumb}
                          alt={project.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/studio/${project.id}`}>
                          <h3 className="font-medium truncate hover:text-primary transition-colors">{project.title}</h3>
                        </Link>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      <Badge className={`text-[10px] hidden sm:flex ${stageColor}`}>
                        {stageLabel}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Edit3 className="w-4 h-4" />
                            {"\u0648\u06CC\u0631\u0627\u06CC\u0634"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Copy className="w-4 h-4" />
                            {"\u06A9\u067E\u06CC"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteProject(Number(project.id))}>
                            <Trash2 className="w-4 h-4" />
                            {"\u062D\u0630\u0641"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-border/50 py-4">
          <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Tex2Film &copy; {"\u06F1\u06F4\u06F0\u06F4"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {"\u0646\u06CC\u0631\u0648 \u06AF\u0631\u0641\u062A\u0647 \u0627\u0632"}
              <a
                href="https://fxai.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors"
                data-testid="link-projects-fxai"
              >
                <span className="relative w-3.5 h-3.5 inline-block">
                  <SafeImage src="/logo.png" alt="FX AI" fill sizes="14px" className="object-contain rounded-sm" />
                </span>
                FX AI
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
