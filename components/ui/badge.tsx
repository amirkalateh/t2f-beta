import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        pill:
          "rounded-full border-transparent bg-muted text-muted-foreground",
        "pill-active":
          "rounded-full border-transparent bg-primary/15 text-primary",
        glass:
          "rounded-full border-border/50 bg-muted/30 text-foreground backdrop-blur-sm",
        golden:
          "border-transparent bg-golden/10 text-golden border border-golden/20",
        narrative:
          "border-transparent bg-stage-narrative/10 text-stage-narrative border border-stage-narrative/20",
        director_brief:
          "border-transparent bg-stage-director/10 text-stage-director border border-stage-director/20",
        elements:
          "border-transparent bg-stage-elements/10 text-stage-elements border border-stage-elements/20",
        vision:
          "border-transparent bg-stage-vision/10 text-stage-vision border border-stage-vision/20",
        assembly:
          "border-transparent bg-stage-assembly/10 text-stage-assembly border border-stage-assembly/20",
        export:
          "border-transparent bg-stage-export/10 text-stage-export border border-stage-export/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
