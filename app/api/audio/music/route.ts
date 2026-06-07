import { NextRequest, NextResponse } from "next/server";
import { checkFeatureFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "کلید API سرویس ElevenLabs تنظیم نشده است" },
      { status: 503 }
    );
  }

  const enabled = await checkFeatureFlag("elevenlabs_music");
  if (!enabled) {
    return NextResponse.json(
      { error: "این قابلیت در حال حاضر غیرفعال است" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { prompt, musicLengthMs = 30000 } = body;

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: "توصیف موسیقی باید حداقل ۱۰ کاراکتر باشد" },
        { status: 400 }
      );
    }

    // ElevenLabs Music compose endpoint
    const response = await fetch(`${ELEVENLABS_API_URL}/music/compose`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        music_length_ms: Math.min(Math.max(musicLengthMs, 5000), 60000),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs Music error:", errText);
      let parsedErr;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        parsedErr = null;
      }
      // Handle bad_prompt error
      if (parsedErr?.detail?.status === "bad_prompt") {
        const suggestion = parsedErr?.detail?.data?.prompt_suggestion || "";
        return NextResponse.json(
          {
            error: "پرامپت شامل مطالب دارای حق تکثیر بود. لطفاً توصیف را تغییر دهید.",
            promptSuggestion: suggestion,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "خطا در تولید موسیقی", detail: errText.slice(0, 200) },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      audioBase64: base64,
      contentType: "audio/mpeg",
      duration: Math.round(musicLengthMs / 1000),
    });
  } catch (error) {
    console.error("Music generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در تولید موسیقی" },
      { status: 500 }
    );
  }
}
