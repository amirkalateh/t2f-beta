"use client";

import SafeImage from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

interface CinemaIconProps {
  src: string | undefined;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  labelEn?: string;
  description?: string;
  mode?: "icon" | "icon-label" | "icon-label-desc" | "full";
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-18 h-18",
};

export function CinemaIcon({
  src,
  alt,
  size = "sm",
  label,
  labelEn,
  description,
  mode = "icon-label",
  className,
  selected,
  onClick,
}: CinemaIconProps) {
  if (!src) return null;

  const iconElement = (
    <div className={cn("relative shrink-0", sizeMap[size])}>
      <SafeImage
        src={src}
        alt={alt}
        fill
        sizes="64px"
        className="object-contain"
      />
    </div>
  );

  if (mode === "icon") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-lg",
          selected && "ring-1 ring-primary bg-primary/10",
          onClick && "cursor-pointer",
          className,
        )}
        onClick={onClick}
      >
        {iconElement}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {iconElement}
      <div className="flex-1 min-w-0">
        {label && (
          <p className={cn(
            "font-medium truncate",
            size === "xs" ? "text-[11px]" : size === "sm" ? "text-xs" : "text-sm",
          )}>
            {label}
          </p>
        )}
        {(mode === "icon-label-desc" || mode === "full") && labelEn && (
          <p className="text-[10px] text-muted-foreground truncate">{labelEn}</p>
        )}
        {mode === "full" && description && (
          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

interface CinemaIconGridProps {
  items: readonly {
    readonly id: string;
    readonly label: string;
    readonly labelEn?: string;
    readonly icon?: string;
    readonly description?: string;
  }[];
  value?: string | null;
  onChange?: (id: string) => void;
  columns?: 2 | 3 | 4 | 5 | 6;
  iconSize?: "xs" | "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
}

const colsMap = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export function CinemaIconGrid({
  items,
  value,
  onChange,
  columns = 4,
  iconSize = "md",
  className,
  "data-testid": dataTestId,
}: CinemaIconGridProps) {
  return (
    <div className={cn("grid gap-0.5", colsMap[columns], className)} data-testid={dataTestId}>
      {items.map((item) => {
        const isSelected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange?.(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-1 rounded-md transition-all duration-200 relative overflow-visible group",
              isSelected
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-primary/80 hover:bg-primary/10",
            )}
          >
            {item.icon && (
              <div className={cn(
                "relative shrink-0 overflow-visible",
                sizeMap[iconSize],
              )}>
                <SafeImage
                  src={item.icon}
                  alt={item.label}
                  fill
                  sizes="64px"
                  className="object-contain transition-all duration-200 !overflow-visible cinema-icon"
                  data-selected={isSelected ? "true" : undefined}
                />
              </div>
            )}
            <div className="text-center w-full">
              <p className={cn(
                "text-[10px] font-medium truncate leading-tight transition-colors duration-200",
                isSelected ? "text-primary" : "group-hover:text-primary/80",
              )}>{item.label}</p>
              {item.labelEn && (
                <p className={cn(
                  "text-[8px] truncate leading-tight transition-colors duration-200",
                  isSelected ? "text-primary/60" : "text-muted-foreground/50 group-hover:text-primary/50",
                )}>{item.labelEn}</p>
              )}
            </div>
            {isSelected && (
              <div className="absolute bottom-0 inset-x-0 mx-auto w-4 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
