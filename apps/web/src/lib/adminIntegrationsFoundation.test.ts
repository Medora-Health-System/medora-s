import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Administration integrations foundation", () => {
  const source = readFileSync(resolve(process.cwd(), "app/app/admin/integrations/page.tsx"), "utf8");
  test("wizard exposes six reviewed configuration steps and no credential input", () => { expect(source).toContain("Step {step} of 6"); expect(source).toContain("PENDING_PROVISIONING"); expect(source).not.toMatch(/clientSecret|apiKey|password/); });
  test("HL7 is visibly planned and capability choices are server supplied", () => { expect(source).toContain("HL7 v2 (planned for P0.4)"); expect(source).toContain("fetchIntegrationPermissions"); expect(source).toContain("No facility access is granted by default"); });
  test("unauthorized platform users are denied in the UI", () => { expect(source).toContain("if (!canCreateFacilities)"); expect(source).toContain("Access denied"); });
});
