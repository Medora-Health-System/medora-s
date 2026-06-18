import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarAllergyReviewAnalyticsMetrics } from "./marAllergyReviewAnalytics.js";
import { buildMarAllergyReviewCandidateNotes } from "./marAllergyCandidate.js";
import { buildMarMedicationResponseNotes } from "./marMedicationResponseGovernance.js";

describe("marAllergyAnalytics", () => {
  it("analytics projection works", () => {
    const responseNotes = buildMarMedicationResponseNotes(null, {
      responseCode: "ADVERSE_REACTION_REPORTED",
      responseDetail: "rash",
      responseTime: "2026-06-03T08:45:00.000Z",
      documentedAt: "2026-06-03T08:45:00.000Z",
      painBefore: null,
      painAfter: null,
    });
    const notes =
      responseNotes.ok && responseNotes.notes
        ? buildMarAllergyReviewCandidateNotes(responseNotes.notes, {
            candidateId: "mar-1:ts",
            medicationName: "Amoxicillin",
            medicationClass: null,
            reactionText: "rash",
            reactionCategory: "HIGH_PRIORITY_REVIEW",
            detectedAt: "2026-06-03T08:45:00.000Z",
            documentedBy: "RN",
            recommendationLevel: "HIGH_PRIORITY_REVIEW",
          })
        : "";

    const metrics = buildMarAllergyReviewAnalyticsMetrics({
      administrations: [{ id: "mar-1", notes, medicationLabel: "Amoxicillin" }],
    });
    expect(metrics.highPriorityAllergyReviewCount).toBeGreaterThanOrEqual(1);
    expect(metrics.allergyReviewRecommendationCount).toBeDefined();
    expect(metrics.reactionDocumentationRate.denominator).toBe(1);
  });

  it("projection module is read-only", () => {
    const src = readFileSync(join(import.meta.dirname, "./marAllergyReviewAnalytics.ts"), "utf8");
    expect(src).not.toMatch(/prisma|createAllergy/i);
  });
});
