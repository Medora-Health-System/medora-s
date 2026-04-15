import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookieOptions } from "@/lib/server/authCookieOptions";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";

import { resolveApiUrl } from "@/lib/server/resolveApiUrl";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() ?? "";
  const withRequestId = (res: NextResponse) => {
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  };
  const originDenied = validateRequestOrigin(request);
  if (originDenied) return withRequestId(originDenied);

  const apiUrl = resolveApiUrl();

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;
  if (refreshToken) {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(requestId ? { "x-request-id": requestId } : {}),
        },
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

  return withRequestId(NextResponse.json({ success: true }));
}

