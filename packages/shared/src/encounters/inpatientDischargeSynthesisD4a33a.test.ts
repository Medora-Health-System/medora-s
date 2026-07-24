import { describe, expect, it } from "vitest";
import {
  hasMeaningfulDischargeSummary,
  synthesizeInpatientDischargeSummaryDraft,
} from "./inpatientDischargeSynthesisD4a33a.js";

describe("inpatientDischargeSynthesis D4A.3.3A", () => {
  it("detects empty vs meaningful summaries", () => {
    expect(hasMeaningfulDischargeSummary(null)).toBe(false);
    expect(hasMeaningfulDischargeSummary({})).toBe(false);
    expect(
      hasMeaningfulDischargeSummary({ dischargeDiagnosisSummary: "Pneumonia" })
    ).toBe(true);
  });

  it("synthesizes a non-empty draft for print", () => {
    const draft = synthesizeInpatientDischargeSummaryDraft({
      admissionDiagnosis: "Abdominal Pain",
      room: "MS-1",
      codeStatus: "FULL_CODE",
      isolation: ["CONTACT"],
      language: "en",
    });
    expect(hasMeaningfulDischargeSummary(draft)).toBe(true);
    expect(String(draft.dischargeInstructions)).toMatch(/Abdominal Pain/);
  });
});
