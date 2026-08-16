import { describe, expect, it } from "vitest";
import {
  D5A5B_CERTIFICATION_ID,
  dentalClinicalBoardPanelLocked,
  resolveEnterpriseDentalEncounterAuthoring,
} from "./enterpriseDentalEncounterAuthoringD5a5b.js";
import { assertNoForbiddenDentalClinicalBoardAuthorities } from "./enterpriseDentalCompleteClinicalBoardD5a5.js";

describe("MEDUI.D5A.5B enterprise Dental encounter authoring", () => {
  it("certification id", () => {
    expect(D5A5B_CERTIFICATION_ID).toBe("MEDUI.D5A.5B");
  });

  it("1: PROVIDER + Dental + OPEN => canEdit all clinical domains", () => {
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(a.isReadOnly).toBe(false);
    expect(a.canEditPeriodontal).toBe(true);
    expect(a.canEditTreatmentPlan).toBe(true);
    expect(a.canDocumentProcedure).toBe(true);
    expect(a.canEditOdontogram).toBe(true);
    expect(a.canEditEnterpriseHistory).toBe(true);
    expect(a.canReviewHistory).toBe(true);
    expect(a.canPrescribe).toBe(true);
    expect(a.canSign).toBe(true);
    expect(a.readOnlyReason).toBeNull();
    expect(dentalClinicalBoardPanelLocked(a)).toBe(false);
  });

  it("2: ADMIN + PROVIDER + Dental + OPEN => canEdit", () => {
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(a.isReadOnly).toBe(false);
    expect(a.canEditPeriodontal).toBe(true);
    expect(a.canEditEnterpriseHistory).toBe(true);
  });

  it("3: ADMIN-only => cannot clinical-author", () => {
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(a.canView).toBe(true);
    expect(a.isReadOnly).toBe(true);
    expect(a.canEditPeriodontal).toBe(false);
    expect(a.readOnlyReason).toBe("NO_CLINICAL_CAPABILITY");
  });

  it("4–5: FRONT_DESK / BILLING => cannot clinical-author", () => {
    for (const role of ["FRONT_DESK", "BILLING"] as const) {
      const a = resolveEnterpriseDentalEncounterAuthoring({
        roleCodes: [role],
        dentalCareEnabled: true,
        encounterStatus: "OPEN",
        serviceLine: "DENTAL",
      });
      expect(a.isReadOnly).toBe(true);
      expect(a.canEditPeriodontal).toBe(false);
      expect(a.canEditEnterpriseHistory).toBe(false);
    }
  });

  it("7: CLOSED => read-only even for PROVIDER", () => {
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "CLOSED",
      serviceLine: "DENTAL",
    });
    expect(a.isReadOnly).toBe(true);
    expect(a.readOnlyReason).toBe("ENCOUNTER_NOT_OPEN");
    expect(a.canEditPeriodontal).toBe(false);
  });

  it("MEDORA_SUPER_ADMIN alone does not silently gain clinical authoring", () => {
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["MEDORA_SUPER_ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(a.isReadOnly).toBe(true);
    expect(a.readOnlyReason).toBe("NO_CLINICAL_CAPABILITY");
  });

  it("RN view-only for clinical board domains", () => {
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["RN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(a.canView).toBe(true);
    expect(a.canEditPeriodontal).toBe(false);
    expect(a.canEditEnterpriseHistory).toBe(false);
  });

  it("11: no DentalMedicalHistory fork", () => {
    expect(assertNoForbiddenDentalClinicalBoardAuthorities(["DentalMedicalHistory"]).ok).toBe(false);
  });
});
