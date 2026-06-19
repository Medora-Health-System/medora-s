import type { MedicationFrequencySnapshotJson } from "./medicationOrderScheduleSnapshot.js";
import {
  DEFAULT_EARLY_TOLERANCE_MINUTES,
  DEFAULT_LATE_TOLERANCE_MINUTES,
  DEFAULT_OVERDUE_GRACE_MINUTES,
} from "./medicationDosePassWindowDefaults.js";
import { assessMarRescheduleRisk } from "../mar/marRescheduleRiskAssessment.js";
import type { MarRescheduleRiskSeverity } from "../mar/marRescheduleRiskAssessment.js";
import { isTerminalMedicationDoseStatus, parseMedicationDoseStatus } from "./medicationDoseStatus.js";

export const MAR_DOSE_SCHEDULE_ADJUSTMENT_HISTORY_KEY = "_marScheduleAdjustmentHistory";

export type MarDoseScheduleAdjustmentAuditEntry = {
  originalScheduledAt: string;
  previousScheduledAt: string;
  newScheduledAt: string;
  originalDueWindowStartAt: string;
  originalDueWindowEndAt: string;
  newDueWindowStartAt: string;
  newDueWindowEndAt: string;
  reasonCode: string;
  reasonDetail: string | null;
  changedByUserId: string;
  changedByDisplay: string | null;
  changedAt: string;
  riskSeverity: MarRescheduleRiskSeverity;
  reviewRecommended: boolean;
};

export type MarDoseScheduleAdjustmentInput = {
  doseStatus: string;
  terminalMedicationAdministrationId?: string | null;
  originalScheduledAt: Date | string;
  previousScheduledAt: Date | string;
  newScheduledAt: Date | string;
  reasonCode: string;
  reasonDetail?: string | null;
  changedByUserId: string;
  changedByDisplay?: string | null;
  changedAt?: Date | string;
  facilityTimeZone?: string | null;
  frequencySnapshotJson?: unknown;
};

export function computeMedicationDoseDueWindowsForScheduledAt(
  scheduledAt: Date,
  _frequencySnapshotJson?: MedicationFrequencySnapshotJson | null
): {
  dueWindowStartAt: Date;
  dueWindowEndAt: Date;
  overdueAt: Date;
} {
  const dueWindowStartAt = new Date(
    scheduledAt.getTime() - DEFAULT_EARLY_TOLERANCE_MINUTES * 60 * 1000
  );
  const dueWindowEndAt = new Date(
    scheduledAt.getTime() + DEFAULT_LATE_TOLERANCE_MINUTES * 60 * 1000
  );
  const overdueAt = new Date(
    dueWindowEndAt.getTime() + DEFAULT_OVERDUE_GRACE_MINUTES * 60 * 1000
  );
  return { dueWindowStartAt, dueWindowEndAt, overdueAt };
}

function parseInstant(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function readMarDoseScheduleAdjustmentHistory(
  orderedDoseSnapshotJson: unknown
): MarDoseScheduleAdjustmentAuditEntry[] {
  if (!orderedDoseSnapshotJson || typeof orderedDoseSnapshotJson !== "object") return [];
  const raw = (orderedDoseSnapshotJson as Record<string, unknown>)[
    MAR_DOSE_SCHEDULE_ADJUSTMENT_HISTORY_KEY
  ];
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is MarDoseScheduleAdjustmentAuditEntry => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as MarDoseScheduleAdjustmentAuditEntry;
    return Boolean(row.originalScheduledAt?.trim() && row.newScheduledAt?.trim());
  }).map((entry) => ({
    ...entry,
    previousScheduledAt:
      entry.previousScheduledAt?.trim() ||
      entry.originalScheduledAt?.trim() ||
      entry.newScheduledAt,
    riskSeverity: entry.riskSeverity ?? "LOW",
    reviewRecommended: entry.reviewRecommended ?? false,
  }));
}

export function appendMarDoseScheduleAdjustmentHistory(
  orderedDoseSnapshotJson: unknown,
  entry: MarDoseScheduleAdjustmentAuditEntry
): Record<string, unknown> {
  const base =
    orderedDoseSnapshotJson && typeof orderedDoseSnapshotJson === "object"
      ? { ...(orderedDoseSnapshotJson as Record<string, unknown>) }
      : {};
  const history = readMarDoseScheduleAdjustmentHistory(base);
  return {
    ...base,
    [MAR_DOSE_SCHEDULE_ADJUSTMENT_HISTORY_KEY]: [...history, entry],
  };
}

export function resolveOriginalScheduledAtFromDose(input: {
  scheduledAt: Date | string;
  orderedDoseSnapshotJson?: unknown;
}): string {
  const history = readMarDoseScheduleAdjustmentHistory(input.orderedDoseSnapshotJson);
  const first = history[0];
  if (first?.originalScheduledAt?.trim()) return first.originalScheduledAt.trim();
  const scheduled = parseInstant(input.scheduledAt);
  return scheduled ? scheduled.toISOString() : String(input.scheduledAt);
}

export function buildMarDoseScheduleAdjustmentAuditEntry(
  input: MarDoseScheduleAdjustmentInput
): MarDoseScheduleAdjustmentAuditEntry {
  const originalScheduledAt = parseInstant(input.originalScheduledAt);
  const previousScheduledAt = parseInstant(input.previousScheduledAt);
  const newScheduledAt = parseInstant(input.newScheduledAt);
  if (!originalScheduledAt || !previousScheduledAt || !newScheduledAt) {
    throw new Error("Invalid schedule adjustment instants");
  }
  const risk = assessMarRescheduleRisk({
    previousScheduledAt,
    newScheduledAt,
    facilityTimeZone: input.facilityTimeZone,
  });
  const originalWindows = computeMedicationDoseDueWindowsForScheduledAt(originalScheduledAt);
  const newWindows = computeMedicationDoseDueWindowsForScheduledAt(newScheduledAt);
  return {
    originalScheduledAt: originalScheduledAt.toISOString(),
    previousScheduledAt: previousScheduledAt.toISOString(),
    newScheduledAt: newScheduledAt.toISOString(),
    originalDueWindowStartAt: originalWindows.dueWindowStartAt.toISOString(),
    originalDueWindowEndAt: originalWindows.dueWindowEndAt.toISOString(),
    newDueWindowStartAt: newWindows.dueWindowStartAt.toISOString(),
    newDueWindowEndAt: newWindows.dueWindowEndAt.toISOString(),
    reasonCode: input.reasonCode.trim().toUpperCase(),
    reasonDetail: input.reasonDetail?.trim() || null,
    changedByUserId: input.changedByUserId.trim(),
    changedByDisplay: input.changedByDisplay?.trim() || null,
    changedAt: (input.changedAt ? parseInstant(input.changedAt) : new Date())!.toISOString(),
    riskSeverity: risk.severity,
    reviewRecommended: risk.reviewRecommended,
  };
}

export function validateMarDoseScheduleAdjustment(input: {
  doseStatus: string;
  terminalMedicationAdministrationId?: string | null;
  originalScheduledAt: Date | string;
  newScheduledAt: Date | string;
  reasonCode?: string | null;
  reasonDetail?: string | null;
}):
  | { ok: true; newScheduledAt: Date }
  | { ok: false; code: string } {
  const status = parseMedicationDoseStatus(input.doseStatus);
  if (!status) return { ok: false, code: "INVALID_DOSE_STATUS" };
  if (isTerminalMedicationDoseStatus(status)) {
    return { ok: false, code: "DOSE_ALREADY_TERMINAL" };
  }
  if (input.terminalMedicationAdministrationId?.trim()) {
    return { ok: false, code: "DOSE_ALREADY_HAS_TERMINAL_MAR" };
  }

  const original = parseInstant(input.originalScheduledAt);
  const next = parseInstant(input.newScheduledAt);
  if (!original || !next) return { ok: false, code: "INVALID_SCHEDULED_AT" };
  if (original.getTime() === next.getTime()) {
    return { ok: false, code: "SCHEDULE_UNCHANGED" };
  }

  const movedMinutes = Math.round(Math.abs(next.getTime() - original.getTime()) / 60_000);
  void movedMinutes;
  void input.reasonCode;
  void input.reasonDetail;

  return { ok: true, newScheduledAt: next };
}
