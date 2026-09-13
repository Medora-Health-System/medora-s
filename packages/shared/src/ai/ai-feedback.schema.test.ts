import { describe, expect, it } from "vitest";
import { AiSuggestionFeedbackRequest } from "./ai-feedback.schema.js";

describe("AiSuggestionFeedbackRequest", () => {
  const valid = {
    suggestionId: "11111111-1111-4111-8111-111111111111",
    category: "CLINICAL_SAFETY",
    snapshotVersion: "snapshot-v1",
    rating: "HELPFUL",
  } as const;

  it("accepts minimal PHI-safe feedback", () => {
    expect(AiSuggestionFeedbackRequest.safeParse(valid).success).toBe(true);
  });

  it("rejects free-text comments and unknown fields", () => {
    expect(
      AiSuggestionFeedbackRequest.safeParse({ ...valid, comment: "patient narrative" }).success
    ).toBe(false);
  });

  it("rejects malformed suggestion ids and ratings", () => {
    expect(AiSuggestionFeedbackRequest.safeParse({ ...valid, suggestionId: "bad" }).success).toBe(false);
    expect(AiSuggestionFeedbackRequest.safeParse({ ...valid, rating: "DISMISS" }).success).toBe(false);
  });
});
