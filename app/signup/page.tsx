"use client";

import Link from "next/link";
import SafeImage from "@/components/ui/safe-image";
import { motion } from "framer-motion";
import { Lock, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FXLogo } from "@/components/layout/fx-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const benefits = [
  "دسترسی به ابزارهای AI تولید ویدیو",
  "استفاده از دوربین‌های سینمایی حرفه‌ای",
  "تولید فیلمنامه و استوری‌بورد خودکار",
  "خروجی 4K با کیفیت سینمایی",
];

export default function SignupPage() {
  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <SafeImage
          src="/frames/fx-art-1767281800380_1767713197614.png"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-l from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              فیلم‌سازی هوشمند
            </h2>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3 text-white/80"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        <div className="flex items-center justify-between p-4">
          <FXLogo size="sm" />
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="glass-card rounded-2xl ring-1 ring-border/20 p-8 shadow-xl text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2">ثبت‌نام</h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                در حال حاضر ثبت‌نام با دعوتنامه امکان‌پذیر است
              </p>

              <div className="rounded-xl border border-border/40 bg-muted/30 p-5 mb-6 text-start space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  برای دریافت دعوتنامه و دسترسی به Tex2Film، با تیم ما تماس بگیرید یا منتظر باز شدن ثبت‌نام عمومی باشید.
                </p>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full gap-2 rounded-xl btn-lift" data-testid="button-go-to-login">
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  ورود به حساب موجود
                </Button>
              </Link>

              <p className="text-center text-sm text-muted-foreground mt-5">
                حساب کاربری دارید؟{" "}
                <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-to-login">
                  وارد شوید
                </Link>
              </p>
            </div>
          </motion.div>
        </div>

        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            نیرو گرفته از
            <a href="https://fxai.ir" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors">
              <span className="relative w-3.5 h-3.5 inline-block">
                <SafeImage src="/logo.png" alt="FX AI" fill sizes="14px" className="object-contain rounded-sm" />
              </span>
              FX AI
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
