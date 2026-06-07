import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  projects,
  visionShots,
  audioTracks,
  tickets,
  usageLogs,
  agentRunLogs,
  assemblies,
} from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const [
      userRows,
      projectRows,
      shotCount,
      audioCount,
      ticketRows,
      usageToday,
      agentLogs,
      assemblyRows,
    ] = await Promise.all([
      db.select({ tier: users.tier, count: sql<number>`count(*)::int` }).from(users).groupBy(users.tier),
      db.select({ stage: projects.currentStage, count: sql<number>`count(*)::int` }).from(projects).groupBy(projects.currentStage),
      db.select({ count: sql<number>`count(*)::int` }).from(visionShots),
      db.select({ count: sql<number>`count(*)::int` }).from(audioTracks),
      db.select({ status: tickets.status, count: sql<number>`count(*)::int` }).from(tickets).groupBy(tickets.status),
      db
        .select({ total: sql<number>`coalesce(sum(credits_used),0)::int` })
        .from(usageLogs)
        .where(sql`created_at >= now() - interval '24 hours'`),
      db
        .select({ status: agentRunLogs.status, count: sql<number>`count(*)::int` })
        .from(agentRunLogs)
        .groupBy(agentRunLogs.status),
      db
        .select({ status: assemblies.status, count: sql<number>`count(*)::int` })
        .from(assemblies)
        .groupBy(assemblies.status),
    ]);

    const totalUsers = userRows.reduce((a, r) => a + r.count, 0);
    const totalProjects = projectRows.reduce((a, r) => a + r.count, 0);
    const totalShots = shotCount[0]?.count || 0;
    const totalAudio = audioCount[0]?.count || 0;
    const openTickets = ticketRows.find(r => r.status === "open")?.count || 0;
    const totalTickets = ticketRows.reduce((a, r) => a + r.count, 0);
    const creditsToday = usageToday[0]?.total || 0;

    return NextResponse.json({
      users: {
        total: totalUsers,
        byTier: Object.fromEntries(userRows.map(r => [r.tier, r.count])),
      },
      projects: {
        total: totalProjects,
        byStage: Object.fromEntries(projectRows.map(r => [r.stage || "unknown", r.count])),
      },
      shots: { total: totalShots },
      audio: { total: totalAudio },
      tickets: { open: openTickets, total: totalTickets },
      credits: { today: creditsToday },
      agents: { byStatus: Object.fromEntries(agentLogs.map(r => [r.status, r.count])) },
      assemblies: { byStatus: Object.fromEntries(assemblyRows.map(r => [r.status || "unknown", r.count])) },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "خطا در بارگزاری آمار" }, { status: 500 });
  }
}
