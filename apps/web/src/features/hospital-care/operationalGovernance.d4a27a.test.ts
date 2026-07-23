/**
 * D4A.2.7A — Operational hardening boundary tests (ED vs Inpatient separation).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD,
  HOSPITAL_CARE_ENTERPRISE_OPERATIONS,
  HOSPITAL_CARE_INPATIENT_OPERATIONS,
} from "./hospitalCarePaths";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.OPERATIONAL_HARDENING.D4A2_7A boundary", () => {
  it("separates ED trackboard from inpatient operations routes", () => {
    expect(EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD).toBe("/app/trackboard");
    expect(HOSPITAL_CARE_INPATIENT_OPERATIONS).toBe(
      "/app/hospitalisation/inpatient-operations"
    );
    expect(HOSPITAL_CARE_ENTERPRISE_OPERATIONS).toBe(
      "/app/hospitalisation/enterprise-operations"
    );
    expect(EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD).not.toBe(
      HOSPITAL_CARE_INPATIENT_OPERATIONS
    );
  });

  it("platform landing links ED and Inpatient separately without merging logic", () => {
    const platform = read("EnterpriseOperationsPlatformView.tsx");
    expect(platform).toContain("EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD");
    expect(platform).toContain("HOSPITAL_CARE_INPATIENT_OPERATIONS");
    expect(platform).toContain("ops-ed-card");
    expect(platform).toContain("ops-inpatient-card");
    expect(platform).toContain("separationBanner");
    expect(platform).not.toContain("EmergencyTrackboardView");
    expect(platform).not.toContain("fetchOpenEncounters");
  });

  it("inpatient dashboard consumes governance API and excludes ED", () => {
    const view = read("InpatientOperationalDashboardView.tsx");
    expect(view).toContain("fetchInpatientOperationalDashboard");
    expect(view).toContain("excludesEd");
    expect(view).toContain("neverDocs");
    expect(view).not.toContain("EmergencyTrackboard");
    expect(view).not.toContain("/trackboard");
  });

  it("service consumes EnterpriseCommandService and never enables placement/MAR writes", () => {
    const svc = readFileSync(
      join(root, "../../../../api/src/encounters/operational-governance.service.ts"),
      "utf8"
    );
    expect(svc).toContain("EnterpriseCommandService");
    expect(svc).toContain("getInpatientOperationalDashboard");
    expect(svc).toContain('domain: "INPATIENT"');
    expect(svc).toContain("excludesEmergencyDepartmentLogic");
    expect(svc).toContain("placementLogicEnabled: false");
    expect(svc).toContain("neverModifyMar");
    expect(svc).toContain("recordChartAccess");
    expect(svc).not.toContain("enablePlacement");
    expect(svc).not.toContain("medicationAdministration.create");
    expect(svc).not.toContain("medicationAdministration.update");
  });

  it("controller exposes inpatient + governance + chart-access APIs", () => {
    const ctl = readFileSync(
      join(root, "../../../../api/src/encounters/operational-governance.controller.ts"),
      "utf8"
    );
    for (const path of [
      "platform-manifest",
      "inpatient-dashboard",
      "dashboards/:kind",
      "medication-compliance",
      "documentation-compliance",
      "chart-access",
      "audit-center",
      "role-timeline",
      "placement-readiness",
    ]) {
      expect(ctl).toContain(path);
    }
    expect(ctl).toContain("facilityIdFromReq");
  });

  it("module registers OperationalGovernanceService", () => {
    const mod = readFileSync(
      join(root, "../../../../api/src/encounters/encounters.module.ts"),
      "utf8"
    );
    expect(mod).toContain("OperationalGovernanceService");
    expect(mod).toContain("OperationalGovernanceController");
  });

  it("EN/FR keys mirrored", () => {
    const en = read("../../i18n/messages/operationalGovernanceD4a27a.en.ts");
    const fr = read("../../i18n/messages/operationalGovernanceD4a27a.fr.ts");
    for (const key of [
      "separationBanner",
      "inpatientCard",
      "edCard",
      "excludesEd",
      "neverModifyMar",
      "placementReadinessNote",
      "AUDIT_CENTER",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });

  it("pages mount platform and inpatient views", () => {
    const platformPage = readFileSync(
      join(root, "../../../app/app/hospitalisation/enterprise-operations/page.tsx"),
      "utf8"
    );
    const inpatientPage = readFileSync(
      join(root, "../../../app/app/hospitalisation/inpatient-operations/page.tsx"),
      "utf8"
    );
    expect(platformPage).toContain("EnterpriseOperationsPlatformView");
    expect(inpatientPage).toContain("InpatientOperationalDashboardView");
  });
});
