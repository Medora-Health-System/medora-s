/** MEDUI.ED.MAR.H10 — allergy review recommendation governance (advisory only). */

import { isMarMedicationResponseCode } from "./marMedicationResponseGovernance.js";
import type { MarAllergyCandidate } from "./marAllergyCandidate.js";

export type MarAllergyReviewRecommendationLevel = "NONE" | "REVIEW_RECOMMENDED" | "HIGH_PRIORITY_REVIEW";

export type MarMedicationResponseAllergyReviewRecommendation = {
  recommendationLevel: MarAllergyReviewRecommendationLevel;
  recommendationMessageKey: string | null;
  allergyCandidate: Omit<MarAllergyCandidate, "dismissedAt"> | null;
};

const HIGH_PRIORITY_KEYWORDS = [
  "rash",
  "urticaria",
  "hives",
  "itching",
  "swelling",
  "angioedema",
  "bronchospasm",
  "anaphylaxis",
  "anaphylact",
  "urticaire",
  "demangeaison",
  "gonflement",
  "oedeme",
  "œdeme",
] as const;

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function containsHighPriorityReactionKeyword(text: string | null | undefined): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return HIGH_PRIORITY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function resolveRecommendationLevel(input: {
  responseCode: string | null | undefined;
  responseDetail?: string | null;
}): MarAllergyReviewRecommendationLevel {
  const code = input.responseCode?.trim();
  if (!code || !isMarMedicationResponseCode(code)) return "NONE";
  if (code !== "ADVERSE_REACTION_REPORTED") return "NONE";
  if (containsHighPriorityReactionKeyword(input.responseDetail)) return "HIGH_PRIORITY_REVIEW";
  return "REVIEW_RECOMMENDED";
}

function recommendationMessageKey(level: MarAllergyReviewRecommendationLevel): string | null {
  if (level === "HIGH_PRIORITY_REVIEW") return "marAllergyReview.recommendation.highPriority";
  if (level === "REVIEW_RECOMMENDED") return "marAllergyReview.recommendation.review";
  return null;
}

export function resolveMarAllergyReviewRecommendationMessageKey(
  level: MarAllergyReviewRecommendationLevel
): string | null {
  return recommendationMessageKey(level);
}

/** Resolve non-blocking allergy review recommendation from medication response documentation. */
export function resolveMedicationResponseAllergyReviewRecommendation(input: {
  responseCode: string | null | undefined;
  responseDetail?: string | null;
  medicationName?: string | null;
  medicationClass?: string | null;
  reactionText?: string | null;
  detectedAt?: string | null;
  documentedBy?: string | null;
  administrationId?: string | null;
  orderItemId?: string | null;
}): MarMedicationResponseAllergyReviewRecommendation {
  const recommendationLevel = resolveRecommendationLevel({
    responseCode: input.responseCode,
    responseDetail: input.responseDetail ?? input.reactionText,
  });
  const messageKey = recommendationMessageKey(recommendationLevel);

  if (recommendationLevel === "NONE") {
    return {
      recommendationLevel,
      recommendationMessageKey: null,
      allergyCandidate: null,
    };
  }

  const reactionText =
    input.reactionText?.trim() || input.responseDetail?.trim() || "Adverse reaction reported";

  return {
    recommendationLevel,
    recommendationMessageKey: messageKey,
    allergyCandidate: {
      candidateId: `${input.administrationId ?? "mar"}:${input.detectedAt ?? new Date().toISOString()}`,
      medicationName: input.medicationName?.trim() || "Medication",
      medicationClass: input.medicationClass?.trim() || null,
      reactionText,
      reactionCategory: recommendationLevel,
      detectedAt: input.detectedAt ?? new Date().toISOString(),
      documentedBy: input.documentedBy?.trim() || null,
      recommendationLevel,
      sourceAdministrationId: input.administrationId ?? null,
      sourceOrderItemId: input.orderItemId ?? null,
    },
  };
}

/** Effective => NONE, NO_ADVERSE_REACTION => NONE, etc. */
export function isAllergyReviewRecommendationActive(
  level: MarAllergyReviewRecommendationLevel
): boolean {
  return level !== "NONE";
}
