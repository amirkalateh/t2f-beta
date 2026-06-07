import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/lib/auth";
import { klingClient } from "@/lib/kling/client";
import { db } from "@/lib/db";
import { assets } from "@shared/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL:
    process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1",
  apiKey:
    process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY ||
    "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",
});

const OPENROUTER_ACTIONS = new Set(["suggest", "generate-description"]);

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json(
          { error: e.message, code: "UNAUTHORIZED", detail: null },
          { status: 401 },
        );
      }
      throw e;
    }

    const body = await request.json();
    const {
      action,
      projectTitle,
      projectDescription,
      logline,
      script,
      style,
      userInput,
      elementType,
      directorBrief,
    } = body;

    if (
      OPENROUTER_ACTIONS.has(action) &&
      !process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY
    ) {
      console.error(
        `[AI/elements] OPENROUTER_KEY_MISSING — API key not set (action: ${action})`,
      );
      return NextResponse.json(
        {
          error: "کلید API هوش مصنوعی تنظیم نشده است.",
          code: "OPENROUTER_KEY_MISSING",
          detail:
            "AI_INTEGRATIONS_OPENROUTER_API_KEY environment variable is not set",
        },
        { status: 503 },
      );
    }

    // Dynamic style guidance for all film styles
    const filmStyle = directorBrief?.filmStyle;
    const STYLE_GUIDANCE_MAP: Record<string, string> = {
      lego: "\n\nSTYLE DIRECTIVE — LEGO WORLD: ALL characters must be described as LEGO minifigures (cylindrical heads, claw hands, studded surfaces, plastic brick construction). ALL locations must be described as built from LEGO bricks (studded surfaces, modular construction, toy-scale). ALL props must be described as LEGO brick-built objects. Use bright saturated primary colors. Every element exists in a LEGO minifigure universe.",
      anime: "\n\nSTYLE DIRECTIVE — ANIME: ALL characters must be described with anime/Japanese animation aesthetics (cel-shaded lighting, expressive large eyes, clean linework, vibrant saturated colors, painterly backgrounds). ALL locations must have anime-style atmosphere (dramatic lighting, rich color palette, hand-painted background quality). ALL props must match anime visual language. Studio Ghibli-inspired visual richness.",
      origami: "\n\nSTYLE DIRECTIVE — ORIGAMI: ALL characters must be described as origami paper figures (folded paper aesthetic, geometric creases, delicate paper craft). ALL locations must be described as origami paper landscapes (folded paper architecture, layered paper depth). ALL props must be described as origami paper objects. Every element is made of folded paper.",
      claymation: "\n\nSTYLE DIRECTIVE — CLAYMATION: ALL characters must be described as clay-sculpted figures (handmade tactile look, fingerprint texture, soft rounded edges). ALL locations must be described as miniature claymation sets (physical miniature construction, handmade tactile surfaces). ALL props must be described as clay-sculpted objects. Every element has a handmade stop-motion aesthetic.",
      low_poly: "\n\nSTYLE DIRECTIVE — LOW POLY: ALL characters must be described as low-polygon 3D models (geometric faceted surfaces, minimal polygon count, flat-shaded). ALL locations must be described as low-poly 3D environments (geometric terrain, faceted architecture, minimal surfaces). ALL props must be described as low-poly 3D objects. Every element is rendered in a low-polygon 3D art style.",
      pop_art: "\n\nSTYLE DIRECTIVE — POP ART: ALL characters must be described in pop art style (bold saturated colors, graphic design, flat color blocks, Andy Warhol inspired). ALL locations must be described in pop art style (bold graphic backgrounds, flat color areas, poster-like composition). ALL props must be described as pop art objects. Every element uses bold colors and graphic design.",
      pixar_render: "\n\nSTYLE DIRECTIVE — PIXAR: ALL characters must be described as Pixar-style 3D CGI characters (vibrant cartoon realism, expressive faces, soft rounded forms, high-quality CGI render). ALL locations must be described as Pixar-style 3D environments (vibrant cartoon realism, detailed CGI sets, cinematic lighting). ALL props must be described as Pixar-style 3D objects. Every element is rendered in a Pixar 3D animation style.",
      black_and_white: "\n\nSTYLE DIRECTIVE — BLACK AND WHITE: ALL characters, locations, and props must be described in monochrome black and white (classic film noir tonality, high contrast, dramatic chiaroscuro lighting). Every element must be described for black and white photography.",
      real: "\n\nSTYLE DIRECTIVE — PHOTOREALISTIC: ALL characters must be described as photorealistic real people (cinematic realism, real photography, natural skin texture). ALL locations must be described as photorealistic real places (cinematic realism, natural lighting, real-world detail). ALL props must be described as photorealistic real objects. Every element is photorealistic.",
    };
    const styleGuidance = filmStyle ? (STYLE_GUIDANCE_MAP[filmStyle] || "") : "";

    if (action === "suggest") {
      const hasScript = script && script.trim().length > 20;
      const hasDirectorBrief =
        directorBrief &&
        Object.values(directorBrief).some(
          (v) => v && typeof v === "string" && v.trim().length > 0,
        );
      const briefStr = hasDirectorBrief
        ? `\n## DIRECTOR'S VISUAL BRIEF (ALL element descriptions MUST reflect this visual DNA):\n- Film Style: ${directorBrief.filmStyle || "Not specified"}\n- Film Texture: ${directorBrief.filmTexture || "Not specified"}\n- Color Science: ${directorBrief.colorScience || "Not specified"}\n- Lighting Philosophy: ${directorBrief.lightingPhilosophy || "Not specified"}\n- Overall Mood: ${directorBrief.overallMood || "Not specified"}\n- Reference Films: ${directorBrief.referenceFilms || "Not specified"}\n- Era/Setting: ${directorBrief.era || "Not specified"}\n- Visual Style: ${directorBrief.visualStyle || "Not specified"}${styleGuidance}\n\nCRITICAL INSTRUCTION: Every element description must reflect the Director's Visual Brief above. Character clothing, location atmosphere, prop textures — all must be consistent with the film's visual DNA. Do NOT generate generic descriptions.`
        : "";
      const baseSystemPrompt = hasScript
        ? `You are a professional film production designer and script supervisor. Analyze the provided screenplay/script thoroughly and extract ALL key production elements needed for visual consistency.${briefStr}

IMPORTANT: Base your suggestions primarily on the SCRIPT content. Every character mentioned, every location described, and every significant prop referenced in the script should be captured.

Return a JSON object with this exact structure:
{
  "characters": [{ "name": "character name", "description": "physical appearance, clothing, distinguishing features as described or implied in the script — styled per the director's visual brief", "age": "age range", "sex": "male/female/other" }],
  "locations": [{ "name": "location name", "description": "detailed visual description of the place, lighting, atmosphere as described in the script — styled per the director's visual brief" }],
  "props": [{ "name": "prop name", "description": "detailed visual description of the object as it appears in the script — styled per the director's visual brief" }],
  "mood": "overall visual mood and atmosphere based on the script's tone — aligned with the director's brief",
  "colorPalette": "color palette description for visual consistency based on the script's settings, mood, AND the director's color science"
}

Extract ALL characters (main and supporting), ALL distinct locations, and significant props from the script.
Keep descriptions visual and specific - they will be used as image generation prompts.
All text should be in English for image generation quality.

NOTE FOR FINAL REFERENCE IMAGES: When generating the actual images from these descriptions, characters must have a plain white background, locations must be empty of people (only the place itself), and props must be isolated on a white background.`
        : `You are a professional film production designer. Based on the project info, suggest key production elements needed for visual consistency.${briefStr}
Return a JSON object with this exact structure:
{
  "characters": [{ "name": "character name", "description": "physical appearance, clothing, distinguishing features — styled per the director's visual brief", "age": "age range", "sex": "male/female/other" }],
  "locations": [{ "name": "location name", "description": "detailed visual description of the place, lighting, atmosphere — styled per the director's visual brief" }],
  "props": [{ "name": "prop name", "description": "detailed visual description of the object — styled per the director's visual brief" }],
  "mood": "overall visual mood and atmosphere description — aligned with the director's brief",
  "colorPalette": "color palette description for visual consistency — aligned with the director's color science"
}
Suggest 2-4 characters, 2-3 locations, and 2-4 key props that would appear in this project.
Keep descriptions visual and specific - they will be used as image generation prompts.
All text should be in English for image generation quality.

NOTE FOR FINAL REFERENCE IMAGES: When generating the actual images from these descriptions, characters must have a plain white background, locations must be empty of people (only the place itself), and props must be isolated on a white background.`;

      const userContent = hasScript
        ? `Project: ${projectTitle || "Untitled"}
Style: ${style || "cinematic"}
Logline: ${logline || "No logline"}

FULL SCREENPLAY/SCRIPT:
${script}`
        : `Project: ${projectTitle || "Untitled"}
Description: ${projectDescription || "No description"}
Logline: ${logline || "No logline yet"}
Style: ${style || "cinematic"}
${userInput ? `Additional context from user: ${userInput}` : ""}`;

      const aiModel = "openai/gpt-4o-mini";
      console.log(
        `[AI/elements] suggest — model: ${aiModel}, hasScript: ${hasScript}, script: ${(script || "").length} chars`,
      );

      const response = await openrouter.chat.completions.create({
        model: aiModel,
        messages: [
          { role: "system", content: baseSystemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4096,
      });

      const durationMs = Date.now() - startTime;
      const usage = response.usage;
      const content = response.choices[0]?.message?.content || "{}";

      try {
        const suggestions = JSON.parse(content);
        const charCount = Array.isArray(suggestions.characters)
          ? suggestions.characters.length
          : 0;
        const locCount = Array.isArray(suggestions.locations)
          ? suggestions.locations.length
          : 0;
        const propCount = Array.isArray(suggestions.props)
          ? suggestions.props.length
          : 0;
        console.log(
          JSON.stringify({
            route: "AI/elements",
            action: "suggest",
            model: aiModel,
            promptTokens: usage?.prompt_tokens ?? null,
            completionTokens: usage?.completion_tokens ?? null,
            totalTokens: usage?.total_tokens ?? null,
            durationMs,
            resultSummary: `${charCount} characters, ${locCount} locations, ${propCount} props suggested`,
          }),
        );
        return NextResponse.json(suggestions);
      } catch {
        console.error("[AI/elements] JSON parse failed for suggest action");
        return NextResponse.json(
          {
            error: "خطا در پردازش پیشنهاد المان‌های هوش مصنوعی",
            code: "PARSE_ERROR",
            detail: `raw content length: ${content.length}`,
          },
          { status: 500 },
        );
      }
    }

    if (action === "generate-description") {
      const aiModel = "openai/gpt-4o-mini";
      console.log(
        `[AI/elements] generate-description — model: ${aiModel}, elementType: ${elementType}, input: ${(userInput || "").slice(0, 60)}`,
      );

      const hasDirectorBrief =
        directorBrief &&
        Object.values(directorBrief).some(
          (v) => v && typeof v === "string" && v.trim().length > 0,
        );
      const briefStr = hasDirectorBrief
        ? `\n## DIRECTOR'S VISUAL BRIEF (MUST be reflected in the description and image prompt):\n- Film Style: ${directorBrief.filmStyle || "Not specified"}\n- Film Texture: ${directorBrief.filmTexture || "Not specified"}\n- Color Science: ${directorBrief.colorScience || "Not specified"}\n- Lighting Philosophy: ${directorBrief.lightingPhilosophy || "Not specified"}\n- Overall Mood: ${directorBrief.overallMood || "Not specified"}\n- Reference Films: ${directorBrief.referenceFilms || "Not specified"}\n- Era/Setting: ${directorBrief.era || "Not specified"}\n- Visual Style: ${directorBrief.visualStyle || "Not specified"}\n\nCRITICAL: The element's visual description AND image prompt must reflect the director's visual brief. Apply the film's color science, texture, lighting philosophy, and era to the element.${styleGuidance}`
        : "";

      const systemPrompt = `You are a visual description expert for film production. Generate a detailed visual description for an image generation prompt.${briefStr}
Return a JSON object:
{
  "name": "element name",
  "description": "detailed visual description optimized for AI image generation",
  "imagePrompt": "a concise, detailed prompt for generating this element as a reference image. Follow the strict rules below for the specific element type.",
  "age": "age if character, null otherwise",
  "sex": "sex if character, null otherwise"
}

IMPORTANT - imagePrompt must adhere to these rules:
- If element is a CHARACTER: full-body or portrait shot, standing against a completely white background (#FFFFFF). No environment, no additional objects. Use phrases like "isolated on pure white background", "studio lighting, clean white backdrop". BUT incorporate the film's visual DNA into clothing, hair, and appearance.
- If element is a LOCATION: an establishing shot of the location ONLY, absolutely empty of any people, characters, or figures. Show the architecture, lighting, and atmosphere of the place itself, reflecting the director's visual brief.
- If element is a PROP/OBJECT: product-style photo, isolated on a pure white background. No context, no hands holding it, no additional elements. BUT style the object to match the film's visual DNA (texture, color, era).
Keep the prompt under 200 words.`;

      const response = await openrouter.chat.completions.create({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a visual description for: "${userInput}"
Element type: ${elementType || "character"}
Project style: ${style || "cinematic"}
Project: ${projectTitle || "Untitled"}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const durationMs = Date.now() - startTime;
      const usage = response.usage;
      const content = response.choices[0]?.message?.content || "{}";

      try {
        const result = JSON.parse(content);
        console.log(
          JSON.stringify({
            route: "AI/elements",
            action: "generate-description",
            model: aiModel,
            promptTokens: usage?.prompt_tokens ?? null,
            completionTokens: usage?.completion_tokens ?? null,
            totalTokens: usage?.total_tokens ?? null,
            durationMs,
            resultSummary: `description generated for ${elementType || "element"}: ${(result.name || userInput || "").slice(0, 40)}`,
          }),
        );
        return NextResponse.json(result);
      } catch {
        console.error(
          "[AI/elements] JSON parse failed for generate-description action",
        );
        return NextResponse.json(
          {
            error: "خطا در پردازش توضیح تصویری هوش مصنوعی",
            code: "PARSE_ERROR",
            detail: `raw content length: ${content.length}`,
          },
          { status: 500 },
        );
      }
    }

    // بقیه اکشن‌ها بدون تغییر ...
    if (action === "create-kling-element") {
      const { assetId, imageUrls, elementName, elementKlingType } = body;

      if (
        !assetId ||
        !imageUrls ||
        !Array.isArray(imageUrls) ||
        imageUrls.length === 0
      ) {
        return NextResponse.json(
          {
            error: "شناسه دارایی و تصاویر الزامی هستند",
            code: "MISSING_FIELDS",
            detail: "assetId and imageUrls required",
          },
          { status: 400 },
        );
      }

      const klingType = elementKlingType === "object" ? "object" : "character";
      const frontalImage = imageUrls[0];
      const additionalImages = imageUrls
        .slice(1, 4)
        .filter((u) => typeof u === "string" && u.trim().length > 10);

      // Validate frontal image
      if (
        !frontalImage ||
        typeof frontalImage !== "string" ||
        frontalImage.trim().length < 10
      ) {
        return NextResponse.json(
          {
            error: "تصویر المان نامعتبر است",
            code: "INVALID_IMAGE",
            detail: `frontalImage length: ${frontalImage?.length || 0}`,
          },
          { status: 400 },
        );
      }

      const result = await klingClient.createElement({
        elementFrontalImage: frontalImage,
        image_list: additionalImages.length > 0 ? additionalImages : undefined,
        type: klingType as "character" | "object",
        name: elementName || `element_${assetId}`,
      });

      return NextResponse.json({
        taskId: result.data.task_id,
        status: result.data.task_status,
        assetId,
        action: "create-kling-element",
      });
    }

    if (action === "query-kling-element") {
      const { taskId } = body;
      if (!taskId) {
        return NextResponse.json(
          {
            error: "شناسه وظیفه الزامی است",
            code: "MISSING_FIELDS",
            detail: "taskId is required",
          },
          { status: 400 },
        );
      }
      const result = await klingClient.queryElement(taskId);
      return NextResponse.json(result);
    }

    if (action === "ai-multi-shot") {
      const { imageUrl } = body;
      if (!imageUrl) {
        return NextResponse.json(
          {
            error: "آدرس تصویر الزامی است",
            code: "MISSING_FIELDS",
            detail: "imageUrl is required",
          },
          { status: 400 },
        );
      }
      const result = await klingClient.createAIMultiShotTask({
        image: imageUrl,
      });
      return NextResponse.json({
        taskId: result.data.task_id,
        status: result.data.task_status,
        action: "ai-multi-shot",
      });
    }

    if (action === "image-recognize") {
      const { imageUrl } = body;
      if (!imageUrl) {
        return NextResponse.json(
          {
            error: "آدرس تصویر الزامی است",
            code: "MISSING_FIELDS",
            detail: "imageUrl is required",
          },
          { status: 400 },
        );
      }
      const result = await klingClient.createImageRecognizeTask({
        image: imageUrl,
      });
      return NextResponse.json({
        taskId: result.data.task_id,
        status: result.data.task_status,
        action: "image-recognize",
      });
    }

    if (action === "store-element-id") {
      const { assetId, klingElementId, multiShotUrls } = body;
      if (!assetId) {
        return NextResponse.json(
          {
            error: "شناسه دارایی الزامی است",
            code: "MISSING_FIELDS",
            detail: "assetId is required",
          },
          { status: 400 },
        );
      }

      const updates: Record<string, unknown> = {};
      if (klingElementId) updates.klingElementId = klingElementId;
      if (multiShotUrls) updates.multiShotUrls = multiShotUrls;

      const [updated] = await db
        .update(assets)
        .set(updates)
        .where(eq(assets.id, assetId))
        .returning();

      return NextResponse.json({ success: true, asset: updated });
    }

    if (action === "list-kling-elements") {
      const result = await klingClient.listElements();
      return NextResponse.json(result);
    }

    if (action === "delete-kling-element") {
      const { elementId, assetId } = body;
      if (!elementId) {
        return NextResponse.json(
          {
            error: "شناسه المان الزامی است",
            code: "MISSING_FIELDS",
            detail: "elementId is required",
          },
          { status: 400 },
        );
      }

      await klingClient.deleteElement(elementId);

      if (assetId) {
        await db
          .update(assets)
          .set({ klingElementId: null })
          .where(eq(assets.id, assetId));
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      {
        error: "عملیات درخواستی معتبر نیست",
        code: "INVALID_ACTION",
        detail: `action "${action}" is not recognized`,
      },
      { status: 400 },
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI/elements] Error after ${durationMs}ms:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI generation failed",
        code: "GENERATION_ERROR",
      },
      { status: 500 },
    );
  }
}
