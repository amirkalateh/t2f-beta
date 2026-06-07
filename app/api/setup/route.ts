import { NextResponse } from "next/server";
import { pushSchema } from "@/lib/db-push";
import { db } from "@/lib/db";
import { seedPredefinedUsers } from "@/lib/seed-users";

export async function POST() {
  try {
    await pushSchema();

    const seedResults = await seedPredefinedUsers(db);

    return NextResponse.json({
      message: "راه‌اندازی با موفقیت انجام شد",
      schema: "pushed",
      users: seedResults,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در راه‌اندازی" },
      { status: 500 }
    );
  }
}
