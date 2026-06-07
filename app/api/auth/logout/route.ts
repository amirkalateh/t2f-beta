import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (sessionToken) {
      await db.delete(sessions).where(eq(sessions.id, sessionToken));
    }

    const response = NextResponse.json({ message: "خروج موفقیت‌آمیز" });

    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "خطا در خروج از حساب" },
      { status: 500 }
    );
  }
}
