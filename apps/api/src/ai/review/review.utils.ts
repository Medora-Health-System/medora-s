import { createHash } from "node:crypto";
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

/**
 * Stable UUID-shaped identifier for one suggestion within one chart snapshot.
 * This prevents auto-refresh from inventing a new identity for an unchanged
 * finding and makes provider feedback meaningful without persisting suggestion
 * bodies. The identifier is not a security token.
 */
export function buildStableSuggestionId(input: {
  snapshotVersion: string;
  source: string;
  category: string;
  title: string;
}): string {
  const hex = createHash("sha256")
    .update(`${input.snapshotVersion}\u0000${input.source}\u0000${input.category}\u0000${input.title.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "5";
  hex[16] = "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

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
    id: buildStableSuggestionId({
      snapshotVersion: ctx.snapshotVersion,
      source: "deterministic",
      category: params.category,
      title: params.title,
    }),
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
