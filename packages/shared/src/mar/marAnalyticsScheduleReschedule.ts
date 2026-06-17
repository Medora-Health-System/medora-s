/** MEDUI.ED.MAR.H9A — MAR schedule reschedule analytics projection (read-only). */

import type { MarAnalyticsCountBucket, MarAnalyticsRateMetric } from "./marAnalyticsDashboardContracts.js";
import type { MarRescheduleRiskSeverity } from "./marRescheduleRiskAssessment.js";
import { assessMarRescheduleRisk } from "./marRescheduleRiskAssessment.js";

export type MarAnalyticsScheduleRescheduleProjection = {
  id: string;
  facilityId: string;
  encounterId: string;
  medicationDoseInstanceId: string;
  orderItemId: string | null;
  changedAt: string;
  changedByUserId: string;
  originalScheduledAt: string;
  previousScheduledAt: string;
  newScheduledAt: string;
  movedMinutes: number;
  direction: "EARLY" | "LATE" | "UNCHANGED";
  riskSeverity: MarRescheduleRiskSeverity;
  reviewRecommended: boolean;
  shiftCode?: string | null;
  unitId?: string | null;
  reasonCode?: string | null;
};

export type MarScheduleRescheduleAnalyticsMetrics = {
  rescheduledDoseCount: number;
  earlyRescheduleCount: number;
  lateRescheduleCount: number;
  highRiskRescheduleCount: number;
  rescheduleRate: MarAnalyticsRateMetric;
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

export function buildMarAnalyticsScheduleRescheduleProjection(input: {
  facilityId: string;
  encounterId: string;
  medicationDoseInstanceId: string;
  orderItemId: string | null;
  changedAt: string;
  changedByUserId: string;
  originalScheduledAt: string;
  previousScheduledAt: string;
  newScheduledAt: string;
  reasonCode?: string | null;
  riskSeverity?: MarRescheduleRiskSeverity | null;
  reviewRecommended?: boolean;
  facilityTimeZone?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
}): MarAnalyticsScheduleRescheduleProjection {
  const risk =
    input.riskSeverity != null
      ? {
          severity: input.riskSeverity,
          movedMinutes: assessMarRescheduleRisk({
            previousScheduledAt: input.previousScheduledAt,
            newScheduledAt: input.newScheduledAt,
            facilityTimeZone: input.facilityTimeZone,
          }).movedMinutes,
          reviewRecommended: input.reviewRecommended === true,
        }
      : assessMarRescheduleRisk({
          previousScheduledAt: input.previousScheduledAt,
          newScheduledAt: input.newScheduledAt,
          facilityTimeZone: input.facilityTimeZone,
        });

  const prevMs = new Date(input.previousScheduledAt).getTime();
  const nextMs = new Date(input.newScheduledAt).getTime();
  let direction: "EARLY" | "LATE" | "UNCHANGED" = "UNCHANGED";
  if (!Number.isNaN(prevMs) && !Number.isNaN(nextMs)) {
    if (nextMs < prevMs) direction = "EARLY";
    else if (nextMs > prevMs) direction = "LATE";
  }

  return {
    id: `reschedule:${input.medicationDoseInstanceId}:${input.changedAt}`,
    facilityId: input.facilityId,
    encounterId: input.encounterId,
    medicationDoseInstanceId: input.medicationDoseInstanceId,
    orderItemId: input.orderItemId,
    changedAt: input.changedAt,
    changedByUserId: input.changedByUserId,
    originalScheduledAt: input.originalScheduledAt,
    previousScheduledAt: input.previousScheduledAt,
    newScheduledAt: input.newScheduledAt,
    movedMinutes: risk.movedMinutes,
    direction,
    riskSeverity: risk.severity,
    reviewRecommended: input.reviewRecommended ?? risk.reviewRecommended,
    shiftCode: input.shiftCode ?? null,
    unitId: input.unitId ?? null,
    reasonCode: input.reasonCode?.trim().toUpperCase() ?? null,
  };
}

export function buildMarScheduleRescheduleAnalyticsMetrics(input: {
  reschedules: MarAnalyticsScheduleRescheduleProjection[];
  scheduledDoseCount: number;
}): MarScheduleRescheduleAnalyticsMetrics {
  const uniqueDoseIds = new Set(input.reschedules.map((r) => r.medicationDoseInstanceId));
  const early = input.reschedules.filter((r) => r.direction === "EARLY").length;
  const late = input.reschedules.filter((r) => r.direction === "LATE").length;
  const highRisk = input.reschedules.filter((r) => r.riskSeverity === "HIGH").length;

  return {
    rescheduledDoseCount: uniqueDoseIds.size,
    earlyRescheduleCount: early,
    lateRescheduleCount: late,
    highRiskRescheduleCount: highRisk,
    rescheduleRate: rate(uniqueDoseIds.size, input.scheduledDoseCount),
    byNurse: countBy(input.reschedules, (r) => r.changedByUserId),
    byShift: countBy(input.reschedules, (r) => r.shiftCode),
    byFacility: countBy(input.reschedules, (r) => r.facilityId),
    byUnit: countBy(input.reschedules, (r) => r.unitId),
  };
}
