import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionShots, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  klingClient,
  type LipSyncRequest,
} from "@/lib/kling/client";

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
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "لطفاً وارد حساب کاربری شوید" },
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

    if (!shot.generatedVideoUrl) {
      return NextResponse.json(
        { error: "برای این شات ویدیو تولید نشده است" },
        { status: 400 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const audioUrl = (body.audioUrl as string) || shot.dialogueAudioUrl || "";

    if (!audioUrl) {
      return NextResponse.json(
        { error: "فایل صوتی دیالوگ یافت نشد. ابتدا صدای دیالوگ را تولید کنید." },
        { status: 400 }
      );
    }

    // Step 1: Identify face in the video
    await db
      .update(visionShots)
      .set({ lipSyncStatus: "identifying", updatedAt: new Date() })
      .where(eq(visionShots.id, shotId));

    const identifyResult = await klingClient.identifyFace(shot.generatedVideoUrl);
    const sessionId = identifyResult.data.session_id;
    const faceData = identifyResult.data.face_data;

    if (!faceData || faceData.length === 0) {
      await db
        .update(visionShots)
        .set({ lipSyncStatus: "failed", updatedAt: new Date() })
        .where(eq(visionShots.id, shotId));
      return NextResponse.json(
        { error: "هیچ چهره‌ای در ویدیو شناسایی نشد" },
        { status: 400 }
      );
    }

    // Use first detected face
    const face = faceData[0];
    const videoDurationMs = (shot.duration || 5) * 1000;
    const faceDuration = face.end_time - face.start_time;
    const audioDurationMs = (body.audioDuration as number) || faceDuration || videoDurationMs;

    // Step 2: Create lip sync task
    await db
      .update(visionShots)
      .set({ lipSyncStatus: "syncing", updatedAt: new Date() })
      .where(eq(visionShots.id, shotId));

    const lipSyncBody: LipSyncRequest = {
      session_id: sessionId,
      face_choose: [
        {
          face_id: face.face_id,
          sound_file: audioUrl,
          sound_start_time: 0,
          sound_end_time: Math.min(audioDurationMs, videoDurationMs),
          sound_insert_time: face.start_time,
          sound_volume: 1.5,
          original_audio_volume: 0.2,
        },
      ],
    };

    const lipSyncResult = await klingClient.createLipSyncTask(lipSyncBody);
    const lipSyncTaskId = lipSyncResult.data.task_id;

    await db
      .update(visionShots)
      .set({
        lipSyncTaskId,
        updatedAt: new Date(),
      })
      .where(eq(visionShots.id, shotId));

    return NextResponse.json({
      success: true,
      lipSyncTaskId,
      sessionId,
      faceId: face.face_id,
      status: "submitted",
    });
  } catch (error) {
    console.error("Lip sync error:", error);
    await db
      .update(visionShots)
      .set({ lipSyncStatus: "failed", updatedAt: new Date() })
      .where(eq(visionShots.id, parseInt(params.shotId)));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در LipSync" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; shotId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "لطفاً وارد حساب کاربری شوید" },
        { status: 401 }
      );
    }

    const shotId = parseInt(params.shotId);

    const [shot] = await db
      .select()
      .from(visionShots)
      .where(eq(visionShots.id, shotId))
      .limit(1);

    if (!shot || shot.projectId !== parseInt(params.id)) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    if (!shot.lipSyncTaskId) {
      return NextResponse.json({ status: shot.lipSyncStatus || "none" });
    }

    const statusResult = await klingClient.queryLipSyncTask(shot.lipSyncTaskId);
    const taskStatus = statusResult.data.task_status;

    if (taskStatus === "succeed") {
      const videoUrl = statusResult.data.task_result?.videos?.[0]?.url;
      if (videoUrl) {
        await db
          .update(visionShots)
          .set({
            lipSyncStatus: "completed",
            lipSyncUrl: videoUrl,
            updatedAt: new Date(),
          })
          .where(eq(visionShots.id, shotId));
      }
      return NextResponse.json({
        status: "completed",
        videoUrl,
        taskResult: statusResult.data.task_result,
      });
    } else if (taskStatus === "failed") {
      await db
        .update(visionShots)
        .set({ lipSyncStatus: "failed", updatedAt: new Date() })
        .where(eq(visionShots.id, shotId));
      return NextResponse.json({
        status: "failed",
        message: statusResult.data.task_status_msg || "Lip sync failed",
      });
    }

    return NextResponse.json({
      status: taskStatus,
      taskId: shot.lipSyncTaskId,
    });
  } catch (error) {
    console.error("Lip sync status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در بررسی وضعیت" },
      { status: 500 }
    );
  }
}
