import fs from "node:fs";
import path from "node:path";
import { WORKFORCE_ACCESS_PACKAGES } from "./workforce-access-packages";

const readLocal = (name: string) => fs.readFileSync(path.join(__dirname, name), "utf8");
const readApiRoot = (name: string) => fs.readFileSync(path.join(__dirname, "..", "..", name), "utf8");

describe("Phase 18 platform production readiness acceptance", () => {
  it("keeps production system health and go-live fail-closed", () => {
    const source = readLocal("platform-production-readiness.ts");
    expect(source).toContain('auditFailureMode !== "fail_closed"');
    expect(source).toContain("alerts_disabled");
    expect(source).toContain("alerts_enabled_no_destination");
    expect(source).toContain('status: blockers.length > 0 ? "critical"');
    expect(source).toContain('status: blockers.length > 0 ? "blocked"');
  });

  it("keeps operational projections capability-gated and facility-explicit", () => {
    const source = readLocal("platform-operations.controller.ts");
    expect(source).toContain("Explicit facilityId is required for this facility-scoped projection");
    for (const capability of [
      "SYSTEM_HEALTH_VIEW",
      "SYSTEM_BACKUP_READINESS_VIEW",
      "SYSTEM_GOLIVE_MONITOR",
      "COMPLIANCE_AUDIT_VIEW",
      "COMPLIANCE_EXPORT_MONITOR",
      "COMPLIANCE_ROI_MONITOR",
      "BILLING_RCM_VIEW",
      "CATALOG_CONFIG_VIEW",
    ]) expect(source).toContain(capability);
    expect(source).toContain("hardenPlatformSystemHealth");
    expect(source).toContain("hardenPlatformGoLive");
  });

  it("keeps external billing fail-safe unless explicitly configured", () => {
    const source = readLocal("platform-operations.controller.ts");
    expect(source).toContain('"preview_only"');
    expect(source).toContain("MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED");
    expect(source).toContain("MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL");
    expect(source).toContain("canTransmitExternally:outboundConfigured");
  });

  it("keeps production migrations as a pre-deploy gate with readiness healthcheck", () => {
    const railway = JSON.parse(readApiRoot("railway.json"));
    expect(railway.deploy.preDeployCommand).toBe("pnpm --filter @medora/api migrate:deploy");
    expect(railway.deploy.healthcheckPath).toBe("/health/ready");
    expect(railway.deploy.restartPolicyType).toBe("ON_FAILURE");
  });

  it("keeps Technology IT broad but separated from billing and clinical authority", () => {
    const tech = new Set(WORKFORCE_ACCESS_PACKAGES.TECHNOLOGY_IT.capabilities);
    for (const capability of [
      "STAFF_VIEW", "STAFF_PROVISION", "STAFF_GRANT_CAPABILITIES", "STAFF_REVOKE_CAPABILITIES",
      "SECURITY_ACCESS_VIEW", "SECURITY_MFA_RECOVERY", "SECURITY_PRIVILEGED_ACTIONS", "SECURITY_AUDIT_VIEW",
      "CATALOG_CONFIG_VIEW", "CATALOG_CONFIG_MANAGE",
      "SYSTEM_HEALTH_VIEW", "SYSTEM_BACKUP_READINESS_VIEW", "SYSTEM_GOLIVE_MONITOR",
    ]) expect(tech.has(capability as any)).toBe(true);
    expect(tech.has("BILLING_RCM_VIEW")).toBe(false);
    expect(tech.has("BILLING_RCM_MANAGE")).toBe(false);
    expect(tech.has("COMPLIANCE_CONTROLS_MANAGE")).toBe(false);
    for (const capability of tech) expect(String(capability)).not.toMatch(/PATIENT|CHART|ENCOUNTER|CLINICAL/);
  });

  it("keeps owner protection and delegated escalation controls server-side", () => {
    const owner = readLocal("platform-owner-control.service.ts");
    const staff = readLocal("platform-staff.service.ts");
    const privileged = readLocal("privileged-action.controller.ts");
    expect(owner).toContain("resolvePlatformAuthority");
    expect(owner).toContain('throw new NotFoundException("Medora staff profile not found")');
    expect(owner).toContain("Authoritative platform principal required");
    expect(staff).toContain("SELF_MUTATION_PROHIBITED");
    expect(staff).toContain("SELF_GRANT_PROHIBITED");
    expect(staff).toContain("DUAL_CONTROL_REQUIRED");
    expect(privileged).toContain("this.owner.isOwner(r.targetUserId)");
    expect(privileged).toContain("this.owner.isOwner(r.requesterUserId)");
  });
});
