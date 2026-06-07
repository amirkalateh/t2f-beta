export type MediaType = "image" | "video" | "audio" | "document";

export interface MediaAsset {
  id: string;
  projectId: string;
  name: string;
  type: MediaType;
  mimeType: string;
  url: string;
  thumbnailUrl: string | null;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  source: "upload" | "generated" | "imported";
  sourceTaskId?: string;
  tags: string[];
  metadata: Record<string, unknown> & {
    hasDialogue?: boolean;
    hasSFX?: boolean;
    waveformData?: number[];
  };
}

export interface MediaAssetInsert {
  projectId: string;
  name: string;
  type: MediaType;
  mimeType: string;
  url: string;
  thumbnailUrl?: string | null;
  size: number;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  source: "upload" | "generated" | "imported";
  sourceTaskId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TimelineClip {
  id: string;
  assetId: string;
  asset: MediaAsset;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  trackIndex: number;
  locked: boolean;
  muted: boolean;
  volume: number;
  opacity: number;
  speed?: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "overlay";
  locked: boolean;
  muted: boolean;
  visible: boolean;
  clips: TimelineClip[];
}

export interface TimelineState {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoom: number;
  scrollX: number;
  selectedClipIds: string[];
  isDragging: boolean;
  draggedClipId: string | null;
  snapEnabled: boolean;
  magnetEnabled: boolean;
}

export const SNAP_THRESHOLD = 10;
export const FRAME_RATE = 30;
export const PIXELS_PER_SECOND = 50;
export const TRACK_HEIGHT = 60;
export const RULER_HEIGHT = 30;
export const MIN_CLIP_WIDTH = 20;

export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function formatTimecode(seconds: number, showFrames = false): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * FRAME_RATE);

  if (showFrames) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  }

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function snapToGrid(time: number, snapInterval: number = 1): number {
  return Math.round(time / snapInterval) * snapInterval;
}

export function findSnapPoints(
  clips: TimelineClip[],
  excludeId: string,
  threshold: number = SNAP_THRESHOLD
): number[] {
  const points: number[] = [0];

  clips.forEach((clip) => {
    if (clip.id !== excludeId) {
      points.push(clip.startTime);
      points.push(clip.startTime + clip.duration);
    }
  });

  return Array.from(new Set(points)).sort((a, b) => a - b);
}

export function snapToPoints(
  time: number,
  points: number[],
  threshold: number,
  pixelsPerSecond: number
): { snapped: number; didSnap: boolean } {
  const thresholdInSeconds = threshold / pixelsPerSecond;

  for (const point of points) {
    if (Math.abs(time - point) < thresholdInSeconds) {
      return { snapped: point, didSnap: true };
    }
  }

  return { snapped: time, didSnap: false };
}
