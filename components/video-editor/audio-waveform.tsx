"use client";

import { useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export function AudioWaveform({
  width,
  height,
  color = "rgba(168, 85, 247, 0.7)",
  backgroundColor = "transparent",
  className,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const waveformData = useMemo(() => {
    const barCount = Math.max(20, Math.floor(width / 4));
    return Array.from({ length: barCount }, () => 0.2 + Math.random() * 0.8);
  }, [width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const barWidth = Math.max(2, width / waveformData.length - 1);
    const barGap = 1;
    const centerY = height / 2;

    ctx.fillStyle = color;

    waveformData.forEach((amplitude, i) => {
      const x = i * (barWidth + barGap);
      const barHeight = amplitude * (height * 0.8);
      const y = centerY - barHeight / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    });
  }, [width, height, color, backgroundColor, waveformData]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none", className)}
      style={{ width, height }}
    />
  );
}
