import { describe, expect, it } from "vitest";
import {
  ED_CLINICAL_DATA_REQUIRED_CATEGORIES,
  canOpenClinicalDataFormForRole,
  resolveClinicalDataAccessMode,
} from "./edClinicalDataWorkspaceGovernance";

describe("edClinicalDataWorkspaceGovernance (MEDUI.ED.CLINICAL_DATA)", () => {
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
        sourceWorkspace: "nursingAssessment",
      })
    ).toBe("editable");
  });

  it("RN can edit Nursing-owned forms from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["RN"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("Provider can edit Provider-owned forms from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("Provider reviews Nursing-owned CIWA from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("review");
  });

  it("Multi-role forms editable by Provider from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "MULTI_ROLE",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
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
