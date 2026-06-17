/** MEDUI.ED.MAR.H9A — MAR timeline schedule-adjustment visibility projection. */

import type { MarDoseScheduleAdjustmentAuditEntry } from "./marDoseScheduleAdjustment.js";
import { readMarDoseScheduleAdjustmentHistory, resolveOriginalScheduledAtFromDose } from "./marDoseScheduleAdjustment.js";
import type { MarRescheduleRiskSeverity } from "../mar/marRescheduleRiskAssessment.js";

export type MarScheduleAdjustmentTimelineProjection = {
  isRescheduled: boolean;
  originalScheduledAt: string | null;
  currentScheduledAt: string;
  lastChangedAt: string | null;
  lastChangedByDisplay: string | null;
  lastReasonCode: string | null;
  lastReasonDetail: string | null;
  riskSeverity: MarRescheduleRiskSeverity | null;
  reviewRecommended: boolean;
  adjustmentCount: number;
  badgeLabel: "RESCHEDULED" | null;
};

export function buildMarScheduleAdjustmentTimelineProjection(input: {
  scheduledAt: string;
  orderedDoseSnapshotJson?: unknown;
}): MarScheduleAdjustmentTimelineProjection {
  const history = readMarDoseScheduleAdjustmentHistory(input.orderedDoseSnapshotJson);
  const currentScheduledAt = input.scheduledAt;
  const originalScheduledAt = resolveOriginalScheduledAtFromDose({
    scheduledAt: currentScheduledAt,
    orderedDoseSnapshotJson: input.orderedDoseSnapshotJson,
  });
  const last = history.length > 0 ? history[history.length - 1] : null;
  const isRescheduled = history.length > 0;

  return {
    isRescheduled,
    originalScheduledAt: isRescheduled ? originalScheduledAt : null,
    currentScheduledAt,
    lastChangedAt: last?.changedAt ?? null,
    lastChangedByDisplay: last?.changedByDisplay ?? null,
    lastReasonCode: last?.reasonCode ?? null,
    lastReasonDetail: last?.reasonDetail ?? null,
    riskSeverity: (last?.riskSeverity as MarRescheduleRiskSeverity | undefined) ?? null,
    reviewRecommended: last?.reviewRecommended === true,
    adjustmentCount: history.length,
    badgeLabel: isRescheduled ? "RESCHEDULED" : null,
  };
}

export function formatMarScheduleAdjustmentTimelineSecondaryText(
  projection: MarScheduleAdjustmentTimelineProjection
): string | null {
  if (!projection.isRescheduled) return null;
  return projection.badgeLabel;
}
