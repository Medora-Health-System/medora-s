import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtAccessTtlSeconds } from "@/lib/server/sessionCookieOptions";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message?.includes("fetch")) return true;
  const c = err as { code?: string; cause?: { code?: string } };
  return c?.code === "ECONNREFUSED" || c?.cause?.code === "ECONNREFUSED" || c?.code === "ENOTFOUND" || c?.cause?.code === "ENOTFOUND";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username = body.username ?? body.email ?? body.identifier ?? body.user ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Identifiant et mot de passe requis." },
        { status: 400 }
      );
    }

    let r: Response;
    try {
      r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch (fetchErr) {
      console.error("Login API unreachable:", fetchErr);
      return NextResponse.json(
        { error: "Service indisponible. Vérifiez que le serveur est démarré ou contactez l'administrateur." },
        { status: 503 }
      );
    }

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({ error: "Échec de la connexion" }));
      const message = r.status === 401
        ? "Identifiants incorrects."
        : (errorData.message ?? errorData.error ?? "Échec de la connexion");
      return NextResponse.json(
        { error: typeof message === "string" ? message : "Échec de la connexion" },
        { status: r.status }
      );
    }

    let json: { accessToken?: string; refreshToken?: string; user?: { facilityRoles?: Array<{ facilityId: string }> } };
    try {
      json = await r.json();
    } catch {
      return NextResponse.json(
        { error: "Réponse du serveur invalide. Réessayez plus tard." },
        { status: 502 }
      );
    }

    if (!json.accessToken || !json.refreshToken) {
      return NextResponse.json(
        { error: "Réponse du serveur invalide. Réessayez plus tard." },
        { status: 502 }
      );
    }

    const isProduction = process.env.NODE_ENV === "production";

    const res = NextResponse.json({ user: json.user });

    /** Aligné sur JWT_ACCESS_TTL côté API (variable d’environnement partagée recommandée). */
    const accessSeconds = jwtAccessTtlSeconds();
    const sessionCookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isProduction,
      path: "/",
      maxAge: accessSeconds,
    };
    res.cookies.set("medora_session", json.accessToken, sessionCookieOpts);
    res.cookies.set("accessToken", json.accessToken, sessionCookieOpts);

    res.cookies.set("refreshToken", json.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    const sortedRoles = [...(json.user?.facilityRoles ?? [])].sort((a, b) =>
      String(a.facilityId).localeCompare(String(b.facilityId), "en")
    );
    const defaultFacilityId = sortedRoles[0]?.facilityId;
    if (defaultFacilityId) {
      res.cookies.set("facilityId", defaultFacilityId, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      res.cookies.set("medora_facility_id", defaultFacilityId, {
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (error) {
    console.error("Login error:", error);
    const message = isNetworkError(error)
      ? "Service indisponible. Vérifiez votre connexion ou contactez l'administrateur."
      : "Une erreur inattendue s'est produite. Réessayez.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

