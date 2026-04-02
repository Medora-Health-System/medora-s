import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  applyAuthCookiesToResponse,
  refreshAccessTokenFromCookies,
  type RefreshedTokens,
} from "@/lib/server/refreshAccessToken";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(cookieHeader);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function getAccessTokenFromRequest(req: NextRequest): string | null {
  const cookieHeader = req.headers.get("cookie");
  const fromAccess = parseCookieHeader(cookieHeader, "accessToken");
  const fromMedora = parseCookieHeader(cookieHeader, "medora_session");
  return fromAccess ?? fromMedora ?? null;
}

const isDev = process.env.NODE_ENV !== "production";

function devLogProxy(msg: string, data: Record<string, unknown>) {
  if (isDev) {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k === "token" && typeof v === "string") safe[k + "Length"] = v.length;
      else safe[k] = v;
    }
    console.log("[proxy auth]", msg, safe);
  }
}

async function getFacilityId(req: NextRequest, accessToken: string | null): Promise<string | null> {
  const headerFacilityId = req.headers.get("x-facility-id");
  if (headerFacilityId) return headerFacilityId;

  const cookieHeader = req.headers.get("cookie");
  const facilityFromHeader =
    parseCookieHeader(cookieHeader, "facilityId") ??
    parseCookieHeader(cookieHeader, "medora_facility_id");
  if (facilityFromHeader) return facilityFromHeader;

  const cookieStore = await cookies();
  const cookieFacilityId = cookieStore.get("facilityId")?.value ?? cookieStore.get("medora_facility_id")?.value;
  if (cookieFacilityId) return cookieFacilityId;

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
        if (firstFacilityId) return firstFacilityId;
      }
    } catch (e) {
      console.error("Failed to fetch facilityId from /auth/me:", e);
    }
  }

  return null;
}

/**
 * Forward an authenticated request to the Nest API.
 * @param nestPath Path after API root, no leading slash (e.g. `patients/search`, `admin/users`).
 */
export async function proxyNestRequest(req: NextRequest, nestPath: string): Promise<NextResponse> {
  const originDenied = validateRequestOrigin(req);
  if (originDenied) return originDenied;

  const normalized = nestPath.replace(/^\/+/, "");
  const url = `${API_URL}/${normalized}${req.nextUrl.search}`;

  const cookieHeader = req.headers.get("cookie");
  devLogProxy("Cookie header", {
    hasCookieHeader: !!cookieHeader,
    cookieLength: cookieHeader?.length ?? 0,
  });

  const cookieStore = await cookies();
  const fromCookieStoreAccess = cookieStore.get("accessToken")?.value ?? null;
  const fromCookieStoreMedora = cookieStore.get("medora_session")?.value ?? null;
  let accessToken: string | null = fromCookieStoreAccess ?? fromCookieStoreMedora ?? null;
  let selectedSource: "cookieStore" | "header" | null = accessToken ? "cookieStore" : null;

  if (!accessToken) {
    accessToken = getAccessTokenFromRequest(req);
    if (accessToken) selectedSource = "header";
  }

  devLogProxy("Token source", {
    hasMedoraSession: !!fromCookieStoreMedora,
    hasAccessToken: !!fromCookieStoreAccess,
    selectedSource,
    selectedTokenLength: accessToken?.length ?? 0,
  });

  if (!accessToken) {
    if (isDev) console.log("[proxy auth] No token found, returning 401");
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  let lastRefreshed: RefreshedTokens | null = null;
  let didRefresh = false;

  const refreshOnce = async (): Promise<boolean> => {
    if (didRefresh) return false;
    const hasRt = !!cookieStore.get("refreshToken")?.value;
    if (!hasRt) return false;
    const t = await refreshAccessTokenFromCookies();
    if (!t) return false;
    didRefresh = true;
    lastRefreshed = t;
    accessToken = t.accessToken;
    return true;
  };

  let facilityId = await getFacilityId(req, accessToken);

  /** Jeton d’accès expiré : /auth/me échoue → pas d’établissement sans refresh (avant : 400 au lieu de laisser le client rafraîchir). */
  if (!facilityId) {
    await refreshOnce();
    facilityId = await getFacilityId(req, accessToken);
  }

  if (!facilityId) {
    return NextResponse.json({ message: "Aucun établissement sélectionné." }, { status: 400 });
  }

  const bodyText =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const buildForwardInit = (token: string): RequestInit => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("x-facility-id", facilityId!);
    return {
      method: req.method,
      headers,
      body: bodyText,
    };
  };

  let r = await fetch(url, buildForwardInit(accessToken!));

  if (r.status === 401 && !didRefresh) {
    await refreshOnce();
    if (lastRefreshed) {
      r = await fetch(url, buildForwardInit(accessToken!));
    }
  }

  const text = await r.text();

  const res = new NextResponse(text, {
    status: r.status,
    headers: {
      "Content-Type": r.headers.get("content-type") || "application/json",
    },
  });

  if (lastRefreshed) {
    applyAuthCookiesToResponse(res, lastRefreshed);
  }

  return res;
}
