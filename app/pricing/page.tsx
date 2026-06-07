"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap, Film, Star, ArrowRight, Users, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

const plans = [
  {
    id: "free",
    name: "رایگان",
    nameEn: "Free",
    price: "۰",
    priceSuffix: "تومان / ماه",
    priceUsd: "$0",
    description: "شروع رایگان و امتحان قابلیت‌ها",
    icon: Zap,
    color: "from-gray-500 to-gray-600",
    borderColor: "border-gray-500/30",
    credits: 50,
    projects: 1,
    maxShots: 8,
    features: [
      { text: "۱ پروژه فعال", included: true },
      { text: "حداکثر ۸ شات", included: true },
      { text: "۵۰ اعتبار ماهانه", included: true },
      { text: "تولید داستان با LLM", included: true },
      { text: "خروجی با واترمارک", included: true },
      { text: "خروجی 720p", included: true },
      { text: "تاریخچه ۷ روز", included: true },
      { text: "تولید تصویر", included: false },
      { text: "تولید ویدیو", included: false },
      { text: "صداگذاری", included: false },
    ],
  },
  {
    id: "creator",
    name: "سازنده",
    nameEn: "Creator",
    price: "۶۰۰٬۰۰۰",
    priceSuffix: "تومان / ماه",
    priceUsd: "~$3.53",
    description: "برای سازندگان محتوای بالغردش",
    icon: Star,
    color: "from-blue-500 to-blue-600",
    borderColor: "border-blue-500/30",
    popular: true,
    credits: 500,
    projects: 5,
    maxShots: 30,
    features: [
      { text: "۵ پروژه فعال", included: true },
      { text: "حداکثر ۳۰ شات", included: true },
      { text: "۵۰۰ اعتبار ماهانه", included: true },
      { text: "تولید تصویر استاندارد", included: true },
      { text: "تولید ویدیو استاندارد", included: true },
      { text: "تبدیل متن به صدا (Flash)", included: true },
      { text: "جلوه‌های صوتی", included: true },
      { text: "خروجی بدون واترمارک", included: true },
      { text: "خروجی 1080p", included: true },
      { text: "تاریخچه ۳۰ روز", included: true },
      { text: "موسیقی و هماهنگ‌سازی", included: false },
    ],
  },
  {
    id: "studio",
    name: "استودیو",
    nameEn: "Studio",
    price: "۱٬۲۰۰٬۰۰۰",
    priceSuffix: "تومان / ماه",
    priceUsd: "~$7.06",
    description: "برای سازندگان حرفه‌ای و استودیوها",
    icon: Crown,
    color: "from-amber-500 to-amber-600",
    borderColor: "border-amber-500/30",
    credits: 1500,
    projects: 20,
    maxShots: 100,
    features: [
      { text: "۲۰ پروژه فعال", included: true },
      { text: "حداکثر ۱۰۰ شات", included: true },
      { text: "۱٬۵۰۰ اعتبار ماهانه", included: true },
      { text: "تولید تصویر حرفه‌ای", included: true },
      { text: "تولید ویدیو حرفه‌ای", included: true },
      { text: "تبدیل متن به صدا شدیدهای ارشمند", included: true },
      { text: "موسیقی و هماهنگ‌سازی", included: true },
      { text: "جلوه‌های صوتی", included: true },
      { text: "خروجی بدون واترمارک", included: true },
      { text: "خروجی 4K", included: true },
      { text: "تاریخچه نامحدود", included: true },
      { text: "پشتیبانی اولویت‌دار", included: true },
    ],
  },
  {
    id: "team",
    name: "تیم",
    nameEn: "Team",
    price: "۲٬۴۰۰٬۰۰۰",
    priceSuffix: "تومان / ماه",
    priceUsd: "~$14.12",
    description: "برای تیم‌های تولید محتوا",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    borderColor: "border-purple-500/30",
    credits: 4000,
    projects: -1,
    maxShots: -1,
    features: [
      { text: "پروژه‌های نامحدود", included: true },
      { text: "شات‌های نامحدود", included: true },
      { text: "۴٬۰۰۰ اعتبار ماهانه", included: true },
      { text: "استخر اعتبار مشترک", included: true },
      { text: "همه قابلیت‌های استودیو", included: true },
      { text: "دسترسی API", included: true },
      { text: "تحلیل مصرف و تگزارش", included: true },
      { text: "پشتیبانی اولویت‌دار + چت", included: true },
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setTimeout(() => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedPlan(null);
      }, 3000);
    }, 2000);
  };

  const faqs = [
    {
      q: "اعتبارها به ماه بعد منتقل می‌شوند؟",
      a: "بله، اعتبارهای استفاده‌نشده در پایان چرخه صورتحساب شما بازنشانی می‌شوند. این استاندارد برای سیستم‌های اعتبار SaaS است. مصرف خود را برنامه‌ریزی کنید.",
    },
    {
      q: "اگر در وسط عملیات اعتبار تمام شد چه می‌شود؟",
      a: "تولید لغو می‌شود و هزینه‌ای برای عملیات ناقص دریافت نمی‌شود. می‌توانید از بسته‌های شارژ استفاده کنید یا پلن خود را ارتقا دهید.",
    },
    {
      q: "چگونه از ایران پرداخت کنم؟",
      a: "از زرین‌پال یا آیدی‌پی استفاده کنید. هر دو از همه کارت‌های بانکی ایرانی (شبکه شتاب) پشتیبانی می‌کنند و نیازی به VPN نیست.",
    },
    {
      q: "فرق تصویر استاندارد و حرفه‌ای چیست؟",
      a: "استاندارد سریع‌تر و کیفیت خوب است. حرفه‌ای کندتر، کیفیت سینمایی و حرکت منسجم‌تر دارد اما ۳.۵ برابر گران‌تر است.",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-muted-foreground hover-elevate rounded-md px-3 py-2"
            data-testid="link-back-projects"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت</span>
          </Link>
          {user && (
            <div className="text-sm text-muted-foreground">
              پلن فعلی شما: <span className="text-foreground font-medium">{user.tier === "unlimited" ? "نامحدود" : user.tier}</span>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 glass-card bg-blue-500/10 text-blue-400 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">نرخ ارز: ۱ دلار = ۱۷۰٬۰۰۰ تومان</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">پلن خود را انتخاب کنید</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            از ایده تا ویدیوی حرفه‌ای تنها چند کلیک فاصله دارید.
            هر عملیات از اعتبار شما کاسته می‌شود.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            <span>
              ۱ اعتبار =
              <span className="font-medium text-foreground"> ۱٬۷۰۰ تومان</span>
              {" "}(۰٫۰۱ دلار)
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-xl border ${plan.borderColor} glass-card bg-transparent p-6 flex flex-col card-interactive ${
                plan.popular ? "ring-2 ring-blue-500/50 scale-[1.02] md:-mt-2 md:mb-2" : ""
              }`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium px-4 py-1 rounded-full">
                  محبوب‌ترین
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                  <plan.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.nameEn}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                </div>
                <span className="text-xs text-muted-foreground/60">{plan.priceUsd}</span>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">اعتبار ماهانه</span>
                  <span className="font-medium">{plan.credits.toLocaleString("fa-IR")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">پروژه</span>
                  <span className="font-medium">{plan.projects === -1 ? "نامحدود" : plan.projects.toLocaleString("fa-IR")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">حداکثر شات</span>
                  <span className="font-medium">{plan.maxShots === -1 ? "نامحدود" : plan.maxShots.toLocaleString("fa-IR")}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      feature.included
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {feature.included ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </div>
                    <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground"}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {user?.tier === "unlimited" ? (
                <button
                  disabled
                  className="w-full py-3 rounded-lg bg-muted text-muted-foreground text-sm cursor-not-allowed"
                  data-testid={`button-plan-${plan.id}`}
                >
                  پلن نامحدود فعال است
                </button>
              ) : selectedPlan === plan.id ? (
                <div className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm text-center">
                  {showSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>با موفقیت فعال شد!</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      در حال پرداخت...
                    </motion.div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  className={`btn-lift w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                      : "bg-muted hover-elevate text-foreground"
                  }`}
                  data-testid={`button-plan-${plan.id}`}
                >
                  {plan.id === "free" ? "شروع رایگان" : `ارتقا به ${plan.name}`}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">سوالات متداول</h2>
            <p className="text-muted-foreground">راهنمای دریافت اعتبار و پرداخت را در بخش پشتیبانی مطالعه کنید</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card rounded-xl p-5 border border-border/40 card-interactive">
                <h3 className="font-medium text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 glass-card rounded-xl px-6 py-4">
            <Film className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-muted-foreground">
              سوالی دارید؟ با تیم پشتیبانی در تماس باشید:{" "}
              <span className="text-foreground">support@fxai.ir</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
