import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const body = await request.json();
    const {
      beforeShot,
      afterShot,
      userDescription,
      projectStyle = "cinematic",
      aspectRatio = "16:9",
      elements = [],
      script = "",
      logline = "",
    } = body;

    if (!userDescription || userDescription.trim().length < 2) {
      return NextResponse.json(
        { error: "لطفا توضیحی برای شات جدید وارد کنید" },
        { status: 400 },
      );
    }

    const beforeContext = beforeShot
      ? `## SHOT BEFORE (must connect smoothly FROM this):
- Title: ${beforeShot.title}
- Description: ${beforeShot.description}
- Prompt: ${beforeShot.prompt}
- Shot Type: ${beforeShot.shotType}
- Camera: ${beforeShot.cameraModel || "not set"}, Lens: ${beforeShot.lensType || "not set"}, Focal: ${beforeShot.focalLength || "not set"}
- Lighting: ${beforeShot.keyLight || "not set"}
- Color Grade: ${beforeShot.colorGrade || "not set"}
- Camera Movement: ${beforeShot.cameraMovement || "static"}
- Camera Angle: ${beforeShot.cameraAngle || "eye_level"}
- Scene Number: ${beforeShot.sceneNumber || "unknown"}
- Scene Name: ${beforeShot.sceneName || "unknown"}
- Location ID: ${beforeShot.locationId || "none"}
- Character IDs: ${JSON.stringify(beforeShot.characterIds || [])}
- Duration: ${beforeShot.duration || 3}s
- Dialogue: ${beforeShot.dialogueText || "none"}
- Aspect Ratio: ${beforeShot.cinemaAspectRatio || aspectRatio}
`
      : "No shot before (this will be the FIRST shot).";

    const afterContext = afterShot
      ? `## SHOT AFTER (must connect smoothly TO this):
- Title: ${afterShot.title}
- Description: ${afterShot.description}
- Prompt: ${afterShot.prompt}
- Shot Type: ${afterShot.shotType}
- Camera: ${afterShot.cameraModel || "not set"}, Lens: ${afterShot.lensType || "not set"}, Focal: ${afterShot.focalLength || "not set"}
- Lighting: ${afterShot.keyLight || "not set"}
- Color Grade: ${afterShot.colorGrade || "not set"}
- Camera Movement: ${afterShot.cameraMovement || "static"}
- Camera Angle: ${afterShot.cameraAngle || "eye_level"}
- Scene Number: ${afterShot.sceneNumber || "unknown"}
- Scene Name: ${afterShot.sceneName || "unknown"}
- Location ID: ${afterShot.locationId || "none"}
- Character IDs: ${JSON.stringify(afterShot.characterIds || [])}
- Duration: ${afterShot.duration || 3}s
- Dialogue: ${afterShot.dialogueText || "none"}
- Aspect Ratio: ${afterShot.cinemaAspectRatio || aspectRatio}
`
      : "No shot after (this will be the LAST shot).";

    const elementContext =
      elements.length > 0
        ? `## PROJECT ELEMENTS
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
    if (meta.distinguishing) extra.push(`distinguishing: ${meta.distinguishing}`);
    if (meta.vibe) extra.push(`vibe: ${meta.vibe}`);
    let desc = `- [${e.type.toUpperCase()}] "${e.name}" (ID: ${e.id})`;
    if (extra.length > 0) desc += `: ${extra.join("; ")}`;
    return desc;
  })
  .join("\n")}
`
        : "";

    const systemPrompt = `You are a world-class cinematographer inserting a NEW shot between two existing shots in a film sequence. Your goal is to create a shot that PERFECTLY bridges the gap between the before and after shots, maintaining complete visual continuity.

## CRITICAL RULES FOR CONTINUITY
1. **Same camera body and lens family** as surrounding shots (if they use ARRI Alexa, you use ARRI Alexa)
2. **Same color grade and film texture** as surrounding shots
3. **Same lighting direction and quality** - if key light is from camera-left, keep it camera-left
4. **Same scene number** if the shots are in the same scene
5. **Character wardrobe and appearance** must match surrounding shots exactly
6. **Environment details** (wall colors, furniture, weather) must match
7. **Motivated transition** - the shot should logically connect from the before shot to the after shot
8. **Professional shot progression** - follow establishing -> medium -> close-up pattern

## USER'S DESCRIPTION FOR THIS SHOT
The filmmaker described what they want: "${userDescription}"

Interpret their description and fill in ALL cinematic details to make it a professional, production-ready shot specification.

${beforeContext}
${afterContext}
${elementContext}
${script ? `## SCREENPLAY CONTEXT\n${script.substring(0, 2000)}\n` : ""}
${logline ? `## LOGLINE\n${logline}\n` : ""}

## OUTPUT FORMAT
Return ONLY valid JSON with a single shot object:
{
  "title": "Persian title for the shot",
  "description": "Full Persian description with raccord details",
  "prompt": "Detailed English image-generation prompt (60-120 words) including camera+lens+focal length, lighting, color grade, environment, character appearance, film texture, aspect ratio - MUST match surrounding shots' visual style",
  "sceneNumber": <integer matching surrounding shots if same scene>,
  "sceneName": "Persian scene name matching surrounding shots if same scene",
  "shotType": "establishing|extreme_wide|wide|medium_wide|medium|medium_close_up|close_up|extreme_close_up|insert|cutaway|two_shot|over_shoulder",
  "cameraAngle": "eye_level|high_angle|low_angle|birds_eye|worms_eye|dutch|pov|over_shoulder",
  "cameraMovement": "static|pan|tilt|dolly_in|dolly_out|truck|crane|handheld|steadicam|whip_pan|zoom|push_in|pull_out|arc",
  "cameraModel": "matching surrounding shots",
  "lensType": "matching surrounding shots",
  "focalLength": "appropriate for shot type",
  "cinemaAspectRatio": "${aspectRatio}",
  "keyLight": "matching surrounding shots",
  "colorGrade": "matching surrounding shots' grade",
  "duration": <2-6 seconds based on shot type>,
  "dialogueText": "Persian dialogue if appropriate, otherwise empty",
  "notes": "Persian director notes including raccord information",
  "raccordNotes": "English continuity notes",
  "transitionFromPrev": "cut|match_cut|dissolve|fade",
  "locationId": <matching location or null>,
  "characterIds": [matching character IDs present],
  "propIds": []
}`;

    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a single shot that fits BETWEEN the surrounding shots. The filmmaker wants: "${userDescription}". Make it seamlessly integrate with the sequence's visual style, colors, lighting, camera setup, and continuity. Return valid JSON only.`,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "پاسخی از هوش مصنوعی دریافت نشد" },
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
          return NextResponse.json(
            { error: "خطا در پردازش پاسخ هوش مصنوعی" },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "خطا در پردازش پاسخ هوش مصنوعی" },
          { status: 500 },
        );
      }
    }

    const shot = {
      ...parsed,
      duration:
        typeof parsed.duration === "number"
          ? parsed.duration
          : parseInt(parsed.duration) || 3,
    };

    return NextResponse.json({ shot });
  } catch (error) {
    console.error("AI Shot insert error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "خطا در تولید شات جدید",
      },
      { status: 500 },
    );
  }
}
