import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || "missing",
});

export async function POST(request: NextRequest) {
  const apiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "missing") {
    return NextResponse.json(
      { error: "کلید API هوش مصنوعی تنظیم نشده است" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      script = "",
      logline = "",
      title = "",
      directorBrief = {},
      filmDuration = 60,
      sceneVisualIdentity,
      visualArc,
    } = body;

    const systemPrompt = `You are an award-winning film composer (Hans Zimmer, Ryuichi Sakamoto, Hildur Guðnadóttir) who scores for Netflix, A24, Cannes competition films, and independent Persian cinema. You are deeply skilled in film music theory, emotional arc mapping, and cinematic cue design.

Your job: write a single English text prompt for ElevenLabs Music (an AI music generator) that produces an original, production-ready film score cue — NOT a reference to any known song, composer, or band.

## CREATIVE RULES
1. The prompt MUST be in English.
2. The prompt MUST describe an original composition in cinematic terms — instruments, mood, tempo, dynamics, arrangement, texture, spatial qualities — NEVER reference a known artist or song.
3. The prompt MUST be tailored to the film's genre, era, mood, visual arc, and scene-level atmosphere.
4. The prompt should be 80–180 words, vivid and production-ready. Use specific musical language: legato, pizzicato, tremolo, ostinato, glissando, ritardando, crescendo, staccato, legato, etc.
5. Think about the emotional arc of the scene — does the music need to rise, fall, hold tension, or release? Describe the arc.
6. Consider spatial audio: is the music diegetic (in-scene) or non-diegetic (score)? Is it intimate or vast?
7. You MUST recommend:
   - genre (string)
   - mood (string)
   - suggestedDuration (number in seconds, up to 60 max)
   - bpmRange (string like "90–110")
   - instrumentation (array of strings)
   - sceneBreakdown (string explaining why this fits)
   - cueSheet (array of {time: string, cue: string} entries — a mini cue sheet showing where key musical moments hit in the scene)
   - emotionalArc (string describing the musical arc)
   - dynamics (string: pp / p / mp / mf / f / ff)
   - texture (string: sparse / layered / dense / minimal / orchestral)
   - spatialQuality (string: intimate / wide / immersive / distant)
8. Return ONLY valid JSON.

## OUTPUT FORMAT
{
  "prompt": "Detailed English music prompt for ElevenLabs Music",
  "genre": "Film genre",
  "mood": "Primary emotional mood",
  "suggestedDuration": 30,
  "bpmRange": "90–110",
  "instrumentation": ["piano", "strings", "synth pad"],
  "sceneBreakdown": "Why this fits the scene",
  "cueSheet": [
    {"time": "0:00", "cue": "Opening: solo piano, tentative"},
    {"time": "0:15", "cue": "Build: strings enter, rising tension"}
  ],
  "emotionalArc": "Tension builds then resolves into melancholy",
  "dynamics": "mp to f",
  "texture": "layered",
  "spatialQuality": "wide"
}`;

    const sceneContext = sceneVisualIdentity
      ? `\nScene Atmosphere:\n${sceneVisualIdentity.timeOfDay ? `- Time of Day: ${sceneVisualIdentity.timeOfDay}` : ""}
${sceneVisualIdentity.mood ? `- Scene Mood: ${sceneVisualIdentity.mood}` : ""}
${sceneVisualIdentity.lightingStyle ? `- Lighting Style: ${sceneVisualIdentity.lightingStyle}` : ""}
${sceneVisualIdentity.colorTemperature ? `- Color Temperature: ${sceneVisualIdentity.colorTemperature}` : ""}
${sceneVisualIdentity.atmosphereDescription ? `- Atmosphere: ${sceneVisualIdentity.atmosphereDescription}` : ""}
`
      : "";

    const visualArcContext = visualArc
      ? `\nVisual Arc (Beginning → Middle → End):\n${visualArc.beginning ? `- Beginning: ${visualArc.beginning}` : ""}
${visualArc.middle ? `- Middle: ${visualArc.middle}` : ""}
${visualArc.end ? `- End: ${visualArc.end}` : ""}
`
      : "";

    const userPrompt = `Compose a film score for this project:

Title: ${title || "Untitled"}
Logline: ${logline || "Not provided"}
${script ? `\nScript excerpt (first 500 chars):\n${script.slice(0, 500)}` : ""}
${sceneContext}
${visualArcContext}

Director Brief:
${directorBrief.filmStyle ? `- Film Style: ${directorBrief.filmStyle}` : ""}
${directorBrief.overallMood ? `- Overall Mood: ${directorBrief.overallMood}` : ""}
${directorBrief.era ? `- Era: ${directorBrief.era}` : ""}
${directorBrief.filmTexture ? `- Texture: ${directorBrief.filmTexture}` : ""}
${directorBrief.colorScience ? `- Color Science: ${directorBrief.colorScience}` : ""}
${directorBrief.lightingPhilosophy ? `- Lighting: ${directorBrief.lightingPhilosophy}` : ""}
${directorBrief.referenceFilms ? `- Reference Films: ${directorBrief.referenceFilms}` : ""}
${directorBrief.signatureMotif ? `- Signature Motif: ${directorBrief.signatureMotif}` : ""}

Target film duration: ~${filmDuration} seconds.

Write the music prompt and metadata as JSON only. Include the cue sheet and full musical analysis.`;

    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "پاسخی از هوش مصنوعی دریافت نشد" },
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
          return NextResponse.json(
            { error: "خطا در پردازش پاسخ هوش مصنوعی", raw: content.slice(0, 200) },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "خطا در پردازش پاسخ هوش مصنوعی", raw: content.slice(0, 200) },
          { status: 500 }
        );
      }
    }

    // Clamp duration
    const suggestedDuration = Math.min(Math.max(parsed.suggestedDuration || 30, 5), 60);

    return NextResponse.json({
      prompt: parsed.prompt || "",
      genre: parsed.genre || "cinematic",
      mood: parsed.mood || "dramatic",
      suggestedDuration,
      bpmRange: parsed.bpmRange || "",
      instrumentation: parsed.instrumentation || [],
      sceneBreakdown: parsed.sceneBreakdown || "",
      cueSheet: parsed.cueSheet || [],
      emotionalArc: parsed.emotionalArc || "",
      dynamics: parsed.dynamics || "",
      texture: parsed.texture || "",
      spatialQuality: parsed.spatialQuality || "",
    });
  } catch (error) {
    console.error("[AI/music-prompt] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در تولید پرامپت موسیقی" },
      { status: 500 }
    );
  }
}
