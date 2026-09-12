import { randomUUID } from "node:crypto";
import type {
  AiSuggestion,
  AiSuggestionCategory,
  AiSuggestionEvidence,
  AiSuggestionPriority,
  AiSuggestionRecommendedAction,
} from "@medora/shared";
import type { SuggestionContext } from "./review.types.js";

const DEFAULT_CLINICAL_DISCLAIMER =
  "This deterministic chart-review observation is for provider review only; it does not diagnose or authorize autonomous action.";

export function buildAiSuggestion(
  ctx: SuggestionContext,
  params: {
    category: AiSuggestionCategory;
    priority: AiSuggestionPriority;
    title: string;
    summary: string;
    reasoningSummary: string;
    evidence: AiSuggestionEvidence[];
    recommendedActions?: AiSuggestionRecommendedAction[];
  }
): AiSuggestion {
  return {
    id: randomUUID(),
    category: params.category,
    priority: params.priority,
    title: params.title,
    summary: params.summary,
    reasoningSummary: params.reasoningSummary,
    evidence: params.evidence,
    recommendedActions: params.recommendedActions ?? [
      { actionType: "REVIEW", label: "Review chart" },
    ],
    clinicalDisclaimer: DEFAULT_CLINICAL_DISCLAIMER,
    source: "deterministic",
    generatedAt: ctx.generatedAt,
    snapshotVersion: ctx.snapshotVersion,
    status: "PENDING",
  };
}
