import { describe, expect, it } from "vitest";
import {
  ED_CLINICAL_DATA_READ_ONLY,
  ED_CLINICAL_DATA_REQUIRED_CATEGORIES,
  canOpenClinicalDataFormForRole,
  resolveClinicalDataAccessMode,
} from "./edClinicalDataWorkspaceGovernance";

describe("edClinicalDataWorkspaceGovernance (MEDUI.ED.CLINICAL_DATA.1)", () => {
  it("Phase 1 is read-only", () => {
    expect(ED_CLINICAL_DATA_READ_ONLY).toBe(true);
  });

  it("Provider can view Nursing-owned forms in review mode", () => {
    expect(
      canOpenClinicalDataFormForRole({
        formOwner: "RN",
        userRoles: ["PROVIDER"],
        mode: "review",
      })
    ).toBe(true);
  });

  it("Provider cannot edit Nursing-owned forms from Clinical Data", () => {
    expect(
      canOpenClinicalDataFormForRole({
        formOwner: "RN",
        userRoles: ["PROVIDER"],
        mode: "edit",
      })
    ).toBe(false);
  });

  it("RN can edit from Nursing Assessment workspace", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["RN"],
        workspace: "nursingAssessment",
      })
    ).toBe("edit");
  });

  it("RN review mode from Clinical Data is still read-only when flag on", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["RN"],
        workspace: "clinicalData",
      })
    ).toBe("review");
  });

  it("Provider Clinical Data workspace is always review", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["PROVIDER"],
        workspace: "clinicalData",
      })
    ).toBe("review");
  });

  it("Multi-role forms open review-only from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "MULTI_ROLE",
        userRoles: ["PROVIDER"],
        workspace: "clinicalData",
      })
    ).toBe("review");
  });

  it("includes all required Phase 1 categories", () => {
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("FLOWSHEETS");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("SCORES_AND_SCREENS");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("INTAKE_OUTPUT");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("SAFETY_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("BEHAVIORAL_HEALTH_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("RESPIRATORY_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("BLOOD_PRODUCT_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("HIGH_ALERT_INFUSION_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("STROKE_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toContain("CARDIAC_MONITORING_DOCUMENTATION");
    expect(ED_CLINICAL_DATA_REQUIRED_CATEGORIES).toHaveLength(10);
  });
});
