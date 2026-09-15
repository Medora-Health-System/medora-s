import { describe, expect, it } from "vitest";
import {
  AiSuggestion,
  AiSuggestionCategory,
  AiSuggestionPriority,
  AiSuggestionRecommendedAction,
  AiSuggestionActionType,
} from "./ai-suggestion.schema.js";

const validSuggestion = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  category: "CLINICAL_SAFETY",
  priority: "HIGH",
  title: "Critical result unacknowledged",
  summary: "A critical lab result is pending provider acknowledgment.",
  reasoningSummary: "The result has criticalValue=true and no acknowledgedAt timestamp.",
  evidence: [
    {
      sourceType: "RESULT",
      sourceId: "result-123",
      label: "Critical potassium",
      value: 6.8,
    },
  ],
  recommendedActions: [
    {
      actionType: "REVIEW",
      targetSection: "results",
      label: "Review result",
    },
  ],
  clinicalDisclaimer: "Requires provider review; not a diagnosis.",
  source: "deterministic",
  generatedAt: "2026-01-01T00:00:00.000Z",
  snapshotVersion: "v1/abc123",
  status: "PENDING",
};

describe("AiSuggestion schema", () => {
  it("accepts a valid suggestion", () => {
    expect(() => AiSuggestion.parse(validSuggestion)).not.toThrow();
  });

  it("rejects malformed suggestion without id", () => {
    const { id: _id, ...rest } = validSuggestion;
    expect(() => AiSuggestion.parse(rest)).toThrow();
  });

  it("rejects unsupported category", () => {
    const parsed = AiSuggestion.safeParse({ ...validSuggestion, category: "UPCODE" });
    expect(parsed.success).toBe(false);
  });

  it("rejects unsupported priority", () => {
    const parsed = AiSuggestion.safeParse({ ...validSuggestion, priority: "URGENT" });
    expect(parsed.success).toBe(false);
  });

  it("has no chain-of-thought field", () => {
    const keys = Object.keys(AiSuggestion.shape);
    expect(keys).not.toContain("chainOfThought");
    expect(keys).not.toContain("reasoning");
    expect(keys).not.toContain("hiddenReasoning");
  });

  it("rejects autonomous order placement action type", () => {
    expect(AiSuggestionActionType.safeParse("PLACE_ORDER").success).toBe(false);
  });

  it("rejects sign-note and modify-chart action types", () => {
    expect(AiSuggestionActionType.safeParse("SIGN_NOTE").success).toBe(false);
    expect(AiSuggestionActionType.safeParse("MODIFY_CHART").success).toBe(false);
  });

  it("allows only REVIEW and NAVIGATE suggestion actions", () => {
    expect(AiSuggestionActionType.safeParse("REVIEW").success).toBe(true);
    expect(AiSuggestionActionType.safeParse("NAVIGATE").success).toBe(true);
    expect(AiSuggestionActionType.safeParse("ACKNOWLEDGE").success).toBe(false);
    expect(AiSuggestionActionType.safeParse("DISMISS").success).toBe(false);
  });

  it("accepts all defined clinical categories", () => {
    for (const category of AiSuggestionCategory.options) {
      expect(AiSuggestion.safeParse({ ...validSuggestion, category }).success).toBe(true);
    }
  });

  it("accepts all defined priorities", () => {
    for (const priority of AiSuggestionPriority.options) {
      expect(AiSuggestion.safeParse({ ...validSuggestion, priority }).success).toBe(true);
    }
  });

  it("accepts a query-free internal deep link", () => {
    const action = {
      actionType: "NAVIGATE",
      targetSection: "results",
      label: "Open results",
      deepLink: "/encounters/123/results",
    };
    expect(AiSuggestionRecommendedAction.safeParse(action).success).toBe(true);
  });

  it("rejects query-bearing, absolute, protocol-relative, and javascript deep links", () => {
    const unsafeLinks = [
      "/encounters/123/results?inject=ignore",
      "https://example.com/results",
      "//example.com/results",
      "javascript:alert(1)",
      "/encounters/123/results#fragment",
    ];

    for (const deepLink of unsafeLinks) {
      expect(
        AiSuggestionRecommendedAction.safeParse({
          actionType: "NAVIGATE",
          targetSection: "results",
          label: "Open results",
          deepLink,
        }).success
      ).toBe(false);
    }
  });
});
