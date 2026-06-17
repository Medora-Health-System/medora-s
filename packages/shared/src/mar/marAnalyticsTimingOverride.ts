/** MEDUI.ED.MAR.H9C — timing override analytics projection (read-only). */

import type { MarAnalyticsCountBucket } from "./marAnalyticsDashboardContracts.js";
import type { MarMedicationTimingOverrideKind } from "./marMedicationTimingOverrideGovernance.js";
import { normalizeMarMedicationTimingOverrideReasonCode } from "./marMedicationTimingOverrideGovernance.js";

export type MarAnalyticsTimingOverrideProjection = {
  id: string;
  facilityId: string;
  encounterId: string;
  overrideKind: MarMedicationTimingOverrideKind;
  reasonCode: string;
  canonicalReasonCode: string;
  reasonDetail?: string | null;
  movedMinutes: number;
  reviewRecommended: boolean;
  performedByUserId?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
  eventAt: string;
  sourceId: string;
};

export type MarTimingOverrideAnalyticsMetrics = {
  earlyByReason: MarAnalyticsCountBucket[];
  lateByReason: MarAnalyticsCountBucket[];
  rescheduleByReason: MarAnalyticsCountBucket[];
  highRiskOverrides: number;
  topOverrideReasons: MarAnalyticsCountBucket[];
  byNurse: MarAnalyticsCountBucket[];
  byShift: MarAnalyticsCountBucket[];
  byFacility: MarAnalyticsCountBucket[];
  byUnit: MarAnalyticsCountBucket[];
};

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

export function buildMarAnalyticsTimingOverrideProjection(input: {
  facilityId: string;
  encounterId: string;
  overrideKind: MarMedicationTimingOverrideKind;
  reasonCode: string;
  reasonDetail?: string | null;
  movedMinutes: number;
  reviewRecommended: boolean;
  performedByUserId?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
  eventAt: string;
  sourceId: string;
}): MarAnalyticsTimingOverrideProjection {
  const canonical =
    normalizeMarMedicationTimingOverrideReasonCode(input.reasonCode) ?? "OTHER";
  return {
    id: `timing-override:${input.sourceId}:${input.eventAt}`,
    facilityId: input.facilityId,
    encounterId: input.encounterId,
    overrideKind: input.overrideKind,
    reasonCode: input.reasonCode.trim().toUpperCase(),
    canonicalReasonCode: canonical,
    reasonDetail: input.reasonDetail?.trim() || null,
    movedMinutes: input.movedMinutes,
    reviewRecommended: input.reviewRecommended,
    performedByUserId: input.performedByUserId ?? null,
    shiftCode: input.shiftCode ?? null,
    unitId: input.unitId ?? null,
    eventAt: input.eventAt,
    sourceId: input.sourceId,
  };
}

export function buildMarTimingOverrideAnalyticsMetrics(input: {
  overrides: MarAnalyticsTimingOverrideProjection[];
}): MarTimingOverrideAnalyticsMetrics {
  const overrides = input.overrides;
  const early = overrides.filter((o) => o.overrideKind === "EARLY_ADMINISTRATION");
  const late = overrides.filter((o) => o.overrideKind === "LATE_ADMINISTRATION");
  const reschedule = overrides.filter((o) => o.overrideKind === "SCHEDULE_CHANGE");
  const highRisk = overrides.filter((o) => o.reviewRecommended).length;

  const allReasons = countBy(overrides, (o) => o.canonicalReasonCode);

  return {
    earlyByReason: countBy(early, (o) => o.canonicalReasonCode),
    lateByReason: countBy(late, (o) => o.canonicalReasonCode),
    rescheduleByReason: countBy(reschedule, (o) => o.canonicalReasonCode),
    highRiskOverrides: highRisk,
    topOverrideReasons: allReasons.slice(0, 10),
    byNurse: countBy(overrides, (o) => o.performedByUserId),
    byShift: countBy(overrides, (o) => o.shiftCode),
    byFacility: countBy(overrides, (o) => o.facilityId),
    byUnit: countBy(overrides, (o) => o.unitId),
  };
}
