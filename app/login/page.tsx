"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SafeImage from "@/components/ui/safe-image";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FXLogo } from "@/components/layout/fx-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";

function LoginPageContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "خطا",
        description: "نام کاربری و رمز عبور را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      const redirect = searchParams?.get("redirect") || "/projects";
      router.push(redirect);
    } else {
      toast({
        title: "خطا در ورود",
        description: result.error || "نام کاربری یا رمز عبور اشتباه است",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = () => {
    toast({
      title: "به‌زودی...",
      description: "ورود با گوگل به‌زودی فعال می‌شود",
    });
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left panel — cinematic image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <SafeImage
          src="/frames/fx-art-1767282647876_1767713197614.png"
          alt=""
          fill
          sizes="50vw"
          className="object-cover scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black via-black/70 to-black/30" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div>
            <FXLogo size="sm" showText={true} href="/" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="max-w-lg"
          >
            <div className="glass-frost rounded-2xl p-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">FX AI Studio</span>
              </div>
              <h2 className="text-3xl font-bold text-white leading-tight">
                داستان‌های خود را
                <br />
                به تصویر بکشید
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                با Tex2Film، از ایده تا ویدیوی سینمایی حرفه‌ای تنها چند کلیک فاصله دارید.
                هوش مصنوعی پیشرفته در خدمت خلاقیت شما.
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/40 text-xs">سرویس فعال</span>
            </div>
            <span className="text-white/20 text-xs">Tex2Film v2.0</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex items-center justify-between p-5">
          <div className="lg:hidden">
            <FXLogo size="sm" />
          </div>
          <div className="lg:block hidden" />
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {/* Glass card form container */}
            <div className="glass-card rounded-2xl ring-1 ring-border/20 p-8 shadow-xl">
              <div className="text-center mb-7">
                {/* FXLogo mark instead of icon square */}
                <div className="flex justify-center mb-4">
                  <FXLogo size="lg" showText={false} href="/" />
                </div>
                <h1 className="text-2xl font-bold mb-1.5">خوش آمدید</h1>
                <p className="text-sm text-muted-foreground">
                  برای ورود اطلاعات حساب خود را وارد کنید
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="نام کاربری خود را وارد کنید"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    dir="ltr"
                    className="text-left rounded-xl"
                    data-testid="input-login-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="رمز عبور خود را وارد کنید"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      dir="ltr"
                      className="text-left ps-10 rounded-xl"
                      data-testid="input-login-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute start-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="aiGenerate"
                  className="w-full gap-2 rounded-xl btn-lift"
                  disabled={isSubmitting}
                  data-testid="button-login-submit"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  {isSubmitting ? "در حال ورود..." : "ورود به حساب"}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card/60 px-3 text-muted-foreground">یا</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 mb-5 rounded-xl btn-lift"
                onClick={handleGoogleLogin}
                data-testid="button-login-google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                ورود با گوگل
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                حساب کاربری ندارید؟{" "}
                <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-to-signup">
                  ثبت‌نام کنید
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
