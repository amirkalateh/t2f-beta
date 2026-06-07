import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  requireAuth,
  getTierLimits,
  getProjectShotCount,
  checkLimit,
  AuthError,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const openrouter = new OpenAI({
  baseURL:
    process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || "missing",
});

const ASPECT_RATIO_MAP: Record<string, string> = {
  "16:9": "16:9 widescreen",
  "9:16": "9:16 vertical/portrait",
  "1:1": "1:1 square",
  "4:5": "4:5 portrait",
  "2.39:1": "2.39:1 anamorphic widescreen",
  "2.35:1": "2.35:1 CinemaScope",
  "1.85:1": "1.85:1 theatrical widescreen",
};

const STYLE_PROMPT_MAP: Record<string, string> = {
  cinematic:
    "Hollywood cinematic look, rich colors, dramatic lighting, shallow depth of field, film grain",
  documentary:
    "documentary style, natural lighting, handheld feel, realistic tones, available light",
  commercial:
    "clean commercial look, bright well-lit, vibrant colors, polished production value",
  "music-video":
    "stylized music video aesthetic, creative color grading, dynamic angles, bold visuals",
  artistic:
    "art-house cinema style, unconventional framing, muted desaturated palette, poetic composition",
  horror:
    "dark atmospheric horror, deep shadows, desaturated cold tones, unsettling angles, low-key lighting",
  animation:
    "digital matte painting style, illustrated cinematic frames, detailed environments",
  lego: "LEGO minifigure world, plastic brick construction aesthetic, studded LEGO surfaces, minifigure proportions, bright saturated primary colors, toy-scale environment",
  anime:
    "anime style, Japanese animation aesthetic, cel-shaded lighting, expressive large eyes, vibrant saturated colors, Studio Ghibli inspired visual richness",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
    console.error(
      "[AI/storyboard] OPENROUTER_KEY_MISSING — API key not set in environment",
    );
    return NextResponse.json(
      {
        error:
          "کلید API هوش مصنوعی تنظیم نشده است. لطفاً کلید OpenRouter را در تنظیمات اضافه کنید.",
        code: "OPENROUTER_KEY_MISSING",
        detail:
          "AI_INTEGRATIONS_OPENROUTER_API_KEY environment variable is not set",
      },
      { status: 503 },
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
          { status: 401 },
        );
      }
      throw e;
    }

    const limits = getTierLimits(user.tier);
    const body = await request.json();
    const {
      script,
      aspectRatio = "16:9",
      style = "cinematic",
      logline = "",
      projectId,
      elements = [],
      maxShots,
      directorBrief,
    } = body;

    if (projectId) {
      const shotCount = await getProjectShotCount(projectId);
      if (!checkLimit(shotCount, limits.maxShots)) {
        return NextResponse.json(
          {
            error: `شما به حداکثر تعداد شات (${limits.maxShots}) در پلن ${limits.label} رسیده‌اید. برای استفاده از Auto Plan، پلن خود را ارتقا دهید.`,
            code: "SHOT_LIMIT_REACHED",
            detail: `currentShots >= maxShots (${limits.maxShots})`,
          },
          { status: 403 },
        );
      }
    }

    if (!script || script.trim().length < 20) {
      return NextResponse.json(
        {
          error: "فیلمنامه باید حداقل ۲۰ کاراکتر باشد",
          code: "SCRIPT_TOO_SHORT",
          detail: null,
        },
        { status: 400 },
      );
    }

    const aspectDesc = ASPECT_RATIO_MAP[aspectRatio] || aspectRatio;
    const styleDesc = STYLE_PROMPT_MAP[style] || style;

    const elementContext =
      elements.length > 0
        ? `\n## PROJECT ELEMENTS (MANDATORY -- YOU MUST USE THESE)
The director has created a cast bible and location/prop list. Every shot MUST reference the correct elements by their EXACT ID and name. Do NOT invent new characters, locations, or props.

${elements
  .map((e: any) => {
    const meta = e.metadata || {};
    const extra: string[] = [];
    if (e.description) extra.push(e.description);
    if (meta.age || e.age) extra.push(`age: ${meta.age || e.age}`);
    if (meta.sex || e.sex) extra.push(meta.sex || e.sex);
    if (meta.hair) extra.push(`${meta.hair} hair`);
    if (meta.build) extra.push(`${meta.build} build`);
    if (meta.clothing) extra.push(`clothing: ${meta.clothing}`);
    if (meta.ethnicity) extra.push(`ethnicity: ${meta.ethnicity}`);
    if (meta.distinguishing)
      extra.push(`distinguishing: ${meta.distinguishing}`);
    if (meta.vibe) extra.push(`vibe: ${meta.vibe}`);
    let line = `- [${e.type.toUpperCase()}] "${e.name}" (ID: ${e.id})`;
    if (extra.length > 0) line += ` -- ${extra.join("; ")}`;
    return line;
  })
  .join("\n")}

### ELEMENT ASSIGNMENT RULES (STRICT)
For EVERY shot you MUST set:
- locationId: the ID of the location where this shot takes place. If a scene happens in one place, EVERY shot in that scene gets the SAME locationId.
- characterIds: array of character IDs physically present in this shot. If a character is in the scene but off-screen in this shot, do NOT include them.
- propIds: array of prop IDs that are VISIBLE in this shot (not just mentioned in the scene).

### ELEMENT DESCRIPTION IN ENGLISH PROMPTS
When you write the English "prompt" for each shot:
1. For each character in characterIds, DESCRIBE them using their metadata (hair, clothing, age, build, distinguishing features) -- do NOT just write their name.
2. For the location in locationId, DESCRIBE the environment using the location's description -- do NOT just write the location name.
3. For each prop in propIds, naturally reference it in the action or setting description.
4. Be SPECIFIC and VISUAL. If a character is described as "young Iranian woman with long black hair wearing a red headscarf" in the element, write EXACTLY that visual description in the prompt -- not just "the woman".
5. Use the element IDs exactly as given. Do NOT create new IDs.
`
        : "";

    const directorBriefContext =
      directorBrief && Object.values(directorBrief).some((v) => v)
        ? `\n## DIRECTOR'S BRIEF (MANDATORY VISUAL DNA - APPLY TO EVERY SHOT)
The director has defined a specific visual identity for this film. You MUST incorporate these specifications into EVERY shot prompt:
${directorBrief.filmTexture ? `- Film Texture: ${directorBrief.filmTexture}` : ""}
${directorBrief.colorScience ? `- Color Science: ${directorBrief.colorScience}` : ""}
${directorBrief.lightingPhilosophy ? `- Lighting Philosophy: ${directorBrief.lightingPhilosophy}` : ""}
${directorBrief.overallMood ? `- Overall Mood: ${directorBrief.overallMood}` : ""}
${directorBrief.referenceFilms ? `- Reference Films: ${directorBrief.referenceFilms}` : ""}
${directorBrief.era ? `- Era/Setting: ${directorBrief.era}` : ""}
${directorBrief.visualStyle ? `- Visual Style: ${directorBrief.visualStyle}` : ""}
${directorBrief.cameraBody ? `- Camera Body (use for ALL shots): ${directorBrief.cameraBody}` : ""}
${directorBrief.lensFamily ? `- Lens Family (use for ALL shots): ${directorBrief.lensFamily}` : ""}
${directorBrief.baseAspectRatio ? `- Aspect Ratio: ${directorBrief.baseAspectRatio}` : ""}
${directorBrief.signatureMotif ? `- Signature Motif: ${directorBrief.signatureMotif}` : ""}
${directorBrief.visualArc ? `- Visual Arc: Beginning="${directorBrief.visualArc.beginning}" | Middle="${directorBrief.visualArc.middle}" | End="${directorBrief.visualArc.end}"` : ""}

${
  directorBrief.sceneVisualIdentities &&
  directorBrief.sceneVisualIdentities.length > 0
    ? `## SCENE VISUAL IDENTITIES (CRITICAL - APPLY PER SCENE)
Each scene has a specific visual identity. You MUST apply these to ALL shots in that scene:
${directorBrief.sceneVisualIdentities
  .map(
    (svi: any) => `
**Scene ${svi.sceneNumber}: ${svi.sceneName || ""}**
- Time: ${svi.timeOfDay || "not specified"}
- Color Temperature: ${svi.colorTemperature || "not specified"}
- Mood: ${svi.mood || "not specified"}
- Lighting Style: ${svi.lightingStyle || "not specified"}
- Dominant Color: ${svi.dominantColor || "not specified"}
- Atmosphere: ${svi.atmosphereDescription || "not specified"}
`,
  )
  .join("\n")}
`
    : ""
}

These settings OVERRIDE the generic project-wide defaults above. Every single shot prompt MUST reflect this visual DNA.
`
        : "";

    const systemPrompt = `You are a world-class cinematographer, 1st AD, and storyboard artist who has worked with Roger Deakins, Emmanuel Lubezki, and Hoyte van Hoytema. Your job is to break down a screenplay (written in Persian/Farsi) into a precise, animation-ready shot list that a director of photography would use on set.

## YOUR TASK
Read the Persian screenplay and produce an ordered shot list. Each shot must include:
1. A Persian title and description (for the director)
2. A **detailed English image-generation prompt** ready for Kling AI (this is the most critical output)
3. Professional cinematography metadata
4. Proper continuity/raccord information

## CINEMATOGRAPHIC PHILOSOPHY: SHOT-BY-SHOT CREATIVITY
You are NOT a machine stamping identical frames. Every shot is a **distinct cinematographic decision** made by a human DP who reads the emotional beat and chooses the right tool. Do NOT mechanically copy the same camera, lens, lighting, and color from shot to shot.

**Golden rule**: Same scene = continuity (raccord). Different scene or different emotional beat = creative freedom to shift the visual language.

- **Camera body** can change shot-to-shot: ARRI Alexa for prestige drama, RED Komodo for raw intimacy, Sony FX6 for documentary immediacy, Blackmagic for gritty texture.
- **Lens family** can change: anamorphic for epic wides, spherical for clean mediums, vintage glass for memory/flashback, macro for inserts.
- **Color temperature** shifts with mood: warm amber for reunion, cold steel for isolation, saturated neon for nightlife, desaturated earth for war, soft pastel for romance.
- **Lighting philosophy** shifts with the beat: hard chiaroscuro for tension, soft diffused for tenderness, practical-only for realism, stylized key for glamour.
- **Film texture** varies: clean digital for sci-fi, fine grain for prestige drama, heavy grain for documentary grit, no grain for commercial polish.

${directorBriefContext}
## ENGLISH PROMPT WRITING RULES (MOST CRITICAL)
The "prompt" field is sent directly to an AI image generator. It must be a single, rich paragraph (60-120 words) in English that paints the EXACT frame. Make EVERY prompt visually DISTINCT from adjacent shots — different lighting quality, different lens character, different color temperature. Follow this structure:

**[Shot size] [of subject/action], [location/environment with specific physical details], [time of day], [lighting description with direction, quality, AND emotional motivation], [camera body + lens + focal length chosen for THIS beat], [color palette/grade chosen for THIS beat], [composition and depth of field], [aspect ratio], [film grain/texture chosen for THIS mood]**

### RACCORD & CONTINUITY IN PROMPTS
When writing prompts for consecutive shots in the SAME scene:
- Describe the SAME environment details (wall color, furniture placement, window position, weather)
- Characters must wear the SAME clothes, have the SAME hairstyle, and maintain physical consistency
- Light source direction must remain consistent (if sun is from camera-left in shot 1, it stays camera-left)
- Props and set dressing mentioned in establishing shot must appear in subsequent shots
- Color temperature must remain consistent within a scene
- If a character holds an object in one shot, reference it in subsequent shots

### Example prompts (study these carefully):
- "Extreme wide establishing shot of an ancient Persian caravanserai at the edge of the Lut Desert at golden hour, warm amber sunlight casting long shadows across weathered brick archways, crumbling turquoise tile mosaics on the eastern wall, a dusty courtyard with a dry stone fountain center frame, shot on ARRI Alexa Mini LF with Cooke S7/i 18mm spherical lens, earthy terracotta and burnt sienna palette with slight desaturation and warm highlights, deep depth of field f/8, fine 35mm film grain texture, 2.39:1 anamorphic aspect ratio"
- "Medium close-up of an elderly woman's weathered hands kneading dough on a flour-dusted wooden table, soft window light from camera left creating gentle Rembrandt lighting pattern on her weathered face with deep smile lines, wearing a faded indigo headscarf and cream linen dress, the same turquoise-tiled kitchen wall visible in soft focus behind her, shot on ARRI Alexa Mini LF with Cooke S7/i 50mm spherical lens at f/1.8, warm golden interior tones with cool blue shadow fill from the window, practical oil lamp adding amber rim light on her right shoulder, fine 35mm film grain, 2.39:1"

## SHOT SEQUENCING & EDITING RULES — DIRECT LIKE A CINEMATOGRAPHER
Follow professional editing conventions for smooth, cinematic, animation-ready sequences:
1. **Establish before detail**: Each new scene MUST begin with WIDE or ESTABLISHING shot showing the full environment
2. **Master scene coverage**: Wide -> Medium -> Close-up -> Reverse/Cutaway (classic Hollywood pattern)
3. **180-degree rule**: Maintain consistent screen direction within every scene — never cross the axis without a clear motivation
4. **Shot/reverse-shot for dialogue**: Alternate between speakers with matching complementary angles (e.g., left-profile -> right-profile)
5. **Cutaways and inserts**: Include at least 1 detail/insert shot per scene for editing flexibility
6. **Pacing variety**: Never repeat the same shot size consecutively — alternate between wide, medium, close for visual rhythm
7. **Emotional beats**: Close-ups for emotional moments, wides for isolation/scale/loneliness
8. **Motivated transitions**: Each shot should logically lead to the next through action, gaze, or sound
9. **Duration logic**: Establishing shots = 4-6s, dialogue medium = 3-5s, close-up inserts = 2-3s, action = 2-4s

## CAMERA MOVEMENT ↔ MOTION MAPPING (CRITICAL — DRIVES VIDEO AI MOTION)
For every shot, the cameraMovement controls how the AI animates the image into video. Map the emotional beat to motion:
- **static**: No movement — locked-off composition, perfect for inserts, emotional close-ups, tableaus
- **pan**: Horizontal camera sweep — reveals space, landscape, follow action across frame
- **tilt**: Vertical camera move — reveals height/scale, upward awe, downward discovery
- **dolly_in**: Slow push toward subject — growing intimacy, tension, character realization
- **dolly_out**: Retreat from subject — isolation, scale reveal, "pulling away" emotional beat
- **truck**: Lateral tracking shot — following walking/running subject, keeping them in frame
- **crane**: Rising/falling camera — dramatic elevation, overhead reveal, epic scope
- **handheld**: Organic slight movement — documentary realism, anxiety, immediacy
- **steadicam**: Smooth floating glide — dreamlike, seamless POV following, elegance
- **whip_pan**: Fast horizontal snap — energy, action, disorientation, transition energy
- **zoom**: Focal length change — sudden discovery, thriller tension, surveillance
- **push_in**: Slow steady approach — contemplation, dawning understanding
- **pull_out**: Slow steady retreat — loss, departure, widening context
- **arc**: Orbital camera around subject — empowerment, 360° reveal, scrutiny

MANDATORY: Do NOT repeat the same movement 3 times in a row. Alternate: static → movement → static → different movement. This creates editing rhythm.

## LENS-TO-SHOT-TYPE MAPPING (CRITICAL FOR REALISM)
The focalLength must match the shot type. Do NOT use 85mm for an establishing shot or 14mm for a close-up. Enforce this mapping:
- **establishing / extreme_wide / wide**: 14mm–18mm (environmental, architectural)
- **medium_wide**: 24mm–28mm (contextual, walk-and-talk)
- **medium / two_shot / over_shoulder**: 35mm–50mm (natural human perspective)
- **medium_close_up**: 50mm–65mm (slight compression, flattering)
- **close_up**: 65mm–85mm (compressed background, portrait intimacy)
- **extreme_close_up / insert**: 85mm–100mm (shallow depth, detail isolation)
- **cutaway**: 50mm–100mm depending on subject size (match the establishing lens)

## CINEMATIC CUTTING LANGUAGE (CRITICAL — APPLY TO EVERY SCENE)
You are editing like a director, not just photographing. Every scene must feel alive:
- **Progressive revelation**: Each new shot reveals NEW information — don't repeat what we already saw
- **Axis of action**: Establish and respect the 180° line; if you cross it, use an insert or cutaway as a "bridge"
- **Match-cut continuity**: When cutting from wide to close-up, the subject's position/screen direction must raccord (match)
- **J-cuts & L-cuts**: Plan overlapping audio-visual transitions — let dialogue or sound lead/follow the picture cut
- **No complete gesture repetition**: If a character raises a hand in shot A, show the RESULT (hand at destination) in shot B, not the same raising motion again
- **Cut on action**: Cut DURING a movement (e.g., turning, walking, sitting) not before or after it finishes
- **Emotional rhythm**: Action scenes = faster cuts (2-3s), contemplative = slower, longer takes (5-7s)
- **Reveal shots**: Start with partial frame (shoulder, shadow, empty space) then reveal the subject — creates suspense
- **Counter-movement**: If shot A dollies left, let shot B counter with a static or rightward movement for visual variety
- **Negative space**: Use empty space in the frame to suggest absence, waiting, or psychological distance

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "projectPalette": {
    "cameraModel": "Primary camera used for MOST shots (shot-level overrides allowed for stylistic contrast)",
    "lensFamily": "Primary lens family used for MOST shots (shot-level overrides encouraged for variety)",
    "colorScience": "Dominant color mood for the film (individual shots can shift temperature/saturation for emotional punctuation)",
    "filmTexture": "Primary grain/texture look (clean digital vs film grain can change per scene)",
    "lightingPhilosophy": "Overall lighting approach (specific shots may use hard/soft/chiaroscuro as the scene demands)"
  },
  "shots": [
    {
      "title": "عنوان فارسی کوتاه شات",
      "description": "توصیف کامل بصری صحنه به فارسی - شامل جزئیات محیط، شخصیت‌ها، اکشن، و حال‌وهوا",
      "prompt": "Full English prompt for AI image generation - 60-120 words",
      "sceneNumber": 1,
      "sceneName": "نام سکانس به فارسی",
      "shotType": "establishing|extreme_wide|wide|medium_wide|medium|medium_close_up|close_up|extreme_close_up|insert|cutaway|two_shot|over_shoulder",
      "cameraAngle": "eye_level|high_angle|low_angle|birds_eye|worms_eye|dutch|pov|over_shoulder",
      "cameraMovement": "static|pan|tilt|dolly_in|dolly_out|truck|crane|handheld|steadicam|whip_pan|zoom|push_in|pull_out|arc",
      "cameraModel": "arri_alexa_mini_lf|arri_alexa_35|red_v_raptor|red_komodo|sony_venice_2|sony_fx6|blackmagic_ursa_g2|blackmagic_pocket_6k|canon_c70|canon_r5c|panasonic_s1h",
      "lensType": "spherical|anamorphic|vintage_anamorphic|vintage_spherical|macro|tilt_shift|fisheye",
      "focalLength": "14mm|18mm|24mm|28mm|35mm|40mm|50mm|65mm|85mm|100mm|135mm|200mm",
      "cinemaAspectRatio": "${aspectRatio}",
      "shotFocus": "deep_focus|shallow_focus|soft_focus|tilt_shift_v|tilt_shift_h",
      "cameraMechanism": "tripod|handheld|gimbal|steadicam|crane|drone",
      "keyLight": "key_light|fill_light|backlight|high_key|low_key|natural|golden_hour|blue_hour|neon|silhouette|chiaroscuro|soft_diffused|hard_dramatic",
      "mainLight": "key_light|fill_light|backlight|high_key|low_key|natural|golden_hour|blue_hour|neon|silhouette|chiaroscuro|soft_diffused|hard_dramatic",
      "rimLight": "key_light|fill_light|backlight|high_key|low_key|natural|golden_hour|blue_hour|neon|silhouette|chiaroscuro|soft_diffused|hard_dramatic",
      "colorGrade": "Detailed English color grading description",
      "duration": 3,
      "dialogueText": "دیالوگ فارسی اگر وجود دارد، وگرنه خالی",
      "notes": "یادداشت کارگردان به فارسی",
      "raccordNotes": "English continuity notes: what must match with adjacent shots",
      "transitionFromPrev": "cut|match_cut|dissolve|fade|whip|j_cut|l_cut",
      "locationId": null,
      "characterIds": [],
      "propIds": []
    }
  ]
}

## CONSTRAINTS
- Target aspect ratio for all shots: ${aspectDesc}
- Visual style direction: ${styleDesc}
- Each scene MUST produce 4-8 shots minimum: wide establishing + medium wide + medium + medium close-up + close-up + reverse/cutaway + insert + detail
- Every scene needs FULL coverage: master shot, singles, two-shots, inserts, cutaways. Never leave a scene with only 1 shot.
- The English prompt is THE MOST IMPORTANT field
- Do NOT use emoji anywhere
- Return valid JSON only, no markdown or extra text
- Duration values should be realistic: establishing=4-6s, medium=3-5s, close-up=2-3s, insert=2-3s
${maxShots ? `- IMPORTANT: Generate EXACTLY ${maxShots} shots total (no more, no less).` : ""}
${logline ? `- Story context/logline: ${logline}` : ""}
${elementContext}`;

    const aiModel = limits.llmModel || "openai/gpt-4o";

    console.log(
      `[AI/storyboard] Starting generation — model: ${aiModel}, script: ${script.length} chars, elements: ${elements.length}, hasDirectorBrief: ${!!directorBrief && Object.values(directorBrief).some(Boolean)}, maxShots: ${maxShots ?? "auto"}`,
    );

    const response = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Break down this Persian screenplay into a professional, animation-ready shot list.${maxShots ? ` Generate EXACTLY ${maxShots} shots total.` : ""} For each shot, write a detailed English image-generation prompt that ensures visual consistency across the entire film.

IMPORTANT REQUIREMENTS:
1. Every shot is a DISTINCT cinematographic decision — camera body, lens, lighting, color, and texture can shift shot-by-shot based on the emotional beat
2. Follow proper directing conventions: establish-wide-medium-close pattern, shot/reverse-shot for dialogue
3. Maintain strict raccord/continuity within a scene: same environment details, character wardrobe, lighting direction — BUT lighting QUALITY (hard/soft, contrast ratio) and color temperature CAN shift for emotional punctuation
4. Each prompt must include: specific camera + lens + focal length CHOSEN FOR THIS BEAT, lighting direction with emotional motivation, color palette chosen for this moment, environment details, character appearance, film texture matching the mood, and aspect ratio
5. Plan transitions between shots for smooth editing flow
${maxShots ? `6. Generate EXACTLY ${maxShots} shots - no more, no less` : ""}

Screenplay:
${script}`,
        },
      ],
      max_tokens: 8096,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const durationMs = Date.now() - startTime;
    const usage = response.usage;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error(
        `[AI/storyboard] No content returned — model: ${aiModel}, duration: ${durationMs}ms`,
      );
      return NextResponse.json(
        {
          error: "پاسخی از هوش مصنوعی دریافت نشد",
          code: "NO_RESPONSE",
          detail: `model: ${aiModel}, durationMs: ${durationMs}`,
        },
        { status: 500 },
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
          console.error(
            `[AI/storyboard] JSON parse failed after regex recovery — content length: ${content.length}`,
          );
          return NextResponse.json(
            {
              error: "خطا در پردازش پاسخ هوش مصنوعی",
              code: "PARSE_ERROR",
              detail: `raw content length: ${content.length}`,
            },
            { status: 500 },
          );
        }
      } else {
        console.error(
          `[AI/storyboard] No JSON found in response — content: ${content.slice(0, 200)}`,
        );
        return NextResponse.json(
          {
            error: "خطا در پردازش پاسخ هوش مصنوعی",
            code: "PARSE_ERROR",
            detail: `raw content length: ${content.length}`,
          },
          { status: 500 },
        );
      }
    }

    const shots = (parsed.shots || []).map((shot: any, index: number) => ({
      ...shot,
      order: index,
      duration:
        typeof shot.duration === "number"
          ? shot.duration
          : parseInt(shot.duration) || 3,
      raccordNotes: shot.raccordNotes || "",
      transitionFromPrev: shot.transitionFromPrev || "cut",
    }));

    console.log(
      JSON.stringify({
        route: "AI/storyboard",
        model: aiModel,
        promptTokens: usage?.prompt_tokens ?? null,
        completionTokens: usage?.completion_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
        durationMs,
        resultSummary: `${shots.length} shots generated`,
        hasProjectPalette: !!(parsed.projectPalette || parsed.projectDefaults),
        scriptLength: script.length,
        elementCount: elements.length,
      }),
    );

    return NextResponse.json({
      shots,
      totalShots: shots.length,
      model: aiModel,
      durationMs,
      tokensUsed: usage?.total_tokens ?? null,
      projectPalette: parsed.projectPalette || parsed.projectDefaults || null,
      projectDefaults: parsed.projectPalette || parsed.projectDefaults || null,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI/storyboard] Error after ${durationMs}ms:`, error);

    if (
      error instanceof Error &&
      (error.message.includes("401") || error.message.includes("Unauthorized"))
    ) {
      return NextResponse.json(
        {
          error:
            "کلید API هوش مصنوعی نامعتبر است. لطفاً کلید OpenRouter را بررسی کنید.",
          code: "OPENROUTER_KEY_INVALID",
          detail: `durationMs: ${durationMs}`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "خطا در تولید استوری‌بورد",
        code: "GENERATION_ERROR",
        detail: `durationMs: ${durationMs}`,
      },
      { status: 500 },
    );
  }
}
