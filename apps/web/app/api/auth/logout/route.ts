import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  // Clear both cookies by setting empty value + maxAge: 0
  cookieStore.set("accessToken", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });

  cookieStore.set("refreshToken", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}

