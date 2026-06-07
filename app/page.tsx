"use client";

import { MegaNav } from "@/components/layout/mega-nav";
import { CinematicVideoHero } from "@/components/layout/cinematic-video-hero";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <MegaNav />
      <main>
        <CinematicVideoHero />
      </main>
      <Footer />
    </div>
  );
}
