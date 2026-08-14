import { describe, expect, it } from "vitest";
import {
  D4C8B_CERTIFICATION_ID,
  ENTERPRISE_CLOSED_CLINICAL_RECORD_SECTIONS,
  assertNoRawJsonClinicalPresentation,
  isForbiddenClosedRecordAggregatePath,
} from "./enterpriseClosedEncounterClinicalRecordD4c8b.js";

describe("MEDUI.D4C.8B closed clinical record contract", () => {
  it("exports certification id and ordered sections", () => {
    expect(D4C8B_CERTIFICATION_ID).toBe("MEDUI.D4C.8B");
    expect(ENTERPRISE_CLOSED_CLINICAL_RECORD_SECTIONS).toContain("vitals");
    expect(ENTERPRISE_CLOSED_CLINICAL_RECORD_SECTIONS).toContain("provider");
    expect(ENTERPRISE_CLOSED_CLINICAL_RECORD_SECTIONS).toContain("results");
  });

  it("forbids patient chart-summary as closed-record aggregate", () => {
    expect(isForbiddenClosedRecordAggregatePath("/patients/x/chart-summary")).toBe(true);
    expect(isForbiddenClosedRecordAggregatePath("/encounters/x/vitals-history")).toBe(false);
  });

  it("detects raw JSON presentation candidates", () => {
    expect(assertNoRawJsonClinicalPresentation('{"hpi":"x"}')).toBe(false);
    expect(assertNoRawJsonClinicalPresentation("Chest pain for 2 hours")).toBe(true);
    expect(assertNoRawJsonClinicalPresentation({ hpi: "x" })).toBe(false);
  });
});
