"use client";

import SafeImage from "@/components/ui/safe-image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Tex2FilmLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  href?: string;
}

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const textSizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
};

export function FXLogo({ size = "md", showText = true, className, href = "/" }: Tex2FilmLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2", className)} data-testid="tex2film-logo">
      <div className={cn("relative", sizeClasses[size])}>
        <SafeImage
          src="/tex2film-logo.png"
          alt="Tex2Film"
          fill
          sizes="64px"
          className="object-contain dark:invert"
          priority
        />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover-elevate rounded-lg p-1 -m-1">
        {content}
      </Link>
    );
  }

  return content;
}

export function FXLogoIcon({ size = "md", className }: Omit<Tex2FilmLogoProps, "showText" | "href">) {
  return (
    <div className={cn("relative", sizeClasses[size], className)} data-testid="tex2film-logo-icon">
      <SafeImage
        src="/tex2film-logo.png"
        alt="Tex2Film"
        fill
        sizes="48px"
        className="object-contain dark:invert"
        priority
      />
    </div>
  );
}

export function FXAILogo({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <a
      href="https://fxai.ir"
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex items-center gap-1.5 hover-elevate rounded-lg p-1 -m-1", className)}
      data-testid="link-fxai"
    >
      <div className={cn("relative", size === "sm" ? "w-5 h-5" : "w-7 h-7")}>
        <SafeImage
          src="/logo.png"
          alt="FX AI"
          fill
          className="object-contain rounded"
          priority
        />
      </div>
      <span className={cn("font-semibold", size === "sm" ? "text-xs" : "text-sm")}>FX AI</span>
    </a>
  );
}
