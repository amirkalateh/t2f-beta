export type ProjectStage = "narrative" | "director_brief" | "vision" | "storyboard" | "assembly" | "export";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "2.4:1" | "1.85:1";
export type ShotType = "extreme_close_up" | "close_up" | "medium_close_up" | "medium" | "medium_wide" | "wide" | "extreme_wide" | "establishing" | "insert" | "cutaway" | "two_shot" | "over_shoulder";
export type CameraAngle = "eye_level" | "high_angle" | "low_angle" | "birds_eye" | "worms_eye" | "dutch" | "pov" | "over_shoulder";
export type CameraMovement = "static" | "pan" | "tilt" | "dolly_in" | "dolly_out" | "truck" | "crane" | "handheld" | "steadicam" | "whip_pan" | "zoom" | "push_in" | "pull_out" | "arc";
export type ShotFocus = "deep_focus" | "shallow_focus" | "soft_focus" | "tilt_shift_v" | "tilt_shift_h";
export type CameraMechanism = "tripod" | "handheld" | "gimbal" | "steadicam" | "crane" | "drone";
export type LightingPreset = "key_light" | "fill_light" | "backlight" | "high_key" | "low_key" | "natural" | "golden_hour" | "blue_hour" | "neon" | "silhouette" | "chiaroscuro" | "soft_diffused" | "hard_dramatic";
export type CameraModel = "arri_alexa_mini_lf" | "arri_alexa_35" | "red_v_raptor" | "red_komodo" | "sony_venice_2" | "sony_fx6" | "blackmagic_ursa_g2" | "blackmagic_pocket_6k" | "canon_c70" | "canon_r5c" | "panasonic_s1h" | "custom";
export type LensType = "spherical" | "anamorphic" | "vintage_anamorphic" | "vintage_spherical" | "macro" | "tilt_shift" | "fisheye" | "custom";
export type FocalLength = "14mm" | "18mm" | "24mm" | "28mm" | "35mm" | "40mm" | "50mm" | "65mm" | "85mm" | "100mm" | "135mm" | "200mm" | "custom";
export type CinemaAspectRatio = "2.39:1" | "2.35:1" | "1.85:1" | "1.66:1" | "16:9" | "4:3" | "1:1" | "9:16" | "custom";
export type ShotStatus = "draft" | "generating" | "generated" | "failed" | "approved" | "rejected";
export type AssetType = "character" | "location" | "property";
export type AudioTrackType = "sfx" | "dialogue" | "narration" | "music";

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  creativeIntent?: string | null;
  style?: string | null;
  tone?: string | null;
  aspectRatio?: AspectRatio | null;
  currentStage: ProjectStage;
  thumbnailUrl?: string | null;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Narrative {
  id: number;
  projectId: number;
  idea?: string | null;
  logline?: string | null;
  outline?: string | null;
  script?: string | null;
  targetAudience?: string | null;
  duration?: string | null;
  version?: number;
  createdAt: string;
}

export interface SceneDefaults {
  locationId?: number | null;
  keyLight?: LightingPreset | null;
  colorGrade?: string | null;
  cameraModel?: CameraModel | null;
  lensType?: LensType | null;
  focalLength?: FocalLength | null;
  cameraMovement?: CameraMovement | null;
  cameraAngle?: CameraAngle | null;
  cinemaAspectRatio?: CinemaAspectRatio | null;
  shotFocus?: ShotFocus | null;
  cameraMechanism?: CameraMechanism | null;
}

export interface SceneVisualIdentity {
  sceneNumber: number;
  sceneName?: string | null;
  timeOfDay?: string | null;
  colorTemperature?: string | null;
  mood?: string | null;
  lightingStyle?: string | null;
  dominantColor?: string | null;
  atmosphereDescription?: string | null;
}

export interface DirectorBrief {
  filmStyle?: string | null;
  filmTexture?: string | null;
  colorScience?: string | null;
  lightingPhilosophy?: string | null;
  overallMood?: string | null;
  referenceFilms?: string | null;
  era?: string | null;
  visualStyle?: string | null;
  cameraBody?: string | null;
  lensFamily?: string | null;
  baseAspectRatio?: string | null;
  signatureMotif?: string | null;
  visualArc?: {
    beginning: string;
    middle: string;
    end: string;
  } | null;
  sceneVisualIdentities?: SceneVisualIdentity[] | null;
}

export interface VisionBoard {
  id: number;
  projectId: number;
  mood?: string | null;
  visualDirection?: string | null;
  colorPalette?: string | null;
  shotList?: string[] | null;
  storyboardFrames?: { description: string; order: number }[] | null;
  sceneDefaults?: Record<string, SceneDefaults> | null;
  directorBrief?: DirectorBrief | null;
  createdAt: string;
}

export interface Shot {
  id: number;
  projectId: number;
  visionBoardId?: number | null;
  order: number;
  title: string;
  description?: string | null;
  prompt?: string | null;
  shotType?: ShotType | null;
  cameraAngle?: CameraAngle | null;
  cameraMovement?: CameraMovement | null;
  shotFocus?: ShotFocus | null;
  cameraMechanism?: CameraMechanism | null;
  keyLight?: LightingPreset | null;
  backLight?: LightingPreset | null;
  mainLight?: LightingPreset | null;
  rimLight?: LightingPreset | null;
  cameraModel?: CameraModel | null;
  lensType?: LensType | null;
  focalLength?: FocalLength | null;
  cinemaAspectRatio?: CinemaAspectRatio | null;
  colorGrade?: string | null;
  cinematographyNotes?: string | null;
  locationId?: number | null;
  characterIds?: number[] | null;
  propIds?: number[] | null;
  generatedImageUrl?: string | null;
  generatedVideoUrl?: string | null;
  lipSyncStatus?: "none" | "identifying" | "syncing" | "completed" | "failed" | null;
  lipSyncTaskId?: string | null;
  lipSyncUrl?: string | null;
  dialogueAudioUrl?: string | null;
  endFrameUrl?: string | null;
  thumbnailUrl?: string | null;
  status: ShotStatus;
  duration?: number | null;
  dialogueText?: string | null;
  notes?: string | null;
  sceneNumber?: number | null;
  sceneName?: string | null;
  generationVersions?: GenerationVersion[] | null;
  raccordNotes?: string | null;
  transitionFromPrev?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GenerationVersion {
  imageUrl?: string;
  videoUrl?: string;
  prompt: string;
  model: string;
  aspectRatio?: string;
  elementIds?: string[];
  duration?: number;
  timestamp: string;
  type: "image" | "video" | "error";
  errorMessage?: string;
  errorType?: "timeout" | "api_failure" | "provider_failure" | "network_error";
}

export type VisionShot = Shot;

export interface Assembly {
  id: number;
  projectId: number;
  timelineData?: TimelineData | null;
  voiceNotes?: string | null;
  sfxNotes?: string | null;
  musicNotes?: string | null;
  finalPreviewUrl?: string | null;
  exportUrl?: string | null;
  exportSettings?: Record<string, unknown> | null;
  status?: string | null;
  createdAt: string;
}

export interface Asset {
  id: number;
  projectId?: number | null;
  userId?: string | null;
  name: string;
  type: AssetType;
  description?: string | null;
  age?: string | null;
  sex?: string | null;
  tags?: string[] | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  mediaType?: string | null;
  source?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  klingElementId?: string | null;
  multiShotUrls?: string[] | null;
  angleImages?: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AudioTrack {
  id: number;
  projectId: number;
  assemblyId?: number | null;
  shotId?: number | null;
  type: AudioTrackType;
  label?: string | null;
  name?: string | null;
  textPrompt?: string | null;
  voiceId?: string | null;
  generatedUrl?: string | null;
  url?: string | null;
  duration?: number | null;
  startTime?: number;
  volume?: number;
  trackIndex?: number;
  status?: "pending" | "generating" | "generated" | "completed" | "failed";
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface TimelineClip {
  id: string;
  type: "video" | "image" | "audio";
  sourceUrl: string;
  startTime: number;
  duration: number;
  trackIndex: number;
  shotId?: number;
  audioTrackId?: number;
  label?: string;
  inPoint?: number;
  outPoint?: number;
  speed?: number;
  volume?: number;
}

export interface TimelineData {
  clips: TimelineClip[];
  duration: number;
  fps: number;
  tracks?: Array<{ id: string; name: string; type: string }>;
}

export interface FullProject extends Project {
  narrative: Narrative | null;
  visionBoard: VisionBoard | null;
  shots: Shot[];
  assembly: Assembly | null;
  audioTracks: AudioTrack[];
}

export type ElementType = "character" | "object" | "place";

export interface Element {
  id: string;
  type: ElementType;
  name: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  createdAt: Date;
}

export interface CinematographyTemplate {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  cameraModel: CameraModel;
  lensType: LensType;
  focalLength: FocalLength;
  cinemaAspectRatio: CinemaAspectRatio;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  cameraMovement: CameraMovement;
  keyLight: LightingPreset;
  colorGrade: string;
}

export type GenerationMode = "image" | "video";

export interface GenerationTask {
  id: string;
  prompt: string;
  mode: GenerationMode;
  model: string;
  aspectRatio: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  resultUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
}
