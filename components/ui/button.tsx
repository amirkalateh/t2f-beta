"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
          "btn-primary text-primary-foreground shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/20 shadow-sm",
        outline:
          "border border-input bg-background shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary/50 shadow-sm",
        ghost: "border-transparent",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
        golden:
          "bg-golden text-golden-foreground border border-golden/20 shadow-sm glow-golden",
        neon:
          "btn-neon no-default-hover-elevate no-default-active-elevate font-semibold tracking-wide",
        neonGolden:
          "btn-neon btn-neon-golden no-default-hover-elevate no-default-active-elevate font-semibold tracking-wide",
        aiGenerate:
          "btn-ai-generate no-default-hover-elevate no-default-active-elevate font-semibold tracking-wide",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
