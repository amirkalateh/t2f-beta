"use client";

import SafeImage from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PresetEntry } from "@/lib/preset-data";

interface PresetPickerProps {
  items: PresetEntry[];
  value?: string | null;
  onChange?: (id: string) => void;
  columns?: 3 | 4 | 5 | 6 | 7;
  aspectRatio?: "square" | "landscape" | "portrait";
  title?: string;
  titleEn?: string;
  icon?: JSX.Element;
  className?: string;
  "data-testid"?: string;
}

const colsMap = {
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-3 sm:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-6",
  7: "grid-cols-3 sm:grid-cols-4 md:grid-cols-7",
};

const aspectMap = {
  square: "aspect-square",
  landscape: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
};

export function PresetPicker({
  items,
  value,
  onChange,
  columns = 7,
  aspectRatio = "square",
  title,
  titleEn,
  icon,
  className,
  "data-testid": dataTestId,
}: PresetPickerProps) {
  return (
    <div className={className} data-testid={dataTestId}>
      {(title || titleEn) && (
        <div className="flex items-center gap-2 mb-3">
          {icon}
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {titleEn && <span className="text-[11px] text-muted-foreground/60">{titleEn}</span>}
          {value && <Check className="w-3.5 h-3.5 text-primary ms-auto" />}
        </div>
      )}
      <div className={cn("grid gap-2", colsMap[columns])}>
        {items.map((item) => {
          const isSelected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange?.(item.id)}
              className={cn(
                "group relative flex flex-col items-center rounded-xl overflow-hidden transition-all duration-300",
                isSelected
                  ? "ring-2 ring-primary shadow-[0_0_16px_rgba(var(--primary),0.35)]"
                  : "ring-1 ring-border/40 hover:ring-primary/50 hover:shadow-[0_0_10px_rgba(var(--primary),0.15)]",
              )}
              data-testid={`preset-${item.id}`}
            >
              <div className={cn("relative w-full overflow-hidden", aspectMap[aspectRatio])}>
                <SafeImage
                  src={item.image}
                  alt={item.labelEn}
                  fill
                  sizes="200px"
                  className={cn(
                    "object-cover transition-transform duration-500",
                    !isSelected && "group-hover:scale-105",
                  )}
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/10" />
                )}
                {isSelected && (
                  <div className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_rgba(var(--primary),0.6)] ring-2 ring-primary-foreground/50">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className={cn(
                "w-full py-1.5 px-1 text-center transition-colors duration-200",
                isSelected ? "bg-primary/10" : "bg-card/50",
              )}>
                <p className={cn(
                  "text-[10px] font-medium truncate leading-tight",
                  isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}>{item.labelEn}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
