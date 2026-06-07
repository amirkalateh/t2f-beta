import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGES = ["/projects", "/studio", "/image", "/video", "/sound", "/character"];
const AUTH_PAGES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/setup")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!sessionToken) {
      return NextResponse.json(
        { error: "لطفاً وارد حساب کاربری شوید" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  const isProtectedPage = PROTECTED_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtectedPage && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/projects/:path*",
    "/studio/:path*",
    "/image/:path*",
    "/video/:path*",
    "/sound/:path*",
    "/character/:path*",
    "/login",
    "/signup",
    "/api/:path*",
  ],
};
