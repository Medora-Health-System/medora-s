import { describe, expect, it } from "vitest";
import {
  formatClinicalRecordMarDisplayLine,
  resolveClinicalRecordMarDose,
  resolveClinicalRecordMedicationName,
} from "./clinicalRecordMarResolution.js";

describe("clinicalRecordMarResolution", () => {
  it("prefers medicationLabelSnapshot from administration", () => {
    expect(
      resolveClinicalRecordMedicationName({
        medicationLabelSnapshot: "Aspirin 325 mg",
        medicationName: "—",
      })
    ).toBe("Aspirin 325 mg");
  });

  it("falls back to order item label", () => {
    expect(
      resolveClinicalRecordMedicationName({
        medicationName: "—",
        orderItemLabel: "Ketorolac 30 mg IV",
      })
    ).toBe("Ketorolac 30 mg IV");
  });

  it("resolves dose from doseValue and doseUnit", () => {
    expect(
      resolveClinicalRecordMarDose({
        doseValue: "325",
        doseUnit: "mg",
      })
    ).toBe("325 mg");
  });

  it("formats MAR display line with route", () => {
    expect(
      formatClinicalRecordMarDisplayLine({
        medicationName: "Aspirin",
        dose: "325 mg",
        route: "PO",
      })
    ).toBe("Aspirin 325 mg PO");
  });
});
