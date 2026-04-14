import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const originDenied = validateRequestOrigin(request);
  if (originDenied) return originDenied;

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (e) {
      console.error("[logout] Nest revoke failed:", e);
    }
  }

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

