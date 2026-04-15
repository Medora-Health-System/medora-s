import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const incomingRequestId = request.headers.get("x-request-id")?.trim() ?? "";
  const requestId =
    incomingRequestId ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);

  const nextWithRequestId = () => {
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-request-id", requestId);
    return res;
  };

  // PWA / public assets (must never go through session checks)
  if (
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/")
  ) {
    return nextWithRequestId();
  }

  const sessionCookie =
    request.cookies.get("medora_session")?.value ?? request.cookies.get("accessToken")?.value;

  // Allow login, forgot/reset password, and /api/auth/* routes
  const publicAuthPaths = ["/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];
  if (publicAuthPaths.includes(pathname) || pathname.startsWith("/api/auth/")) {
    if (pathname === "/login" && sessionCookie) {
      const res = NextResponse.redirect(new URL("/app", request.url));
      res.headers.set("x-request-id", requestId);
      return res;
    }
    return nextWithRequestId();
  }

  // Protect /app routes - redirect to /login if no session
  if (pathname.startsWith("/app")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.headers.set("x-request-id", requestId);
      return res;
    }
  }

  return nextWithRequestId();
}

export const config = {
  matcher: [
    "/manifest.webmanifest",
    "/sw.js",
    "/icons/:path*",
    "/api/backend/:path*",
    "/app/:path*",
    "/login",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/api/auth/:path*",
  ],
};

