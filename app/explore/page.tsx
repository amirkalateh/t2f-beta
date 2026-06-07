"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, TrendingUp, Eye, Heart, Image, Video, Film, Trophy, Play } from "lucide-react";
import { MegaNav } from "@/components/layout/mega-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SafeImage from "@/components/ui/safe-image";
import { cinematicFrames } from "@/lib/cinematic-frames";
import { useAuth } from "@/components/providers/auth-provider";

type FilterType = "all" | "image" | "video" | "cinema";

const PERSIAN_TITLES: Record<string, string> = {
  "water-ripples": "بازتاب جنگل در آب",
  "boots-grass": "چکمه‌های قدیمی در علفزار",
  "person-wheat-field": "تامل در گندمزار",
  "man-field-profile": "نیمرخ مردانه در دشت",
  "person-horizon": "قدم زدن تا افق",
  "man-tv-dark": "تنهایی در تاریکی",
  "car-rain-bokeh": "بوکه بارانی شهر",
  "woman-purple-light": "پرتره نئونی",
  "cyberpunk-city": "خیابان سایبرپانک",
  "dark-alley-neon": "کوچه نئونی",
  "rain-portrait": "پرتره بارانی",
};

const MOCK_CREATORS = [
  "آریا فیلم",
  "سینا ویژن",
  "نورا استودیو",
  "کیان آرت",
  "مهسا کریتیو",
  "رامین دیجیتال",
  "الهه سینما",
  "پارسا مدیا",
  "سارا ویژوال",
  "امیر استودیو",
  "نگین هنر",
];

const DETERMINISTIC_VIEWS = [3200, 5800, 1400, 7100, 2900, 4300, 6500, 1800, 8200, 3700, 5100];
const DETERMINISTIC_LIKES = [87, 92, 78, 95, 83, 88, 91, 76, 97, 85, 90];

interface ExploreItem {
  id: string;
  src: string;
  title: string;
  creator: string;
  views: number;
  likePercent: number;
  type: FilterType;
  trending: boolean;
}

const exploreItems: ExploreItem[] = cinematicFrames.map((frame, index) => ({
  id: frame.id,
  src: frame.src,
  title: PERSIAN_TITLES[frame.id] || frame.alt,
  creator: MOCK_CREATORS[index % MOCK_CREATORS.length],
  views: DETERMINISTIC_VIEWS[index % DETERMINISTIC_VIEWS.length],
  likePercent: DETERMINISTIC_LIKES[index % DETERMINISTIC_LIKES.length],
  type: index % 4 === 0 ? "cinema" : index % 3 === 0 ? "video" : "image",
  trending: index < 3,
}));

const FILTERS: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "همه", icon: Compass },
  { value: "image", label: "تصویر", icon: Image },
  { value: "video", label: "ویدیو", icon: Video },
  { value: "cinema", label: "سینما", icon: Film },
];

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function typeLabel(t: FilterType) {
  if (t === "cinema") return "سینما";
  if (t === "video") return "ویدیو";
  return "تصویر";
}

export default function ExplorePage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { isAuthenticated } = useAuth();

  const filtered = filter === "all" ? exploreItems : exploreItems.filter((item) => item.type === filter);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <MegaNav />
      <AppSidebar />

      {/* Cinematic hero banner */}
      <div className={`relative w-full h-56 md:h-72 overflow-hidden pt-14 ${isAuthenticated ? "pe-[60px]" : ""}`}>
        {/* Blurred mosaic background */}
        <div className="absolute inset-0 grid grid-cols-4 gap-0">
          {cinematicFrames.slice(0, 8).map((frame, i) => (
            <div key={frame.id} className="relative overflow-hidden">
              <SafeImage
                src={frame.src}
                alt=""
                fill
                sizes="25vw"
                className="object-cover scale-110"
              />
            </div>
          ))}
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-s from-background/60 to-transparent" />

        {/* Hero text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-3 text-primary">
              <Compass className="w-4 h-4" />
              <span className="text-sm font-medium">کاوش آثار</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">
              الهام بگیر، خلق کن
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              آثار سینمایی خلاقان جامعه Tex2Film را کشف کنید
            </p>
          </motion.div>
        </div>
      </div>

      <div className={`max-w-[1200px] mx-auto px-4 pb-16 ${isAuthenticated ? "pe-[calc(60px+1rem)]" : ""}`}>
        {/* Filters */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            return (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
                className="gap-1.5 btn-lift"
                data-testid={`button-filter-${f.value}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </Button>
            );
          })}
        </div>

        {/* Masonry grid */}
        <div className="columns-2 md:columns-3 xl:columns-4 gap-3 space-y-0" data-testid="explore-grid">
          {filtered.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="break-inside-avoid mb-3"
            >
              <div
                className="relative rounded-xl overflow-hidden group card-interactive border border-border/30"
                data-testid={`explore-card-${item.id}`}
              >
                <SafeImage
                  src={item.src}
                  alt={item.title}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover block"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badges — always visible */}
                <div className="absolute top-2 start-2 flex gap-1">
                  {item.trending && (
                    <Badge variant="default" className="gap-1 text-[10px] py-0 px-1.5" data-testid={`badge-trending-${item.id}`}>
                      <TrendingUp className="w-2.5 h-2.5" />
                      ترند
                    </Badge>
                  )}
                </div>
                <div className="absolute top-2 end-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {typeLabel(item.type)}
                  </Badge>
                </div>

                {/* Info — slides up on hover */}
                <div className="absolute bottom-0 inset-x-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <h3 className="text-white text-sm font-semibold truncate mb-1" data-testid={`explore-title-${item.id}`}>
                    {item.title}
                  </h3>
                  <p className="text-white/70 text-xs mb-2" data-testid={`explore-creator-${item.id}`}>
                    {item.creator}
                  </p>
                  <div className="flex items-center gap-3 text-white/60 text-xs">
                    <span className="flex items-center gap-1" data-testid={`explore-views-${item.id}`}>
                      <Eye className="w-3 h-3" />
                      {formatViews(item.views)}
                    </span>
                    <span className="flex items-center gap-1" data-testid={`explore-likes-${item.id}`}>
                      <Heart className="w-3 h-3" />
                      {item.likePercent}٪
                    </span>
                    {item.type === "video" || item.type === "cinema" ? (
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        ویدیو
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contest section */}
        <div className="rounded-xl border border-border/40 bg-muted/10 p-8 text-center space-y-4 mt-8" data-testid="contest-section">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">مسابقه بعدی به‌زودی...</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            آثار خود را برای مسابقات خلاقیت AI ارسال کنید و با جامعه هنرمندان رقابت کنید
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-1" data-testid="badge-contest-coming-soon">به‌زودی</Badge>
        </div>
      </div>
    </div>
  );
}
