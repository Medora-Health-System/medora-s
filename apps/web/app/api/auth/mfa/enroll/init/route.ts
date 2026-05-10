/**
 * Phase 9 — MFA enrollment init (BFF).
 *
 * Accepts either:
 *   * a logged-in user (we forward their `accessToken` as Bearer), OR
 *   * an `enrollmentToken` in the body (forced-enrollment branch from login)
 *
 * Returns the otpauth URI + QR data URL the page renders for the user.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { resolveApiUrl } from "@/lib/server/resolveApiUrl";

export async function POST(request: NextRequest) {
  try {
    const apiUrl = resolveApiUrl();
    const body = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value ?? null;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    else if (typeof body?.enrollmentToken === "string") {
      headers["Authorization"] = `Bearer ${body.enrollmentToken}`;
    }

    const r = await fetch(`${apiUrl}/auth/mfa/enroll/init`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const json = await r.json().catch(() => ({}));
    return NextResponse.json(json, { status: r.status });
  } catch (error) {
    console.error("[mfa/enroll/init]", error);
    return NextResponse.json({ error: "Service indisponible." }, { status: 500 });
  }
}
