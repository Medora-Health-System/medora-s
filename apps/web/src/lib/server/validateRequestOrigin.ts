import { NextRequest, NextResponse } from "next/server";

const NON_MUTATING = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export function validateRequestOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (NON_MUTATING.has(method)) {
    return null;
  }

  const hostHeader =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    request.nextUrl.host;

  const requestHost = hostHeader.toLowerCase();

  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return NextResponse.json(
        { message: "Requête refusée (origine invalide)." },
        { status: 403 }
      );
    }
    if (originHost !== requestHost) {
      return NextResponse.json(
        { message: "Requête refusée (origine invalide)." },
        { status: 403 }
      );
    }
    return null;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    let refererHost: string;
    try {
      refererHost = new URL(referer).host.toLowerCase();
    } catch {
      return NextResponse.json(
        { message: "Requête refusée (origine invalide)." },
        { status: 403 }
      );
    }
    if (refererHost !== requestHost) {
      return NextResponse.json(
        { message: "Requête refusée (origine invalide)." },
        { status: 403 }
      );
    }
  }

  return null;
}
