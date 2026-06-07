import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionShots, projects, audioTracks } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkFeatureFlag } from "@/lib/feature-flags";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const DEFAULT_VOICES: Record<string, { id: string; name: string }> = {
  persian_male: { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  persian_female: { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  tara: { id: "FX9jgscUzO7OJVMgITol", name: "Tara" },
  narrator: { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
};

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; shotId: string } },
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "\u06a9\u0644\u06cc\u062f API \u0633\u0631\u0648\u06cc\u0633 ElevenLabs \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a",
      },
      { status: 503 },
    );
  }

  const enabled = await checkFeatureFlag("elevenlabs_dialogue");
  if (!enabled) {
    return NextResponse.json(
      { error: "\u0627\u06cc\u0646 \u0642\u0627\u0628\u0644\u06cc\u062a \u062f\u0631 \u062d\u0627\u0644 \u062d\u0627\u0636\u0631 \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u0627\u0633\u062a" },
      { status: 503 },
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        {
          error:
            "\u0644\u0637\u0641\u0627\u064b \u0648\u0627\u0631\u062f \u062d\u0633\u0627\u0628 \u06a9\u0627\u0631\u0628\u0631\u06cc \u0634\u0648\u06cc\u062f",
        },
        { status: 401 },
      );
    }

    const projectId = parseInt(params.id);
    const shotId = parseInt(params.shotId);

    const project = await verifyProjectOwnership(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [shot] = await db
      .select()
      .from(visionShots)
      .where(
        and(eq(visionShots.id, shotId), eq(visionShots.projectId, projectId)),
      )
      .limit(1);

    if (!shot) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const text = (body.text as string) || shot.dialogueText || "";
    const voicePreset = (body.voicePreset as string) || "tara";
    const modelId = (body.modelId as string) || "eleven_v3";
    const autoLipSync = !!body.autoLipSync;

    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        {
          error:
            "\u0645\u062a\u0646 \u062f\u06cc\u0627\u0644\u0648\u06af \u0628\u0627\u06cc\u062f \u062d\u062f\u0627\u0642\u0644 2 \u06a9\u0627\u0631\u0627\u06a9\u062a\u0631 \u0628\u0627\u0634\u062f",
        },
        { status: 400 },
      );
    }

    const resolvedVoiceId =
      DEFAULT_VOICES[voicePreset]?.id || DEFAULT_VOICES.narrator.id;

    const ttsResponse = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      },
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("ElevenLabs TTS v3 error:", errText);
      return NextResponse.json(
        {
          error:
            "\u062e\u0637\u0627 \u062f\u0631 \u062a\u0648\u0644\u06cc\u062f \u0635\u062f\u0627\u06cc \u062f\u06cc\u0627\u0644\u0648\u06af",
        },
        { status: ttsResponse.status },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    // Store dialogue audio track
    const [track] = await db
      .insert(audioTracks)
      .values({
        projectId,
        shotId,
        name: `\u062f\u06cc\u0627\u0644\u0648\u06af \u0634\u0627\u062a ${shotId}`,
        url: audioUrl,
        duration: 0,
        type: "dialogue",
        volume: 100,
        startTime: 0,
        metadata: {
          text: text.trim(),
          voicePreset,
          modelId,
          generatedVia: "auto_dialogue",
        },
      })
      .returning();

    // Update shot with dialogue audio URL
    await db
      .update(visionShots)
      .set({
        dialogueAudioUrl: audioUrl,
        updatedAt: new Date(),
      })
      .where(eq(visionShots.id, shotId));

    return NextResponse.json({
      success: true,
      audioTrack: track,
      audioBase64: base64,
      voiceId: resolvedVoiceId,
      modelId,
      autoLipSync,
      contentType: "audio/mpeg",
    });
  } catch (error) {
    console.error("Dialogue generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "\u062e\u0637\u0627 \u062f\u0631 \u062a\u0648\u0644\u06cc\u062f \u062f\u06cc\u0627\u0644\u0648\u06af",
      },
      { status: 500 },
    );
  }
}
