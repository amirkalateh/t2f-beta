import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  narratives,
  visionShots,
  audioTracks,
  assemblies,
  visionBoards,
  users,
} from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const projectId = Number(id);

    const [projectRows, narrativeRows, shotRows, audioRows, assemblyRows, boardRows] =
      await Promise.all([
        db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
        db.select().from(narratives).where(eq(narratives.projectId, projectId)).limit(1),
        db
          .select({
            id: visionShots.id,
            order: visionShots.order,
            title: visionShots.title,
            shotType: visionShots.shotType,
            status: visionShots.status,
            duration: visionShots.duration,
            generatedImageUrl: visionShots.generatedImageUrl,
            generatedVideoUrl: visionShots.generatedVideoUrl,
            sceneNumber: visionShots.sceneNumber,
            klingTaskId: visionShots.klingTaskId,
          })
          .from(visionShots)
          .where(eq(visionShots.projectId, projectId))
          .orderBy(visionShots.order),
        db
          .select({
            id: audioTracks.id,
            name: audioTracks.name,
            type: audioTracks.type,
            duration: audioTracks.duration,
            url: audioTracks.url,
            createdAt: audioTracks.createdAt,
          })
          .from(audioTracks)
          .where(eq(audioTracks.projectId, projectId)),
        db.select().from(assemblies).where(eq(assemblies.projectId, projectId)).limit(1),
        db.select().from(visionBoards).where(eq(visionBoards.projectId, projectId)).limit(1),
      ]);

    if (!projectRows[0]) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectRows[0];

    let owner = null;
    if (project.userId) {
      const [ownerRow] = await db
        .select({
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          tier: users.tier,
        })
        .from(users)
        .where(eq(users.id, project.userId))
        .limit(1);
      owner = ownerRow || null;
    }

    const generatedShots = shotRows.filter(s => s.generatedImageUrl || s.generatedVideoUrl).length;
    const videoShots = shotRows.filter(s => s.generatedVideoUrl).length;

    return NextResponse.json({
      project,
      owner,
      narrative: narrativeRows[0] || null,
      shots: shotRows,
      shotStats: {
        total: shotRows.length,
        generated: generatedShots,
        withVideo: videoShots,
        draft: shotRows.filter(s => s.status === "draft").length,
      },
      audio: audioRows,
      audioStats: {
        total: audioRows.length,
        music: audioRows.filter(a => a.type === "music").length,
        sfx: audioRows.filter(a => a.type === "sfx").length,
        dialogue: audioRows.filter(a => a.type === "dialogue").length,
      },
      assembly: assemblyRows[0] || null,
      visionBoard: boardRows[0] || null,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin project detail error:", error);
    return NextResponse.json({ error: "خطا در بارگزاری پروژه" }, { status: 500 });
  }
}
