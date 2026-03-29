import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PWA / public assets (must never go through session checks)
  if (
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/")
  ) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("medora_session")?.value ?? request.cookies.get("accessToken")?.value;

  // Allow login, forgot/reset password, and /api/auth/* routes
  const publicAuthPaths = ["/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];
  if (publicAuthPaths.includes(pathname) || pathname.startsWith("/api/auth/")) {
    if (pathname === "/login" && sessionCookie) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  // Protect /app routes - redirect to /login if no session
  if (pathname.startsWith("/app")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/manifest.webmanifest",
    "/sw.js",
    "/icons/:path*",
    "/app/:path*",
    "/login",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/api/auth/:path*",
  ],
};

