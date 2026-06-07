const BASE = "/icons/cinema";

export type CinemaIconCategory =
  | "shot-size"
  | "shot-framing"
  | "shot-angle"
  | "shot-focus"
  | "camera-movement"
  | "camera-mechanism"
  | "motion-graph";

export interface CinemaIconEntry {
  id: string;
  icon: string;
  label: string;
  labelEn: string;
  description?: string;
}

export const SHOT_SIZE_ICONS: Record<string, string> = {
  extreme_close_up: `${BASE}/shot-size/extreme-close-up.png`,
  close_up: `${BASE}/shot-size/close-up.png`,
  medium_close_up: `${BASE}/shot-size/medium-close-up.png`,
  medium: `${BASE}/shot-size/medium.png`,
  medium_wide: `${BASE}/shot-size/medium-full.png`,
  cowboy: `${BASE}/shot-size/cowboy.png`,
  wide: `${BASE}/shot-size/full.png`,
  extreme_wide: `${BASE}/shot-size/extreme-long.png`,
  establishing: `${BASE}/shot-size/long.png`,
};

export const SHOT_FRAMING_ICONS: Record<string, string> = {
  single: `${BASE}/shot-framing/single.png`,
  two_shot: `${BASE}/shot-framing/two-shot.png`,
  three_shot: `${BASE}/shot-framing/three-shot.png`,
  four_shot: `${BASE}/shot-framing/four-shot.png`,
  five_shot: `${BASE}/shot-framing/five-shot.png`,
  crowd: `${BASE}/shot-framing/crowd.png`,
  over_shoulder: `${BASE}/shot-framing/over-shoulder.png`,
  pov: `${BASE}/shot-framing/pov.png`,
  insert: `${BASE}/shot-framing/insert.png`,
  cutaway: `${BASE}/shot-framing/insert.png`,
};

export const SHOT_ANGLE_ICONS: Record<string, string> = {
  eye_level: `${BASE}/shot-angle/eye-level.png`,
  high_angle: `${BASE}/shot-angle/high-angle.png`,
  low_angle: `${BASE}/shot-angle/low-angle.png`,
  birds_eye: `${BASE}/shot-angle/overhead.png`,
  worms_eye: `${BASE}/shot-angle/ground-level.png`,
  dutch: `${BASE}/shot-angle/dutch.png`,
  overhead: `${BASE}/shot-angle/overhead.png`,
  shoulder_level: `${BASE}/shot-angle/shoulder-level.png`,
  ground_level: `${BASE}/shot-angle/ground-level.png`,
  hip_level: `${BASE}/shot-angle/hip-level.png`,
  knee_level: `${BASE}/shot-angle/knee-level.png`,
};

export const SHOT_FOCUS_ICONS: Record<string, string> = {
  deep_focus: `${BASE}/shot-focus/deep-focus.png`,
  shallow_focus: `${BASE}/shot-focus/shallow-focus.png`,
  soft_focus: `${BASE}/shot-focus/soft-focus.png`,
  tilt_shift_v: `${BASE}/shot-focus/tilt-shift-v.png`,
  tilt_shift_h: `${BASE}/shot-focus/tilt-shift-h.png`,
};

export const CAMERA_MOVEMENT_ICONS: Record<string, string> = {
  static: `${BASE}/camera-mechanism/tripod.png`,
  dolly_in: `${BASE}/camera-movement/dolly.png`,
  dolly_out: `${BASE}/camera-movement/dolly.png`,
  boom: `${BASE}/camera-movement/boom.png`,
  truck: `${BASE}/camera-movement/truck.png`,
  pan: `${BASE}/camera-movement/pan.png`,
  tilt: `${BASE}/camera-movement/tilt.png`,
  roll: `${BASE}/camera-movement/roll.png`,
  arc: `${BASE}/camera-movement/arc.png`,
  rotate_360: `${BASE}/camera-movement/360.png`,
  whip_pan: `${BASE}/camera-movement/pan.png`,
  zoom: `${BASE}/camera-movement/dolly.png`,
  push_in: `${BASE}/camera-movement/dolly.png`,
  pull_out: `${BASE}/camera-movement/dolly.png`,
  crane: `${BASE}/camera-mechanism/crane.png`,
  handheld: `${BASE}/camera-mechanism/handheld.png`,
  steadicam: `${BASE}/camera-mechanism/steadicam.png`,
};

export const CAMERA_MECHANISM_ICONS: Record<string, string> = {
  tripod: `${BASE}/camera-mechanism/tripod.png`,
  handheld: `${BASE}/camera-mechanism/handheld.png`,
  gimbal: `${BASE}/camera-mechanism/gimbal.png`,
  steadicam: `${BASE}/camera-mechanism/steadicam.png`,
  crane: `${BASE}/camera-mechanism/crane.png`,
  drone: `${BASE}/camera-mechanism/drone.png`,
};

export const MOTION_GRAPH_ICONS: Record<string, string> = {
  linear: `${BASE}/motion-graph/ease-in.png`,
  ease_in: `${BASE}/motion-graph/ease-in.png`,
  ease_out: `${BASE}/motion-graph/ease-out.png`,
  easy_ease: `${BASE}/motion-graph/easy-ease.png`,
  bounce: `${BASE}/motion-graph/bounce.png`,
  hold: `${BASE}/motion-graph/hold.png`,
};

export function getShotTypeIcon(id: string): string | undefined {
  return SHOT_SIZE_ICONS[id] || SHOT_FRAMING_ICONS[id];
}

export function getCameraAngleIcon(id: string): string | undefined {
  return SHOT_ANGLE_ICONS[id];
}

export function getCameraMovementIcon(id: string): string | undefined {
  return CAMERA_MOVEMENT_ICONS[id];
}

export function getShotFocusIcon(id: string): string | undefined {
  return SHOT_FOCUS_ICONS[id];
}

export function getCameraMechanismIcon(id: string): string | undefined {
  return CAMERA_MECHANISM_ICONS[id];
}
