import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const allUsers = await db.select().from(users);
    const safe = allUsers.map(({ password, ...rest }) => rest);
    return NextResponse.json({ users: safe });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "خطا در بارگزری اطلاعات" }, { status: 500 });
  }
}
