import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken");

  // Allow /login and /api/auth/* routes
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    // Redirect authenticated users away from /login to /app
    if (pathname === "/login" && accessToken) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  // Protect /app routes - redirect to /login if no access token
  if (pathname.startsWith("/app")) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/api/auth/:path*"],
};

