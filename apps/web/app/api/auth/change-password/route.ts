import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { applyAuthCookiesToResponse, refreshAccessTokenFromCookies } from "@/lib/server/refreshAccessToken";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const originDenied = validateRequestOrigin(request);
    if (originDenied) return originDenied;

    const body = await request.json();
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const cookieStore = await cookies();
    let accessToken =
      cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const doChange = (token: string) =>
      fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

    let backendResponse = await doChange(accessToken);
    let refreshedTokens: Awaited<ReturnType<typeof refreshAccessTokenFromCookies>> = null;

    if (backendResponse.status === 401) {
      refreshedTokens = await refreshAccessTokenFromCookies();
      if (refreshedTokens) {
        accessToken = refreshedTokens.accessToken;
        backendResponse = await doChange(accessToken);
      }
    }

    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      const message =
        typeof data.message === "string"
          ? data.message
          : typeof data.error === "string"
            ? data.error
            : "Échec de la mise à jour.";
      return NextResponse.json({ error: message }, { status: backendResponse.status });
    }

    const res = NextResponse.json(data);
    if (refreshedTokens) {
      applyAuthCookiesToResponse(res, refreshedTokens);
    }
    return res;
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Service indisponible. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
