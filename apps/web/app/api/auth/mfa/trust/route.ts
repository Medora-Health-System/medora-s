import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveApiUrl } from "@/lib/server/resolveApiUrl";
import { MFA_TRUST_COOKIE_NAME, mfaTrustedDeviceCookieOptions } from "@/lib/server/mfaTrustedDeviceCookie";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value;
    if (!accessToken) return NextResponse.json({ errorCode: "SESSION_REQUIRED" }, { status: 401 });

    const r = await fetch(`${resolveApiUrl()}/auth/mfa/trust/issue`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) return NextResponse.json({ errorCode: "MFA_TRUST_NOT_ISSUED" }, { status: r.status });
    const json = (await r.json()) as { trustedMfaToken?: string };
    if (!json.trustedMfaToken) return NextResponse.json({ errorCode: "INVALID_SERVER_RESPONSE" }, { status: 502 });

    const res = NextResponse.json({ trustedForHours: 24 });
    res.cookies.set(MFA_TRUST_COOKIE_NAME, json.trustedMfaToken, mfaTrustedDeviceCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ errorCode: "SERVER_UNAVAILABLE" }, { status: 503 });
  }
}
