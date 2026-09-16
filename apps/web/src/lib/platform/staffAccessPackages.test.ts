import { describe, expect, it } from "vitest";
import { TECHNOLOGY_IT_ADMIN_PACKAGE } from "./staffAccessPackages";

describe("Technology / IT Administration access package", () => {
  it("includes the operational authority needed to administer the platform", () => {
    expect(TECHNOLOGY_IT_ADMIN_PACKAGE.capabilities).toEqual(expect.arrayContaining([
      "FACILITY_CONFIGURE",
      "STAFF_VIEW",
      "STAFF_PROVISION",
      "STAFF_GRANT_CAPABILITIES",
      "STAFF_REVOKE_CAPABILITIES",
      "SECURITY_ACCESS_VIEW",
      "SECURITY_PRIVILEGED_ACTIONS",
      "SECURITY_AUDIT_VIEW",
      "CATALOG_CONFIG_VIEW",
      "CATALOG_CONFIG_MANAGE",
      "SYSTEM_HEALTH_VIEW",
      "SYSTEM_BACKUP_READINESS_VIEW",
      "SYSTEM_GOLIVE_MONITOR",
      "AUDIT_EXPORT",
    ]));
  });

  it("does not silently grant billing or compliance-policy mutation authority", () => {
    expect(TECHNOLOGY_IT_ADMIN_PACKAGE.capabilities).not.toContain("BILLING_RCM_VIEW");
    expect(TECHNOLOGY_IT_ADMIN_PACKAGE.capabilities).not.toContain("BILLING_RCM_MANAGE");
    expect(TECHNOLOGY_IT_ADMIN_PACKAGE.capabilities).not.toContain("COMPLIANCE_CONTROLS_MANAGE");
  });

  it("uses Platform Operations only as classification, never as runtime authority", () => {
    expect(TECHNOLOGY_IT_ADMIN_PACKAGE.basePersona).toBe("PLATFORM_OPERATIONS");
  });
});
