/** MEDUI.ED.MAR.H9L — medication response analytics projection (read-only). */

import {
  parseMarMedicationResponseNotes,
  type MarMedicationResponseCode,
  type ParsedMarMedicationResponse,
} from "./marMedicationResponseGovernance.js";
import type { MarAnalyticsRateMetric } from "./marAnalyticsDashboardContracts.js";

export type MarMedicationResponseAnalyticsProjection = {
  administrationId: string;
  encounterId: string;
  facilityId: string;
  eventAt: string;
  responses: ParsedMarMedicationResponse[];
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

export function buildMarMedicationResponseAnalyticsProjection(input: {
  administrationId: string;
  encounterId: string;
  facilityId: string;
  eventAt: string;
  notes?: string | null;
}): MarMedicationResponseAnalyticsProjection | null {
  const responses = parseMarMedicationResponseNotes(input.notes);
  if (responses.length === 0) return null;
  return {
    administrationId: input.administrationId,
    encounterId: input.encounterId,
    facilityId: input.facilityId,
    eventAt: input.eventAt,
    responses,
  };
}

export function buildMarMedicationResponseAnalyticsMetrics(input: {
  eligibleAdministrationCount: number;
  projections: MarMedicationResponseAnalyticsProjection[];
}): MarMedicationResponseAnalyticsMetrics {
  const allResponses = input.projections.flatMap((p) => p.responses);
  const documentedAdministrations = input.projections.length;

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
  };
}
