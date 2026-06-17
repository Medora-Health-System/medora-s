import { describe, expect, it } from "vitest";
import {
  assertMedicationAdministrationInfusionClinicalCorrectionAllowed,
  planMedicationAdministrationClinicalCorrection,
} from "./medicationAdministrationClinicalCorrection.js";

describe("medicationAdministrationClinicalCorrection (MEDUI.ED.MAR.H7A)", () => {
  const administered = {
    doseValue: "4",
    doseUnit: "mg",
    route: "IV",
    marAction: "administered",
    notes: null,
  };

  it("blocks wrong-patient correction at planning layer", () => {
    const result = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_PATIENT", reason: "Wrong chart" },
      current: administered,
      marActionResolved: "administered",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN_WRONG_PATIENT");
  });

  it("plans dose correction with effective update", () => {
    const result = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_DOSE", doseValue: "2", doseUnit: "mg" },
      current: administered,
      marActionResolved: "administered",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.previousValues.doseValue).toBe("4");
      expect(result.plan.correctedValues.doseValue).toBe("2");
      expect(result.plan.marUpdate.doseValue).toBe("2");
    }
  });

  it("plans route correction", () => {
    const result = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_ROUTE", route: "PO" },
      current: administered,
      marActionResolved: "administered",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.previousValues.route).toBe("IV");
      expect(result.plan.correctedValues.route).toBe("PO");
    }
  });

  it("plans charted-not-given as refused outcome", () => {
    const result = planMedicationAdministrationClinicalCorrection({
      dto: {
        correctionReasonCode: "DOCUMENTED_NOT_GIVEN",
        reason: "Charted in error",
      },
      current: administered,
      marActionResolved: "administered",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.marUpdate.marAction).toBe("refused");
      expect(result.plan.correctedValues.marAction).toBe("refused");
    }
  });

  it("requires detail for duplicate entry", () => {
    const result = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DUPLICATE_ENTRY" },
      current: administered,
      marActionResolved: "administered",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DUPLICATE_DETAIL_REQUIRED");
  });

  it("flags duplicate documentation without MAR deletion fields", () => {
    const result = planMedicationAdministrationClinicalCorrection({
      dto: {
        correctionReasonCode: "DUPLICATE_ENTRY",
        reason: "Accidental double chart",
        relatedDuplicateAdministrationId: "11111111-1111-4111-8111-111111111111",
      },
      current: administered,
      marActionResolved: "administered",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.correctedValues.duplicateDocumentationFlag).toBe(true);
      expect(result.plan.marUpdate).toEqual({});
    }
  });

  it("prohibits infusion dose correction", () => {
    const gate = assertMedicationAdministrationInfusionClinicalCorrectionAllowed({
      correctionReasonCode: "DOCUMENTED_WRONG_DOSE",
      infusionPhase: "INFUSION_START",
      notes: null,
    });
    expect(gate.ok).toBe(false);
  });
});
