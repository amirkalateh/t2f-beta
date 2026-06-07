import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, sessions } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import type { User, UserTier } from "@shared/schema";
import { NextResponse } from "next/server";

export type SafeUser = Omit<User, "password">;

export async function getAuthenticatedUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return null;
    }

    const result = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.id, sessionToken),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { user } = result[0];
    const { password: _, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SafeUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthError("لطفاً وارد حساب کاربری شوید");
  }
  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthError("لطفاً وارد حساب کاربری شوید");
  }
  if (!user.isAdmin) {
    throw new AuthError("دسترسی مدیریتی ندارید");
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

import { TIER_LIMITS } from "@/lib/constants";
import { projects, visionShots } from "@shared/schema";
import { sql } from "drizzle-orm";

export { TIER_LIMITS };

export type TierKey = keyof typeof TIER_LIMITS;

export function getTierLimits(tier: string) {
  return TIER_LIMITS[tier as TierKey] || TIER_LIMITS.free;
}

export async function getUserProjectCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.userId, userId));
  return result[0]?.count || 0;
}

export async function getProjectShotCount(projectId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(visionShots)
    .where(eq(visionShots.projectId, projectId));
  return result[0]?.count || 0;
}

export function checkLimit(current: number, max: number): boolean {
  if (max === -1) return true;
  return current < max;
}
