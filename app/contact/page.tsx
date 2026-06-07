"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Mail,
  MessageCircle,
  Headphones,
  Clock,
  Instagram,
  Twitter,
  Github,
  CheckCircle2,
  ChevronLeft,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { MegaNav } from "@/components/layout/mega-nav";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

const TOPICS = [
  { id: "bug", label: "گزارش باگ" },
  { id: "billing", label: "مسائل مالی" },
  { id: "feature", label: "پیشنهاد ویژگی" },
  { id: "general", label: "سوال عمومی" },
  { id: "partnership", label: "همکاری تجاری" },
  { id: "press", label: "رسانه و مطبوعات" },
];

const CHANNELS = [
  {
    icon: Headphones,
    title: "پشتیبانی فنی",
    desc: "مشکلات پلتفرم، باگ، و سوالات فنی",
    cta: "ارسال تیکت",
    href: "/support",
    accent: "text-violet-400",
    border: "border-violet-500/25 hover:border-violet-500/50",
    bg: "bg-violet-500/5",
  },
  {
    icon: Mail,
    title: "ایمیل مستقیم",
    desc: "hello@tex2film.ai",
    cta: "ارسال ایمیل",
    href: "mailto:hello@tex2film.ai",
    accent: "text-blue-400",
    border: "border-blue-500/25 hover:border-blue-500/50",
    bg: "bg-blue-500/5",
  },
  {
    icon: MessageCircle,
    title: "همکاری تجاری",
    desc: "business@tex2film.ai",
    cta: "ارسال ایمیل",
    href: "mailto:business@tex2film.ai",
    accent: "text-emerald-400",
    border: "border-emerald-500/25 hover:border-emerald-500/50",
    bg: "bg-emerald-500/5",
  },
];

const SOCIAL = [
  { icon: Instagram, label: "Instagram", href: "#", handle: "@tex2film" },
  { icon: Twitter, label: "X / Twitter", href: "#", handle: "@tex2film_ai" },
  { icon: Github, label: "GitHub", href: "#", handle: "tex2film" },
];

const FAQ = [
  {
    q: "چطور اعتبار اضافه کنم؟",
    a: "از منوی پروفایل > خرید اعتبار یا ارتقاء اشتراک را انتخاب کنید.",
  },
  {
    q: "آیا امکان استرداد وجه وجود دارد؟",
    a: "در صورت اختلال فنی اثبات‌شده از سمت پلتفرم، استرداد انجام می‌شود. برای بررسی، تیکت پشتیبانی ارسال کنید.",
  },
  {
    q: "ویدیوهایم چه مدت نگهداری می‌شوند؟",
    a: "تا زمانی که حساب شما فعال است. پس از حذف حساب، داده‌ها ظرف ۳۰ روز پاک می‌شوند.",
  },
  {
    q: "آیا API برای توسعه‌دهندگان وجود دارد؟",
    a: "در حال توسعه است. برای دسترسی زودهنگام، ایمیل بزنید.",
  },
];

export default function ContactPage() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <MegaNav />

      {/* Hero */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-[500px] h-[280px] rounded-full blur-[100px] opacity-15 bg-gradient-to-br from-fuchsia-500 to-violet-400" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,hsl(var(--background)))]" />
        </div>
        <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25 mb-4">
              تماس با ما
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 bg-gradient-to-bl from-fuchsia-500 to-violet-400 bg-clip-text text-transparent">
              چطور کمک کنیم؟
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              تیم Tex2Film آماده پاسخگویی است. کانال مناسب را انتخاب کنید یا فرم زیر را پر کنید.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 pb-24 w-full">

        {/* Channels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14"
        >
          {CHANNELS.map((ch) => (
            <Link
              key={ch.title}
              href={ch.href}
              className={cn(
                "group rounded-2xl border p-5 transition-all duration-200",
                ch.border, ch.bg
              )}
            >
              <ch.icon className={cn("w-6 h-6 mb-3", ch.accent)} />
              <p className="font-semibold text-foreground text-sm mb-1">{ch.title}</p>
              <p className="text-xs text-muted-foreground mb-4 leading-5">{ch.desc}</p>
              <span className={cn("inline-flex items-center gap-1 text-xs font-medium", ch.accent)}>
                {ch.cta}
                <ChevronLeft className="w-3 h-3 rotate-180 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </motion.div>

        {/* Response time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/10 px-5 py-3.5 mb-14"
        >
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">زمان پاسخ معمول:</strong> تیکت‌های پشتیبانی ظرف ۲۴–۴۸ ساعت بررسی می‌شوند. ایمیل‌ها تا ۵ روز کاری.
          </p>
        </motion.div>

        {/* Form + FAQ side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-6">ارسال پیام</h2>

            {submitted ? (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">پیام شما دریافت شد</p>
                <p className="text-sm text-muted-foreground">
                  به‌زودی با آدرس ایمیلی که وارد کردید پاسخ می‌دهیم.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", message: "" }); setSelectedTopic(""); }}
                  className="mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ارسال پیام دیگر
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">موضوع</label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTopic(t.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          selectedTopic === t.id
                            ? "bg-primary/15 text-primary border-primary/40"
                            : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">نام</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="نام شما"
                    className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">ایمیل</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                    dir="ltr"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">پیام</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="پیام خود را اینجا بنویسید..."
                    className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  ارسال پیام
                </button>

                <p className="text-center text-xs text-muted-foreground/60">
                  این فرم اطلاعات شما را طبق{" "}
                  <Link href="/privacy" className="underline hover:text-foreground transition-colors">سیاست حریم خصوصی</Link>{" "}
                  پردازش می‌کند.
                </p>
              </form>
            )}
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-6">سوالات متداول</h2>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 overflow-hidden transition-colors hover:border-border"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 text-right"
                  >
                    <span className="text-sm font-medium text-foreground">{item.q}</span>
                    <ChevronLeft
                      className={cn(
                        "w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform",
                        openFaq === i ? "-rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground leading-7">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Social */}
            <div className="mt-8">
              <p className="text-sm font-medium text-foreground mb-3">شبکه‌های اجتماعی</p>
              <div className="flex gap-2">
                {SOCIAL.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    title={s.label}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 hover:border-border bg-muted/10 hover:bg-muted/30 transition-all group"
                  >
                    <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{s.handle}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Support ticket CTA */}
            <div className="mt-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="flex items-start gap-3">
                <Ticket className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">مشکل فنی دارید؟</p>
                  <p className="text-xs text-muted-foreground mb-3 leading-5">
                    برای مشکلات فنی، تیکت پشتیبانی ارسال کنید تا تیم ما با اطلاعات کامل بررسی کند.
                  </p>
                  <Link
                    href="/support"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    ارسال تیکت
                    <ChevronLeft className="w-3 h-3 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
