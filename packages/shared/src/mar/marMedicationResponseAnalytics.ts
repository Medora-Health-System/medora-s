/** MEDUI.ED.MAR.H9L — medication response analytics projection (read-only). */

import {
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
  type MarMedicationResponseCode,
  type ParsedMarMedicationResponse,
} from "./marMedicationResponseGovernance.js";
import {
  buildMarMedicationResponseFollowUpSummary,
  resolveMarMedicationResponseAdverseEscalationHint,
  type MarMedicationResponseFollowUpInput,
} from "./marMedicationResponseFollowUpGovernance.js";
import type { MarAnalyticsRateMetric } from "./marAnalyticsDashboardContracts.js";

export type MarMedicationResponseAnalyticsProjection = {
  administrationId: string;
  encounterId: string;
  facilityId: string;
  eventAt: string;
  administeredAt: string;
  medicationLabel?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  prnIndication?: string | null;
  responses: ParsedMarMedicationResponse[];
};

export type MarMedicationResponseFollowUpCandidate = MarMedicationResponseFollowUpInput & {
  administrationId: string;
};

export type MarMedicationResponseAnalyticsMetrics = {
  responseDocumentedCount: number;
  responseRate: MarAnalyticsRateMetric;
  effectiveCount: number;
  partiallyEffectiveCount: number;
  ineffectiveCount: number;
  noAdverseReactionCount: number;
  adverseReactionCount: number;
  sedationCount: number;
  painImprovementAverage: number | null;
  painReductionAverage: number | null;
  responseRecommendedCount: number;
  responseOverdueCount: number;
  responseDocumentedWithinWindowCount: number;
  responseDocumentedLateCount: number;
  adverseReactionEscalationCount: number;
  multipleResponseCount: number;
};

function rate(numerator: number, denominator: number): MarAnalyticsRateMetric {
  const safeDenom = denominator > 0 ? denominator : 0;
  return {
    numerator,
    denominator: safeDenom,
    rate: safeDenom === 0 ? 0 : numerator / safeDenom,
  };
}

function countByCode(responses: ParsedMarMedicationResponse[], code: MarMedicationResponseCode): number {
  return responses.filter((r) => r.responseCode === code).length;
}

function averagePainReduction(responses: ParsedMarMedicationResponse[]): number | null {
  const deltas: number[] = [];
  for (const response of responses) {
    if (response.painBefore == null || response.painAfter == null) continue;
    deltas.push(response.painBefore - response.painAfter);
  }
  if (deltas.length === 0) return null;
  const sum = deltas.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / deltas.length) * 10) / 10;
}

function averagePainImprovement(responses: ParsedMarMedicationResponse[]): number | null {
  const improvements: number[] = [];
  for (const response of responses) {
    if (response.painBefore == null || response.painAfter == null) continue;
    if (response.painAfter < response.painBefore) {
      improvements.push(response.painBefore - response.painAfter);
    }
  }
  if (improvements.length === 0) return null;
  const sum = improvements.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / improvements.length) * 10) / 10;
}

function firstResponseDocumentedAt(responses: ParsedMarMedicationResponse[]): string | null {
  if (responses.length === 0) return null;
  const sorted = [...responses].sort(
    (a, b) => new Date(a.documentedAt).getTime() - new Date(b.documentedAt).getTime()
  );
  return sorted[0]?.documentedAt ?? null;
}

export function buildMarMedicationResponseAnalyticsProjection(input: {
  administrationId: string;
  encounterId: string;
  facilityId: string;
  eventAt: string;
  administeredAt: string;
  medicationLabel?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  prnIndication?: string | null;
  notes?: string | null;
}): MarMedicationResponseAnalyticsProjection | null {
  const responses = parseMarMedicationResponseNotes(input.notes);
  if (responses.length === 0) return null;
  return {
    administrationId: input.administrationId,
    encounterId: input.encounterId,
    facilityId: input.facilityId,
    eventAt: input.eventAt,
    administeredAt: input.administeredAt,
    medicationLabel: input.medicationLabel ?? null,
    route: input.route ?? null,
    frequencyCode: input.frequencyCode ?? null,
    prnIndication: input.prnIndication ?? null,
    responses,
  };
}

export function buildMarMedicationResponseAnalyticsMetrics(input: {
  eligibleAdministrationCount: number;
  projections: MarMedicationResponseAnalyticsProjection[];
  followUpCandidates?: MarMedicationResponseFollowUpCandidate[];
  referenceAt?: string;
}): MarMedicationResponseAnalyticsMetrics {
  const allResponses = input.projections.flatMap((p) => p.responses);
  const documentedAdministrations = input.projections.length;
  const referenceAt = input.referenceAt ?? new Date().toISOString();

  let responseRecommendedCount = 0;
  let responseOverdueCount = 0;
  let responseDocumentedWithinWindowCount = 0;
  let responseDocumentedLateCount = 0;
  let adverseReactionEscalationCount = 0;
  let multipleResponseCount = 0;

  for (const projection of input.projections) {
    if (projection.responses.length > 1) multipleResponseCount += 1;
    if (resolveMarMedicationResponseAdverseEscalationHint(projection.responses)) {
      adverseReactionEscalationCount += 1;
    }

    const followUp = buildMarMedicationResponseFollowUpSummary({
      medicationLabel: projection.medicationLabel,
      route: projection.route,
      frequencyCode: projection.frequencyCode,
      prnIndication: projection.prnIndication,
      administeredAt: projection.administeredAt,
      responses: projection.responses,
      referenceAt: firstResponseDocumentedAt(projection.responses) ?? referenceAt,
    });
    const firstDocumentedAt = firstResponseDocumentedAt(projection.responses);
    if (firstDocumentedAt && followUp.latestAt) {
      if (new Date(firstDocumentedAt).getTime() <= new Date(followUp.latestAt).getTime()) {
        responseDocumentedWithinWindowCount += 1;
      } else {
        responseDocumentedLateCount += 1;
      }
    }
  }

  const documentedAdministrationIds = new Set(input.projections.map((p) => p.administrationId));
  for (const candidate of input.followUpCandidates ?? []) {
    if (documentedAdministrationIds.has(candidate.administrationId)) continue;
    const status = buildMarMedicationResponseFollowUpSummary({
      ...candidate,
      referenceAt,
    }).status;
    if (status === "RECOMMENDED") responseRecommendedCount += 1;
    if (status === "OVERDUE") responseOverdueCount += 1;
  }

  return {
    responseDocumentedCount: allResponses.length,
    responseRate: rate(documentedAdministrations, input.eligibleAdministrationCount),
    effectiveCount: countByCode(allResponses, "EFFECTIVE"),
    partiallyEffectiveCount: countByCode(allResponses, "PARTIALLY_EFFECTIVE"),
    ineffectiveCount: countByCode(allResponses, "INEFFECTIVE"),
    noAdverseReactionCount: countByCode(allResponses, "NO_ADVERSE_REACTION"),
    adverseReactionCount: countByCode(allResponses, "ADVERSE_REACTION_REPORTED"),
    sedationCount: countByCode(allResponses, "SEDATION_PRESENT"),
    painImprovementAverage: averagePainImprovement(allResponses),
    painReductionAverage: averagePainReduction(allResponses),
    responseRecommendedCount,
    responseOverdueCount,
    responseDocumentedWithinWindowCount,
    responseDocumentedLateCount,
    adverseReactionEscalationCount,
    multipleResponseCount,
  };
}

/** Chronology helper for tests — newest first labels. */
export function formatMarMedicationResponseChronologyLabels(
  responses: ParsedMarMedicationResponse[]
): string[] {
  return sortMarMedicationResponsesNewestFirst(responses).map((r) => r.responseCode);
}
