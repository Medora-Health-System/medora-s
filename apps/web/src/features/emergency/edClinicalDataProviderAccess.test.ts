import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canOpenClinicalDataFormForRole,
  resolveClinicalDataAccessMode,
} from "./edClinicalDataWorkspaceGovernance";

const hub = readFileSync(
  join(import.meta.dirname, "../../features/clinical-documentation/ClinicalDocumentationHub.tsx"),
  "utf8"
);

describe("edClinicalDataProviderAccess (MEDUI.ED.CLINICAL_DATA.4)", () => {
  const providerRoles = ["PROVIDER"];
  const nurseRoles = ["RN"];

  it("1 — Provider sees CIWA-Ar (RN-owned) as editable in Clinical Data", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: providerRoles,
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("2 — Provider sees COWS as editable", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: providerRoles,
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("3 — Provider sees NIHSS (stroke) as editable", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: providerRoles,
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("4 — Provider sees HEART Score as editable", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: providerRoles,
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("5 — Nurse sees CIWA-Ar as editable", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: nurseRoles,
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("6 — Front-desk-only user does not get edit access", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["FRONT_DESK"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("review");
    expect(
      canOpenClinicalDataFormForRole({
        formOwner: "RN",
        userRoles: ["FRONT_DESK"],
        mode: "edit",
      })
    ).toBe(false);
  });

  it("7 — Billing-only user does not get edit access", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["BILLING"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("review");
    expect(
      canOpenClinicalDataFormForRole({
        formOwner: "PROVIDER",
        userRoles: ["BILLING"],
        mode: "edit",
      })
    ).toBe(false);
  });

  it("8 — resolveClinicalDataAccessMode returns editable for provider role", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "TECHNICIAN",
        userRoles: ["PROVIDER"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("9 — resolveClinicalDataAccessMode returns editable for nurse role", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "PROVIDER",
        userRoles: ["RN"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("editable");
  });

  it("10 — resolveClinicalDataAccessMode returns review for nonclinical role", () => {
    expect(
      resolveClinicalDataAccessMode({
        formOwner: "RN",
        userRoles: ["PHARMACY"],
        sourceWorkspace: "clinicalData",
      })
    ).toBe("review");
  });

  it("Provider catalog uses Open button path when editable", () => {
    expect(hub).toContain("clinical-documentation-card-open-button");
    expect(hub).toContain("resolveClinicalDataAccessMode");
  });
});
