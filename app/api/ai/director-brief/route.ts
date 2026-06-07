import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || "missing",
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
    console.error("[AI/director-brief] OPENROUTER_KEY_MISSING — API key not set");
    return NextResponse.json(
      {
        error: "کلید API هوش مصنوعی تنظیم نشده است.",
        code: "OPENROUTER_KEY_MISSING",
        detail: "AI_INTEGRATIONS_OPENROUTER_API_KEY environment variable is not set",
      },
      { status: 503 }
    );
  }

  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json(
          { error: e.message, code: "UNAUTHORIZED", detail: null },
          { status: 401 }
        );
      }
      throw e;
    }

    const body = await request.json();
    const { script, style = "cinematic", logline = "" } = body;

    if (!script || script.trim().length < 20) {
      return NextResponse.json(
        { error: "فیلمنامه باید حداقل ۲۰ کاراکتر باشد", code: "SCRIPT_TOO_SHORT", detail: null },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite cinematographer and film director known for creating distinctive visual identities for films. Your expertise spans color science, film texture, lighting design, visual storytelling, and SCENE-LEVEL visual direction.

Given a screenplay (in Persian/Farsi), analyze its themes, mood, setting, and narrative arc to propose a comprehensive "Director's Brief" — a unified visual DNA that governs every single frame, PLUS scene-level visual identities that guide how each scene LOOKS.

Your brief must ensure that when shots from different scenes are cut together, they feel like they belong to the SAME film. This is about creating a cohesive visual world.

Consider:
- The emotional tone and genre of the story
- The time period and cultural setting
- The pacing and dramatic structure
- The VISUAL ARC: how the film's look should evolve from beginning to end
- Similar films that share thematic or visual DNA
- Each scene's unique emotional beat and how it should LOOK

## OUTPUT FORMAT
Return ONLY valid JSON with these exact fields:
{
  "filmTexture": "Describe the film's texture/grain (e.g., 'fine 35mm Kodak Vision3 500T grain with slight halation on highlights', 'clean digital with subtle noise in shadows')",
  "colorScience": "Describe the color palette and grading approach (e.g., 'warm amber highlights with teal shadows, desaturated midtones, skin tones pushed toward golden')",
  "lightingPhilosophy": "Describe the overall lighting approach (e.g., 'naturalistic lighting using practical sources — table lamps, windows, candles — with minimal artificial fill')",
  "overallMood": "Brief mood description in Persian (e.g., 'تاریک و اگزیستانسیال با لحظات گرم خانوادگی')",
  "referenceFilms": "List 2-4 reference films that share visual DNA (e.g., 'A Separation (2011), Close-Up (1990), Leviathan (2014)')",
  "era": "Time period and setting (e.g., 'contemporary Tehran, working-class neighborhoods')",
  "visualStyle": "Overall visual style in 5-10 words (e.g., 'intimate social realism with poetic compositions')",
  "cameraBody": "Recommend ONE camera body ID from: arri_alexa_mini_lf, arri_alexa_35, red_v_raptor, red_komodo, sony_venice_2, sony_fx6, blackmagic_ursa_g2, blackmagic_pocket_6k, canon_c70, canon_r5c, panasonic_s1h. For LEGO or anime styles, ignore real camera bodies — use 'custom'",
  "lensFamily": "Recommend ONE lens family ID from: spherical, anamorphic, vintage_anamorphic, vintage_spherical, macro, tilt_shift, fisheye. For LEGO/anime styles, use 'custom'",
  "baseAspectRatio": "Recommend ONE aspect ratio from: 2.39:1, 2.35:1, 1.85:1, 1.66:1, 16:9, 4:3, 1:1, 9:16",
  "signatureMotif": "A recurring visual motif, technique, or compositional signature that appears throughout the film (e.g., 'windows used as frames-within-frames, always placing characters in the lower third of the frame', 'single-source lighting creating dramatic shadows, objects passing through foreground defocus to create depth')",
  "visualArc": {
    "beginning": "Describe the visual style for the film's opening (e.g., 'bright, warm, optimistic palette with golden hour lighting and saturated colors — established world feeling safe')",
    "middle": "Describe the visual shift for the turning point (e.g., 'desaturated earth tones, harsher shadows, cooler color temperature — the world has shifted')",
    "end": "Describe the visual style for the climax/resolution (e.g., 'dark chiaroscuro with stark contrasts, or warm return-to-home lighting if the ending is hopeful')"
  },
  "sceneVisualIdentities": [
    {
      "sceneNumber": 1,
      "sceneName": "Persian name of the scene",
      "timeOfDay": "dawn | morning | noon | afternoon | golden_hour | twilight | night | blue_hour",
      "colorTemperature": "warm | cool | neutral | cold | golden | blue",
      "mood": "حال‌وهوای فارسی — e.g., امیدوار | تاریک | پرتنش | آرام | غمگین | شاد",
      "lightingStyle": "natural | practical | neon | chiaroscuro | high_key | low_key | soft_diffused | hard_dramatic",
      "dominantColor": "dominant color for this scene (e.g., 'burnt sienna', 'teal', 'amber', 'steel blue')",
      "atmosphereDescription": "2-3 sentence English description of the visual atmosphere for this scene"
    }
  ]
}

## SCENE VISUAL IDENTITIES RULES
For EACH scene in the screenplay (up to 8 scenes), create a scene visual identity that captures:
- **timeOfDay**: When the scene takes place (not just "day/night" — be specific: golden hour, blue hour, noon, twilight)
- **colorTemperature**: The dominant color temperature (warm/cool/neutral/cold/golden/blue)
- **mood**: The emotional mood in Persian (e.g., امیدوار، تاریک، پرتنش، آرام، غمگین، شاد، رهام، نومید)
- **lightingStyle**: The lighting approach (natural, practical, neon, chiaroscuro, high_key, low_key, soft_diffused, hard_dramatic)
- **dominantColor**: The primary color that dominates the frame in this scene
- **atmosphereDescription**: A vivid English description of what the scene FEELS LIKE visually

## VISUAL ARC RULES
The visual arc must show a TRANSFORMATION:
- **beginning**: How the film OPENS visually (optimistic? dark? neutral? mysterious?)
- **middle**: How the visual language shifts at the turning point (more contrast? cooler? warmer? more shadows?)
- **end**: How the visual language resolves (returns to warmth? stays dark? becomes surreal?)

## SPECIAL STYLE DIRECTIONS
If the project style is "lego":
- All visuals must feel like a LEGO minifigure world: plastic brick construction, studded surfaces, minifigure proportions, bright saturated primary colors, toy-scale environments.
- Camera recommendations should be "custom" (not real-world cinema cameras).
- Texture should describe LEGO plastic surface qualities.
- Color science should be vibrant, bold primary colors typical of LEGO sets.

If the project style is "anime":
- All visuals must follow Japanese animation aesthetic: cel-shaded lighting, expressive character designs, vibrant saturated colors, dynamic dramatic compositions, painterly backgrounds with clean linework.
- Camera recommendations should be "custom" (not real-world cinema cameras).
- Texture should describe clean digital cel animation.
- Color science should be bold, saturated anime palette with distinct color separation.

Style direction: ${style}
${logline ? `Logline: ${logline}` : ""}

Be specific and evocative. Every field must feel chosen by a master cinematographer who deeply understands THIS specific story. The scene visual identities and visual arc are CRITICAL — do not skip them.`;

    const aiModel = "openai/gpt-4o-mini";
    console.log(`[AI/director-brief] Starting — model: ${aiModel}, script: ${script.length} chars`);

    const response = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this Persian screenplay and create a Director's Brief — a unified visual DNA for the entire film. Be specific, evocative, and ensure all choices serve the story's emotional truth.\n\nScreenplay:\n${script.substring(0, 8000)}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const durationMs = Date.now() - startTime;
    const usage = response.usage;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error(`[AI/director-brief] No content returned — duration: ${durationMs}ms`);
      return NextResponse.json(
        { error: "پاسخی از هوش مصنوعی دریافت نشد", code: "NO_RESPONSE", detail: `durationMs: ${durationMs}` },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error(`[AI/director-brief] JSON parse failed — duration: ${durationMs}ms`);
          return NextResponse.json(
            { error: "خطا در پردازش پاسخ هوش مصنوعی", code: "PARSE_ERROR", detail: `raw content length: ${content.length}` },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "خطا در پردازش پاسخ هوش مصنوعی", code: "PARSE_ERROR", detail: `raw content length: ${content.length}` },
          { status: 500 }
        );
      }
    }

    console.log(JSON.stringify({
      route: "AI/director-brief",
      model: aiModel,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      durationMs,
      resultSummary: `director brief with ${Object.keys(parsed).length} fields`,
    }));

    return NextResponse.json({ ...parsed, model: aiModel, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI/director-brief] Error after ${durationMs}ms:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در تولید کارگردان هوشمند",
        code: "GENERATION_ERROR",
        detail: `durationMs: ${durationMs}`,
      },
      { status: 500 }
    );
  }
}
