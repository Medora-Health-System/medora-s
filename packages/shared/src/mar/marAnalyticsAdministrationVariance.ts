/** MEDUI.ED.MAR.H9B — MAR administration variance analytics projection (read-only). */

import type { MarAnalyticsCountBucket, MarAnalyticsRateMetric } from "./marAnalyticsDashboardContracts.js";
import type {
  MarAdministrationVarianceClassification,
  MarAdministrationVarianceSeverity,
} from "./marAdministrationVarianceGovernance.js";

export type MarAnalyticsAdministrationVarianceProjection = {
  id: string;
  facilityId: string;
  encounterId: string;
  medicationAdministrationId: string;
  medicationDoseInstanceId: string | null;
  orderItemId: string | null;
  administeredAt: string;
  effectiveScheduledAt: string;
  classification: MarAdministrationVarianceClassification;
  varianceMinutes: number;
  severity: MarAdministrationVarianceSeverity;
  reviewRecommended: boolean;
  performedByUserId?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
  reasonCode?: string | null;
};

export type MarAdministrationVarianceAnalyticsMetrics = {
  onTimeAdministrationCount: number;
  earlyAdministrationCount: number;
  lateAdministrationCount: number;
  onTimeRate: MarAnalyticsRateMetric;
  earlyRate: MarAnalyticsRateMetric;
  lateRate: MarAnalyticsRateMetric;
  highVarianceCount: number;
  byNurse: MarAnalyticsCountBucket[];
  byShift: MarAnalyticsCountBucket[];
  byFacility: MarAnalyticsCountBucket[];
  byUnit: MarAnalyticsCountBucket[];
};

function rate(numerator: number, denominator: number): MarAnalyticsRateMetric {
  const safeDenom = denominator > 0 ? denominator : 0;
  return {
    numerator,
    denominator: safeDenom,
    rate: safeDenom === 0 ? 0 : numerator / safeDenom,
  };
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

export function buildMarAnalyticsAdministrationVarianceProjection(input: {
  facilityId: string;
  encounterId: string;
  medicationAdministrationId: string;
  medicationDoseInstanceId: string | null;
  orderItemId: string | null;
  administeredAt: string;
  effectiveScheduledAt: string;
  classification: MarAdministrationVarianceClassification;
  varianceMinutes: number;
  severity: MarAdministrationVarianceSeverity;
  reviewRecommended: boolean;
  performedByUserId?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
  reasonCode?: string | null;
}): MarAnalyticsAdministrationVarianceProjection {
  return {
    id: `variance:${input.medicationAdministrationId}`,
    facilityId: input.facilityId,
    encounterId: input.encounterId,
    medicationAdministrationId: input.medicationAdministrationId,
    medicationDoseInstanceId: input.medicationDoseInstanceId,
    orderItemId: input.orderItemId,
    administeredAt: input.administeredAt,
    effectiveScheduledAt: input.effectiveScheduledAt,
    classification: input.classification,
    varianceMinutes: input.varianceMinutes,
    severity: input.severity,
    reviewRecommended: input.reviewRecommended,
    performedByUserId: input.performedByUserId ?? null,
    shiftCode: input.shiftCode ?? null,
    unitId: input.unitId ?? null,
    reasonCode: input.reasonCode?.trim().toUpperCase() ?? null,
  };
}

export function buildMarAdministrationVarianceAnalyticsMetrics(input: {
  variances: MarAnalyticsAdministrationVarianceProjection[];
  scheduledAdministrationCount: number;
}): MarAdministrationVarianceAnalyticsMetrics {
  const onTime = input.variances.filter(
    (v) => v.classification === "ON_TIME_ADMINISTRATION"
  ).length;
  const early = input.variances.filter(
    (v) => v.classification === "EARLY_ADMINISTRATION"
  ).length;
  const late = input.variances.filter((v) => v.classification === "LATE_ADMINISTRATION").length;
  const total = input.variances.length;
  const denom = input.scheduledAdministrationCount > 0 ? input.scheduledAdministrationCount : total;
  const highVariance = input.variances.filter((v) => v.severity === "HIGH").length;

  return {
    onTimeAdministrationCount: onTime,
    earlyAdministrationCount: early,
    lateAdministrationCount: late,
    onTimeRate: rate(onTime, denom),
    earlyRate: rate(early, denom),
    lateRate: rate(late, denom),
    highVarianceCount: highVariance,
    byNurse: countBy(input.variances, (v) => v.performedByUserId),
    byShift: countBy(input.variances, (v) => v.shiftCode),
    byFacility: countBy(input.variances, (v) => v.facilityId),
    byUnit: countBy(input.variances, (v) => v.unitId),
  };
}
