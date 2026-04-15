import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookieOptions } from "@/lib/server/authCookieOptions";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";

import { resolveApiUrl } from "@/lib/server/resolveApiUrl";

const API_URL = resolveApiUrl();

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

  const clearOpts = clearAuthCookieOptions();
  cookieStore.set("medora_session", "", clearOpts);
  cookieStore.set("accessToken", "", clearOpts);

  cookieStore.set("refreshToken", "", clearOpts);

  return NextResponse.json({ success: true });
}

