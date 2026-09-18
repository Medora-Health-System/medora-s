import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Administration Phase 1 authority architecture", () => {
  it("keeps facility administration and platform operations as separate authority domains", () => {
    const roles = read("apps/api/src/common/auth/platform-operator-roles.ts");
    expect(roles).toContain("FACILITY_OR_PLATFORM_ADMIN_ROLES");
    expect(roles).toContain("PLATFORM_OPERATOR_ROLES");

    const integrations = read("apps/api/src/admin/admin-integrations.controller.ts");
    expect(integrations).toContain("PlatformIntegrationAdminGuard");
    expect(integrations).not.toContain("FACILITY_OR_PLATFORM_ADMIN_ROLES");
  });

  it("keeps customer audit authorization adjacent to the facility-scoped query", () => {
    const service = read("apps/api/src/admin/admin-audit.service.ts");
    expect(service).toContain("assertFacilityAdminFacilityScope");
    expect(service).toContain("facilityId,");
    expect(service).toContain("Prisma.AuditLogWhereInput");
  });

  it("keeps user administration behind the facility mutation boundary", () => {
    const service = read("apps/api/src/admin/admin-users.service.ts");
    expect(service).toContain("assertFacilityAdminFacilityScope");
    expect(service).toContain("assertFacilityAdminMayMutateUser");
    expect(service).toContain("assertNoPlatformRoleAssignment");
  });

  it("keeps workflow and clinical rules on authenticated clinical facility context", () => {
    const workflow = read("apps/api/src/encounters/enterprise-workflow/enterprise-workflow.controller.ts");
    const rules = read("apps/api/src/encounters/enterprise-workflow/clinical-rules.controller.ts");
    expect(workflow).toContain("req.user?.facilityId");
    expect(workflow).not.toContain('x-facility-id');
    expect(rules).toContain("req.user?.facilityId");
    expect(rules).not.toContain('x-facility-id');
  });

  it("keeps ED reports and go-live explicitly facility-scoped", () => {
    const reports = read("apps/api/src/reports/reports.controller.ts");
    const goLive = read("apps/api/src/admin/admin-go-live.controller.ts");
    expect(reports).toContain("facilityIdFromReq");
    expect(reports).toContain("this.reports.doorToEkgJson(facilityId");
    expect(reports).toContain("this.reports.doorToProviderJson(facilityId");
    expect(reports).toContain("this.reports.doorToDoorJson(facilityId");
    expect(reports).toContain("this.reports.medicationAdministrationJson(facilityId");
    expect(goLive).toContain("this.goLive.getSnapshot(facilityId)");
  });

  it("documents internal billing as excluded while Revenue Cycle remains facility operations", () => {
    const architecture = read("docs/operations/administration-phase-1-authority-facility-isolation.md");
    expect(architecture).toContain("Internal Medora billing is explicitly excluded");
    expect(architecture).toContain("Revenue Cycle");
    expect(architecture).toContain("PLATFORM_WITH_FACILITY_BINDINGS");
  });
});
