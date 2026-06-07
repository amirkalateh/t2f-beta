import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audioTracks, projects, visionShots } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkFeatureFlag } from "@/lib/feature-flags";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; shotId: string } }
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "\u06a9\u0644\u06cc\u062f API \u0633\u0631\u0648\u06cc\u0633 ElevenLabs \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a" },
      { status: 503 }
    );
  }

  const enabled = await checkFeatureFlag("elevenlabs_sfx");
  if (!enabled) {
    return NextResponse.json(
      { error: "\u0627\u06cc\u0646 \u0642\u0627\u0628\u0644\u06cc\u062a \u062f\u0631 \u062d\u0627\u0644 \u062d\u0627\u0636\u0631 \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u0627\u0633\u062a" },
      { status: 503 }
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "\u0644\u0637\u0641\u0627\u064b \u0648\u0627\u0631\u062f \u062d\u0633\u0627\u0628 \u06a9\u0627\u0631\u0628\u0631\u06cc \u0634\u0648\u06cc\u062f" },
        { status: 401 }
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
      .where(and(eq(visionShots.id, shotId), eq(visionShots.projectId, projectId)))
      .limit(1);

    if (!shot) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    const body = await request.json() as Record<string, unknown>;
    const promptText = (body.prompt as string) || "";
    const durationSeconds = (body.durationSeconds as number) || 5;

    if (!promptText || promptText.trim().length < 2) {
      return NextResponse.json(
        { error: "\u062a\u0648\u0635\u06cc\u0641 \u0627\u0641\u06a9\u062a \u0635\u0648\u062a\u06cc \u0628\u0627\u06cc\u062f \u062d\u062f\u0627\u0642\u0644 2 \u06a9\u0627\u0631\u0627\u06a9\u062a\u0631 \u0628\u0627\u0634\u062f" },
        { status: 400 }
      );
    }

    // Call ElevenLabs SFX API
    const response = await fetch(`${ELEVENLABS_API_URL}/sound-generation`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: promptText.trim(),
        duration_seconds: Math.min(Math.max(durationSeconds, 0.5), 22),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs SFX error:", errText);
      return NextResponse.json(
        { error: "\u062e\u0637\u0627 \u062f\u0631 \u062a\u0648\u0644\u06cc\u062f \u0627\u0641\u06a9\u062a \u0635\u0648\u062a\u06cc" },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    // Store in audio_tracks with shot_id
    const [track] = await db
      .insert(audioTracks)
      .values({
        projectId,
        shotId,
        name: promptText.slice(0, 60),
        url: audioUrl,
        duration: Math.round(durationSeconds),
        type: "sfx",
        volume: 100,
        startTime: 0,
        metadata: { prompt: promptText, shotId, generatedVia: "storyboard" },
      })
      .returning();

    return NextResponse.json({
      audioTrack: {
        ...track,
        label: track.name,
        generatedUrl: track.url,
        textPrompt: promptText,
      },
      audioBase64: base64,
      contentType: "audio/mpeg",
      duration: Math.round(durationSeconds),
    }, { status: 201 });
  } catch (error) {
    console.error("Shot SFX generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "\u062e\u0637\u0627 \u062f\u0631 \u062a\u0648\u0644\u06cc\u062f \u0627\u0641\u06a9\u062a \u0635\u0648\u062a\u06cc" },
      { status: 500 }
    );
  }
}
