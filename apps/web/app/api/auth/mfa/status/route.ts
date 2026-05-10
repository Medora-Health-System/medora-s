/** Phase 9 — MFA status (BFF). Requires logged-in user. */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveApiUrl } from "@/lib/server/resolveApiUrl";

export async function GET() {
  try {
    const apiUrl = resolveApiUrl();
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value;
    if (!accessToken) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    const r = await fetch(`${apiUrl}/auth/mfa/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await r.json().catch(() => ({}));
    return NextResponse.json(json, { status: r.status });
  } catch (error) {
    console.error("[mfa/status]", error);
    return NextResponse.json({ error: "Service indisponible." }, { status: 500 });
  }
}
