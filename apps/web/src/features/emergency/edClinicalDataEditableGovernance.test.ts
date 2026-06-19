import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ED_CLINICAL_DATA_READ_ONLY,
  canOpenClinicalDataFormForRole,
  resolveClinicalDataAccessMode,
} from "./edClinicalDataWorkspaceGovernance";

describe("edClinicalDataEditableGovernance (MEDUI.ED.CLINICAL_DATA.3)", () => {
  it("1 — Provider can edit Provider-owned forms from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("2 — Provider can edit Multi-role forms from Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "MULTI_ROLE",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("3 — Provider cannot edit Nursing-owned forms unless nurse role present", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("review");
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["PROVIDER", "RN"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("4 — Nurse can edit Nursing-owned forms", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["RN"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("5 — Nurse reviews Provider-owned forms unless provider role present", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["RN"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("review");
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["RN", "PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("Phase 3 is not globally read-only", () => {
    expect(ED_CLINICAL_DATA_READ_ONLY).toBe(false);
  });

  it("canOpenClinicalDataFormForRole edit follows access mode", () => {
    expect(
      canOpenClinicalDataFormForRole({
        formOwner: "PROVIDER",
        userRoles: ["PROVIDER"],
        mode: "edit",
      })
    ).toBe(true);
    expect(
      canOpenClinicalDataFormForRole({
        formOwner: "RN",
        userRoles: ["PROVIDER"],
        mode: "edit",
      })
    ).toBe(false);
  });
});

describe("edClinicalData button labels (MEDUI.ED.CLINICAL_DATA.3)", () => {
  it("6 — Open for editable, Review for review-only in hub", () => {
    const hub = readFileSync(
      join(import.meta.dirname, "../../features/clinical-documentation/ClinicalDocumentationHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("cardIsReviewMode(card)");
    expect(hub).toContain("clinicalDocumentation.actionOpen");
    expect(hub).toContain("clinicalDocumentation.actionReview");
  });
});
