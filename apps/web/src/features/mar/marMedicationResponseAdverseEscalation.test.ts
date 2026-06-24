import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveMarMedicationResponseAdverseEscalationHint } from "@medora/shared";

describe("marMedicationResponseAdverseEscalation", () => {
  it("ADVERSE_REACTION_REPORTED shows tiered allergy review recommendation in panel source", () => {
    const panelSrc = readFileSync(
      join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
      "utf8"
    );
    expect(panelSrc).toContain("mar-medication-response-allergy-review-recommendation");
    expect(panelSrc).toContain("resolveMedicationResponseAllergyReviewRecommendation");
  });

  it("adverse reaction does not modify allergy list", () => {
    const panelSrc = readFileSync(
      join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
      "utf8"
    );
    const historySrc = readFileSync(
      join(process.cwd(), "src/lib/medicationAdministrationHistoryRail.ts"),
      "utf8"
    );
    const serviceSrc = readFileSync(
      join(process.cwd(), "../api/src/medication-administration/medication-administration.service.ts"),
      "utf8"
    );
    expect(serviceSrc).not.toMatch(/createAllergy|PatientAllergy|updateAllergyList/i);
    expect(historySrc).not.toMatch(/updateAllergy|createAllergy|allergyList/i);
    expect(panelSrc).toContain("marAllergyReview");
  });

  it("resolveMarMedicationResponseAdverseEscalationHint detects adverse reaction", () => {
    expect(
      resolveMarMedicationResponseAdverseEscalationHint([
        {
          responseCode: "ADVERSE_REACTION_REPORTED",
          responseDetail: "rash",
          responseTime: null,
          documentedAt: "2026-06-03T10:00:00.000Z",
          painBefore: null,
          painAfter: null,
          painResponseTrend: null,
          noAdverseReaction: null,
          nausea: null,
          vomiting: null,
          itching: null,
          sedation: null,
          dizziness: null,
          constipation: null,
          respiratoryDepression: null,
        },
      ])
    ).toBe(true);
  });
});
