import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedPredefinedUsers } from "@/lib/seed-users";

export async function POST() {
  try {
    const results = await seedPredefinedUsers(db);
    return NextResponse.json({
      message: "کاربران اولیه ایجاد شدند",
      results,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در ایجاد کاربران" },
      { status: 500 }
    );
  }
}
