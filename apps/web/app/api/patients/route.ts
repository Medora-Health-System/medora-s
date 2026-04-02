import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

async function getFacilityId(req: NextRequest): Promise<string | null> {
  // Priority: header > cookie > fetch from /auth/me
  const headerFacilityId = req.headers.get("x-facility-id");
  if (headerFacilityId) return headerFacilityId;

  const cookieStore = await cookies();
  const cookieFacilityId = cookieStore.get("facilityId")?.value;
  if (cookieFacilityId) return cookieFacilityId;

  // Fallback: try to get from /auth/me
  const accessToken =
    cookieStore.get("medora_session")?.value ?? cookieStore.get("accessToken")?.value;
  if (accessToken) {
    try {
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (meResponse.ok) {
        const userData = await meResponse.json();
        const firstFacilityId = userData?.facilityRoles?.[0]?.facilityId;
        if (firstFacilityId) {
          // Cache it in cookie for next time
          cookieStore.set("facilityId", firstFacilityId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
          });
          return firstFacilityId;
        }
      }
    } catch (e) {
      console.error("Failed to fetch facilityId from /auth/me:", e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const originDenied = validateRequestOrigin(req);
    if (originDenied) return originDenied;

    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("medora_session")?.value ?? cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
    }

    const facilityId = await getFacilityId(req);
    if (!facilityId) {
      return NextResponse.json({ message: "Aucun établissement sélectionné." }, { status: 400 });
    }

    const body = await req.json();

    const r = await fetch(`${API_URL}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-facility-id": facilityId,
      },
      body: JSON.stringify(body),
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: "Erreur de communication avec le serveur.", error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("medora_session")?.value ?? cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
    }

    const facilityId = await getFacilityId(req);
    if (!facilityId) {
      return NextResponse.json({ message: "Aucun établissement sélectionné." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const queryString = searchParams.toString();

    const r = await fetch(`${API_URL}/patients${queryString ? `?${queryString}` : ""}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-facility-id": facilityId,
      },
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: "Erreur de communication avec le serveur.", error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

