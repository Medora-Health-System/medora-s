import { parseMedicationDoseStatus, isTerminalMedicationDoseStatus } from "./medicationDoseStatus.js";
import { isDirectMarFrequency } from "./medicationFrequencyEdHardening.js";
import { parseMedicationFrequencyCode } from "./medicationFrequencyCatalog.js";

export type MarOrderItemScheduleAdjustmentInput = {
  orderItemStatus: string;
  frequencyCode: string | null | undefined;
  hasMedicationDoseInstances: boolean;
  originalScheduledAt: Date | string;
  newScheduledAt: Date | string;
  reasonCode?: string | null;
};

function parseInstant(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function canAdjustMarOrderItemSchedule(input: {
  orderItemStatus: string;
  frequencyCode: string | null | undefined;
  hasMedicationDoseInstances: boolean;
}): boolean {
  const status = String(input.orderItemStatus ?? "").trim().toUpperCase();
  if (status === "COMPLETED" || status === "CANCELLED") {
    return false;
  }
  if (input.hasMedicationDoseInstances) return false;
  const parsed = parseMedicationFrequencyCode(input.frequencyCode == null ? null : String(input.frequencyCode));
  if (isDirectMarFrequency(parsed)) return true;
  const raw = String(input.frequencyCode ?? "").trim().toUpperCase();
  return raw === "ONCE";
}

export function validateMarOrderItemScheduleAdjustment(
  input: MarOrderItemScheduleAdjustmentInput
):
  | { ok: true; newScheduledAt: Date }
  | { ok: false; code: string } {
  if (!canAdjustMarOrderItemSchedule(input)) {
    return { ok: false, code: "ORDER_ITEM_SCHEDULE_NOT_ADJUSTABLE" };
  }
  const original = parseInstant(input.originalScheduledAt);
  const next = parseInstant(input.newScheduledAt);
  if (!original || !next) return { ok: false, code: "INVALID_SCHEDULED_AT" };
  if (original.getTime() === next.getTime()) {
    return { ok: false, code: "SCHEDULE_UNCHANGED" };
  }
  if (!input.reasonCode?.trim()) {
    return { ok: false, code: "REASON_REQUIRED" };
  }
  return { ok: true, newScheduledAt: next };
}

export function findMedicationDoseInstanceIdForScheduleAdjustment(input: {
  doses: ReadonlyArray<{ id: string; scheduledAt: Date | string; doseStatus: string }>;
  scheduledAt: Date | string;
  toleranceMs?: number;
}): string | null {
  const target = parseInstant(input.scheduledAt);
  if (!target) return null;
  const toleranceMs = input.toleranceMs ?? 60_000;
  let best: { id: string; delta: number } | null = null;
  for (const dose of input.doses) {
    const status = parseMedicationDoseStatus(dose.doseStatus);
    if (!status || isTerminalMedicationDoseStatus(status)) continue;
    const scheduled = parseInstant(dose.scheduledAt);
    if (!scheduled) continue;
    const delta = Math.abs(scheduled.getTime() - target.getTime());
    if (delta > toleranceMs) continue;
    if (!best || delta < best.delta) {
      best = { id: dose.id, delta };
    }
  }
  return best?.id ?? null;
}
