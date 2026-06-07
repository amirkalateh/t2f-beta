import crypto from "crypto";

const KLING_BASE_URL = "https://api.klingai.com";

type CredentialSet = "image" | "video";

function generateJWT(_credSet: CredentialSet = "video"): string {
  // All Kling calls use the same credentials (video account) — image account has no credits
  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error("Kling API credentials not configured (KLING_ACCESS_KEY / KLING_SECRET_KEY)");
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${base64Header}.${base64Payload}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(signatureInput)
    .digest("base64url");

  return `${signatureInput}.${signature}`;
}

function getAuthHeaders(credSet: CredentialSet = "video"): Record<string, string> {
  return {
    Authorization: `Bearer ${generateJWT(credSet)}`,
    "Content-Type": "application/json",
  };
}

export function stripBase64Prefix(base64: string): string {
  return base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
}

export const KLING_IMAGE_MODELS = [
  { id: "kling-v3-omni", label: "Kling v3 Omni", labelFa: "کلینگ v3 Omni", description: "Latest omni model, 1K, multi-reference", descriptionFa: "جدیدترین مدل، ۱K، چند مرجع" },
  { id: "kling-image-o1", label: "Kling O1 Omni", labelFa: "کلینگ O1 Omni", description: "O1 omni model, multi-image input", descriptionFa: "مدل O1 Omni، ورودی چند تصویری" },
  { id: "kling-v3", label: "Kling v3", labelFa: "کلینگ v3", description: "High consistency, precise detail", descriptionFa: "ثبات بالا، جزئیات دقیق" },
  { id: "kling-v2-1", label: "Kling v2.1", labelFa: "کلینگ v2.1", description: "Stable quality generation", descriptionFa: "تولید با کیفیت پایدار" },
  { id: "kling-v2", label: "Kling v2", labelFa: "کلینگ v2", description: "Standard generation", descriptionFa: "تولید استاندارد" },
  { id: "kling-v1-5", label: "Kling v1.5", labelFa: "کلینگ v1.5", description: "Subject/face reference", descriptionFa: "ارجاع سوژه و چهره" },
  { id: "kling-v1", label: "Kling v1", labelFa: "کلینگ v1", description: "Classic generation", descriptionFa: "تولید کلاسیک" },
] as const;

export type KlingImageModel = typeof KLING_IMAGE_MODELS[number]["id"];

export type ImageReferenceType = "subject" | "face";
export type ImageResolution = "1k" | "2k" | "4k";
export type KlingElementType = "character" | "object";

export function isOmniModel(model: string): boolean {
  return model === "kling-v3-omni" || model === "kling-image-o1";
}

export function isV3Model(model: string): boolean {
  return model === "kling-v3" || model === "kling-v3-omni";
}

export interface ImageGenerationRequest {
  model_name: string;
  prompt: string;
  negative_prompt?: string;
  image_fidelity?: number;
  human_fidelity?: number;
  n?: number;
  aspect_ratio?: string;
  resolution?: ImageResolution;
  callback_url?: string;
  image?: string;
  image_reference?: ImageReferenceType;
  ref_images?: Array<{ url: string; weight?: number }>;
  element_list?: Array<{ element_id: string }>;
}

export interface OmniImageGenerationRequest {
  model_name: string;
  prompt: string;
  negative_prompt?: string;
  image_list?: Array<{ image: string }>;
  element_list?: Array<{ element_id: string }>;
  aspect_ratio?: string;
  resolution?: ImageResolution;
  image_fidelity?: number;
  human_fidelity?: number;
  n?: number;
  callback_url?: string;
}

export interface MultiImageToImageRequest {
  model_name?: string;
  prompt: string;
  negative_prompt?: string;
  subject_image_list: Array<{ subject_image: string }>;
  scene_image?: string;
  style_image?: string;
  aspect_ratio?: string;
  n?: number;
  callback_url?: string;
}

export interface AIMultiShotRequest {
  image: string;
  callback_url?: string;
}


export interface ImageRecognizeRequest {
  image: string;
  callback_url?: string;
}

export interface CreateElementRequest {
  elementFrontalImage: string;
  image_list?: string[];
  video_url?: string;
  type: KlingElementType;
  name: string;
  callback_url?: string;
}

export interface VideoGenerationRequest {
  model_name: string;
  prompt: string;
  negative_prompt?: string;
  cfg_scale?: number;
  mode?: "std" | "pro";
  aspect_ratio?: string;
  duration?: "5" | "10";
  callback_url?: string;
  image_url?: string;
  image_tail_url?: string;
  element_list?: Array<{ element_id: string }>;
}

export interface TaskResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;
  };
}

export interface IdentifyFaceResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    session_id: string;
    final_unit_deduction?: string;
    face_data: Array<{
      face_id: string;
      face_image: string;
      start_time: number;
      end_time: number;
    }>;
  };
}

export interface LipSyncRequest {
  session_id: string;
  face_choose: Array<{
    face_id: string;
    sound_file?: string;
    audio_id?: string;
    sound_start_time: number;
    sound_end_time: number;
    sound_insert_time: number;
    sound_volume?: number;
    original_audio_volume?: number;
  }>;
  external_task_id?: string;
  callback_url?: string;
}

export interface VideoToAudioRequest {
  video_url?: string;
  video_id?: string;
  sound_effect_prompt?: string;
  bgm_prompt?: string;
  asmr_mode?: boolean;
  external_task_id?: string;
  callback_url?: string;
}

export interface TaskQueryResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;
    task_status_msg?: string;
    task_result?: {
      images?: Array<{
        index: number;
        url: string;
      }>;
      videos?: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
      element_id?: string;
      subjects?: Array<{
        segment_image: string;
        label: string;
        bbox: number[];
      }>;
    };
  };
}

export interface ElementQueryResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    element_id: string;
    name: string;
    type: string;
    status: string;
    images?: string[];
  };
}

export interface ElementListResponse {
  code: number;
  message: string;
  request_id: string;
  data: Array<{
    element_id: string;
    name: string;
    type: string;
    status: string;
  }>;
}

export const SUPPORTED_IMAGE_ASPECT_RATIOS = [
  "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3",
] as const;

export const SUPPORTED_OMNI_ASPECT_RATIOS = [
  "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "9:21",
] as const;

export const SUPPORTED_VIDEO_ASPECT_RATIOS = [
  "1:1", "16:9", "9:16",
] as const;

async function klingFetch<T>(endpoint: string, options: RequestInit = {}, credSet: CredentialSet = "video"): Promise<T> {
  const response = await fetch(`${KLING_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(credSet),
      ...(options.headers || {}),
    },
  });

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => "(empty)");
    console.error(`[Kling API Error] ${endpoint}: non-JSON response, status=${response.status}, body=${text.slice(0, 200)}`);
    throw new Error(`Kling API error: ${response.status} — ${text.slice(0, 100)}`);
  }

  if (data.code !== 0 && data.code !== undefined) {
    console.error(`[Kling API Error] ${endpoint}: code=${data.code}, message=${data.message}, request_id=${data.request_id}`);
    throw new Error((data.message as string) || `Kling API error: code ${data.code}`);
  }

  if (!response.ok) {
    throw new Error((data.message as string) || `Kling API error: ${response.status}`);
  }

  return data as T;
}

export async function createImageTask(
  request: ImageGenerationRequest
): Promise<TaskResponse> {
  const body: Record<string, unknown> = {
    model_name: request.model_name,
    prompt: request.prompt,
    n: request.n || 1,
  };

  if (request.negative_prompt) body.negative_prompt = request.negative_prompt;
  if (request.aspect_ratio) body.aspect_ratio = request.aspect_ratio;
  if (request.callback_url) body.callback_url = request.callback_url;
  if (request.resolution) body.resolution = request.resolution;

  if (request.element_list && request.element_list.length > 0) {
    body.element_list = request.element_list;
  }

  if (request.image && request.image_reference) {
    body.image = request.image;
    body.image_reference = request.image_reference;
    if (request.image_fidelity !== undefined) body.image_fidelity = request.image_fidelity;
    if (request.image_reference === "face" && request.human_fidelity !== undefined) {
      body.human_fidelity = request.human_fidelity;
    }
  } else if (request.ref_images && request.ref_images.length > 0) {
    body.ref_images = request.ref_images;
    if (request.image_fidelity !== undefined) body.image_fidelity = request.image_fidelity;
  }

  return klingFetch<TaskResponse>("/v1/images/generations", {
    method: "POST",
    body: JSON.stringify(body),
  }, "image");
}

export async function createOmniImageTask(
  request: OmniImageGenerationRequest
): Promise<TaskResponse> {
  const body: Record<string, unknown> = {
    model_name: request.model_name,
    prompt: request.prompt,
    n: request.n || 1,
  };

  if (request.negative_prompt) body.negative_prompt = request.negative_prompt;
  if (request.aspect_ratio) body.aspect_ratio = request.aspect_ratio;
  if (request.resolution) body.resolution = request.resolution;
  if (request.callback_url) body.callback_url = request.callback_url;

  if (request.image_list && request.image_list.length > 0) {
    body.image_list = request.image_list;
    if (request.image_fidelity !== undefined) body.image_fidelity = request.image_fidelity;
    if (request.human_fidelity !== undefined) body.human_fidelity = request.human_fidelity;
  }

  if (request.element_list && request.element_list.length > 0) {
    body.element_list = request.element_list;
  }

  return klingFetch<TaskResponse>("/v1/images/omni-image", {
    method: "POST",
    body: JSON.stringify(body),
  }, "image");
}

export async function createMultiImageToImageTask(
  request: MultiImageToImageRequest
): Promise<TaskResponse> {
  const body: Record<string, unknown> = {
    prompt: request.prompt,
  };

  if (request.model_name) body.model_name = request.model_name;
  if (request.negative_prompt) body.negative_prompt = request.negative_prompt;
  if (request.aspect_ratio) body.aspect_ratio = request.aspect_ratio;
  if (request.n) body.n = request.n;
  if (request.callback_url) body.callback_url = request.callback_url;

  body.subject_image_list = request.subject_image_list;
  if (request.scene_image) body.scene_image = request.scene_image;
  if (request.style_image) body.style_image = request.style_image;

  return klingFetch<TaskResponse>("/v1/images/multi-image2image", {
    method: "POST",
    body: JSON.stringify(body),
  }, "image");
}

export async function createAIMultiShotTask(
  request: AIMultiShotRequest
): Promise<TaskResponse> {
  const image = request.image.startsWith("data:")
    ? stripBase64Prefix(request.image)
    : request.image;

  const body: Record<string, unknown> = { element_frontal_image: image };
  if (request.callback_url) body.callback_url = request.callback_url;

  return klingFetch<TaskResponse>("/v1/general/ai-multi-shot", {
    method: "POST",
    body: JSON.stringify(body),
  }, "image");
}

export async function createImageRecognizeTask(
  request: ImageRecognizeRequest
): Promise<TaskResponse> {
  const image = request.image.startsWith("data:")
    ? stripBase64Prefix(request.image)
    : request.image;

  const body: Record<string, unknown> = { image };
  if (request.callback_url) body.callback_url = request.callback_url;

  return klingFetch<TaskResponse>("/v1/videos/image-recognize", {
    method: "POST",
    body: JSON.stringify(body),
  }, "video");
}

export async function createElement(
  request: CreateElementRequest
): Promise<TaskResponse> {
  const body: Record<string, unknown> = {
    type: request.type,
    name: request.name,
    element_frontal_image: request.elementFrontalImage,
  };

  if (request.image_list && request.image_list.length > 0) {
    body.image_list = request.image_list;
  }
  if (request.video_url) body.video_url = request.video_url;
  if (request.callback_url) body.callback_url = request.callback_url;

  console.log("[Kling createElement] Sending body keys:", Object.keys(body), "type:", request.type, "name:", request.name, "frontalImage length:", request.elementFrontalImage?.length || 0);

  return klingFetch<TaskResponse>("/v1/general/element", {
    method: "POST",
    body: JSON.stringify(body),
  }, "video");
}

export async function queryElement(elementId: string): Promise<ElementQueryResponse> {
  return klingFetch<ElementQueryResponse>(`/v1/general/element/${elementId}`, {
    method: "GET",
  }, "video");
}

export async function listElements(): Promise<ElementListResponse> {
  return klingFetch<ElementListResponse>("/v1/general/element", {
    method: "GET",
  }, "video");
}

export async function deleteElement(elementId: string): Promise<TaskResponse> {
  return klingFetch<TaskResponse>(`/v1/general/element/${elementId}`, {
    method: "DELETE",
  }, "video");
}

export async function queryImageTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/images/generations/${taskId}`, {
    method: "GET",
  }, "image");
}

export async function queryOmniImageTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/images/omni-image/${taskId}`, {
    method: "GET",
  }, "image");
}

export async function queryMultiImageToImageTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/images/multi-image2image/${taskId}`, {
    method: "GET",
  }, "image");
}

export async function queryAIMultiShotTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/general/ai-multi-shot/${taskId}`, {
    method: "GET",
  }, "image");
}

export async function queryImageRecognizeTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/videos/image-recognize/${taskId}`, {
    method: "GET",
  }, "video");
}

export async function identifyFace(videoUrl: string): Promise<IdentifyFaceResponse> {
  const body: Record<string, unknown> = {};
  if (videoUrl.startsWith("https://")) {
    body.video_url = videoUrl;
  } else {
    body.video_id = videoUrl;
  }
  return klingFetch<IdentifyFaceResponse>("/v1/videos/identify-face", {
    method: "POST",
    body: JSON.stringify(body),
  }, "video");
}

export async function createLipSyncTask(request: LipSyncRequest): Promise<TaskResponse> {
  return klingFetch<TaskResponse>("/v1/videos/advanced-lip-sync", {
    method: "POST",
    body: JSON.stringify(request),
  }, "video");
}

export async function queryLipSyncTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/videos/advanced-lip-sync/${taskId}`, {
    method: "GET",
  }, "video");
}

export async function videoToAudio(request: VideoToAudioRequest): Promise<TaskResponse> {
  const body: Record<string, unknown> = {};
  if (request.video_url) body.video_url = request.video_url;
  if (request.video_id) body.video_id = request.video_id;
  if (request.sound_effect_prompt) body.sound_effect_prompt = request.sound_effect_prompt;
  if (request.bgm_prompt) body.bgm_prompt = request.bgm_prompt;
  if (request.asmr_mode !== undefined) body.asmr_mode = request.asmr_mode;
  if (request.external_task_id) body.external_task_id = request.external_task_id;
  if (request.callback_url) body.callback_url = request.callback_url;
  return klingFetch<TaskResponse>("/v1/audio/video-to-audio", {
    method: "POST",
    body: JSON.stringify(body),
  }, "video");
}

export async function queryVideoToAudioTask(taskId: string): Promise<TaskQueryResponse> {
  return klingFetch<TaskQueryResponse>(`/v1/audio/video-to-audio/${taskId}`, {
    method: "GET",
  }, "video");
}

export async function queryVideoTask(taskId: string, isImage2Video = false): Promise<TaskQueryResponse> {
  const endpoint = isImage2Video
    ? `/v1/videos/image2video/${taskId}`
    : `/v1/videos/text2video/${taskId}`;

  return klingFetch<TaskQueryResponse>(endpoint, {
    method: "GET",
  }, "video");
}

export async function createVideoTask(
  request: VideoGenerationRequest
): Promise<TaskResponse> {
  const isImage2Video = !!request.image_url;
  const endpoint = isImage2Video
    ? "/v1/videos/image2video"
    : "/v1/videos/text2video";

  const body: Record<string, unknown> = {
    model_name: request.model_name,
    prompt: request.prompt,
  };

  if (request.negative_prompt) body.negative_prompt = request.negative_prompt;
  if (request.cfg_scale !== undefined) body.cfg_scale = request.cfg_scale;
  if (request.mode) body.mode = request.mode;
  if (request.aspect_ratio) body.aspect_ratio = request.aspect_ratio;
  if (request.duration) body.duration = request.duration;
  if (request.callback_url) body.callback_url = request.callback_url;

  if (isImage2Video) {
    body.image = request.image_url;
    if (request.image_tail_url) body.image_tail = request.image_tail_url;
  }

  if (request.element_list && request.element_list.length > 0) {
    body.element_list = request.element_list;
  }

  return klingFetch<TaskResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  }, "video");
}

export const klingClient = {
  createImageTask,
  createOmniImageTask,
  createMultiImageToImageTask,
  createAIMultiShotTask,
  createImageRecognizeTask,
  createElement,
  queryElement,
  listElements,
  deleteElement,
  createVideoTask,
  queryImageTask,
  queryOmniImageTask,
  queryMultiImageToImageTask,
  queryAIMultiShotTask,
  queryImageRecognizeTask,
  identifyFace,
  createLipSyncTask,
  queryLipSyncTask,
  videoToAudio,
  queryVideoToAudioTask,
  queryVideoTask,
  isOmniModel,
  isV3Model,
  stripBase64Prefix,
};
