"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

export function CinematicVideoHero() {
  const { isAuthenticated, isLoading } = useAuth();
  const [phase, setPhase] = useState<
    "loading" | "playing" | "frozen" | "revealed"
  >("loading");
  const [showSkip, setShowSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onCanPlay = () => {
      setPhase("playing");
      skipTimerRef.current = setTimeout(() => setShowSkip(true), 4000);
    };

    const onEnded = () => {
      setPhase("frozen");
      setTimeout(() => setPhase("revealed"), 1200);
    };

    vid.addEventListener("canplaythrough", onCanPlay);
    vid.addEventListener("ended", onEnded);

    return () => {
      vid.removeEventListener("canplaythrough", onCanPlay);
      vid.removeEventListener("ended", onEnded);
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  const handleSkip = () => {
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = videoRef.current.duration || 9999;
    }
    setShowSkip(false);
    setPhase("frozen");
    setTimeout(() => setPhase("revealed"), 600);
  };

  const isContentVisible = phase === "revealed";

  return (
    <section className="relative h-screen overflow-hidden bg-black" dir="rtl">

      {/* Video Layer — full brightness always, no dimming on freeze */}
      <video
        ref={videoRef}
        src="/tex2film-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover sm:object-contain"
        style={{ backgroundColor: "#000" }}
      />

      {/* Vignette — provides contrast for CTAs without dimming the logo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Subtle studio label during playback */}
      <AnimatePresence>
        {phase === "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="text-white/20 text-[10px] tracking-[0.4em] uppercase font-light"
            >
              Tex2Film Studio
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero content — bottom of screen */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-20 md:pb-24 px-6">

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isContentVisible ? 1 : 0, y: isContentVisible ? 0 : 12 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="md:text-base text-white/40 mb-7 tracking-wide text-center text-[19px] font-medium"
        >
          Become the director
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isContentVisible ? 1 : 0, y: isContentVisible ? 0 : 10 }}
          transition={{ duration: 1, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-row flex-wrap items-center justify-center gap-3 w-full max-w-xs mx-auto"
        >
          {isLoading ? (
            <div className="w-36 h-12 rounded-full bg-white/10 animate-pulse" />
          ) : isAuthenticated ? (
            <Link href="/projects" className="w-full">
              <Button
                size="lg"
                variant="aiGenerate"
                className="w-full rounded-full h-12 text-base"
              >
                ورود به استودیو
                <ArrowLeft className="ms-2 w-4 h-4 shrink-0" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup" className="flex-1 min-w-0">
                <Button
                  size="lg"
                  variant="aiGenerate"
                  className="w-full rounded-full h-12 whitespace-nowrap"
                >
                  شروع رایگان
                </Button>
              </Link>
              <Link href="/explore" className="flex-1 min-w-0">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full h-12 border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-sm transition-all whitespace-nowrap"
                >
                  <Play className="me-2 w-4 h-4 fill-current shrink-0" />
                  کاوش آثار
                </Button>
              </Link>
            </>
          )}
        </motion.div>

        {/* Minimal secondary links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isContentVisible ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="flex items-center gap-4 mt-8 text-[11px] text-white/25"
        >
          {[
            { label: "درباره ما", href: "/about" },
            { label: "مستندات", href: "/docs" },
            { label: "تعرفه‌ها", href: "/pricing" },
            { label: "تماس", href: "/contact" },
          ].map((link, i, arr) => (
            <span key={link.href} className="flex items-center gap-4">
              <Link
                href={link.href}
                className="hover:text-white/60 transition-colors tracking-wider"
              >
                {link.label}
              </Link>
              {i < arr.length - 1 && <span className="text-white/10">·</span>}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Skip button */}
      <AnimatePresence>
        {showSkip && phase === "playing" && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handleSkip}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 text-white/25 hover:text-white/60 text-[11px] tracking-[0.2em] uppercase transition-all border border-white/10 hover:border-white/25 px-5 py-2 rounded-full backdrop-blur-sm"
          >
            رد کردن
          </motion.button>
        )}
      </AnimatePresence>

    </section>
  );
}
