/**
 * D4A.2.8-HF3 — Authenticated server-owned active facility switch.
 * Updates httpOnly `facilityId` and readable `medora_facility_id` together after membership check.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { resolveApiUrl } from "@/lib/server/resolveApiUrl";
import {
  facilityIdHttpOnlyCookieOptions,
  facilityIdReadableCookieOptions,
} from "@/lib/server/authCookieOptions";
import { refreshAccessTokenFromCookies } from "@/lib/server/refreshAccessToken";
import {
  logFacilityContextEvent,
  userHasFacilityMembership,
} from "@/lib/server/facilityContextSync";

type MePayload = {
  id?: string;
  facilityRoles?: Array<{ facilityId?: string }>;
};

async function fetchMe(apiUrl: string, accessToken: string, requestId: string): Promise<MePayload | null> {
  const res = await fetch(`${apiUrl}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as MePayload;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() ?? "";
  const withRequestId = (res: NextResponse) => {
    if (requestId) res.headers.set("x-request-id", requestId);
    return res;
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withRequestId(
      NextResponse.json({ error: "Invalid request body.", code: "INVALID_BODY" }, { status: 400 })
    );
  }

  const requestedFacilityId = String(
    (body as { facilityId?: unknown })?.facilityId ?? ""
  ).trim();
  if (!requestedFacilityId) {
    return withRequestId(
      NextResponse.json({ error: "Facility ID required.", code: "FACILITY_REQUIRED" }, { status: 400 })
    );
  }

  let apiUrl: string;
  try {
    apiUrl = resolveApiUrl();
  } catch {
    return withRequestId(
      NextResponse.json(
        { error: "BACKEND_TEMPORARILY_UNAVAILABLE", retryable: true },
        { status: 503 }
      )
    );
  }

  const cookieStore = await cookies();
  let accessToken =
    cookieStore.get("accessToken")?.value ?? cookieStore.get("medora_session")?.value ?? null;
  if (!accessToken) {
    return withRequestId(
      NextResponse.json({ error: "Not authenticated.", code: "AUTH_REQUIRED" }, { status: 401 })
    );
  }

  const previousFacilityId =
    cookieStore.get("facilityId")?.value?.trim() ||
    cookieStore.get("medora_facility_id")?.value?.trim() ||
    null;

  let me = await fetchMe(apiUrl, accessToken, requestId);
  if (!me) {
    const refreshed = await refreshAccessTokenFromCookies(requestId || undefined, request);
    if (refreshed?.accessToken) {
      accessToken = refreshed.accessToken;
      me = await fetchMe(apiUrl, accessToken, requestId);
    }
  }

  if (!me) {
    return withRequestId(
      NextResponse.json({ error: "Session expired.", code: "AUTH_SESSION_EXPIRED" }, { status: 401 })
    );
  }

  const userId = typeof me.id === "string" ? me.id : null;
  if (!userHasFacilityMembership(me.facilityRoles, requestedFacilityId)) {
    logFacilityContextEvent("facility_switch_denied", {
      userId,
      requestedFacilityId,
      previousFacilityId,
      route: "/api/auth/facility",
      source: "explicit_header",
    });
    return withRequestId(
      NextResponse.json(
        { error: "Access denied for this facility.", code: "FACILITY_SWITCH_DENIED" },
        { status: 403 }
      )
    );
  }

  const res = NextResponse.json({
    facilityId: requestedFacilityId,
    previousFacilityId,
  });

  res.cookies.set("facilityId", requestedFacilityId, facilityIdHttpOnlyCookieOptions());
  res.cookies.set("medora_facility_id", requestedFacilityId, facilityIdReadableCookieOptions());

  logFacilityContextEvent("facility_switch_success", {
    userId,
    requestedFacilityId,
    previousFacilityId,
    resolvedFacilityId: requestedFacilityId,
    route: "/api/auth/facility",
    source: "explicit_header",
  });

  return withRequestId(res);
}
