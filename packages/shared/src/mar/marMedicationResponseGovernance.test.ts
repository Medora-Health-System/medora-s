import { describe, expect, it } from "vitest";
import {
  buildMarMedicationResponseNotes,
  parseMarMedicationResponseNotes,
  resolveMarMedicationResponseSeverity,
  validateMarMedicationResponse,
} from "./marMedicationResponseGovernance.js";

describe("marMedicationResponseGovernance", () => {
  it("validates response codes", () => {
    expect(validateMarMedicationResponse({ responseCode: "EFFECTIVE" }).ok).toBe(true);
    expect(validateMarMedicationResponse({ responseCode: "INVALID" as never }).ok).toBe(false);
  });

  it("supports PARTIALLY_EFFECTIVE as neutral severity", () => {
    expect(resolveMarMedicationResponseSeverity("PARTIALLY_EFFECTIVE")).toBe("neutral");
  });

  it("requires comment for OTHER", () => {
    expect(validateMarMedicationResponse({ responseCode: "OTHER" }).ok).toBe(false);
    expect(
      validateMarMedicationResponse({ responseCode: "OTHER", responseDetail: "note" }).ok
    ).toBe(true);
  });

  it("requires comment for ADVERSE_REACTION_REPORTED", () => {
    expect(validateMarMedicationResponse({ responseCode: "ADVERSE_REACTION_REPORTED" }).ok).toBe(
      false
    );
    expect(
      validateMarMedicationResponse({
        responseCode: "ADVERSE_REACTION_REPORTED",
        responseDetail: "rash",
      }).ok
    ).toBe(true);
  });

  it("validates pain scores 0-10", () => {
    expect(validateMarMedicationResponse({ responseCode: "PAIN_REDUCED", painBefore: 11 }).ok).toBe(
      false
    );
    expect(
      validateMarMedicationResponse({
        responseCode: "PAIN_REDUCED",
        painBefore: 8,
        painAfter: 3,
      }).ok
    ).toBe(true);
  });

  it("appends response notes without overwriting prior lines", () => {
    const first = buildMarMedicationResponseNotes(null, {
      responseCode: "EFFECTIVE",
      documentedAt: "2026-06-03T10:00:00.000Z",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = buildMarMedicationResponseNotes(first.notes, {
      responseCode: "PAIN_REDUCED",
      painBefore: 8,
      painAfter: 3,
      documentedAt: "2026-06-03T10:30:00.000Z",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const parsed = parseMarMedicationResponseNotes(second.notes);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.responseCode).toBe("EFFECTIVE");
    expect(parsed[1]?.responseCode).toBe("PAIN_REDUCED");
  });
});
