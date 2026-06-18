import { describe, expect, it } from "vitest";
import { resolveMedicationResponseAllergyReviewRecommendation } from "./marAllergyReviewGovernance.js";

describe("marAllergyReviewGovernance", () => {
  it("adverse reaction generates REVIEW_RECOMMENDED", () => {
    const result = resolveMedicationResponseAllergyReviewRecommendation({
      responseCode: "ADVERSE_REACTION_REPORTED",
      responseDetail: "nausea only",
      medicationName: "Amoxicillin",
      administrationId: "mar-1",
      detectedAt: "2026-06-03T08:45:00.000Z",
    });
    expect(result.recommendationLevel).toBe("REVIEW_RECOMMENDED");
    expect(result.recommendationMessageKey).toBe("marAllergyReview.recommendation.review");
    expect(result.allergyCandidate?.medicationName).toBe("Amoxicillin");
  });

  it.each([
    ["rash", "HIGH_PRIORITY_REVIEW"],
    ["hives", "HIGH_PRIORITY_REVIEW"],
    ["angioedema", "HIGH_PRIORITY_REVIEW"],
    ["anaphylaxis", "HIGH_PRIORITY_REVIEW"],
  ])("%s => %s", (detail, level) => {
    const result = resolveMedicationResponseAllergyReviewRecommendation({
      responseCode: "ADVERSE_REACTION_REPORTED",
      responseDetail: detail,
      medicationName: "Amoxicillin",
    });
    expect(result.recommendationLevel).toBe(level);
    expect(result.recommendationMessageKey).toBe("marAllergyReview.recommendation.highPriority");
  });

  it("effective => NONE", () => {
    const result = resolveMedicationResponseAllergyReviewRecommendation({
      responseCode: "EFFECTIVE",
      medicationName: "Amoxicillin",
    });
    expect(result.recommendationLevel).toBe("NONE");
    expect(result.allergyCandidate).toBeNull();
  });

  it("no adverse reaction => NONE", () => {
    const result = resolveMedicationResponseAllergyReviewRecommendation({
      responseCode: "NO_ADVERSE_REACTION",
      medicationName: "Amoxicillin",
    });
    expect(result.recommendationLevel).toBe("NONE");
  });
});
