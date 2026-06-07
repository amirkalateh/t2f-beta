"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Info,
  FileText,
  Shield,
  Phone,
  Wand2,
  Eye,
  Clapperboard,
  Layers,
  Film,
  Music2,
  Cpu,
  Sparkles,
  CreditCard,
  Zap,
  Crown,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  Star,
  HelpCircle,
  Lock,
  Image,
  Video,
  Mic,
  Clock,
} from "lucide-react";
import { MegaNav } from "@/components/layout/mega-nav";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

/* ── Data ──────────────────────────────────────────────── */

interface DocArticle {
  title: string;
  desc: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ElementType;
  external?: boolean;
}

interface DocSection {
  id: string;
  heading: string;
  headingEn: string;
  icon: React.ElementType;
  accent: string;
  border: string;
  bg: string;
  dot: string;
  articles: DocArticle[];
}

const SECTIONS: DocSection[] = [
  {
    id: "start",
    heading: "شروع سریع",
    headingEn: "Getting Started",
    icon: Zap,
    accent: "text-yellow-400",
    border: "border-yellow-500/25 hover:border-yellow-500/50",
    bg: "bg-yellow-500/5",
    dot: "bg-yellow-400",
    articles: [
      {
        title: "درباره Tex2Film",
        desc: "پلتفرم چیست و چه کاری می‌کند؟",
        href: "/about",
        icon: Info,
      },
      {
        title: "ثبت‌نام و شروع",
        desc: "ساخت حساب رایگان و اولین پروژه",
        href: "/signup",
        icon: Sparkles,
        badge: "رایگان",
        badgeColor: "bg-emerald-500/15 text-emerald-400",
      },
      {
        title: "تعرفه‌ها و پلن‌ها",
        desc: "مقایسه پلن Free، Creator، و Pro",
        href: "/pricing",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "pipeline",
    heading: "خط تولید",
    headingEn: "Production Pipeline",
    icon: Film,
    accent: "text-violet-400",
    border: "border-violet-500/25 hover:border-violet-500/50",
    bg: "bg-violet-500/5",
    dot: "bg-violet-400",
    articles: [
      {
        title: "۰۱ — روایت",
        desc: "تبدیل ایده به داستان ساختاریافته با LLM",
        href: "/about#pipeline",
        icon: Wand2,
        badge: "مرحله ۱",
        badgeColor: "bg-blue-500/15 text-blue-400",
      },
      {
        title: "۰۲ — ویژوال",
        desc: "تعریف سبک بصری، پالت رنگ، و راهنمای هنری",
        href: "/about#pipeline",
        icon: Eye,
        badge: "مرحله ۲",
        badgeColor: "bg-cyan-500/15 text-cyan-400",
      },
      {
        title: "۰۳ — استوری‌بورد",
        desc: "دوربین‌بندی سینماتیک، تصویر، و ویدیوی هر شات",
        href: "/about#pipeline",
        icon: Clapperboard,
        badge: "مرحله ۳",
        badgeColor: "bg-amber-500/15 text-amber-400",
      },
      {
        title: "۰۴ — مونتاژ",
        desc: "تایم‌لاین، استودیوی صدا، و تدوین",
        href: "/about#pipeline",
        icon: Layers,
        badge: "مرحله ۴",
        badgeColor: "bg-orange-500/15 text-orange-400",
      },
      {
        title: "۰۵ — خروجی",
        desc: "رندر server-side و دانلود ویدیوی نهایی",
        href: "/about#pipeline",
        icon: Film,
        badge: "مرحله ۵",
        badgeColor: "bg-green-500/15 text-green-400",
      },
    ],
  },
  {
    id: "ai-models",
    heading: "مدل‌های AI",
    headingEn: "AI Models",
    icon: Cpu,
    accent: "text-blue-400",
    border: "border-blue-500/25 hover:border-blue-500/50",
    bg: "bg-blue-500/5",
    dot: "bg-blue-400",
    articles: [
      {
        title: "Kling AI — تولید ویدیو",
        desc: "مدل سینماتیک پیشرفته برای کلیپ‌های با کیفیت بالا",
        href: "/about#technology",
        icon: Video,
        badge: "ویدیو",
        badgeColor: "bg-violet-500/15 text-violet-400",
      },
      {
        title: "ElevenLabs — صداسازی",
        desc: "موسیقی، افکت صوتی، و گویندگی چندزبانه",
        href: "/about#technology",
        icon: Music2,
        badge: "صدا",
        badgeColor: "bg-rose-500/15 text-rose-400",
      },
      {
        title: "LLM — هوش روایی",
        desc: "مدل‌های زبانی برای روایت، شات‌نامه، و راهنمای سینماتیک",
        href: "/about#technology",
        icon: Cpu,
        badge: "متن",
        badgeColor: "bg-emerald-500/15 text-emerald-400",
      },
      {
        title: "Image AI — تولید تصویر",
        desc: "آرت‌ورک و فریم‌های استوری‌بورد",
        href: "/about#technology",
        icon: Image,
        badge: "تصویر",
        badgeColor: "bg-amber-500/15 text-amber-400",
      },
    ],
  },
  {
    id: "account",
    heading: "حساب و اعتبار",
    headingEn: "Account & Credits",
    icon: Crown,
    accent: "text-amber-400",
    border: "border-amber-500/25 hover:border-amber-500/50",
    bg: "bg-amber-500/5",
    dot: "bg-amber-400",
    articles: [
      {
        title: "سیستم اعتبار",
        desc: "هر عملیات چند اعتبار مصرف می‌کند؟",
        href: "/pricing",
        icon: Zap,
      },
      {
        title: "پلن‌های اشتراک",
        desc: "Free، Creator، و Pro — تفاوت‌ها و محدودیت‌ها",
        href: "/pricing",
        icon: Crown,
        badge: "Pro",
        badgeColor: "bg-amber-500/15 text-amber-400",
      },
      {
        title: "قوانین اشتراک و استرداد",
        desc: "تمدید خودکار، لغو، و سیاست استرداد",
        href: "/terms#credits",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "support",
    heading: "پشتیبانی",
    headingEn: "Support",
    icon: HelpCircle,
    accent: "text-emerald-400",
    border: "border-emerald-500/25 hover:border-emerald-500/50",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-400",
    articles: [
      {
        title: "ارسال تیکت",
        desc: "مشکلات فنی را از بخش پشتیبانی گزارش دهید",
        href: "/support",
        icon: HelpCircle,
      },
      {
        title: "تماس با ما",
        desc: "ایمیل، شبکه‌های اجتماعی، و فرم تماس",
        href: "/contact",
        icon: Phone,
      },
      {
        title: "زمان پاسخگویی",
        desc: "تیکت‌ها ۲۴–۴۸ ساعت، ایمیل ۵ روز کاری",
        href: "/contact",
        icon: Clock,
        badge: "SLA",
        badgeColor: "bg-blue-500/15 text-blue-400",
      },
    ],
  },
  {
    id: "legal",
    heading: "قانونی",
    headingEn: "Legal",
    icon: Shield,
    accent: "text-muted-foreground",
    border: "border-border/40 hover:border-border/70",
    bg: "bg-muted/10",
    dot: "bg-muted-foreground/50",
    articles: [
      {
        title: "قوانین و شرایط استفاده",
        desc: "حقوق، تکالیف، و محدودیت‌های استفاده از پلتفرم",
        href: "/terms",
        icon: FileText,
      },
      {
        title: "سیاست حریم خصوصی",
        desc: "چه داده‌ای جمع‌آوری می‌شود و چگونه استفاده می‌شود",
        href: "/privacy",
        icon: Shield,
      },
      {
        title: "مالکیت محتوا",
        desc: "مالکیت خروجی‌های AI و حقوق شما",
        href: "/terms#content",
        icon: Lock,
      },
    ],
  },
];

const FEATURED = [
  {
    icon: Wand2,
    title: "اولین پروژه را بسازید",
    desc: "گام‌به‌گام از ایده تا ویدیوی نهایی",
    href: "/signup",
    gradient: "from-violet-500 to-fuchsia-500",
    cta: "شروع رایگان",
  },
  {
    icon: Film,
    title: "خط تولید Tex2Film",
    desc: "۵ مرحله از روایت تا خروجی — چگونه کار می‌کند؟",
    href: "/about#pipeline",
    gradient: "from-blue-500 to-cyan-500",
    cta: "مطالعه بیشتر",
  },
  {
    icon: CreditCard,
    title: "پلن مناسب خود را انتخاب کنید",
    desc: "مقایسه Free، Creator، و Pro",
    href: "/pricing",
    gradient: "from-amber-500 to-orange-500",
    cta: "مشاهده تعرفه‌ها",
  },
];

/* ── Component ──────────────────────────────────────────── */

export default function DocsPage() {
  const [query, setQuery] = useState("");

  const filteredSections = query.trim()
    ? SECTIONS.map((sec) => ({
        ...sec,
        articles: sec.articles.filter(
          (a) =>
            a.title.includes(query) ||
            a.desc.includes(query) ||
            sec.heading.includes(query)
        ),
      })).filter((sec) => sec.articles.length > 0)
    : SECTIONS;

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <MegaNav />

      {/* ── Hero ── */}
      <div className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[120px] opacity-15 bg-gradient-to-br from-primary to-violet-400" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,hsl(var(--background)))]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 60px,hsl(var(--foreground)/0.5) 60px,hsl(var(--foreground)/0.5) 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,hsl(var(--foreground)/0.5) 60px,hsl(var(--foreground)/0.5) 61px)",
            }}
          />
        </div>

        <div className="max-w-[900px] mx-auto px-6 relative z-10 text-center">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-6"
          >
            <Link href="/" className="hover:text-foreground transition-colors">خانه</Link>
            <ChevronLeft className="w-3 h-3 opacity-50 rotate-180" />
            <span className="text-foreground/70">مستندات</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/25 mb-5">
              <BookOpen className="w-3.5 h-3.5" />
              مستندات
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 bg-gradient-to-bl from-foreground to-foreground/40 bg-clip-text text-transparent">
              مرکز مستندات
            </h1>
            <p className="text-lg text-muted-foreground mb-3 max-w-lg mx-auto leading-relaxed">
              هر چیزی که باید درباره Tex2Film بدانید — از شروع سریع تا مفاهیم پیشرفته.
            </p>
            <p className="text-xs text-muted-foreground/40 font-mono uppercase tracking-widest">
              Documentation · Tex2Film v2.0
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 relative max-w-md mx-auto"
          >
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="جستجو در مستندات..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-border/60 bg-muted/20 backdrop-blur-sm pr-10 pl-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pb-28 w-full">

        {/* ── Featured cards ── */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16"
          >
            {FEATURED.map((f, i) => (
              <Link
                key={f.title}
                href={f.href}
                className="group relative rounded-2xl border border-border/40 bg-muted/10 p-6 overflow-hidden hover:border-border/70 transition-all duration-200"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-gradient-to-br ${f.gradient} -translate-y-8 translate-x-8 group-hover:opacity-20 transition-opacity`} />
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 relative z-10`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-bold text-foreground text-sm mb-1 relative z-10">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-5 mb-4 relative z-10">{f.desc}</p>
                <span className={`inline-flex items-center gap-1 text-xs font-medium bg-gradient-to-br ${f.gradient} bg-clip-text text-transparent relative z-10`}>
                  {f.cta}
                  <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" style={{ color: "hsl(var(--primary))" }} />
                </span>
              </Link>
            ))}
          </motion.div>
        )}

        {/* ── Section grid ── */}
        {filteredSections.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">نتیجه‌ای برای «{query}» یافت نشد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSections.map((section, si) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: si * 0.06 }}
                className={`rounded-2xl border ${section.border} ${section.bg} p-6 transition-all duration-200`}
              >
                {/* Section header */}
                <div className="flex items-center gap-2.5 mb-5">
                  <div className={`w-2 h-2 rounded-full ${section.dot}`} />
                  <span className={`font-bold text-sm ${section.accent}`}>{section.heading}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-wider">{section.headingEn}</span>
                </div>

                {/* Articles */}
                <div className="space-y-1">
                  {section.articles.map((article) => (
                    <Link
                      key={article.title}
                      href={article.href}
                      className="group flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-background/50 transition-colors"
                    >
                      {article.icon && (
                        <article.icon className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                            {article.title}
                          </span>
                          {article.badge && (
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", article.badgeColor)}>
                              {article.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 leading-4 truncate">{article.desc}</p>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mt-0.5 rotate-180 group-hover:text-muted-foreground/60 group-hover:-translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Bottom CTA strip ── */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
          >
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                سوال بی‌پاسخ ماند؟
              </h3>
              <p className="text-sm text-muted-foreground">
                تیم پشتیبانی Tex2Film آماده کمک است.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/support"
                className="px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                ارسال تیکت
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                تماس با ما
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
