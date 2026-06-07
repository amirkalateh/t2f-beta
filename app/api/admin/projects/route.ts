import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, users, visionShots, audioTracks, assemblies } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();

    const allProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        currentStage: projects.currentStage,
        aspectRatio: projects.aspectRatio,
        progress: projects.progress,
        thumbnailUrl: projects.thumbnailUrl,
        userId: projects.userId,
        username: users.username,
        displayName: users.displayName,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .orderBy(desc(projects.updatedAt));

    const projectIds = allProjects.map(p => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const [shotCounts, audioCounts, assemblyCounts] = await Promise.all([
      db
        .select({ projectId: visionShots.projectId, count: sql<number>`count(*)::int` })
        .from(visionShots)
        .groupBy(visionShots.projectId),
      db
        .select({ projectId: audioTracks.projectId, count: sql<number>`count(*)::int` })
        .from(audioTracks)
        .groupBy(audioTracks.projectId),
      db
        .select({ projectId: assemblies.projectId, status: assemblies.status, exportUrl: assemblies.exportUrl })
        .from(assemblies),
    ]);

    const shotMap = Object.fromEntries(shotCounts.map(r => [r.projectId, r.count]));
    const audioMap = Object.fromEntries(audioCounts.map(r => [r.projectId, r.count]));
    const assemblyMap = Object.fromEntries(assemblyCounts.map(r => [r.projectId, r]));

    const enriched = allProjects.map(p => ({
      ...p,
      shotCount: shotMap[p.id] || 0,
      audioCount: audioMap[p.id] || 0,
      assembly: assemblyMap[p.id] || null,
    }));

    return NextResponse.json({ projects: enriched });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin projects error:", error);
    return NextResponse.json({ error: "خطا در بارگزری" }, { status: 500 });
  }
}
