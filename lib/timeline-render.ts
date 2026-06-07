"use client";

import type { TimelineTrack, TimelineClip } from "./media-types";

export interface SubtitleConfig {
  text: string;
  startTime: number;
  duration: number;
}

export interface RenderOptions {
  tracks: TimelineTrack[];
  duration: number;
  aspectRatio?: string;
  fps?: number;
  width?: number;
  subtitles?: SubtitleConfig[];
  onProgress?: (progress: number) => void;
  onComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

function getCanvasSize(ratio?: string, baseWidth = 960): { width: number; height: number } {
  switch (ratio) {
    case "9:16": return { width: Math.round(baseWidth * 0.5625), height: baseWidth };
    case "1:1": return { width: baseWidth, height: baseWidth };
    case "4:3": return { width: baseWidth, height: Math.round(baseWidth * 0.75) };
    case "3:4": return { width: Math.round(baseWidth * 0.75), height: baseWidth };
    default: return { width: baseWidth, height: Math.round(baseWidth * 0.5625) }; // 16:9
  }
}

async function preloadVisualAssets(clips: TimelineClip[]): Promise<Map<string, HTMLVideoElement | HTMLImageElement>> {
  const map = new Map<string, HTMLVideoElement | HTMLImageElement>();
  const videoClips = clips.filter(c => c.asset.type === "video" && c.asset.url);
  const imageClips = clips.filter(c => c.asset.type === "image" && (c.asset.url || c.asset.thumbnailUrl));

  await Promise.all([
    ...videoClips.map(async (clip) => {
      const video = document.createElement("video");
      video.src = clip.asset.url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error(`Failed to load video: ${clip.asset.name}`));
        // Timeout fallback
        setTimeout(() => resolve(), 8000);
      });
      map.set(clip.id, video);
    }),
    ...imageClips.map(async (clip) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const src = clip.asset.url || clip.asset.thumbnailUrl || "";
      img.src = src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${clip.asset.name}`));
        setTimeout(() => resolve(), 5000);
      });
      map.set(clip.id, img);
    }),
  ]);
  return map;
}

async function preloadAudioBuffers(clips: TimelineClip[]): Promise<Map<string, AudioBuffer>> {
  const audioCtx = new AudioContext();
  const map = new Map<string, AudioBuffer>();
  const audioClips = clips.filter(c => c.asset.type === "audio" && c.asset.url);

  await Promise.all(
    audioClips.map(async (clip) => {
      try {
        const res = await fetch(clip.asset.url);
        const buf = await res.arrayBuffer();
        const audioBuf = await audioCtx.decodeAudioData(buf);
        map.set(clip.id, audioBuf);
      } catch {
        // Ignore failed audio decodes for MVP
      }
    })
  );
  return map;
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string, canvasWidth: number, canvasHeight: number) {
  if (!text || !text.trim()) return;
  const fontSize = Math.max(14, Math.round(canvasHeight * 0.035));
  const lineHeight = fontSize * 1.4;
  const maxWidth = canvasWidth * 0.9;
  const bottomMargin = Math.round(canvasHeight * 0.06);

  ctx.font = `${fontSize}px "Vazirmatn", "Noto Sans Arabic", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  // Word wrap for Persian text
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine + word;
    if (ctx.measureText(test).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  const totalTextHeight = lines.length * lineHeight;
  const startY = canvasHeight - bottomMargin - totalTextHeight + lineHeight;

  // Draw text outline (stroke) for readability over any background
  ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.15));
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineJoin = "round";
  for (let i = 0; i < lines.length; i++) {
    ctx.strokeText(lines[i], canvasWidth / 2, startY + i * lineHeight);
  }

  // Draw text fill
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], canvasWidth / 2, startY + i * lineHeight);
  }
}

export function renderTimeline(options: RenderOptions): { start: () => void; stop: () => void } {
  const { tracks, duration, aspectRatio, fps = 24, width = 960, subtitles, onProgress, onComplete, onError } = options;
  const { width: canvasWidth, height: canvasHeight } = getCanvasSize(aspectRatio, width);

  let stopped = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let chunks: Blob[] = [];

  const allClips = tracks.flatMap(t => t.clips);

  async function start() {
    try {
      onProgress?.(0);

      // Create offscreen canvas
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas context not available");

      // Preload assets
      const visualAssets = await preloadVisualAssets(allClips);
      const audioBuffers = await preloadAudioBuffers(allClips);
      if (stopped) return;

      onProgress?.(5);

      // Setup video stream
      const videoStream = canvas.captureStream(fps);

      // Setup audio mixing
      audioContext = new AudioContext({ sampleRate: 48000 });
      const destNode = audioContext.createMediaStreamDestination();

      // Schedule audio clips
      const audioClips = allClips.filter(c => c.asset.type === "audio" && audioBuffers.has(c.id));
      for (const clip of audioClips) {
        const buf = audioBuffers.get(clip.id)!;
        const source = audioContext.createBufferSource();
        source.buffer = buf;
        const gain = audioContext.createGain();
        gain.gain.value = clip.muted ? 0 : Math.max(0, Math.min(1, clip.volume ?? 1));
        source.connect(gain);
        gain.connect(destNode);
        // Apply track mute
        const track = tracks.find(t => t.clips.some(c => c.id === clip.id));
        if (track?.muted) gain.gain.value = 0;
        const when = audioContext.currentTime + clip.startTime;
        const offset = clip.inPoint;
        const dur = Math.min(clip.duration, buf.duration - offset);
        if (dur > 0.05) {
          source.start(when, offset, dur);
        }
      }

      // Combine video + audio tracks
      const combinedTracks = [
        ...videoStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks(),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

      mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        onComplete?.(blob);
        audioContext?.close();
      };
      mediaRecorder.onerror = (e) => {
        onError?.(new Error(`MediaRecorder error: ${e}`));
        audioContext?.close();
      };

      mediaRecorder.start(100);
      onProgress?.(10);

      // Render loop
      const frameTime = 1 / fps;
      let currentTime = 0;
      const totalFrames = Math.ceil(duration * fps);
      let frameCount = 0;

      // Fill initial black frame
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Wait a moment for recorder to initialize
      await new Promise(r => setTimeout(r, 200));
      if (stopped) { mediaRecorder.stop(); return; }

      // Start audio context
      await audioContext.resume();

      const renderFrame = () => {
        if (stopped) {
          mediaRecorder?.stop();
          return;
        }

        // Clear
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Find active visual clips (draw bottom tracks first)
        const visualTracks = tracks.filter(t => t.type === "video" && t.visible && !t.locked);
        for (const track of visualTracks) {
          if (track.locked) continue;
          for (const clip of track.clips) {
            if (currentTime < clip.startTime || currentTime >= clip.startTime + clip.duration) continue;
            const sourceTime = clip.inPoint + (currentTime - clip.startTime);
            const asset = visualAssets.get(clip.id);
            if (!asset) continue;

            ctx.globalAlpha = clip.opacity ?? 1;
            if (asset instanceof HTMLVideoElement) {
              try {
                if (asset.readyState >= 2 && asset.duration > 0) {
                  asset.currentTime = Math.min(sourceTime, asset.duration - 0.01);
                  ctx.drawImage(asset, 0, 0, canvasWidth, canvasHeight);
                }
              } catch {
                // Ignore draw errors for MVP
              }
            } else {
              ctx.drawImage(asset, 0, 0, canvasWidth, canvasHeight);
            }
            ctx.globalAlpha = 1;
          }
        }

        // Burn-in subtitles for current frame
        if (subtitles && subtitles.length > 0) {
          const activeSub = subtitles.find(s =>
            currentTime >= s.startTime && currentTime < s.startTime + s.duration
          );
          if (activeSub) {
            drawSubtitle(ctx, activeSub.text, canvasWidth, canvasHeight);
          }
        }

        frameCount++;
        currentTime += frameTime;

        const progress = Math.min(95, 10 + (frameCount / totalFrames) * 85);
        onProgress?.(progress);

        if (currentTime >= duration || frameCount >= totalFrames) {
          // Let recorder finish
          setTimeout(() => {
            mediaRecorder?.stop();
            onProgress?.(100);
          }, 500);
          return;
        }

        // Schedule next frame
        setTimeout(renderFrame, 0);
      };

      renderFrame();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      audioContext?.close();
    }
  }

  function stop() {
    stopped = true;
    mediaRecorder?.stop();
    audioContext?.close();
  }

  return { start, stop };
}
