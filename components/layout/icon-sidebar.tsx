"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FileText,
  Eye,
  Film,
  Download,
  BookOpen,
  Home,
  Settings,
  Plus,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_ORDER } from "@/lib/constants";
import { toPersianNumber } from "@/lib/utils";
import type { ProjectStage } from "@/lib/types";
import { FXLogo } from "@/components/layout/fx-logo";

interface IconSidebarProps {
  currentStage: ProjectStage;
  onStageChange: (stage: ProjectStage) => void;
  projectTitle?: string;
  onNewProject?: () => void;
}

const stageIcons: Record<string, typeof FileText> = {
  narrative: FileText,
  director_brief: Sparkles,
  elements: Film,
  vision: Eye,
  storyboard: BookOpen,
  assembly: Film,
  export: Download,
};

const stageGradients: Record<string, string> = {
  narrative: "from-purple-500 to-pink-500",
  director_brief: "from-purple-600 to-violet-500",
  elements: "from-pink-500 to-rose-500",
  vision: "from-cyan-500 to-teal-500",
  storyboard: "from-violet-500 to-indigo-500",
  assembly: "from-amber-500 to-orange-500",
  export: "from-emerald-500 to-green-500",
};

export function IconSidebar({
  currentStage,
  onStageChange,
  projectTitle = "پروژه جدید",
  onNewProject,
}: IconSidebarProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="w-16 h-full glass-surface flex flex-col items-center py-3 gap-1 border-l border-border/50"
        dir="rtl"
        data-testid="icon-sidebar"
      >
        <div className="mb-2">
          <FXLogo size="sm" showText={false} href="/projects" />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewProject}
              className="mb-1"
              data-testid="icon-sidebar-new-project"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">پروژه جدید</TooltipContent>
        </Tooltip>

        <div className="w-8 h-px bg-border/30 mb-1" />

        <nav className="flex flex-col items-center gap-1 flex-1">
          {STAGE_ORDER.map((stageId, index) => {
            const stage = STAGES[stageId];
            const Icon = stageIcons[stageId];
            const isActive = currentStage === stageId;
            const stageIndex = STAGE_ORDER.indexOf(stageId);
            const isCompleted = stageIndex < currentIndex;
            const isAccessible = stageIndex <= currentIndex;
            const gradient = stageGradients[stageId];

            return (
              <Tooltip key={stageId}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => isAccessible && onStageChange(stageId)}
                    disabled={!isAccessible}
                    aria-label={stage.label}
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      isActive && `bg-gradient-to-br ${gradient} shadow-lg`,
                      isCompleted && "bg-emerald-500/15",
                      !isActive && !isCompleted && isAccessible && "hover-elevate",
                      !isAccessible && "opacity-30 cursor-not-allowed"
                    )}
                    data-testid={`icon-sidebar-stage-${stageId}`}
                  >
                    {isActive && (
                      <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />
                    )}
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          isActive && "text-white",
                          !isActive && "text-muted-foreground"
                        )}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="flex flex-col">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-[10px] text-muted-foreground">{stage.description}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="w-8 h-px bg-border/30 mb-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/projects">
              <Button variant="ghost" size="icon" data-testid="icon-sidebar-home">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left">پروژه‌ها</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="icon-sidebar-settings">
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">تنظیمات</TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
}
