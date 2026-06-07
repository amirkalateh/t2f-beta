"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MegaNav } from "@/components/layout/mega-nav";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import {
  Info,
  FileText,
  Shield,
  Phone,
  ChevronLeft,
  Circle,
} from "lucide-react";

const DOC_NAV = [
  { href: "/about", label: "درباره ما", labelEn: "About", icon: Info },
  { href: "/terms", label: "قوانین استفاده", labelEn: "Terms", icon: FileText },
  { href: "/privacy", label: "حریم خصوصی", labelEn: "Privacy", icon: Shield },
  { href: "/contact", label: "تماس با ما", labelEn: "Contact", icon: Phone },
];

export interface DocSection {
  id: string;
  label: string;
}

interface DocsShellProps {
  badge?: string;
  badgeColor?: string;
  title: string;
  titleEn?: string;
  subtitle: string;
  accentFrom?: string;
  accentTo?: string;
  sections: DocSection[];
  children: React.ReactNode;
}

export function DocsShell({
  badge,
  badgeColor = "bg-primary/20 text-primary border-primary/30",
  title,
  titleEn,
  subtitle,
  accentFrom = "from-primary",
  accentTo = "to-violet-400",
  sections,
  children,
}: DocsShellProps) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { threshold: 0.3, rootMargin: "-80px 0px -50% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <MegaNav />

      {/* Hero */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn("absolute top-0 right-1/2 translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-20 bg-gradient-to-br", accentFrom, accentTo)} />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,hsl(var(--background)))]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 60px,hsl(var(--foreground)/0.3) 60px,hsl(var(--foreground)/0.3) 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,hsl(var(--foreground)/0.3) 60px,hsl(var(--foreground)/0.3) 61px)",
            }}
          />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6"
          >
            <Link href="/" className="hover:text-foreground transition-colors">خانه</Link>
            <ChevronLeft className="w-3 h-3 opacity-50 rotate-180" />
            <span className="text-foreground/70">{title}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {badge && (
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border mb-4", badgeColor)}>
                {badge}
              </span>
            )}
            <h1 className={cn("text-4xl md:text-5xl font-black tracking-tight mb-3 bg-gradient-to-bl bg-clip-text text-transparent", accentFrom, accentTo)}>
              {title}
            </h1>
            {titleEn && (
              <p className="text-sm font-medium text-muted-foreground/50 uppercase tracking-widest mb-3">{titleEn}</p>
            )}
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">{subtitle}</p>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-6 pb-24 w-full flex gap-10 items-start">

        {/* Sidebar — sticky */}
        <aside className="hidden lg:flex flex-col gap-2 w-56 shrink-0 sticky top-28 self-start">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-1 px-2">مستندات</p>
          {DOC_NAV.map(({ href, label, labelEn, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                  active
                    ? "bg-primary/15 text-primary font-semibold border border-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/70")} />
                <span className="flex-1">{label}</span>
                {active && <span className="text-[10px] text-primary/60 font-normal">{labelEn}</span>}
              </Link>
            );
          })}

          {sections.length > 0 && (
            <>
              <div className="h-px bg-border/30 my-3" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-1 px-2">در این صفحه</p>
              {sections.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 group",
                    activeSection === id
                      ? "text-foreground"
                      : "text-muted-foreground/60 hover:text-muted-foreground"
                  )}
                >
                  <Circle className={cn("w-1.5 h-1.5 shrink-0 fill-current transition-all", activeSection === id ? "text-primary scale-125" : "text-muted-foreground/30")} />
                  <span className="text-xs leading-snug">{label}</span>
                </a>
              ))}
            </>
          )}
        </aside>

        {/* Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex-1 min-w-0"
        >
          {children}
        </motion.main>
      </div>

      <Footer />
    </div>
  );
}

/* ── Reusable content primitives ── */

export function DocSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-28 mb-14", className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-gradient-to-l from-border/60 to-transparent" />
        <h2 className="text-xl font-bold text-foreground shrink-0">{title}</h2>
      </div>
      <div className="space-y-4 text-muted-foreground leading-8 text-[15px]">
        {children}
      </div>
    </section>
  );
}

export function DocCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon?: React.ElementType;
  title: string;
  body: string;
  accent?: string;
}) {
  return (
    <div className={cn("relative rounded-2xl border border-border/60 bg-muted/20 p-5 overflow-hidden group hover:border-border transition-colors")}>
      {accent && (
        <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 -translate-y-6 translate-x-6", accent)} />
      )}
      <div className="flex gap-3 items-start relative z-10">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground/70" />
          </div>
        )}
        <div>
          <p className="font-semibold text-sm text-foreground mb-1">{title}</p>
          <p className="text-sm text-muted-foreground leading-6">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function DocHighlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm leading-7 text-foreground/80">
      <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary/50 rounded-full" />
      {children}
    </div>
  );
}
