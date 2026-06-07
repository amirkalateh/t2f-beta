import { NextRequest, NextResponse } from "next/server";
import { checkFeatureFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface SceneVisualIdentity {
  sceneNumber?: number;
  sceneName?: string;
  timeOfDay?: string;
  colorTemperature?: string;
  mood?: string;
  lightingStyle?: string;
  dominantColor?: string;
  atmosphereDescription?: string;
}

interface DirectorBrief {
  filmStyle?: string | null;
  filmTexture?: string | null;
  colorScience?: string | null;
  lightingPhilosophy?: string | null;
  overallMood?: string | null;
  era?: string | null;
  signatureMotif?: string | null;
  visualArc?: {
    beginning: string;
    middle: string;
    end: string;
  } | null;
}

function enrichSfxPrompt(
  basePrompt: string,
  sceneVisualIdentity?: SceneVisualIdentity | null,
  directorBrief?: DirectorBrief | null
): string {
  const enrichments: string[] = [];

  if (sceneVisualIdentity) {
    if (sceneVisualIdentity.timeOfDay) {
      const timeOfDaySounds: Record<string, string> = {
        dawn: "early morning birds, soft wind, distant awakening sounds",
        morning: "morning ambient sounds, light traffic, gentle breeze",
        noon: "midday warmth, cicadas, bright ambient hum",
        afternoon: "lazy afternoon sounds, distant voices, warm air",
        golden_hour: "golden hour warmth, gentle breeze, nature settling",
        twilight: "twilight atmosphere, evening insects, fading light sounds",
        night: "night ambience, crickets, distant city hum, silence",
        blue_hour: "blue hour stillness, cool air, distant echoes",
      };
      const timeSound = timeOfDaySounds[sceneVisualIdentity.timeOfDay.toLowerCase()];
      if (timeSound) enrichments.push(timeSound);
    }
    if (sceneVisualIdentity.mood) {
      const moodSounds: Record<string, string> = {
        "تاریک": "dark ambient, low rumble, tension drones",
        "ساسپنس": "heartbeat-like pulses, subtle tension, creeping silence",
        "رمانتیک": "soft warm tones, gentle melodies, romantic ambience",
        "شاد": "bright lively sounds, cheerful ambience, warm tones",
        "غمگین": "melancholic drones, soft rain-like textures, sorrowful tones",
        "تحمل‌آمیز": "inspirational swells, uplifting textures, hopeful ambience",
        "تنش": "anxious ticking, restless movement, uneasy atmosphere",
        "عشم": "angry drones, harsh textures, aggressive ambience",
        "راز": "mysterious echoes, enigmatic textures, curious ambience",
      };
      const moodSound = moodSounds[sceneVisualIdentity.mood] || `ambience matching ${sceneVisualIdentity.mood} mood`;
      enrichments.push(moodSound);
    }
    if (sceneVisualIdentity.lightingStyle) {
      const lightingSounds: Record<string, string> = {
        natural: "natural outdoor ambience, wind, distant nature",
        practical: "indoor practical sounds, room tone, subtle human presence",
        neon: "electric hum, neon buzz, urban nightlife ambience",
        chiaroscuro: "dramatic silence, deep shadows, intense contrast ambience",
        high_key: "bright open ambience, airy sounds, clean room tone",
        low_key: "dark muffled ambience, heavy shadows, intimate silence",
        soft_diffused: "soft gentle ambience, muted sounds, dreamy atmosphere",
        hard_dramatic: "sharp dramatic sounds, stark echoes, tense silence",
      };
      const lightSound = lightingSounds[sceneVisualIdentity.lightingStyle.toLowerCase()];
      if (lightSound) enrichments.push(lightSound);
    }
    if (sceneVisualIdentity.atmosphereDescription) {
      enrichments.push(`atmosphere: ${sceneVisualIdentity.atmosphereDescription}`);
    }
  }

  if (directorBrief) {
    if (directorBrief.filmTexture) {
      enrichments.push(`film texture: ${directorBrief.filmTexture}`);
    }
    if (directorBrief.overallMood) {
      enrichments.push(`overall film mood: ${directorBrief.overallMood}`);
    }
    if (directorBrief.era) {
      const eraSounds: Record<string, string> = {
        "1960s": "vintage 60s ambience, analog warmth, period atmosphere",
        "1970s": "70s retro ambience, warm analog tones, nostalgic sounds",
        "1980s": "80s synth ambience, electronic textures, retro-futuristic",
        "1990s": "90s grunge ambience, urban sounds, raw textures",
        contemporary: "modern digital ambience, clean sounds, contemporary atmosphere",
      };
      const eraSound = eraSounds[directorBrief.era.toLowerCase()];
      if (eraSound) enrichments.push(eraSound);
    }
    if (directorBrief.signatureMotif) {
      enrichments.push(`signature motif: ${directorBrief.signatureMotif}`);
    }
  }

  if (enrichments.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}. Cinematic context: ${enrichments.join(". ")}.`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "کلید API سرویس ElevenLabs تنظیم نشده است" },
      { status: 503 }
    );
  }

  const enabled = await checkFeatureFlag("elevenlabs_sfx");
  if (!enabled) {
    return NextResponse.json(
      { error: "این قابلیت در حال حاضر غیرفعال است" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      text,
      durationSeconds = 5,
      sceneVisualIdentity,
      directorBrief,
      category,
      shotContext,
      layerMode,
    } = body;

    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: "توصیف افکت صوتی باید حداقل ۲ کاراکتر باشد" },
        { status: 400 }
      );
    }

    // Category-specific spatial/texture hints
    const categorySpatialHints: Record<string, string> = {
      ambient: "spatial, immersive, 360-degree field",
      foley: "close-up, dry, focused, tactile",
      impact: "wide, explosive, deep bass, reverberant",
      "sci-fi": "synthetic, processed, wide stereo, otherworldly",
      nature: "wide, natural reverb, open air, organic",
      ui: "clean, dry, close, minimal reverb",
    };
    const spatialHint = category ? categorySpatialHints[category] : "";

    // Shot context enrichment
    let shotEnrichment = "";
    if (shotContext) {
      const parts = [];
      if (shotContext.shotType) parts.push(`shot type: ${shotContext.shotType}`);
      if (shotContext.cameraMovement) parts.push(`camera movement: ${shotContext.cameraMovement}`);
      if (shotContext.duration) parts.push(`duration: ${shotContext.duration}s`);
      if (parts.length) shotEnrichment = ` [Cinematic framing: ${parts.join(", ")}]`;
    }

    let enrichedPrompt = enrichSfxPrompt(text, sceneVisualIdentity, directorBrief);
    if (spatialHint) enrichedPrompt += ` ${spatialHint}.`;
    if (shotEnrichment) enrichedPrompt += shotEnrichment;
    if (layerMode) enrichedPrompt += " (layered composite sound, multiple elements audible)";

    const response = await fetch(`${ELEVENLABS_API_URL}/sound-generation`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: enrichedPrompt,
        duration_seconds: Math.min(Math.max(durationSeconds, 0.5), 22),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs SFX error:", errText);
      return NextResponse.json(
        { error: "خطا در تولید افکت صوتی" },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      audioBase64: base64,
      contentType: "audio/mpeg",
      enrichedPrompt,
    });
  } catch (error) {
    console.error("SFX generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در تولید افکت صوتی" },
      { status: 500 }
    );
  }
}
