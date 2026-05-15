import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  applyAuthCookiesToResponse,
  refreshAccessTokenFromCookies,
  type RefreshedTokens,
} from "@/lib/server/refreshAccessToken";
import { validateRequestOrigin } from "@/lib/server/validateRequestOrigin";
import { resolveApiUrl } from "@/lib/server/resolveApiUrl";

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

/** Consistent JSON when the Nest API is unreachable (DNS, ECONNREFUSED, timeout). No stack traces to clients. */
function backendUnavailableResponse(requestId: string): NextResponse {
  const res = NextResponse.json(
    { errorCode: "BACKEND_UNAVAILABLE", message: "Service temporarily unavailable." },
    { status: 503 }
  );
  if (requestId) res.headers.set("x-request-id", requestId);
  return res;
}

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

async function getFacilityId(
  req: NextRequest,
  accessToken: string | null,
  apiUrl: string
): Promise<string | null> {
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
      const requestId = req.headers.get("x-request-id")?.trim();
      const meHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };
      if (requestId) meHeaders["x-request-id"] = requestId;
      const meResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: meHeaders,
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
  const requestId = req.headers.get("x-request-id")?.trim() ?? "";
  const originDenied = validateRequestOrigin(req);
  if (originDenied) {
    if (requestId) originDenied.headers.set("x-request-id", requestId);
    return originDenied;
  }

  const apiUrl = resolveApiUrl();
  const normalized = nestPath.replace(/^\/+/, "");
  const url = `${apiUrl}/${normalized}${req.nextUrl.search}`;

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
    const res = NextResponse.json({ message: "Authentication required." }, { status: 401 });
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  }

  let lastRefreshed: RefreshedTokens | null = null;
  let didRefresh = false;
  /** Une seule tentative de refresh par requête proxy (évite 2× POST /auth/refresh si le 1er échoue puis un 401 Nest). */
  let refreshAttempted = false;

  const refreshOnce = async (): Promise<boolean> => {
    if (refreshAttempted) return false;
    refreshAttempted = true;
    const hasRt = !!cookieStore.get("refreshToken")?.value;
    if (!hasRt) return false;
    const t = await refreshAccessTokenFromCookies(requestId || undefined);
    if (!t) return false;
    didRefresh = true;
    lastRefreshed = t;
    accessToken = t.accessToken;
    return true;
  };

  let facilityId = await getFacilityId(req, accessToken, apiUrl);

  /** Jeton d’accès expiré : /auth/me échoue → pas d’établissement sans refresh (avant : 400 au lieu de laisser le client rafraîchir). */
  if (!facilityId) {
    await refreshOnce();
    facilityId = await getFacilityId(req, accessToken, apiUrl);
  }

  if (!facilityId) {
    const res = NextResponse.json({ message: "No facility selected." }, { status: 400 });
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  }

  const bodyText =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const buildForwardInit = (token: string): RequestInit => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("x-facility-id", facilityId!);
    if (requestId) headers.set("x-request-id", requestId);
    const uiLang = req.headers.get("x-medora-ui-language");
    if (uiLang) headers.set("x-medora-ui-language", uiLang);
    return {
      method: req.method,
      headers,
      body: bodyText,
    };
  };

  const fetchUpstream = async (init: RequestInit): Promise<Response | null> => {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (isDev) {
        console.error("[proxy] upstream unreachable", {
          nestPath: normalized,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      return null;
    }
  };

  let r = await fetchUpstream(buildForwardInit(accessToken!));
  if (!r) return backendUnavailableResponse(requestId);

  if (r.status === 401 && !didRefresh) {
    await refreshOnce();
    if (lastRefreshed) {
      const retry = await fetchUpstream(buildForwardInit(accessToken!));
      if (!retry) return backendUnavailableResponse(requestId);
      r = retry;
    }
  }

  const upstreamContentType = r.headers.get("content-type") || "";
  const isStreamingCsv = upstreamContentType.includes("text/csv") && r.body != null;

  if (isStreamingCsv) {
    const outHeaders = new Headers();
    outHeaders.set("Content-Type", upstreamContentType);
    const cd = r.headers.get("content-disposition");
    if (cd) outHeaders.set("Content-Disposition", cd);
    const res = new NextResponse(r.body, { status: r.status, headers: outHeaders });
    if (requestId) res.headers.set("x-request-id", requestId);
    if (lastRefreshed) {
      applyAuthCookiesToResponse(res, lastRefreshed);
    }
    return res;
  }

  const text = await r.text();

  const res = new NextResponse(text, {
    status: r.status,
    headers: {
      "Content-Type": upstreamContentType || "application/json",
    },
  });
  if (requestId) res.headers.set("x-request-id", requestId);

  if (lastRefreshed) {
    applyAuthCookiesToResponse(res, lastRefreshed);
  }

  return res;
}
