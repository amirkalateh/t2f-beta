import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, assemblies, visionShots, audioTracks } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { uploadFromBuffer } from "@/lib/blob-storage";
import { parseProjectId, invalidProjectIdResponse } from "@/lib/parse-project-id";
import { spawn } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project || null;
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buffer);
  } finally {
    clearTimeout(timer);
  }
}

function runFFmpeg(args: string[]): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 0, stderr });
    });
    proc.on("error", (err) => {
      resolve({ exitCode: 1, stderr: err.message });
    });
  });
}

interface RenderExportParams {
  projectId: number;
  videoClips: Array<{ url: string; duration: number; type: "video" | "image"; startTime: number; speed: number }>;
  audioClips: Array<{ url: string; duration: number; startTime: number; volume: number }>;
  totalDuration: number;
}

async function renderExport({ projectId, videoClips, audioClips, totalDuration }: RenderExportParams) {
  const tmpDir = join(tmpdir(), `tex2film-export-${projectId}-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  // --- Step 1: Download and normalize video segments ---
  const videoSegmentPaths: string[] = [];
  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i];
    const ext = clip.type === "video" ? ".mp4" : ".png";
    const srcPath = join(tmpDir, `clip_${i}_orig${ext}`);
    const segPath = join(tmpDir, `clip_${i}.mp4`);
    await downloadFile(clip.url, srcPath);

    const adjustedDuration = clip.duration / clip.speed;

    if (clip.type === "image") {
      const { exitCode, stderr } = await runFFmpeg([
        "-y", "-loop", "1", "-i", srcPath,
        "-c:v", "libx264", "-t", String(adjustedDuration),
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black",
        "-r", "30",
        "-an", segPath,
      ]);
      if (exitCode !== 0) console.warn("Image->video warning:", stderr);
    } else {
      const { exitCode, stderr } = await runFFmpeg([
        "-y", "-i", srcPath,
        "-c:v", "libx264", "-t", String(adjustedDuration),
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black",
        "-r", "30", "-an", segPath,
      ]);
      if (exitCode !== 0) console.warn("Video normalization warning:", stderr);
    }
    if (existsSync(segPath)) videoSegmentPaths.push(segPath);
    try { await unlink(srcPath); } catch { /* ignore */ }
  }

  // --- Step 2: Download and normalize audio segments ---
  const audioSegmentPaths: string[] = [];
  for (let i = 0; i < audioClips.length; i++) {
    const clip = audioClips[i];
    const srcPath = join(tmpDir, `audio_${i}_orig.mp3`);
    const segPath = join(tmpDir, `audio_${i}.mp3`);
    await downloadFile(clip.url, srcPath);
    const { exitCode, stderr } = await runFFmpeg([
      "-y", "-i", srcPath,
      "-ar", "48000", "-ac", "1",
      "-af", `volume=${clip.volume},adelay=delays=${Math.round(clip.startTime * 1000)}:all=1`,
      "-c:a", "libmp3lame", "-q:a", "2",
      "-t", String(totalDuration + 1),
      segPath,
    ]);
    if (exitCode !== 0) console.warn("Audio normalization warning:", stderr);
    if (existsSync(segPath)) audioSegmentPaths.push(segPath);
    try { await unlink(srcPath); } catch { /* ignore */ }
  }

  const hasVideo = videoSegmentPaths.length > 0;
  const hasAudio = audioSegmentPaths.length > 0;
  const finalVideoPath = join(tmpDir, "output.mp4");

  if (hasVideo) {
    // Concat video segments
    const concatListPath = join(tmpDir, "video_list.txt");
    const concatContent = videoSegmentPaths.map(p => `file '${p}'`).join("\n");
    await writeFile(concatListPath, concatContent);
    const concatVideoPath = join(tmpDir, "concat_video.mp4");
    const { exitCode: concatCode, stderr: concatErr } = await runFFmpeg([
      "-y", "-f", "concat", "-safe", "0", "-i", concatListPath,
      "-c", "copy", "-an", concatVideoPath,
    ]);
    if (concatCode !== 0 || !existsSync(concatVideoPath)) {
      console.error("Concat error:", concatErr);
      return NextResponse.json({ error: "Video concat failed", details: concatErr }, { status: 500 });
    }

    if (hasAudio) {
      // Mix all audio segments
      const audioListPath = join(tmpDir, "audio_list.txt");
      const audioContent = audioSegmentPaths.map(p => `file '${p}'`).join("\n");
      await writeFile(audioListPath, audioContent);
      const mixedAudioPath = join(tmpDir, "mixed_audio.mp3");
      const { exitCode: mixCode, stderr: mixErr } = await runFFmpeg([
        "-y", "-f", "concat", "-safe", "0", "-i", audioListPath,
        "-c:a", "libmp3lame", "-q:a", "2", mixedAudioPath,
      ]);
      if (mixCode !== 0 || !existsSync(mixedAudioPath)) {
        console.error("Audio mix error:", mixErr);
        return NextResponse.json({ error: "Audio mix failed", details: mixErr }, { status: 500 });
      }

      // Combine video + audio
      const { exitCode, stderr } = await runFFmpeg([
        "-y", "-i", concatVideoPath, "-i", mixedAudioPath,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-shortest", finalVideoPath,
      ]);
      if (exitCode !== 0 || !existsSync(finalVideoPath)) {
        console.error("Final combine error:", stderr);
        return NextResponse.json({ error: "Final combine failed", details: stderr }, { status: 500 });
      }
    } else {
      const { exitCode, stderr } = await runFFmpeg([
        "-y", "-i", concatVideoPath, "-c:v", "copy", "-an", finalVideoPath,
      ]);
      if (exitCode !== 0 || !existsSync(finalVideoPath)) {
        return NextResponse.json({ error: "Final video failed", details: stderr }, { status: 500 });
      }
    }
  } else if (hasAudio) {
    // Audio-only: create black background + mix audio
    const blackPath = join(tmpDir, "black.mp4");
    const { exitCode: blackCode } = await runFFmpeg([
      "-y", "-f", "lavfi", "-i", `color=c=black:s=1920x1080:d=${Math.ceil(totalDuration)}`,
      "-c:v", "libx264", "-r", "30", "-pix_fmt", "yuv420p", "-an", blackPath,
    ]);
    if (blackCode !== 0 || !existsSync(blackPath)) {
      return NextResponse.json({ error: "Failed to create black video" }, { status: 500 });
    }

    const audioListPath = join(tmpDir, "audio_list.txt");
    const audioContent = audioSegmentPaths.map(p => `file '${p}'`).join("\n");
    await writeFile(audioListPath, audioContent);
    const mixedAudioPath = join(tmpDir, "mixed_audio.mp3");
    const { exitCode: mixCode, stderr: mixErr } = await runFFmpeg([
      "-y", "-f", "concat", "-safe", "0", "-i", audioListPath,
      "-c:a", "libmp3lame", "-q:a", "2", mixedAudioPath,
    ]);
    if (mixCode !== 0 || !existsSync(mixedAudioPath)) {
      console.error("Audio mix error:", mixErr);
      return NextResponse.json({ error: "Audio mix failed", details: mixErr }, { status: 500 });
    }

    const { exitCode, stderr } = await runFFmpeg([
      "-y", "-i", blackPath, "-i", mixedAudioPath,
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-shortest", finalVideoPath,
    ]);
    if (exitCode !== 0 || !existsSync(finalVideoPath)) {
      console.error("Final combine error:", stderr);
      return NextResponse.json({ error: "Final combine failed", details: stderr }, { status: 500 });
    }
  }

  if (!existsSync(finalVideoPath)) {
    return NextResponse.json({ error: "Render output not found" }, { status: 500 });
  }

  const outputBuffer = await readFile(finalVideoPath);
  const pathname = `projects/${projectId}/exports/${Date.now()}_film.mp4`;
  const blob = await uploadFromBuffer(outputBuffer, pathname, "video/mp4");

  // Update assembly
  const [existingAssembly] = await db
    .select()
    .from(assemblies)
    .where(eq(assemblies.projectId, projectId))
    .limit(1);

  if (existingAssembly) {
    await db
      .update(assemblies)
      .set({ exportUrl: blob.url, status: "exported", updatedAt: new Date() })
      .where(eq(assemblies.projectId, projectId));
  } else {
    await db
      .insert(assemblies)
      .values({ projectId, exportUrl: blob.url, status: "exported", createdAt: new Date(), updatedAt: new Date() });
  }

  // Cleanup
  try {
    const files = [
      finalVideoPath,
      join(tmpDir, "concat_video.mp4"),
      join(tmpDir, "mixed_audio.mp3"),
      join(tmpDir, "black.mp4"),
      join(tmpDir, "video_list.txt"),
      join(tmpDir, "audio_list.txt"),
      ...videoSegmentPaths,
      ...audioSegmentPaths,
    ];
    for (const f of files) {
      if (existsSync(f)) await unlink(f);
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    exportUrl: blob.url,
    size: outputBuffer.length,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });
    }

    const projectId = parseProjectId(params.id);
    if (projectId === null) {
      return invalidProjectIdResponse();
    }

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Read assembly timeline
    const [assembly] = await db
      .select()
      .from(assemblies)
      .where(eq(assemblies.projectId, projectId))
      .limit(1);

    const timeline = (assembly?.timeline || null) as { clips?: Array<{ id?: string; type?: string; sourceUrl?: string; startTime?: number; duration?: number; trackIndex?: number; inPoint?: number; outPoint?: number; speed?: number; volume?: number }> } | null;
    const clips = timeline?.clips || [];

    // Fallback: if no timeline, use legacy shot-based export
    if (clips.length === 0) {
      const shots = await db
        .select()
        .from(visionShots)
        .where(eq(visionShots.projectId, projectId))
        .orderBy(asc(visionShots.order));

      const audioTracksList = await db
        .select()
        .from(audioTracks)
        .where(eq(audioTracks.projectId, projectId));

      const videoClips: Array<{ url: string; duration: number; type: "video" | "image"; startTime: number; speed: number }> = [];
      shots.forEach((shot) => {
        const url = shot.lipSyncUrl || shot.generatedVideoUrl || shot.generatedImageUrl;
        const type = shot.lipSyncUrl || shot.generatedVideoUrl ? "video" : "image";
        if (url) {
          videoClips.push({ url, duration: shot.duration || 5, type, startTime: 0, speed: 1 });
        }
      });

      const audioClips: Array<{ url: string; duration: number; startTime: number; volume: number }> = [];
      let totalDuration = 0;
      shots.forEach((shot, idx) => {
        const startTime = shots.slice(0, idx).reduce((sum, s) => sum + (s.duration || 5), 0);
        totalDuration = Math.max(totalDuration, startTime + (shot.duration || 5));
        if (shot.dialogueAudioUrl) {
          audioClips.push({ url: shot.dialogueAudioUrl, duration: shot.duration || 5, startTime, volume: 1 });
        }
      });
      audioTracksList.forEach((track) => {
        if (track.url) {
          const st = (track.startTime ?? 0) / 1000;
          audioClips.push({ url: track.url, duration: track.duration || 5, startTime: st, volume: track.volume ? track.volume / 100 : 1 });
          totalDuration = Math.max(totalDuration, st + (track.duration || 5));
        }
      });

      if (videoClips.length === 0 && audioClips.length === 0) {
        return NextResponse.json({ error: "No media clips to export" }, { status: 400 });
      }

      return renderExport({ projectId, videoClips, audioClips, totalDuration });
    }

    // Build clips from timeline
    const videoClips: Array<{ url: string; duration: number; type: "video" | "image"; startTime: number; speed: number }> = [];
    const audioClips: Array<{ url: string; duration: number; startTime: number; volume: number }> = [];
    let totalDuration = 0;

    for (const clip of clips) {
      const url = clip.sourceUrl;
      if (!url) continue;
      const startTime = clip.startTime ?? 0;
      const duration = clip.duration ?? 5;
      const speed = clip.speed ?? 1;
      const volume = clip.volume ?? 1;
      const type = clip.type || "video";
      totalDuration = Math.max(totalDuration, startTime + duration);

      if (type === "video" || type === "image") {
        videoClips.push({ url, duration, type: type as "video" | "image", startTime, speed });
      } else if (type === "audio") {
        audioClips.push({ url, duration, startTime, volume });
      }
    }

    if (videoClips.length === 0 && audioClips.length === 0) {
      return NextResponse.json({ error: "No media clips to export" }, { status: 400 });
    }

    return renderExport({ projectId, videoClips, audioClips, totalDuration });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
