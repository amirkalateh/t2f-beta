import crypto from "crypto";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const PREDEFINED_USERS = [
  { username: "admin", password: "admin2025", displayName: "مدیر سیستم", tier: "unlimited" as const },
  { username: "director", password: "film2025", displayName: "کارگردان", tier: "unlimited" as const },
  { username: "producer", password: "studio2025", displayName: "تهیه‌کننده", tier: "unlimited" as const },
  { username: "editor", password: "edit2025", displayName: "تدوینگر", tier: "unlimited" as const },
  { username: "writer", password: "script2025", displayName: "فیلمنامه‌نویس", tier: "unlimited" as const },
  { username: "demo", password: "demo2025", displayName: "کاربر آزمایشی", tier: "unlimited" as const },
];

export async function seedPredefinedUsers(db: Database) {
  const results: string[] = [];

  for (const userData of PREDEFINED_USERS) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username))
      .limit(1);

    if (existing.length > 0) {
      results.push(`${userData.username}: already exists`);
      continue;
    }

    await db.insert(users).values({
      username: userData.username,
      password: hashPassword(userData.password),
      displayName: userData.displayName,
      tier: userData.tier,
      credits: -1,
      isAdmin: userData.username === "admin",
    });

    results.push(`${userData.username}: created`);
  }

  return results;
}
