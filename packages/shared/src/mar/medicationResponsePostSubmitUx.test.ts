import { describe, expect, it } from "vitest";
import {
  derivePersonInitials,
  resolveMedicationResponseDocumentedByLabel,
} from "./medicationResponseDocumentedByDisplay.js";
import {
  buildMarMedicationResponseNotes,
  parseMarMedicationResponseNotes,
} from "./marMedicationResponseGovernance.js";
import { formatMedicationResponseCountLabel, listMedicationResponseSideEffectKeys } from "./medicationResponseSummaryFormat.js";

describe("medicationResponseDocumentedByDisplay", () => {
  it("prefers stored initials", () => {
    expect(
      resolveMedicationResponseDocumentedByLabel({
        documentedByInitials: "EP",
        documentedByDisplayName: "Elizabeth Posada RN",
        documentedBy: "Elizabeth Posada RN",
      })
    ).toBe("EP");
  });

  it("derives initials from full name", () => {
    expect(derivePersonInitials("Elizabeth Posada RN")).toBe("EPR");
    expect(
      resolveMedicationResponseDocumentedByLabel({
        documentedByInitials: null,
        documentedByDisplayName: "Elizabeth Posada RN",
        documentedBy: null,
      })
    ).toBe("EPR");
  });

  it("persists and parses documented by fields", () => {
    const built = buildMarMedicationResponseNotes(null, {
      responseCode: "EFFECTIVE",
      documentedAt: "2026-06-23T14:00:00.000Z",
      documentedBy: "Elizabeth Posada RN",
      documentedByDisplayName: "Elizabeth Posada RN",
      documentedByInitials: "EP",
    });
    expect(built.ok).toBe(true);
    const parsed = parseMarMedicationResponseNotes(built.notes)[0];
    expect(parsed?.documentedByInitials).toBe("EP");
    expect(parsed?.documentedByDisplayName).toBe("Elizabeth Posada RN");
  });
});

describe("medicationResponseSummaryFormat", () => {
  it("formats response count badge", () => {
    expect(formatMedicationResponseCountLabel(1)).toBe("RESPONSE");
    expect(formatMedicationResponseCountLabel(2)).toBe("RESPONSE (2)");
  });

  it("lists side effects for summary", () => {
    expect(
      listMedicationResponseSideEffectKeys({
        responseCode: "EFFECTIVE",
        responseDetail: null,
        responseTime: null,
        documentedAt: "2026-06-23T14:00:00.000Z",
        painBefore: null,
        painAfter: null,
        painResponseTrend: null,
        noAdverseReaction: true,
        nausea: true,
        vomiting: null,
        itching: null,
        sedation: null,
        dizziness: null,
        constipation: null,
        respiratoryDepression: null,
        documentedBy: null,
        documentedByInitials: null,
        documentedByDisplayName: null,
        documentedByUserId: null,
        documentedByName: null,
      })
    ).toEqual(["noAdverseReaction", "nausea"]);
  });
});
