/**
 * D4A.2.8-HF3 — Facility context synchronization regression tests.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  defaultFacilityIdFromRoles,
  resolveProxyFacilityId,
  userHasFacilityMembership,
} from "@/lib/server/facilityContextSync";
import { switchActiveFacility } from "@/lib/facilitySwitch";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WAYNE = "90395a66-20d0-4165-aa76-e37ba3d520ed";
const OTHER = "084ee961-6fd2-44fc-b7eb-821076882729";

describe("D4A.2.8-HF3 facility context sync", () => {
  it("login multi-membership default is lexicographic first (deterministic, no invented preference)", () => {
    const id = defaultFacilityIdFromRoles([
      { facilityId: WAYNE },
      { facilityId: OTHER },
    ]);
    expect(id).toBe(OTHER);
  });

  it("membership check rejects unauthorized facility", () => {
    expect(userHasFacilityMembership([{ facilityId: WAYNE }], OTHER)).toBe(false);
    expect(userHasFacilityMembership([{ facilityId: WAYNE }], WAYNE)).toBe(true);
  });

  it("proxy: explicit x-facility-id wins when present", () => {
    const r = resolveProxyFacilityId({
      headerFacilityId: WAYNE,
      httpOnlyFacilityId: OTHER,
      readableFacilityId: OTHER,
    });
    expect(r.facilityId).toBe(WAYNE);
    expect(r.source).toBe("explicit_header");
  });

  it("proxy: cookie mismatch prefers httpOnly and flags mismatch (no silent arbitrary pick)", () => {
    const r = resolveProxyFacilityId({
      headerFacilityId: null,
      httpOnlyFacilityId: OTHER,
      readableFacilityId: WAYNE,
    });
    expect(r.facilityId).toBe(OTHER);
    expect(r.source).toBe("http_only_cookie");
    expect(r.cookieMismatch).toBe(true);
  });

  it("proxy: readable cookie used only when httpOnly absent", () => {
    const r = resolveProxyFacilityId({
      headerFacilityId: null,
      httpOnlyFacilityId: null,
      readableFacilityId: WAYNE,
    });
    expect(r.facilityId).toBe(WAYNE);
    expect(r.source).toBe("readable_cookie_fallback");
    expect(r.cookieMismatch).toBe(false);
  });

  it("proxy: auth default used when no cookies/header", () => {
    const r = resolveProxyFacilityId({
      authDefaultFacilityId: WAYNE,
    });
    expect(r.facilityId).toBe(WAYNE);
    expect(r.source).toBe("auth_default");
  });

  it("hospital census API passes facilityId into apiFetch options", () => {
    const src = readFileSync(
      join(process.cwd(), "src/features/hospital-care/hospitalCareCensusApi.ts"),
      "utf8"
    );
    expect(src).toContain("facilityId");
    expect(src).toContain("apiFetch(`/hospital-care/census");
    expect(src).toMatch(/facilityId,\s*\}/);
  });

  it("workspace-bootstrap API passes facilityId into apiFetch options", () => {
    const src = readFileSync(
      join(process.cwd(), "src/features/hospital-care/inpatientOperationsApi.ts"),
      "utf8"
    );
    expect(src).toContain("fetchInpatientWorkspaceBootstrap");
    expect(src).toContain("options?: { facilityId?: string | null }");
    expect(src).toContain("{ facilityId }");
  });

  it("bed board still passes facilityId explicitly", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/bedBoardApi.ts"), "utf8");
    expect(src).toContain("apiFetch(path, {");
    expect(src).toContain("facilityId,");
  });

  it("layout uses server-owned switchActiveFacility (no client-only httpOnly write)", () => {
    const src = readFileSync(join(process.cwd(), "app/app/layout.tsx"), "utf8");
    expect(src).toContain("switchActiveFacility");
    expect(src).not.toMatch(/onFacilityChange[\s\S]*document\.cookie = `medora_facility_id=\$\{newFacility\}/);
  });

  it("login and MFA still set both facility cookies together", () => {
    const login = readFileSync(join(process.cwd(), "app/api/auth/login/route.ts"), "utf8");
    const mfa = readFileSync(join(process.cwd(), "app/api/auth/mfa/verify/route.ts"), "utf8");
    for (const src of [login, mfa]) {
      expect(src).toContain('res.cookies.set("facilityId"');
      expect(src).toContain('res.cookies.set("medora_facility_id"');
    }
  });

  it("facility-switch route exists and validates membership before setting cookies", () => {
    const src = readFileSync(join(process.cwd(), "app/api/auth/facility/route.ts"), "utf8");
    expect(src).toContain("userHasFacilityMembership");
    expect(src).toContain('res.cookies.set("facilityId"');
    expect(src).toContain('res.cookies.set("medora_facility_id"');
    expect(src).toContain("FACILITY_SWITCH_DENIED");
  });
});

describe("switchActiveFacility client helper", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not treat UI as switched when server returns 403", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Access denied", code: "FACILITY_SWITCH_DENIED" }), {
        status: 403,
      })
    );
    const result = await switchActiveFacility(WAYNE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("FACILITY_SWITCH_DENIED");
    }
  });

  it("returns resolved facilityId on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ facilityId: WAYNE, previousFacilityId: OTHER }), {
        status: 200,
      })
    );
    const result = await switchActiveFacility(WAYNE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.facilityId).toBe(WAYNE);
      expect(result.previousFacilityId).toBe(OTHER);
    }
  });
});
