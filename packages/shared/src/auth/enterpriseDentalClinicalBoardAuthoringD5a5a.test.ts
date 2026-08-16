import { describe, expect, it } from "vitest";
import {
  canAuthorDentalClinicalBoard,
  isDentalClinicalBoardEditable,
  resolveDentalWorkspaceAccess,
  assertNoForbiddenDentalAuthoritiesInD5a2,
} from "./enterpriseDentalServiceLineNavigationD5a2.js";
import {
  D5A5A_CERTIFICATION_ID,
  D5A5_DENTAL_HISTORY_REVIEW_KEY,
  D5A5_OVERVIEW_SECTIONS,
  assertNoForbiddenDentalClinicalBoardAuthorities,
} from "./enterpriseDentalCompleteClinicalBoardD5a5.js";

describe("MEDUI.D5A.5A dental clinical board authoring", () => {
  it("certification id", () => {
    expect(D5A5A_CERTIFICATION_ID).toBe("MEDUI.D5A.5A");
  });

  it("1–3: PROVIDER + OPEN => periodontal / plan / procedures editable", () => {
    const access = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(access.canEditPeriodontal).toBe(true);
    expect(access.canEditTreatmentPlan).toBe(true);
    expect(access.canPerformProcedures).toBe(true);
    expect(canAuthorDentalClinicalBoard(access)).toBe(true);
    expect(isDentalClinicalBoardEditable({ access, encounterStatus: "OPEN" })).toBe(true);
  });

  it("ADMIN+PROVIDER retains clinical authoring despite ADMIN profession priority", () => {
    const access = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
    });
    expect(access.canAccessDentalAdmin).toBe(true);
    expect(access.canEditPeriodontal).toBe(true);
    expect(access.canEditTreatmentPlan).toBe(true);
    expect(access.canPerformProcedures).toBe(true);
    expect(access.canEditOdontogram).toBe(true);
  });

  it("4: unauthorized roles denied clinical authoring", () => {
    for (const role of ["FRONT_DESK", "BILLING", "MEDORA_SUPER_ADMIN"] as const) {
      const access = resolveDentalWorkspaceAccess({
        roleCodes: [role],
        dentalCareEnabled: true,
      });
      expect(canAuthorDentalClinicalBoard(access)).toBe(false);
      expect(access.canEditPeriodontal).toBe(false);
      expect(access.canEditTreatmentPlan).toBe(false);
      expect(access.canPerformProcedures).toBe(false);
    }
  });

  it("MEDUI.D5A.5C: FACILITY_ADMIN-only authors clinical board", () => {
    const access = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
    });
    expect(canAuthorDentalClinicalBoard(access)).toBe(true);
    expect(access.canEditPeriodontal).toBe(true);
    expect(isDentalClinicalBoardEditable({ access, encounterStatus: "OPEN" })).toBe(true);
  });

  it("6: CLOSED encounter is not editable even for PROVIDER", () => {
    const access = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
      dentalCareEnabled: true,
    });
    expect(isDentalClinicalBoardEditable({ access, encounterStatus: "CLOSED" })).toBe(false);
  });

  it("11–12: history review uses zero-schema key (no DentalMedicalHistory)", () => {
    expect(D5A5_DENTAL_HISTORY_REVIEW_KEY).toBe("dentalHistoryReviewV1");
    expect(
      assertNoForbiddenDentalClinicalBoardAuthorities([
        "Patient",
        "Encounter",
        "EnterpriseDocument",
      ]).ok
    ).toBe(true);
    expect(assertNoForbiddenDentalClinicalBoardAuthorities(["DentalMedicalHistory"]).ok).toBe(false);
  });

  it("13–15: Overview projects consents/documents and all dental domains", () => {
    expect(D5A5_OVERVIEW_SECTIONS).toContain("alertsHistory");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("documents");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("periodontalExam");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("treatmentPlan");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("treatmentAcceptance");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("procedures");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("odontogramFindings");
  });

  it("17: treatment-plan acceptance section is distinct from documents/consent", () => {
    const acceptanceIdx = D5A5_OVERVIEW_SECTIONS.indexOf("treatmentAcceptance");
    const documentsIdx = D5A5_OVERVIEW_SECTIONS.indexOf("documents");
    expect(acceptanceIdx).toBeGreaterThanOrEqual(0);
    expect(documentsIdx).toBeGreaterThanOrEqual(0);
    expect(acceptanceIdx).not.toBe(documentsIdx);
  });

  it("18: no Patient/MRN duplication authorities", () => {
    expect(assertNoForbiddenDentalAuthoritiesInD5a2(["DentalPatient", "DentalMRN"]).ok).toBe(false);
    expect(assertNoForbiddenDentalClinicalBoardAuthorities(["DentalPatient", "DentalMRN"]).ok).toBe(
      false
    );
  });
});
