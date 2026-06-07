import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, sessions } from "@shared/schema";
import { eq } from "drizzle-orm";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        expiresAt,
      })
      .returning();

    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      user: safeUser,
      message: "ورود موفقیت‌آمیز",
    });

    response.cookies.set("session_token", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "خطا در ورود به حساب" },
      { status: 500 }
    );
  }
}
