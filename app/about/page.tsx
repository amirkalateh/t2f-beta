"use client";

import { motion } from "framer-motion";
import {
  Clapperboard,
  Sparkles,
  Layers,
  Cpu,
  Eye,
  Music2,
  Film,
  Wand2,
  Mic,
  Zap,
  Globe2,
  Heart,
  ArrowLeft,
  ChevronLeft,
  Star,
} from "lucide-react";
import Link from "next/link";
import {
  DocsShell,
  DocSection,
  DocCard,
  DocHighlight,
} from "@/components/docs/docs-shell";

const SECTIONS = [
  { id: "vision", label: "چشم‌انداز" },
  { id: "mission", label: "مأموریت" },
  { id: "pipeline", label: "خط تولید" },
  { id: "technology", label: "تکنولوژی" },
  { id: "values", label: "ارزش‌ها" },
];

const PIPELINE_STAGES = [
  {
    num: "۰۱",
    en: "Narrative",
    fa: "روایت",
    desc: "از یک ایده خام یا متن، داستان ساختاریافته با LLM پیشرفته شکل می‌گیرد. شخصیت‌ها، کشمکش، و قوس روایی تعریف می‌شوند.",
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    icon: Wand2,
  },
  {
    num: "۰۲",
    en: "Vision",
    fa: "ویژوال",
    desc: "سبک بصری، پالت رنگی، و راهنمای هنری پروژه تعریف می‌شود. AI بر اساس روایت، reference‌های بصری تولید می‌کند.",
    color: "from-cyan-500/20 to-cyan-600/5",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    icon: Eye,
  },
  {
    num: "۰۳",
    en: "Storyboard",
    fa: "استوری‌بورد",
    desc: "هر شات با دوربین‌بندی سینماتیک — لنز، حرکت، نور، و کمپوزیسیون — تعریف می‌شود و تصویر و ویدیوی هر شات تولید می‌شود.",
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    icon: Clapperboard,
  },
  {
    num: "۰۴",
    en: "Assembly",
    fa: "مونتاژ",
    desc: "شات‌ها روی تایم‌لاین چیده می‌شوند. موسیقی، گویندگی، و افکت‌های صوتی در استودیوی صدا تولید و میکس می‌شوند.",
    color: "from-orange-500/20 to-orange-600/5",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    icon: Layers,
  },
  {
    num: "۰۵",
    en: "Export",
    fa: "خروجی",
    desc: "ویدیوی نهایی با رندر server-side، میکس صدا، و نرمال‌سازی رنگ در کیفیت ۱۰۸۰p آماده می‌شود.",
    color: "from-green-500/20 to-green-600/5",
    border: "border-green-500/30",
    dot: "bg-green-500",
    icon: Film,
  },
];

const TECH_STACK = [
  {
    name: "Kling AI",
    role: "تولید ویدیو",
    desc: "پیشرفته‌ترین مدل تولید ویدیوی سینماتیک — حرکت طبیعی دوربین، کیفیت بصری سینمایی.",
    icon: Film,
  },
  {
    name: "ElevenLabs",
    role: "صداسازی",
    desc: "تولید موسیقی، افکت صوتی، و گویندگی چندزبانه با مدل‌های پیشرفته neural TTS.",
    icon: Music2,
  },
  {
    name: "Large Language Models",
    role: "هوش روایی",
    desc: "مدل‌های LLM برای نوشتن داستان، تعریف شات، و راهنمایی سینماتیک در تمام مراحل.",
    icon: Cpu,
  },
  {
    name: "Image AI",
    role: "تولید تصویر",
    desc: "مدل‌های تولید تصویر برای آرت‌ورک، ریفرنس بصری، و فریم‌های استوری‌بورد.",
    icon: Sparkles,
  },
];

const VALUES = [
  {
    icon: Sparkles,
    title: "کیفیت بر سرعت",
    body: "ما ابزاری می‌سازیم که خروجی سینمایی واقعی تولید کند — نه صرفاً سریع، بلکه درست.",
  },
  {
    icon: Globe2,
    title: "دسترسی جهانی",
    body: "خلق سینما نباید به تجهیزات گران‌قیمت یا تیم بزرگ نیاز داشته باشد. Tex2Film برای همه است.",
  },
  {
    icon: Heart,
    title: "خالق‌محور",
    body: "AI ابزار است، نه جایگزین. خلاقیت و چشم‌انداز همیشه از شما می‌آید.",
  },
  {
    icon: Zap,
    title: "نوآوری مداوم",
    body: "پلتفرم ما با سرعت پیشرفت AI رشد می‌کند. هر ماه قابلیت‌های جدیدتری.",
  },
];

export default function AboutPage() {
  return (
    <DocsShell
      badge="Tex2Film"
      badgeColor="bg-violet-500/15 text-violet-400 border-violet-500/25"
      title="درباره ما"
      titleEn="About Tex2Film"
      subtitle="Tex2Film اولین استودیوی AI-native تولید فیلم است — از ایده تا خروجی نهایی، در یک خط تولید یکپارچه."
      accentFrom="from-violet-500"
      accentTo="to-fuchsia-400"
      sections={SECTIONS}
    >
      {/* Intro callout */}
      <DocHighlight>
        Tex2Film یک پلتفرم پیش‌تولید و تولید فیلم است که تمام مراحل — از روایت تا صدا تا تدوین — را در یک محیط یکپارچه و هوشمند گرد هم می‌آورد. هدف ما این است که هر کسی با یک ایده، بتواند یک فیلم واقعی بسازد.
      </DocHighlight>

      <div className="mt-10" />

      {/* Vision */}
      <DocSection id="vision" title="چشم‌انداز">
        <p>
          ما باور داریم قرن بیست‌و‌یکم، قرن دمکراتیزه‌شدن خلق محتواست. همان‌طور که موسیقی در دهه ۲۰۰۰ با DAW‌های مقرون‌به‌صرفه از استودیوهای گران‌قیمت بیرون آمد، امروز نوبت سینماست.
        </p>
        <p>
          Tex2Film با ترکیب قدرتمندترین مدل‌های هوش مصنوعی جهان — از تولید ویدیو گرفته تا صداسازی و روایت — یک خط تولید سینمایی کامل در اختیار هر خالقی قرار می‌دهد.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Star, label: "سینمای شخصی", val: "کیفیت استودیویی" },
            { icon: Zap, label: "سرعت تولید", val: "از ایده تا فیلم" },
            { icon: Globe2, label: "زبان‌ها", val: "چندزبانه" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-muted/10 p-4 text-center">
              <s.icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{s.val}</p>
            </div>
          ))}
        </div>
      </DocSection>

      {/* Mission */}
      <DocSection id="mission" title="مأموریت">
        <p>
          مأموریت Tex2Film ساده است: <strong className="text-foreground">هر داستانی که در ذهن دارید باید بتواند به تصویر تبدیل شود</strong> — بدون نیاز به بودجه بزرگ، تیم کامل، یا دانش فنی عمیق.
        </p>
        <p>
          ما ابزارهای حرفه‌ای‌ای می‌سازیم که با AI تقویت شده‌اند؛ نه برای جایگزین کردن کارگردان، بلکه برای تبدیل ایده‌های ذهنی به تصویر واقعی با سرعت و دقت بسیار بیشتر.
        </p>
        <DocHighlight>
          ما خالق را در مرکز هر تصمیم می‌گذاریم. AI هدایت می‌کند، پیشنهاد می‌دهد، و اجرا می‌کند — اما چشم‌انداز، همیشه از شما می‌آید.
        </DocHighlight>
      </DocSection>

      {/* Pipeline */}
      <DocSection id="pipeline" title="خط تولید">
        <p>
          Tex2Film یک pipeline پنج‌مرحله‌ای دارد که هر مرحله بر اساس خروجی مرحله قبل بنا می‌شود:
        </p>
        <div className="mt-6 space-y-3">
          {PIPELINE_STAGES.map((stage, i) => (
            <motion.div
              key={stage.en}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={`relative rounded-2xl border ${stage.border} bg-gradient-to-l ${stage.color} p-5 flex gap-4 items-start`}
            >
              <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                <span className="text-xs font-mono text-muted-foreground/50">{stage.num}</span>
                <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-foreground">{stage.fa}</span>
                  <span className="text-xs text-muted-foreground/50 font-mono">{stage.en}</span>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{stage.desc}</p>
              </div>
              <stage.icon className="w-5 h-5 text-muted-foreground/30 shrink-0 mt-0.5" />
            </motion.div>
          ))}
        </div>
      </DocSection>

      {/* Technology */}
      <DocSection id="technology" title="تکنولوژی">
        <p>
          Tex2Film از بهترین مدل‌های AI جهان در هر حوزه استفاده می‌کند و آن‌ها را در یک workflow واحد ادغام می‌کند:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {TECH_STACK.map((tech) => (
            <DocCard
              key={tech.name}
              icon={tech.icon}
              title={`${tech.name} — ${tech.role}`}
              body={tech.desc}
            />
          ))}
        </div>
        <p className="mt-5 text-sm">
          تمام مدل‌ها از طریق APIهای رسمی ادغام شده‌اند و به‌روز‌رسانی مداوم می‌شوند تا همیشه از پیشرفته‌ترین نسخه‌ها استفاده شود.
        </p>
      </DocSection>

      {/* Values */}
      <DocSection id="values" title="ارزش‌ها">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VALUES.map((v) => (
            <DocCard key={v.title} icon={v.icon} title={v.title} body={v.body} />
          ))}
        </div>
      </DocSection>

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-8 text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">آماده شروع هستید؟</h3>
        <p className="text-muted-foreground text-sm mb-5">اولین پروژه‌تان را رایگان بسازید.</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          شروع رایگان
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </DocsShell>
  );
}
