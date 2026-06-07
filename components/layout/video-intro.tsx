"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "t2f_intro_seen";

export function VideoIntro() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const already = sessionStorage.getItem(STORAGE_KEY);
    if (!already) {
      setVisible(true);
      const skipTimer = setTimeout(() => setShowSkip(true), 4000);
      return () => clearTimeout(skipTimer);
    }
  }, []);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sessionStorage.setItem(STORAGE_KEY, "1");
    setFading(true);
    setTimeout(() => setVisible(false), 900);
  };

  const handleEnded = () => {
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 1400);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          animate={{ opacity: fading ? 0 : 1 }}
          transition={{ duration: 0.85, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          style={{ pointerEvents: fading ? "none" : "auto" }}
        >
          <video
            ref={videoRef}
            src="/tex2film-intro.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleEnded}
            className="w-full h-full object-contain"
            style={{ background: "#000" }}
          />

          <AnimatePresence>
            {showSkip && !fading && (
              <motion.button
                key="skip"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                onClick={dismiss}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/80 text-xs tracking-widest uppercase transition-colors border border-white/10 hover:border-white/30 px-4 py-2 rounded-full backdrop-blur-sm"
              >
                رد کردن
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
