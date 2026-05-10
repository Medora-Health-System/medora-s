/** Phase 9 — Admin MFA reset (BFF). RBAC enforced server-side by the API. */
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
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value;
    if (!accessToken) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    const r = await fetch(`${apiUrl}/admin/mfa/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => ({}));
    return NextResponse.json(json, { status: r.status });
  } catch (error) {
    console.error("[admin/mfa/reset]", error);
    return NextResponse.json({ error: "Service indisponible." }, { status: 500 });
  }
}
