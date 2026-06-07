import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const VISION_MODEL = "openai/gpt-4o";
const TEXT_MODEL = "openai/gpt-4o-mini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  try {
    const res = await fetch(imageUrl, { timeout: 15000 } as any);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error("Failed to fetch image for vision SFX:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "\u06a9\u0644\u06cc\u062f OpenRouter \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const {
      shotTitle,
      description,
      shotType,
      cameraMovement,
      sceneName,
      imageUrl,
    } = body;

    if (!description) {
      return NextResponse.json(
        {
          error:
            "\u062a\u0648\u0635\u06cc\u0641 \u0634\u0627\u062a \u0645\u0648\u062c\u0648\u062f \u0646\u06cc\u0633\u062a",
        },
        { status: 400 },
      );
    }

    const hasVision = !!imageUrl;

    const systemPrompt = `
You are a professional foley artist and sound designer for film. Your job is to create concise, vivid sound effect (SFX) descriptions for movie scenes. You write in English because the SFX engine requires English prompts.

${hasVision ? "You are shown the actual visual frame of the shot. Describe the EXACT sounds that belong in this frame — nothing more, nothing less." : ""}

Rules:
- Keep prompts under 80 words.
- Focus on the dominant ambient and foreground sounds.
- Avoid music, dialogue, or abstract mood words (e.g., "tension", "emotional").
- Use concrete nouns and verbs: wind, rain, footsteps, door creak, engine rev, birds chirping.
- If the shot involves movement, describe the sound of that movement.
- ${hasVision ? "Look at the image carefully: note weather, environment, objects, characters, and their actions. Every visible detail should map to a sound." : ""}
- Return ONLY valid JSON with no markdown.

Output JSON shape:
{
  "prompt": "string (English SFX description for ElevenLabs)",
  "suggestedDuration": number (seconds, 3-15),
  "dominantSounds": ["string", ...],
  "ambienceLevel": "low" | "medium" | "high",
  "moodTag": "calm" | "energetic" | "tense" | "eerie" | "urban" | "nature"
}`;

    const userText = `Shot: "${shotTitle || ""}"
Scene: "${sceneName || ""}"
Shot type: ${shotType || "unknown"}
Camera movement: ${cameraMovement || "static"}
Description: ${description}

Generate a short English SFX prompt suitable for an AI sound-generation API.`;

    let messages;
    let model = TEXT_MODEL;

    if (hasVision) {
      const base64Image = await fetchImageAsBase64(imageUrl);
      if (base64Image) {
        model = VISION_MODEL;
        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  userText +
                  "\n\nLook at this shot frame and describe the EXACT sounds that should be heard based on what you see.",
              },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ];
      } else {
        // Fallback to text-only if image fetch fails
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ];
      }
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ];
    }

    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "https://tex2film.com",
        "X-Title": "Tex2Film Vision SFX",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter vision SFX prompt error:", errText);
      return NextResponse.json(
        {
          error:
            "\u062e\u0637\u0627 \u062f\u0631 \u062a\u0648\u0644\u06cc\u062f \u067e\u0631\u0627\u0645\u067e\u062a",
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || !parsed.prompt) {
      return NextResponse.json({
        prompt: `Ambient soundscape for ${shotType || "scene"}: ${description.slice(0, 100)}`,
        suggestedDuration: 5,
        dominantSounds: ["ambient"],
        ambienceLevel: "medium",
        moodTag: "neutral",
        raw,
        visionUsed: hasVision,
      });
    }

    return NextResponse.json({ ...parsed, visionUsed: hasVision });
  } catch (error) {
    console.error("SFX prompt generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "\u062e\u0637\u0627 \u062f\u0631 \u0633\u0631\u0648\u0631",
      },
      { status: 500 },
    );
  }
}
