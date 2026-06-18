/** MEDUI.ED.MAR.H8 — read-only MAR analytics aggregates (no workflow side effects). */

import { MEDICATION_INFUSION_STOP_REASON_CODES } from "../medication/medicationInfusionStopReasonGovernance.js";
import type {
  MarAnalyticsCountBucket,
  MarAnalyticsKpiKey,
  MarAnalyticsKpiValue,
  MarAnalyticsRateMetric,
} from "./marAnalyticsDashboardContracts.js";
import type {
  MarAnalyticsAdministrationProjection,
  MarAnalyticsCorrectionProjection,
  MarAnalyticsInput,
  MarAnalyticsOrderCancelProjection,
} from "./marAnalyticsProjection.js";
import { MAR_ANALYTICS_READ_ONLY } from "./marAnalyticsProjection.js";
import {
  buildMarScheduleRescheduleAnalyticsMetrics,
  type MarScheduleRescheduleAnalyticsMetrics,
} from "./marAnalyticsScheduleReschedule.js";
import {
  buildMarAdministrationVarianceAnalyticsMetrics,
  type MarAdministrationVarianceAnalyticsMetrics,
} from "./marAnalyticsAdministrationVariance.js";
import {
  buildMarTimingOverrideAnalyticsMetrics,
  type MarTimingOverrideAnalyticsMetrics,
} from "./marAnalyticsTimingOverride.js";
import {
  buildMarMedicationResponseAnalyticsMetrics,
  type MarMedicationResponseAnalyticsMetrics,
} from "./marMedicationResponseAnalytics.js";
import {
  buildMarAllergyReviewAnalyticsMetrics,
  type MarAllergyReviewAnalyticsMetrics,
} from "./marAllergyReviewAnalytics.js";

export type MarAnalyticsAggregates = {
  readOnly: typeof MAR_ANALYTICS_READ_ONLY;
  generatedAt: string;
  facilityId: string;
  windowStart: string;
  windowEnd: string;
  kpis: Record<MarAnalyticsKpiKey, MarAnalyticsKpiValue>;
  administrations: MarAdministrationAnalyticsMetrics;
  corrections: MarCorrectionAnalyticsMetrics;
  missedDoses: MarMissedDoseAnalyticsMetrics;
  infusions: MarInfusionAnalyticsMetrics;
  complianceHealth: MarComplianceHealthScore;
  executiveOverview: MarExecutiveOverviewMetrics;
  scheduleReschedules: MarScheduleRescheduleAnalyticsMetrics;
  administrationVariances: MarAdministrationVarianceAnalyticsMetrics;
  timingOverrides: MarTimingOverrideAnalyticsMetrics;
  medicationResponses: MarMedicationResponseAnalyticsMetrics;
  allergyReview: MarAllergyReviewAnalyticsMetrics;
};

export type MarAdministrationAnalyticsMetrics = {
  totalAdministrations: number;
  byRoute: MarAnalyticsCountBucket[];
  byMedicationClass: MarAnalyticsCountBucket[];
  byNurse: MarAnalyticsCountBucket[];
  byProvider: MarAnalyticsCountBucket[];
  byShift: MarAnalyticsCountBucket[];
  byDay: MarAnalyticsCountBucket[];
  byEncounter: MarAnalyticsCountBucket[];
  prnCount: number;
  scheduledCount: number;
};

export type MarCorrectionAnalyticsMetrics = {
  totalCorrections: number;
  correctionRate: MarAnalyticsRateMetric;
  doseCorrections: number;
  routeCorrections: number;
  timeCorrections: number;
  duplicateDocumentation: number;
  chartedNotGiven: number;
  lateDocumentation: number;
  byUser: MarAnalyticsCountBucket[];
  byShift: MarAnalyticsCountBucket[];
  byUnit: MarAnalyticsCountBucket[];
  highFrequencyAlerts: MarAnalyticsCountBucket[];
};

export type MarMissedDoseAnalyticsMetrics = {
  missed: number;
  refused: number;
  notAvailable: number;
  held: number;
  missedDoseRate: MarAnalyticsRateMetric;
  refusalRate: MarAnalyticsRateMetric;
  heldDoseRate: MarAnalyticsRateMetric;
  byMedicationClass: MarAnalyticsCountBucket[];
  byShift: MarAnalyticsCountBucket[];
  byUser: MarAnalyticsCountBucket[];
  byEncounter: MarAnalyticsCountBucket[];
  byDay: MarAnalyticsCountBucket[];
};

export type MarInfusionAnalyticsMetrics = {
  infusionStarts: number;
  infusionStops: number;
  stopReasonDistribution: MarAnalyticsCountBucket[];
  averageDurationMinutes: number | null;
  activeInfusionCount: number;
  ivpbCompletedCount: number;
  ivpbTotalCount: number;
  ivpbCompletionRate: MarAnalyticsRateMetric;
  infusionGovernanceComplianceRate: MarAnalyticsRateMetric;
};

export type MarComplianceHealthScore = {
  score: number;
  missedDoseRate: number;
  correctionRate: number;
  chartedNotGivenRate: number;
  duplicateDocumentationRate: number;
  infusionGovernanceCompliance: number;
  historicalReconstructionAvailability: number;
  auditCompleteness: number;
  inputs: {
    missedDoseWeight: number;
    correctionWeight: number;
    chartedNotGivenWeight: number;
    duplicateWeight: number;
    infusionWeight: number;
    reconstructionWeight: number;
    auditWeight: number;
  };
};

export type MarExecutiveOverviewMetrics = {
  totalAdministrations: number;
  totalCorrections: number;
  totalMissedTerminalEvents: number;
  complianceHealthScore: number;
  canceledOrders: number;
  prnAdministrations: number;
  infusionStarts: number;
  auditReconstructionAvailability: number;
};

function rate(numerator: number, denominator: number): MarAnalyticsRateMetric {
  const safeDenom = denominator > 0 ? denominator : 0;
  return {
    numerator,
    denominator: safeDenom,
    rate: safeDenom === 0 ? 0 : numerator / safeDenom,
  };
}

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function countBy<T>(
  items: T[],
  keyFn: (item: T) => string | null | undefined
): MarAnalyticsCountBucket[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item)?.trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toISOString().slice(0, 10);
}

function isAdministeredEvent(row: MarAnalyticsAdministrationProjection): boolean {
  return row.eventType === "ADMINISTERED" || row.eventType === "PRN_ADMINISTERED";
}

function terminalMissedType(row: MarAnalyticsAdministrationProjection): "MISSED" | "REFUSED" | "HELD" | "NOT_AVAILABLE" | null {
  if (row.eventType === "MISSED") return "MISSED";
  if (row.eventType === "REFUSED") return "REFUSED";
  if (row.eventType === "HELD") return "HELD";
  if (row.eventType === "NOT_AVAILABLE") return "NOT_AVAILABLE";
  return null;
}

export function buildMarAdministrationMetrics(
  input: MarAnalyticsInput
): MarAdministrationAnalyticsMetrics {
  const administered = input.administrations.filter(isAdministeredEvent);
  const prnCount = administered.filter((r) => r.isPrn || r.eventType === "PRN_ADMINISTERED").length;
  const scheduledCount = input.scheduledAdministrationCount ?? administered.length - prnCount;

  return {
    totalAdministrations: administered.length,
    byRoute: countBy(administered, (r) => r.route ?? "unknown"),
    byMedicationClass: countBy(administered, (r) => r.medicationTherapeuticClass ?? "unknown"),
    byNurse: countBy(administered, (r) =>
      r.performedByRole === "RN" || r.performedByRole === "PROVIDER"
        ? r.performedByUserId
        : r.performedByUserId
    ),
    byProvider: countBy(administered, (r) => r.orderingProviderUserId),
    byShift: countBy(administered, (r) => r.shiftCode),
    byDay: countBy(administered, (r) => dayKey(r.eventAt)),
    byEncounter: countBy(administered, (r) => r.encounterId),
    prnCount,
    scheduledCount: Math.max(0, scheduledCount),
  };
}

export function buildMarCorrectionMetrics(input: MarAnalyticsInput): MarCorrectionAnalyticsMetrics {
  const corrections = input.corrections;
  const administeredCount = input.administrations.filter(isAdministeredEvent).length;
  const reason = (code: string) =>
    corrections.filter((c) => (c.reasonCode ?? "").toUpperCase() === code).length;

  const byUser = countBy(corrections, (c) => c.correctedByUserId);
  const highFrequencyAlerts = byUser.filter((b) => b.count >= 3);

  return {
    totalCorrections: corrections.length,
    correctionRate: rate(corrections.length, administeredCount),
    doseCorrections: reason("DOCUMENTED_WRONG_DOSE"),
    routeCorrections: reason("DOCUMENTED_WRONG_ROUTE"),
    timeCorrections: reason("DOCUMENTED_WRONG_TIME"),
    duplicateDocumentation: reason("DUPLICATE_ENTRY"),
    chartedNotGiven: reason("DOCUMENTED_NOT_GIVEN"),
    lateDocumentation: reason("LATE_DOCUMENTATION"),
    byUser,
    byShift: countBy(corrections, (c) => c.shiftCode),
    byUnit: countBy(corrections, (c) => c.unitId),
    highFrequencyAlerts,
  };
}

export function buildMarMissedDoseMetrics(input: MarAnalyticsInput): MarMissedDoseAnalyticsMetrics {
  const terminal = input.administrations.filter((r) => terminalMissedType(r) != null);
  const missed = terminal.filter((r) => r.eventType === "MISSED").length;
  const refused = terminal.filter((r) => r.eventType === "REFUSED").length;
  const held = terminal.filter((r) => r.eventType === "HELD").length;
  const notAvailable = terminal.filter((r) => r.eventType === "NOT_AVAILABLE").length;
  const denominator =
    input.scheduledAdministrationCount ??
    input.administrations.filter(isAdministeredEvent).length + terminal.length;

  return {
    missed,
    refused,
    notAvailable,
    held,
    missedDoseRate: rate(missed, denominator),
    refusalRate: rate(refused, denominator),
    heldDoseRate: rate(held, denominator),
    byMedicationClass: countBy(terminal, (r) => r.medicationTherapeuticClass),
    byShift: countBy(terminal, (r) => r.shiftCode),
    byUser: countBy(terminal, (r) => r.performedByUserId),
    byEncounter: countBy(terminal, (r) => r.encounterId),
    byDay: countBy(terminal, (r) => dayKey(r.eventAt)),
  };
}

export function buildMarInfusionMetrics(input: MarAnalyticsInput): MarInfusionAnalyticsMetrics {
  const starts = input.administrations.filter(
    (r) => r.eventType === "INFUSION_START" || r.infusionPhase === "INFUSION_START"
  );
  const stops = input.administrations.filter(
    (r) => r.eventType === "INFUSION_STOP" || r.infusionPhase === "INFUSION_STOP"
  );

  const stopReasonDistribution: MarAnalyticsCountBucket[] = MEDICATION_INFUSION_STOP_REASON_CODES.map(
    (code) => ({
      key: code,
      count: stops.filter(
        (s) => (s.infusionStopReasonCode ?? "").toUpperCase() === code
      ).length,
    })
  );

  const durations = stops
    .map((s) => s.infusionDurationMinutes)
    .filter((d): d is number => typeof d === "number" && Number.isFinite(d));
  const averageDurationMinutes =
    durations.length === 0
      ? null
      : Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;

  const ivpbRows = input.administrations.filter((r) => r.isIvpb);
  const ivpbCompletedCount = ivpbRows.filter((r) => r.ivpbCompleted).length;
  const stopsWithReason = stops.filter((s) => Boolean(s.infusionStopReasonCode?.trim())).length;

  return {
    infusionStarts: starts.length,
    infusionStops: stops.length,
    stopReasonDistribution,
    averageDurationMinutes,
    activeInfusionCount: input.activeInfusionCount ?? Math.max(0, starts.length - stops.length),
    ivpbCompletedCount,
    ivpbTotalCount: ivpbRows.length,
    ivpbCompletionRate: rate(ivpbCompletedCount, ivpbRows.length),
    infusionGovernanceComplianceRate: rate(stopsWithReason, stops.length),
  };
}

export function buildMarComplianceHealth(input: MarAnalyticsInput): MarComplianceHealthScore {
  const missed = buildMarMissedDoseMetrics(input);
  const corrections = buildMarCorrectionMetrics(input);
  const infusions = buildMarInfusionMetrics(input);
  const administered = input.administrations.filter(isAdministeredEvent);
  const reconstructionAvailable = administered.filter((r) => r.reconstructionAvailable !== false).length;
  const auditComplete = administered.length + input.corrections.length;

  const missedDoseRate = missed.missedDoseRate.rate;
  const correctionRate = corrections.correctionRate.rate;
  const chartedNotGivenRate = rate(
    corrections.chartedNotGiven,
    Math.max(1, administered.length)
  ).rate;
  const duplicateRate = rate(
    corrections.duplicateDocumentation,
    Math.max(1, administered.length)
  ).rate;
  const infusionCompliance = infusions.infusionGovernanceComplianceRate.rate;
  const reconstructionAvailability = rate(reconstructionAvailable, Math.max(1, administered.length)).rate;
  const auditCompleteness = rate(
    input.corrections.filter((c) => Boolean(c.reasonCode?.trim())).length +
      administered.filter((r) => Boolean(r.performedByUserId?.trim())).length,
    Math.max(1, auditComplete)
  ).rate;

  const weights = {
    missedDoseWeight: 0.2,
    correctionWeight: 0.15,
    chartedNotGivenWeight: 0.15,
    duplicateWeight: 0.1,
    infusionWeight: 0.15,
    reconstructionWeight: 0.15,
    auditWeight: 0.1,
  };

  const penalty =
    missedDoseRate * weights.missedDoseWeight +
    correctionRate * weights.correctionWeight +
    chartedNotGivenRate * weights.chartedNotGivenWeight +
    duplicateRate * weights.duplicateWeight +
    (1 - infusionCompliance) * weights.infusionWeight +
    (1 - reconstructionAvailability) * weights.reconstructionWeight +
    (1 - auditCompleteness) * weights.auditWeight;

  const score = Math.max(0, Math.min(100, Math.round((1 - penalty) * 100)));

  return {
    score,
    missedDoseRate: roundRate(missedDoseRate),
    correctionRate: roundRate(correctionRate),
    chartedNotGivenRate: roundRate(chartedNotGivenRate),
    duplicateDocumentationRate: roundRate(duplicateRate),
    infusionGovernanceCompliance: roundRate(infusionCompliance),
    historicalReconstructionAvailability: roundRate(reconstructionAvailability),
    auditCompleteness: roundRate(auditCompleteness),
    inputs: weights,
  };
}

export function buildMarExecutiveOverview(input: MarAnalyticsInput): MarExecutiveOverviewMetrics {
  const administrations = buildMarAdministrationMetrics(input);
  const corrections = buildMarCorrectionMetrics(input);
  const missed = buildMarMissedDoseMetrics(input);
  const infusions = buildMarInfusionMetrics(input);
  const compliance = buildMarComplianceHealth(input);
  const administered = input.administrations.filter(isAdministeredEvent);
  const reconstructionAvailable = administered.filter((r) => r.reconstructionAvailable !== false).length;

  return {
    totalAdministrations: administrations.totalAdministrations,
    totalCorrections: corrections.totalCorrections,
    totalMissedTerminalEvents: missed.missed + missed.refused + missed.held + missed.notAvailable,
    complianceHealthScore: compliance.score,
    canceledOrders: input.orderCancellations.length,
    prnAdministrations: administrations.prnCount,
    infusionStarts: infusions.infusionStarts,
    auditReconstructionAvailability: roundRate(
      rate(reconstructionAvailable, Math.max(1, administered.length)).rate
    ),
  };
}

function buildKpiRecord(
  input: MarAnalyticsInput,
  administrations: MarAdministrationAnalyticsMetrics,
  corrections: MarCorrectionAnalyticsMetrics,
  missed: MarMissedDoseAnalyticsMetrics,
  infusions: MarInfusionAnalyticsMetrics,
  compliance: MarComplianceHealthScore,
  executive: MarExecutiveOverviewMetrics,
  scheduleReschedules: MarScheduleRescheduleAnalyticsMetrics,
  administrationVariances: MarAdministrationVarianceAnalyticsMetrics
): Record<MarAnalyticsKpiKey, MarAnalyticsKpiValue> {
  const infusionStarts = infusions.infusionStarts;
  const infusionStops = infusions.infusionStops;

  return {
    medication_administrations: { key: "medication_administrations", count: administrations.totalAdministrations },
    scheduled_administrations: { key: "scheduled_administrations", count: administrations.scheduledCount },
    prn_administrations: { key: "prn_administrations", count: administrations.prnCount },
    infusion_starts: { key: "infusion_starts", count: infusionStarts },
    infusion_stops: { key: "infusion_stops", count: infusionStops },
    corrections: { key: "corrections", count: corrections.totalCorrections, rate: corrections.correctionRate },
    missed_doses: { key: "missed_doses", count: missed.missed },
    refused_doses: { key: "refused_doses", count: missed.refused },
    held_doses: { key: "held_doses", count: missed.held },
    not_available_doses: { key: "not_available_doses", count: missed.notAvailable },
    canceled_orders: { key: "canceled_orders", count: input.orderCancellations.length },
    duplicate_documentation_corrections: {
      key: "duplicate_documentation_corrections",
      count: corrections.duplicateDocumentation,
    },
    charted_not_given_corrections: {
      key: "charted_not_given_corrections",
      count: corrections.chartedNotGiven,
    },
    late_documentation_corrections: {
      key: "late_documentation_corrections",
      count: corrections.lateDocumentation,
    },
    correction_rate: { key: "correction_rate", rate: corrections.correctionRate },
    missed_dose_rate: { key: "missed_dose_rate", rate: missed.missedDoseRate },
    refusal_rate: { key: "refusal_rate", rate: missed.refusalRate },
    held_dose_rate: { key: "held_dose_rate", rate: missed.heldDoseRate },
    compliance_health_score: { key: "compliance_health_score", score: compliance.score },
    audit_reconstruction_availability: {
      key: "audit_reconstruction_availability",
      score: executive.auditReconstructionAvailability,
    },
    rescheduled_doses: {
      key: "rescheduled_doses",
      count: scheduleReschedules.rescheduledDoseCount,
    },
    early_reschedules: {
      key: "early_reschedules",
      count: scheduleReschedules.earlyRescheduleCount,
    },
    late_reschedules: {
      key: "late_reschedules",
      count: scheduleReschedules.lateRescheduleCount,
    },
    high_risk_reschedules: {
      key: "high_risk_reschedules",
      count: scheduleReschedules.highRiskRescheduleCount,
    },
    reschedule_rate: {
      key: "reschedule_rate",
      rate: scheduleReschedules.rescheduleRate,
    },
    on_time_administrations: {
      key: "on_time_administrations",
      count: administrationVariances.onTimeAdministrationCount,
    },
    early_administrations: {
      key: "early_administrations",
      count: administrationVariances.earlyAdministrationCount,
    },
    late_administrations: {
      key: "late_administrations",
      count: administrationVariances.lateAdministrationCount,
    },
    high_variance_administrations: {
      key: "high_variance_administrations",
      count: administrationVariances.highVarianceCount,
    },
    on_time_administration_rate: {
      key: "on_time_administration_rate",
      rate: administrationVariances.onTimeRate,
    },
    early_administration_rate: {
      key: "early_administration_rate",
      rate: administrationVariances.earlyRate,
    },
    late_administration_rate: {
      key: "late_administration_rate",
      rate: administrationVariances.lateRate,
    },
  };
}

export function buildMarAnalyticsAggregates(input: MarAnalyticsInput): MarAnalyticsAggregates {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const administrations = buildMarAdministrationMetrics(input);
  const corrections = buildMarCorrectionMetrics(input);
  const missedDoses = buildMarMissedDoseMetrics(input);
  const infusions = buildMarInfusionMetrics(input);
  const complianceHealth = buildMarComplianceHealth(input);
  const executiveOverview = buildMarExecutiveOverview(input);
  const scheduleReschedules = buildMarScheduleRescheduleAnalyticsMetrics({
    reschedules: input.scheduleReschedules ?? [],
    scheduledDoseCount:
      input.scheduledAdministrationCount ?? administrations.scheduledCount,
  });
  const administrationVariances = buildMarAdministrationVarianceAnalyticsMetrics({
    variances: input.administrationVariances ?? [],
    scheduledAdministrationCount:
      input.scheduledAdministrationCount ?? administrations.scheduledCount,
  });
  const timingOverrides = buildMarTimingOverrideAnalyticsMetrics({
    overrides: input.timingOverrides ?? [],
  });
  const medicationResponses = buildMarMedicationResponseAnalyticsMetrics({
    eligibleAdministrationCount: administrations.totalAdministrations,
    projections: input.medicationResponses ?? [],
  });
  const allergyReview = buildMarAllergyReviewAnalyticsMetrics({
    administrations: (input.allergyReviewAdministrations ?? []).map((row) => ({
      id: row.id,
      notes: row.notes,
      medicationLabel: row.medicationLabel,
    })),
    dismissedCandidateIds: input.dismissedAllergyCandidateIds,
  });

  return {
    readOnly: MAR_ANALYTICS_READ_ONLY,
    generatedAt,
    facilityId: input.facilityId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    kpis: buildKpiRecord(
      input,
      administrations,
      corrections,
      missedDoses,
      infusions,
      complianceHealth,
      executiveOverview,
      scheduleReschedules,
      administrationVariances
    ),
    administrations,
    corrections,
    missedDoses,
    infusions,
    complianceHealth,
    executiveOverview,
    scheduleReschedules,
    administrationVariances,
    timingOverrides,
    medicationResponses,
    allergyReview,
  };
}

/** Project history-normalized rows into analytics input without mutating source data. */
export function projectMarAnalyticsInputFromSnapshots(input: {
  facilityId: string;
  windowStart: string;
  windowEnd: string;
  generatedAt?: string;
  scheduledAdministrationCount?: number;
  activeInfusionCount?: number;
  administrations: MarAnalyticsAdministrationProjection[];
  corrections: MarAnalyticsCorrectionProjection[];
  orderCancellations: MarAnalyticsOrderCancelProjection[];
  scheduleReschedules?: import("./marAnalyticsScheduleReschedule.js").MarAnalyticsScheduleRescheduleProjection[];
  administrationVariances?: import("./marAnalyticsAdministrationVariance.js").MarAnalyticsAdministrationVarianceProjection[];
  timingOverrides?: import("./marAnalyticsTimingOverride.js").MarAnalyticsTimingOverrideProjection[];
  medicationResponses?: import("./marMedicationResponseAnalytics.js").MarMedicationResponseAnalyticsProjection[];
  allergyReviewAdministrations?: Array<{
    id: string;
    notes?: string | null;
    medicationLabel?: string | null;
  }>;
  dismissedAllergyCandidateIds?: string[];
}): MarAnalyticsInput {
  return {
    facilityId: input.facilityId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    generatedAt: input.generatedAt,
    scheduledAdministrationCount: input.scheduledAdministrationCount,
    activeInfusionCount: input.activeInfusionCount,
    administrations: [...input.administrations],
    corrections: [...input.corrections],
    orderCancellations: [...input.orderCancellations],
    scheduleReschedules: input.scheduleReschedules ? [...input.scheduleReschedules] : undefined,
    administrationVariances: input.administrationVariances
      ? [...input.administrationVariances]
      : undefined,
    timingOverrides: input.timingOverrides ? [...input.timingOverrides] : undefined,
    medicationResponses: input.medicationResponses ? [...input.medicationResponses] : undefined,
    allergyReviewAdministrations: input.allergyReviewAdministrations
      ? [...input.allergyReviewAdministrations]
      : undefined,
    dismissedAllergyCandidateIds: input.dismissedAllergyCandidateIds
      ? [...input.dismissedAllergyCandidateIds]
      : undefined,
  };
}
