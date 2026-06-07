import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { visionShots } from "@shared/schema";
import { eq } from "drizzle-orm";
import { buildCinematographyPrompt, buildNegativePrompt } from "@/lib/kling/prompt-builder";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

const MOVEMENT_DESCRIPTIONS: Record<string, string> = {
  "static": "The camera is completely static. The scene stays identical except for subject movement.",
  "pan-left": "Camera pans horizontally to the left, revealing new content on the left while the right side leaves frame.",
  "pan-right": "Camera pans horizontally to the right, revealing new content on the right.",
  "tilt-up": "Camera tilts upward, moving from lower subjects to higher elements — sky, ceiling, treetops.",
  "tilt-down": "Camera tilts downward from a higher position to ground level or lower elements.",
  "zoom-in": "Camera zooms in, magnifying the center subject. Background compresses. Subject fills more frame.",
  "zoom-out": "Camera pulls out to reveal a wider view. Subject shrinks. More background becomes visible.",
  "dolly-in": "Camera physically moves forward toward the subject. Depth increases, background perspective shifts.",
  "dolly-out": "Camera physically moves backward away from subject. More environment comes into frame.",
  "track-left": "Camera tracks laterally to the left, following or revealing subject from a side angle.",
  "track-right": "Camera tracks laterally to the right.",
  "crane-up": "Camera cranes upward to a higher position, revealing the scene from above.",
  "crane-down": "Camera cranes down from a high position to a lower angle.",
  "handheld": "Handheld camera movement — subtle organic shake, slight drift, naturalistic energy.",
  "push-in": "Slow, subtle push toward subject — intimate, tension-building.",
  "pull-out": "Slow pull back from subject — isolation, revelation of context.",
  "pan": "Horizontal camera pan — revealing new content across the frame.",
  "tilt": "Vertical camera tilt — revealing height or depth.",
  "truck": "Lateral tracking shot following subject movement.",
  "crane": "Crane movement rising or descending with vertical sweep.",
  "steadicam": "Smooth steadicam glide — floating, fluid, elegant.",
  "whip_pan": "Fast whip pan with motion blur streaks — energetic transition.",
  "arc": "Camera arcing in orbit around subject — 360° reveal.",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    try {
      await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const body = await request.json();
    const {
      startFrameUrl,
      duration = 3,
      cameraMovement,
      description,
      shotType,
      aspectRatio,
      shotId,
      directorBrief,
      sceneVisualIdentity,
      colorGrade,
      keyLight,
      cameraModel,
      lensType,
      focalLength,
      shotFocus,
      cameraMechanism,
      elements = [],
    } = body;

    if (!startFrameUrl) {
      return NextResponse.json({ error: "startFrameUrl is required" }, { status: 400 });
    }

    const movementDesc = MOVEMENT_DESCRIPTIONS[cameraMovement?.toLowerCase()] ||
      (cameraMovement ? `Camera movement: ${cameraMovement}.` : "Camera is mostly static.");

    const durationNote = duration <= 2
      ? "Very short shot — minimal change between frames."
      : duration <= 4
      ? "Short shot — subtle but visible camera movement."
      : duration <= 7
      ? "Medium shot — clear camera movement, noticeable change in framing."
      : "Long shot — significant camera displacement, dramatically different framing at end.";

    // Build the cinematic context string for the end-frame prompt
    const cinematicContext: string[] = [];
    if (sceneVisualIdentity?.timeOfDay) cinematicContext.push(`${sceneVisualIdentity.timeOfDay} atmosphere`);
    if (sceneVisualIdentity?.colorTemperature) cinematicContext.push(`${sceneVisualIdentity.colorTemperature} color temperature`);
    if (sceneVisualIdentity?.mood) cinematicContext.push(`mood: ${sceneVisualIdentity.mood}`);
    if (sceneVisualIdentity?.lightingStyle) cinematicContext.push(`${sceneVisualIdentity.lightingStyle} lighting`);
    if (sceneVisualIdentity?.dominantColor) cinematicContext.push(`${sceneVisualIdentity.dominantColor} dominant color palette`);
    if (sceneVisualIdentity?.atmosphereDescription) cinematicContext.push(sceneVisualIdentity.atmosphereDescription);
    if (colorGrade) cinematicContext.push(`color grade: ${colorGrade}`);
    if (keyLight) cinematicContext.push(`lighting: ${keyLight}`);
    if (cameraModel) cinematicContext.push(`camera: ${cameraModel}`);
    if (lensType) cinematicContext.push(`lens: ${lensType}`);
    if (focalLength) cinematicContext.push(`focal length: ${focalLength}`);
    if (shotFocus) cinematicContext.push(`focus: ${shotFocus}`);
    if (cameraMechanism) cinematicContext.push(`rig: ${cameraMechanism}`);
    if (directorBrief?.filmTexture) cinematicContext.push(`texture: ${directorBrief.filmTexture}`);
    if (directorBrief?.colorScience) cinematicContext.push(`color science: ${directorBrief.colorScience}`);
    if (directorBrief?.signatureMotif) cinematicContext.push(`motif: ${directorBrief.signatureMotif}`);

    const cinematicContextStr = cinematicContext.length > 0
      ? `\nCINEMATIC CONTEXT (must preserve):\n${cinematicContext.join("\n")}`
      : "";

    const analysisRes = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a cinematography expert and AI image prompt writer. I will show you the START FRAME of a film shot. Your job is to generate a precise image generation prompt for the END FRAME of this shot — what the camera will see after the movement completes.

SHOT INFORMATION:
- Shot type: ${shotType || "unspecified"}
- Duration: ${duration} seconds (${durationNote})
- Camera movement: ${cameraMovement || "static"} — ${movementDesc}
- Scene description: ${description || "No specific description"}
${cinematicContextStr}

TASK:
1. Analyze what is visible in the START FRAME (composition, subjects, background, lighting, mood)
2. Apply the camera movement logically — figure out what the camera frame will contain at the END
3. Write a cinematic image generation prompt for the END FRAME

The end frame prompt MUST:
- Describe EXACTLY what would be visible after the camera movement completes
- Maintain SAME lighting, color grade, atmosphere, and film texture as the start frame
- Preserve ALL cinematic context (time of day, color temperature, mood, lighting style, dominant color)
- Be specific about new framing (what's centered, what's in background, what's cut off, what's newly revealed)
- Be 2-3 sentences, written as a rich cinematic image prompt in English
- NOT describe the movement itself — only describe what the final frame LOOKS LIKE
- Include camera, lens, and focal length if specified in the cinematic context

Return ONLY a JSON object: { "endFramePrompt": "your prompt here", "reasoning": "brief explanation of what changed" }`,
            },
            {
              type: "image_url",
              image_url: { url: startFrameUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const content = analysisRes.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No AI response" }, { status: 500 });
    }

    let parsed: { endFramePrompt: string; reasoning: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    if (!parsed.endFramePrompt) {
      return NextResponse.json({ error: "No end frame prompt generated" }, { status: 500 });
    }

    // Build negative prompt using director brief if available
    const negativePrompt = buildNegativePrompt(directorBrief || null);

    const generateRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
      body: JSON.stringify({
        mode: "image",
        model: "kling-v2",
        prompt: parsed.endFramePrompt,
        negativePrompt,
        aspectRatio: aspectRatio || "16:9",
        resolution: "1k",
        referenceImageUrl: startFrameUrl,
        imageReference: "subject",
        imageFidelity: 0.6,
      }),
    });

    if (!generateRes.ok) {
      const errText = await generateRes.text().catch(() => "unknown");
      console.error(`[EndFrame] Generate failed: ${generateRes.status} ${errText}`);
      return NextResponse.json({ error: "Failed to submit generation", detail: errText }, { status: 500 });
    }

    const generateData = await generateRes.json();

    const durationMs = Date.now() - startTime;
    console.log(JSON.stringify({
      route: "AI/end-frame",
      durationMs,
      shotId,
      hasDirectorBrief: !!directorBrief,
      hasSceneVisualIdentity: !!sceneVisualIdentity,
      promptLength: parsed.endFramePrompt.length,
    }));

    return NextResponse.json({
      taskId: generateData.taskId,
      imageSource: generateData.imageSource,
      prompt: parsed.endFramePrompt,
      reasoning: parsed.reasoning,
      shotId,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[EndFrame] Error after ${durationMs}ms:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
