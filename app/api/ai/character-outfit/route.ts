import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/lib/auth";
import { klingClient } from "@/lib/kling/client";
import { db } from "@/lib/db";
import { assets } from "@shared/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const openrouter = new OpenAI({
  baseURL:
    process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

/* ── Outfit categories with prompt guidance ── */
const OUTFIT_PROMPTS: Record<string, string> = {
  formal:
    "elegant formal attire — formal suit, gown, tuxedo, dress shirt, or sophisticated evening wear. Photorealistic. Professional studio lighting.",
  casual:
    "everyday casual wear — jeans, t-shirt, hoodie, sweater, sneakers, comfortable relaxed clothing. Photorealistic. Natural daylight.",
  action:
    "action-ready tactical or combat outfit — body armor, tactical vest, combat gear, boots, utility belt. Photorealistic. Dramatic lighting.",
  period:
    "historical or period-appropriate costume — clothing from a specific historical era with authentic fabrics and tailoring. Photorealistic. Period lighting.",
  ceremonial:
    "ceremonial or religious formal attire — traditional garments, robes, formal vestments with ornate details. Photorealistic. Soft diffused lighting.",
  costume:
    "fantasy or theatrical costume — elaborate, stylized, or fantasy-themed clothing with distinctive visual flair. Photorealistic. Dramatic cinematic lighting.",
  business:
    "professional business attire — formal blazer, suit, dress pants, button-up shirt, smart shoes. Photorealistic. Office lighting.",
  swimwear:
    "swimwear or beachwear — bathing suit, swimsuit, or beach-appropriate clothing. Photorealistic. Bright natural lighting.",
  nightwear:
    "nightwear or loungewear — pajamas, robe, sleepwear. Photorealistic. Warm indoor lighting.",
  sport:
    "sports or athletic wear — jersey, shorts, athletic shoes, tracksuit. Photorealistic. Bright outdoor lighting.",
  winter:
    "warm winter clothing — heavy coat, scarf, gloves, boots, layered warm clothing. Photorealistic. Cold weather lighting.",
  summer:
    "light summer clothing — shorts, tank top, sandals, light breathable fabrics. Photorealistic. Bright sunlight.",
  military:
    "military uniform — formal military dress, camo, medals, structured uniform. Photorealistic. Dramatic lighting.",
  wedding:
    "wedding attire — bridal gown, groom suit, formal wedding wear. Photorealistic. Soft romantic lighting.",
  undercover:
    "undercover or disguise attire — inconspicuous clothing, hat, glasses, altered appearance. Photorealistic. Natural lighting.",
};

/* ── Outfit generation endpoint ── */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json(
          { error: e.message, code: "UNAUTHORIZED" },
          { status: 401 },
        );
      }
      throw e;
    }

    const body = await request.json();
    const {
      action,
      characterId,
      outfitType,
      sceneContext,
      outfitDescription,
      directorBrief,
    } = body;

    if (action === "activate-outfit") {
      if (!characterId || !body.outfitId) {
        return NextResponse.json(
          { error: "characterId and outfitId are required" },
          { status: 400 },
        );
      }
      const [character] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, characterId));
      if (!character) {
        return NextResponse.json(
          { error: "Character not found" },
          { status: 404 },
        );
      }
      const metadata = (character.metadata as Record<string, unknown>) || {};
      const outfits =
        (metadata.outfits as Record<string, unknown>[] | null) || [];
      const updatedOutfits = outfits.map((o) => ({
        ...o,
        isActive: o.id === body.outfitId,
      }));
      const activeOutfit = outfits.find((o) => o.id === body.outfitId);
      const updatedMetadata = {
        ...metadata,
        outfits: updatedOutfits,
        activeOutfitId: body.outfitId,
      };
      await db
        .update(assets)
        .set({ metadata: updatedMetadata, updatedAt: new Date() })
        .where(eq(assets.id, characterId));
      return NextResponse.json({
        success: true,
        outfitId: body.outfitId,
        outfitName: activeOutfit?.name || body.outfitId,
      });
    }

    if (action === "delete-outfit") {
      if (!characterId || !body.outfitId) {
        return NextResponse.json(
          { error: "characterId and outfitId are required" },
          { status: 400 },
        );
      }
      const [character] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, characterId));
      if (!character) {
        return NextResponse.json(
          { error: "Character not found" },
          { status: 404 },
        );
      }
      const metadata = (character.metadata as Record<string, unknown>) || {};
      const outfits =
        (metadata.outfits as Record<string, unknown>[] | null) || [];
      const updatedOutfits = outfits.filter((o) => o.id !== body.outfitId);
      const updatedMetadata = {
        ...metadata,
        outfits: updatedOutfits,
        activeOutfitId:
          metadata.activeOutfitId === body.outfitId
            ? null
            : metadata.activeOutfitId,
      };
      await db
        .update(assets)
        .set({ metadata: updatedMetadata, updatedAt: new Date() })
        .where(eq(assets.id, characterId));
      return NextResponse.json({ success: true });
    }

    if (action !== "generate-outfit") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!characterId || !outfitType) {
      return NextResponse.json(
        { error: "characterId and outfitType are required" },
        { status: 400 },
      );
    }

    // Fetch character
    const [character] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, characterId));
    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const metadata = (character.metadata as Record<string, unknown>) || {};
    const existingOutfits =
      (metadata.outfits as Record<string, unknown>[] | null) || [];
    const costumeInfo = metadata as Record<string, string>;

    const charName = character.name || "Character";
    const charDesc = character.description || "";
    const charImage = character.imageUrl || "";
    const charClothing = costumeInfo.clothing || "unspecified";
    const charHair = costumeInfo.hair || "unspecified";
    const charBuild = costumeInfo.build || "unspecified";
    const charEthnicity = costumeInfo.ethnicity || "unspecified";
    const charDistinguishing = costumeInfo.distinguishing || "unspecified";

    if (!charImage) {
      return NextResponse.json(
        { error: "Character has no reference image for outfit generation" },
        { status: 400 },
      );
    }

    const styleGuidance = directorBrief?.filmStyle
      ? `\nFilm style: ${directorBrief.filmStyle} — ${directorBrief.visualStyle || "cinematic"} aesthetics. Must match the film's visual DNA.`
      : "";

    const baseOutfitDesc = OUTFIT_PROMPTS[outfitType] || OUTFIT_PROMPTS.casual;

    const promptSystem = `You are a film costume designer. Generate a detailed outfit description for a character.\n${styleGuidance}\n
Character: ${charName}\nDescription: ${charDesc}\nHair: ${charHair}\nBuild: ${charBuild}\nEthnicity: ${charEthnicity}\nDistinguishing: ${charDistinguishing}\nCurrent outfit: ${charClothing}\n
Outfit type requested: ${outfitType}\nBase outfit description: ${baseOutfitDesc}\n${sceneContext ? `Scene context: ${sceneContext}` : ""}
${outfitDescription ? `User-specific outfit description: ${outfitDescription}` : ""}

Return a JSON object:
{
  "outfitName": "Short name for this outfit (e.g. 'Formal Evening', 'Tactical Mission') — 2-3 words, Persian",
  "outfitDescription": "Full clothing description in English, detailed, specific, including color/material/style. This will be used for AI image generation.",
  "clothingTags": ["tag1", "tag2", ...], // 3-5 relevant clothing tags for filtering
  "prompt": "Complete image generation prompt in English: same character (same face, same hair, same build, same ethnicity), same pose, same lighting, same background — ONLY change clothing to the new outfit. Preserve face identity exactly. Use reference image for face fidelity."
}

Rules for the prompt:
- MUST preserve face identity — use the character's existing face as reference
- MUST keep same pose, lighting, background as the original
- ONLY change clothing to the new outfit
- Use the exact character description for the base
- The outfit description should be detailed and specific
- Include 'same person' or 'same face' in the prompt
- Use terms like 'same character' or 'same face' to ensure identity preservation`;

    const aiModel = "openai/gpt-4o-mini";
    console.log(
      `[AI/character-outfit] generate — model: ${aiModel}, character: ${charName}, outfit: ${outfitType}`,
    );

    const response = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: promptSystem },
        {
          role: "user",
          content: `Generate outfit for ${charName} — type: ${outfitType}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "{}";
    let outfitResult: Record<string, unknown>;
    try {
      outfitResult = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI outfit response" },
        { status: 500 },
      );
    }

    const outfitName =
      (outfitResult.outfitName as string) || `${outfitType} outfit`;
    const outfitDesc = (outfitResult.outfitDescription as string) || "";
    const clothingTags = (outfitResult.clothingTags as string[]) || [];
    const imagePrompt = (outfitResult.prompt as string) || "";

    const klingPrompt =
      imagePrompt ||
      `Same character, same face, same hair (${charHair}), same build (${charBuild}), same ethnicity (${charEthnicity}), same pose, same lighting, same background — ONLY change clothing to: ${outfitDesc}. Preserve face identity exactly.`;

    const klingResult = await klingClient.createImageTask({
      model_name: "kling-v2-1",
      prompt: klingPrompt,
      negative_prompt:
        "different face, different person, different hair color, different hair style, different ethnicity, different skin tone",
      aspect_ratio: "3:4",
      n: 1,
      resolution: "1k",
      image: charImage,
      image_reference: "face",
      image_fidelity: 0.85,
      human_fidelity: 0.85,
    });

    const taskId = klingResult.data.task_id;

    // Poll for image
    let imageUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const klingRes = await klingClient.queryImageTask(taskId);
        const data = klingRes.data;
        if (
          data.task_status === "succeed" &&
          data.task_result?.images?.[0]?.url
        ) {
          imageUrl = data.task_result.images[0].url;
          break;
        }
        if (data.task_status === "failed") break;
      } catch {
        continue;
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 },
      );
    }

    // Persist URL
    try {
      const persistRes = await fetch(
        `${process.env.VERCEL_URL || "http://localhost:5000"}/api/blob/persist-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: imageUrl,
            projectId: character.projectId,
            folder: "elements",
            filename: `outfit_${Date.now()}.png`,
          }),
        },
      );
      if (persistRes.ok) {
        const pd = await persistRes.json();
        imageUrl = pd.url || imageUrl;
      }
    } catch {
      // ignore persist failure
    }

    const outfitId = `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newOutfit = {
      id: outfitId,
      name: outfitName,
      type: outfitType,
      description: outfitDesc,
      clothingTags,
      imageUrl,
      prompt: klingPrompt,
      sceneContext: sceneContext || null,
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    const updatedOutfits = [...existingOutfits, newOutfit];

    // Save to version history
    const existingVersions =
      (metadata.versions as Record<string, unknown>[] | null) || [];
    const newVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "outfit",
      imageUrl,
      prompt: klingPrompt,
      outfitId,
      outfitName,
      timestamp: new Date().toISOString(),
      model: "kling-v2-1",
    };
    const updatedVersions = [...existingVersions, newVersion];

    const finalMetadata = {
      ...metadata,
      outfits: updatedOutfits,
      versions: updatedVersions,
    };

    await db
      .update(assets)
      .set({
        metadata: finalMetadata,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, characterId));

    const durationMs = Date.now() - startTime;
    console.log(
      JSON.stringify({
        route: "AI/character-outfit",
        action: "generate-outfit",
        model: aiModel,
        durationMs,
        resultSummary: `outfit generated for ${charName}: ${outfitName}`,
      }),
    );

    return NextResponse.json({
      outfitId,
      outfitName,
      outfitDescription: outfitDesc,
      clothingTags,
      imageUrl,
      prompt: klingPrompt,
      characterId,
      durationMs,
    });
  } catch (error) {
    console.error("Character outfit generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Outfit generation failed",
      },
      { status: 500 },
    );
  }
}

/* ── GET endpoint for listing outfits/versions ── */
export async function GET(request: NextRequest) {
  try {
    try {
      await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("characterId");
    const action = searchParams.get("action");

    if (!characterId) {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 },
      );
    }

    const [character] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, parseInt(characterId)));

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const metadata = (character.metadata as Record<string, unknown>) || {};

    if (action === "list-outfits") {
      const outfits =
        (metadata.outfits as Record<string, unknown>[] | null) || [];
      return NextResponse.json({ outfits });
    }

    if (action === "list-versions") {
      const versions =
        (metadata.versions as Record<string, unknown>[] | null) || [];
      return NextResponse.json({ versions });
    }

    return NextResponse.json({
      outfits: metadata.outfits || [],
      versions: metadata.versions || [],
    });
  } catch (error) {
    console.error("Character outfit GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
