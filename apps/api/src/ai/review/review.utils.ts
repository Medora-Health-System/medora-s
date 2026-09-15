import { createHash } from "node:crypto";
import type {
  AiLocalizedCopy,
  AiSuggestion,
  AiSuggestionCategory,
  AiSuggestionEvidence,
  AiSuggestionPriority,
  AiSuggestionRecommendedAction,
} from "@medora/shared";
import {
  MEDORA_ASSIST_DISCLAIMER,
  MEDORA_ASSIST_REVIEW_ACTION,
  medoraAssistFindingCopy,
  type MedoraAssistFindingKey,
} from "@medora/shared";
import type { SuggestionContext } from "./review.types.js";

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
    reasoningSummary?: string;
    titleLocalized?: AiLocalizedCopy;
    summaryLocalized?: AiLocalizedCopy;
    reasoningSummaryLocalized?: AiLocalizedCopy;
    evidence?: AiSuggestionEvidence[];
    recommendedActions?: AiSuggestionRecommendedAction[];
  }
): AiSuggestion {
  const title = params.titleLocalized?.en ?? params.title;
  const summary = params.summaryLocalized?.en ?? params.summary;
  const reasoningSummary =
    params.reasoningSummaryLocalized?.en ?? params.reasoningSummary ?? summary;
  const recommendedActions = (params.recommendedActions ?? [
    { actionType: "REVIEW" as const, label: MEDORA_ASSIST_REVIEW_ACTION.en },
  ]).map((action) => ({
    ...action,
    actionType: action.actionType === "NAVIGATE" ? ("NAVIGATE" as const) : ("REVIEW" as const),
  }));

  return {
    id: buildStableSuggestionId({
      snapshotVersion: ctx.snapshotVersion,
      source: "deterministic",
      category: params.category,
      title,
    }),
    category: params.category,
    priority: params.priority,
    title,
    summary,
    reasoningSummary,
    titleLocalized: params.titleLocalized,
    summaryLocalized: params.summaryLocalized,
    reasoningSummaryLocalized: params.reasoningSummaryLocalized,
    clinicalDisclaimerLocalized: MEDORA_ASSIST_DISCLAIMER,
    evidence: params.evidence ?? [],
    recommendedActions,
    clinicalDisclaimer: MEDORA_ASSIST_DISCLAIMER.en,
    source: "deterministic",
    generatedAt: ctx.generatedAt,
    snapshotVersion: ctx.snapshotVersion,
    status: "PENDING",
  };
}

export function buildCopiedSuggestion(
  ctx: SuggestionContext,
  params: {
    category: AiSuggestionCategory;
    priority: AiSuggestionPriority;
    copyKey: MedoraAssistFindingKey;
    vars?: Record<string, string>;
    evidence?: AiSuggestionEvidence[];
    recommendedActions?: AiSuggestionRecommendedAction[];
  }
): AiSuggestion {
  const copy = medoraAssistFindingCopy(params.copyKey, params.vars);
  return buildAiSuggestion(ctx, {
    category: params.category,
    priority: params.priority,
    title: copy.title.en,
    summary: copy.summary.en,
    reasoningSummary: copy.summary.en,
    titleLocalized: copy.title,
    summaryLocalized: copy.summary,
    reasoningSummaryLocalized: copy.summary,
    evidence: params.evidence,
    recommendedActions: params.recommendedActions,
  });
}
