/** MEDUI.ED.MAR.H9A — read-only schedule adjustment chain viewer model. */

import type { MarDoseScheduleAdjustmentAuditEntry } from "./marDoseScheduleAdjustment.js";
import {
  readMarDoseScheduleAdjustmentHistory,
  resolveOriginalScheduledAtFromDose,
} from "./marDoseScheduleAdjustment.js";

export type MarScheduleAdjustmentChainStepKind =
  | "ORIGINAL_SCHEDULED"
  | "RESCHEDULED"
  | "ADMINISTERED";

export type MarScheduleAdjustmentChainStep = {
  kind: MarScheduleAdjustmentChainStepKind;
  atIso: string;
  label: string;
  reasonCode?: string | null;
  reasonDetail?: string | null;
  changedByDisplay?: string | null;
  riskSeverity?: string | null;
  reviewRecommended?: boolean;
};

export function buildMarScheduleAdjustmentChain(input: {
  scheduledAt: string;
  orderedDoseSnapshotJson?: unknown;
  administeredAt?: string | null;
}): MarScheduleAdjustmentChainStep[] {
  const history = readMarDoseScheduleAdjustmentHistory(input.orderedDoseSnapshotJson);
  const originalScheduledAt = resolveOriginalScheduledAtFromDose({
    scheduledAt: input.scheduledAt,
    orderedDoseSnapshotJson: input.orderedDoseSnapshotJson,
  });

  const steps: MarScheduleAdjustmentChainStep[] = [];

  if (history.length === 0) {
    steps.push({
      kind: "ORIGINAL_SCHEDULED",
      atIso: originalScheduledAt,
      label: originalScheduledAt,
    });
  } else {
    steps.push({
      kind: "ORIGINAL_SCHEDULED",
      atIso: originalScheduledAt,
      label: originalScheduledAt,
    });

    for (const entry of history) {
      steps.push(mapAuditEntryToChainStep(entry));
    }
  }

  if (input.administeredAt?.trim()) {
    steps.push({
      kind: "ADMINISTERED",
      atIso: input.administeredAt.trim(),
      label: input.administeredAt.trim(),
    });
  }

  return steps;
}

function mapAuditEntryToChainStep(
  entry: MarDoseScheduleAdjustmentAuditEntry
): MarScheduleAdjustmentChainStep {
  return {
    kind: "RESCHEDULED",
    atIso: entry.newScheduledAt,
    label: entry.newScheduledAt,
    reasonCode: entry.reasonCode,
    reasonDetail: entry.reasonDetail,
    changedByDisplay: entry.changedByDisplay,
    riskSeverity: entry.riskSeverity ?? null,
    reviewRecommended: entry.reviewRecommended ?? false,
  };
}
