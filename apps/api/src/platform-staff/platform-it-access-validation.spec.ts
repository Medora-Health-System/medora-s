import fs from "node:fs";
import path from "node:path";
import { WORKFORCE_ACCESS_PACKAGES } from "./workforce-access-packages";

const read = (name: string) => fs.readFileSync(path.join(__dirname, name), "utf8");

describe("Phase 16 Technology / IT access validation matrix", () => {
  const tech = new Set(WORKFORCE_ACCESS_PACKAGES.TECHNOLOGY_IT.capabilities);

  it("grants the intended platform administration surface", () => {
    for (const capability of [
      "FACILITY_CREATE", "FACILITY_CONFIGURE", "FACILITY_ACTIVATE", "FACILITY_HEALTH_VIEW",
      "STAFF_VIEW", "STAFF_PROVISION", "STAFF_GRANT_CAPABILITIES", "STAFF_REVOKE_CAPABILITIES",
      "SECURITY_ACCESS_VIEW", "SECURITY_MFA_RECOVERY", "SECURITY_PRIVILEGED_ACTIONS", "SECURITY_AUDIT_VIEW",
      "CATALOG_CONFIG_VIEW", "CATALOG_CONFIG_MANAGE",
      "SYSTEM_HEALTH_VIEW", "SYSTEM_BACKUP_READINESS_VIEW", "SYSTEM_GOLIVE_MONITOR",
    ]) expect(tech.has(capability as any)).toBe(true);
  });

  it("does not grant billing or compliance-control mutation", () => {
    expect(tech.has("BILLING_RCM_VIEW")).toBe(false);
    expect(tech.has("BILLING_RCM_MANAGE")).toBe(false);
    expect(tech.has("COMPLIANCE_CONTROLS_MANAGE")).toBe(false);
  });

  it("contains no patient, chart, encounter, or clinical capability", () => {
    for (const capability of tech) {
      expect(String(capability)).not.toMatch(/PATIENT|CHART|ENCOUNTER|CLINICAL/);
    }
  });

  it("keeps workforce identity separate from runtime authorization", () => {
    const source = read("workforce-access-packages.ts");
    expect(source).toContain("Explicit PlatformCapabilityGrant rows remain authoritative");
    expect(source).not.toContain("facilityId");
  });
});

describe("Phase 16 protected-owner server-side enforcement contract", () => {
  it("protects owner targets in staff management routes", () => {
    const source = read("platform-staff.controller.ts");
    expect(source).toContain("PlatformOwnerControlService");
    expect(source).toContain("assertTargetVisibleTo");
    expect(source).toContain("filterProtectedUsers");
  });

  it("protects owner targets in workforce routes", () => {
    const source = read("corporate-workforce.controller.ts");
    expect(source).toContain("PlatformOwnerControlService");
    expect(source).toContain("assertTargetVisibleTo");
  });

  it("protects owner targets in workforce package routes", () => {
    const source = read("workforce-access-package.controller.ts");
    expect(source).toContain("PlatformOwnerControlService");
    expect(source).toContain("assertTargetVisibleTo");
  });

  it("protects owner targets in privileged-action routes", () => {
    const source = read("privileged-action.controller.ts");
    expect(source).toContain("PlatformOwnerControlService");
    expect(source).toContain("assertTargetVisibleTo");
  });

  it("returns not-found semantics when delegated staff target the owner", () => {
    const source = read("platform-owner-control.service.ts");
    expect(source).toContain('throw new NotFoundException("Medora staff profile not found")');
  });

  it("does not identify the protected owner by email address", () => {
    const source = read("platform-owner-control.service.ts");
    expect(source).toContain("resolvePlatformAuthority");
    expect(source).not.toMatch(/support@medoras\.com/i);
  });
});
