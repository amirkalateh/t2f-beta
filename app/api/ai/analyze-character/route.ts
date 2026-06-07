import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
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
    const { imageUrl, name, description } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a film costume and character continuity supervisor. Analyze this character image carefully.
Character name: ${name || "Unknown"}${description ? `\nContext: ${description}` : ""}

Extract their visual appearance for film shot continuity tracking. Return a JSON object with exactly these fields:

{
  "clothing": "Complete clothing description — list every visible piece with color, material, style. Be specific (e.g. 'dark charcoal wool overcoat over white dress shirt, slim black formal trousers, brown leather oxford shoes'). This is the MOST important field.",
  "hair": "Hair color and style (e.g. 'short black hair slicked back' or 'long wavy auburn hair loose')",
  "build": "Physical build descriptor (e.g. 'tall lean build' or 'stocky muscular build' or 'average medium build')",
  "distinguishing": "Any accessories, jewelry, glasses, facial hair, scars, tattoos, or other identifying features visible. Empty string if none.",
  "ethnicity": "Visual ethnicity descriptor (e.g. 'Middle Eastern' or 'East Asian' or 'South Asian' or 'Caucasian' or 'Latino')"
}

These descriptions will be injected directly into AI image generation prompts to maintain costume and appearance continuity across film shots. Precision is essential.
Return ONLY the JSON object, no other text.`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json({
      clothing: parsed.clothing || "",
      hair: parsed.hair || "",
      build: parsed.build || "",
      distinguishing: parsed.distinguishing || "",
      ethnicity: parsed.ethnicity || "",
    });
  } catch (error) {
    console.error("Character appearance analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
