/** MEDUI.ED.MAR.H10 — allergy review analytics projection (read-only). */

import type { MarAllergyCandidate } from "./marAllergyCandidate.js";
import type { MarAnalyticsRateMetric } from "./marAnalyticsDashboardContracts.js";
import { parseMarMedicationResponseNotes } from "./marMedicationResponseGovernance.js";
import { resolveMedicationResponseAllergyReviewRecommendation } from "./marAllergyReviewGovernance.js";
import { parseMarAllergyReviewCandidatesFromNotes } from "./marAllergyCandidate.js";

export type MarAllergyReviewAnalyticsMetrics = {
  allergyReviewRecommendationCount: number;
  highPriorityAllergyReviewCount: number;
  reactionDocumentationRate: MarAnalyticsRateMetric;
  reactionReviewCompletionRate: MarAnalyticsRateMetric;
};

function rate(numerator: number, denominator: number): MarAnalyticsRateMetric {
  const safeDenom = denominator > 0 ? denominator : 0;
  return {
    numerator,
    denominator: safeDenom,
    rate: safeDenom === 0 ? 0 : numerator / safeDenom,
  };
}

export function buildMarAllergyReviewAnalyticsMetrics(input: {
  administrations: Array<{
    id: string;
    notes?: string | null;
    medicationLabel?: string | null;
  }>;
  dismissedCandidateIds?: string[];
}): MarAllergyReviewAnalyticsMetrics {
  let adverseReactionDocumented = 0;
  let allergyReviewRecommendationCount = 0;
  let highPriorityAllergyReviewCount = 0;
  let dismissedCount = 0;
  const dismissed = new Set(input.dismissedCandidateIds ?? []);

  for (const row of input.administrations) {
    const responses = parseMarMedicationResponseNotes(row.notes);
    const candidates = parseMarAllergyReviewCandidatesFromNotes(row.notes);

    for (const response of responses) {
      if (response.responseCode !== "ADVERSE_REACTION_REPORTED") continue;
      adverseReactionDocumented += 1;
      const recommendation = resolveMedicationResponseAllergyReviewRecommendation({
        responseCode: response.responseCode,
        responseDetail: response.responseDetail,
        medicationName: row.medicationLabel,
        detectedAt: response.documentedAt,
      });
      if (recommendation.recommendationLevel === "REVIEW_RECOMMENDED") {
        allergyReviewRecommendationCount += 1;
      }
      if (recommendation.recommendationLevel === "HIGH_PRIORITY_REVIEW") {
        highPriorityAllergyReviewCount += 1;
      }
    }

    for (const candidate of candidates) {
      if (candidate.dismissedAt || dismissed.has(candidate.candidateId)) {
        dismissedCount += 1;
      }
    }
  }

  const totalRecommendations = allergyReviewRecommendationCount + highPriorityAllergyReviewCount;

  return {
    allergyReviewRecommendationCount,
    highPriorityAllergyReviewCount,
    reactionDocumentationRate: rate(adverseReactionDocumented, input.administrations.length),
    reactionReviewCompletionRate: rate(dismissedCount, totalRecommendations),
  };
}

export function summarizeMarAllergyCandidates(candidates: MarAllergyCandidate[]): {
  activeCount: number;
  highPriorityCount: number;
} {
  const active = candidates.filter((c) => !c.dismissedAt?.trim());
  return {
    activeCount: active.length,
    highPriorityCount: active.filter((c) => c.recommendationLevel === "HIGH_PRIORITY_REVIEW").length,
  };
}
