import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  const clearOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: 0,
  };
  cookieStore.set("medora_session", "", clearOpts);
  cookieStore.set("accessToken", "", clearOpts);

  cookieStore.set("refreshToken", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}

