import { NextRequest, NextResponse } from "next/server";
import { checkFeatureFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const DEFAULT_VOICES: Record<string, { id: string; name: string }> = {
  persian_male: { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  persian_female: { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  tara: { id: "FX9jgscUzO7OJVMgITol", name: "Tara" },
  narrator: { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  adam: { id: "pNInz6obiiDQlFQPdG0O", name: "Adam" },
  bella: { id: "XB0fDUnXU5powFXDhCwa", name: "Bella" },
  rachel: { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "کلید API سرویس ElevenLabs تنظیم نشده است" },
      { status: 503 },
    );
  }

  const enabled = await checkFeatureFlag("elevenlabs_tts");
  if (!enabled) {
    return NextResponse.json(
      { error: "این قابلیت در حال حاضر غیرفعال است" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { text, voiceId, voicePreset, modelId = "eleven_v3", emotion = "neutral", speed = 1 } = body;

    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: "متن باید حداقل ۲ کاراکتر باشد" },
        { status: 400 },
      );
    }

    const resolvedVoiceId =
      voiceId || DEFAULT_VOICES[voicePreset]?.id || DEFAULT_VOICES.narrator.id;

    // Emotion mapping for voice settings
    const emotionSettings: Record<string, { stability: number; similarity_boost: number; style: number }> = {
      neutral: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
      happy: { stability: 0.4, similarity_boost: 0.8, style: 0.5 },
      sad: { stability: 0.6, similarity_boost: 0.7, style: 0.2 },
      angry: { stability: 0.3, similarity_boost: 0.85, style: 0.7 },
      whispering: { stability: 0.7, similarity_boost: 0.65, style: 0.1 },
      excited: { stability: 0.35, similarity_boost: 0.8, style: 0.6 },
      dramatic: { stability: 0.45, similarity_boost: 0.78, style: 0.55 },
    };
    const settings = emotionSettings[emotion] || emotionSettings.neutral;

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarity_boost,
            style: settings.style,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs TTS error:", errText);
      return NextResponse.json(
        { error: "خطا در تولید صدا" },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      audioBase64: base64,
      contentType: "audio/mpeg",
      voiceId: resolvedVoiceId,
    });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در تولید صدا" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      voices: Object.entries(DEFAULT_VOICES).map(([key, v]) => ({
        ...v,
        preset: key,
      })),
    });
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: { "xi-api-key": apiKey },
    });
    const data = await response.json();
    return NextResponse.json({ voices: data.voices || [] });
  } catch {
    return NextResponse.json({
      voices: Object.entries(DEFAULT_VOICES).map(([key, v]) => ({
        ...v,
        preset: key,
      })),
    });
  }
}
