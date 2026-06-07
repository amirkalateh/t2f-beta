import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usageLogs, agentRunLogs, users } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "usage";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    if (type === "agent") {
      const rows = await db
        .select({
          id: agentRunLogs.id,
          threadId: agentRunLogs.threadId,
          projectId: agentRunLogs.projectId,
          nodeName: agentRunLogs.nodeName,
          status: agentRunLogs.status,
          costCredits: agentRunLogs.costCredits,
          error: agentRunLogs.error,
          createdAt: agentRunLogs.createdAt,
        })
        .from(agentRunLogs)
        .orderBy(desc(agentRunLogs.createdAt))
        .limit(limit);
      return NextResponse.json({ logs: rows });
    }

    const rows = await db
      .select({
        id: usageLogs.id,
        userId: usageLogs.userId,
        username: users.username,
        displayName: users.displayName,
        action: usageLogs.action,
        creditsUsed: usageLogs.creditsUsed,
        metadata: usageLogs.metadata,
        createdAt: usageLogs.createdAt,
      })
      .from(usageLogs)
      .leftJoin(users, eq(usageLogs.userId, users.id))
      .orderBy(desc(usageLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ logs: rows });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin usage logs error:", error);
    return NextResponse.json({ error: "خطا در بارگزاری لاگ‌ها" }, { status: 500 });
  }
}
