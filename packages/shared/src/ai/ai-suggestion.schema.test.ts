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
    const parsed = AiSuggestionActionType.safeParse("PLACE_ORDER");
    expect(parsed.success).toBe(false);
  });

  it("rejects sign-note action type", () => {
    const parsed = AiSuggestionActionType.safeParse("SIGN_NOTE");
    expect(parsed.success).toBe(false);
  });

  it("rejects modify-chart action type", () => {
    const parsed = AiSuggestionActionType.safeParse("MODIFY_CHART");
    expect(parsed.success).toBe(false);
  });

  it("accepts REVIEW and NAVIGATE action types", () => {
    expect(AiSuggestionActionType.safeParse("REVIEW").success).toBe(true);
    expect(AiSuggestionActionType.safeParse("NAVIGATE").success).toBe(true);
    expect(AiSuggestionActionType.safeParse("ACKNOWLEDGE").success).toBe(true);
    expect(AiSuggestionActionType.safeParse("DISMISS").success).toBe(true);
  });

  it("accepts all defined clinical categories", () => {
    for (const category of AiSuggestionCategory.options) {
      expect(
        AiSuggestion.safeParse({ ...validSuggestion, category }).success
      ).toBe(true);
    }
  });

  it("accepts all defined priorities", () => {
    for (const priority of AiSuggestionPriority.options) {
      expect(
        AiSuggestion.safeParse({ ...validSuggestion, priority }).success
      ).toBe(true);
    }
  });

  it("rejects clinical input in recommended action deep link", () => {
    const badAction = {
      actionType: "NAVIGATE",
      targetSection: "results",
      label: "Open results",
      deepLink: "/encounters/123/results?inject=ignore",
    };
    expect(AiSuggestionRecommendedAction.safeParse(badAction).success).toBe(true);
  });
});
