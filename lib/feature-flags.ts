import { db } from "@/lib/db";
import { featureFlags } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function checkFeatureFlag(key: string): Promise<boolean> {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);
  return flag?.enabled ?? true;
}

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const rows = await db.select().from(featureFlags);
  const map: Record<string, boolean> = {};
  for (const row of rows) {
    map[row.key] = row.enabled;
  }
  return map;
}
