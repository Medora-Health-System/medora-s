import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Administration integrations foundation", () => {
  const source = readFileSync(resolve(process.cwd(), "app/app/admin/integrations/page.tsx"), "utf8");
  const proxySource = readFileSync(resolve(process.cwd(), "src/lib/server/nestApiProxy.ts"), "utf8");
  test("wizard exposes six reviewed configuration steps and no credential input", () => { expect(source).toContain("Step {step} of 6"); expect(source).toContain("PENDING_PROVISIONING"); expect(source).not.toMatch(/clientSecret|apiKey|password/); });
  test("HL7 is visibly planned and capability choices are server supplied", () => { expect(source).toContain("HL7 v2 — Planned (not available)"); expect(source).toContain("fetchIntegrationPermissions"); expect(source).toContain("fetchIntegrationFacilities"); });
  test("review is human-readable while retaining an optional technical payload", () => { expect(source).toContain("Primary Responsible Contact"); expect(source).toContain("Authorized Medora Facilities"); expect(source).toContain("Technical payload"); });
  test("navigation preserves controlled form state and blocks empty grants", () => { expect(source).toContain("setStep(step-1)"); expect(source).toContain('4:["facilityIds"]'); expect(source).toContain('5:["permissionCodes"]'); });
  test("regression: platform integration endpoints do not require a selected clinical facility", () => { expect(proxySource).toContain("isPlatformIntegrationAdminPath"); expect(proxySource).toMatch(/!isPlatformAnnouncementPath && !isPlatformIntegrationAdminPath/); });
  test("unauthorized platform users are denied in the UI", () => { expect(source).toMatch(/if\s*\(!canCreateFacilities\)/); expect(source).toContain("Access denied"); });
});
