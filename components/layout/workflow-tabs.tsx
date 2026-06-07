"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Layers, 
  Sparkles, 
  Film, 
  Scissors,
  Download,
  type LucideIcon 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type WorkflowTab = "elements" | "gen-space" | "storyboard" | "video-editor" | "export";

interface WorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  className?: string;
}

interface TabConfig {
  id: WorkflowTab;
  label: string;
  labelFa: string;
  icon: LucideIcon;
  badge?: string;
}

const tabs: TabConfig[] = [
  {
    id: "elements",
    label: "Elements",
    labelFa: "عناصر",
    icon: Layers,
  },
  {
    id: "gen-space",
    label: "Gen Space",
    labelFa: "تولید",
    icon: Sparkles,
  },
  {
    id: "storyboard",
    label: "Storyboard",
    labelFa: "استوری‌بورد",
    icon: Film,
  },
  {
    id: "video-editor",
    label: "Video Editor",
    labelFa: "ویرایشگر",
    icon: Scissors,
  },
  {
    id: "export",
    label: "Export",
    labelFa: "خروجی",
    icon: Download,
  },
];

export function WorkflowTabs({ activeTab, onTabChange, className }: WorkflowTabsProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1 p-1 rounded-xl bg-card/50 border border-border/50",
        className
      )}
      data-testid="workflow-tabs"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200",
              "text-sm font-medium",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-${tab.id}`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                transition={{ type: "spring", duration: 0.4 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{tab.labelFa}</span>
            {tab.badge && (
              <Badge 
                variant="golden" 
                className="relative z-10 text-[10px] px-1.5 py-0 hidden md:inline-flex"
              >
                {tab.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Vertical workflow tabs for sidebar
export function WorkflowTabsVertical({ activeTab, onTabChange, className }: WorkflowTabsProps) {
  return (
    <div 
      className={cn("flex flex-col gap-1", className)}
      data-testid="workflow-tabs-vertical"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sm font-medium text-right w-full",
              isActive
                ? "text-primary bg-primary/10 border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            data-testid={`tab-vertical-${tab.id}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{tab.labelFa}</span>
            {tab.badge && (
              <Badge variant="golden" className="text-[10px] px-1.5 py-0">
                {tab.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
