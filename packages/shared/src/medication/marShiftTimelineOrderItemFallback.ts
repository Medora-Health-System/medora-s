import {
  isDirectMarFrequency,
  isFutureSchedulingFrequency,
  medicationFrequencyMustBypassScheduleExpansion,
  resolveMedicationScheduleExpansionGate,
  type MedicationSchedulingFeatureFlags,
} from "./medicationFrequencyEdHardening.js";
import { parseMedicationFrequencyCode } from "./medicationFrequencyCatalog.js";
import { isStructuredMedicationOrderRouteIvpb } from "./medicationOrderRoute.js";
import type { MedicationDoseStatus } from "./medicationDoseStatus.js";

const NOW_STAT_NOTES_PATTERN = /\b(now|stat|asap|imm[eé]diat|urgent)\b/i;

export function notesImplyImmediateMarPlacement(notes: string | null | undefined): boolean {
  const text = notes?.trim();
  if (!text) return false;
  return NOW_STAT_NOTES_PATTERN.test(text);
}

export function isMarShiftTimelineOrderItemIvpbRoute(route: string | null | undefined): boolean {
  return isStructuredMedicationOrderRouteIvpb(route);
}

/** Whether a medication OrderItem without dose instances should appear on the MAR timeline. */
export function shouldCreateMarShiftTimelineOrderItemFallback(input: {
  frequencyCode: string | null | undefined;
  notes: string | null | undefined;
  intendedAdministrationAt: Date | string | null | undefined;
  hasMedicationDoseInstances: boolean;
  featureFlags: Partial<MedicationSchedulingFeatureFlags> | null | undefined;
}): boolean {
  if (input.hasMedicationDoseInstances) return false;

  const parsed = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );

  if (isDirectMarFrequency(parsed)) return true;

  if (!parsed) {
    return true;
  }

  if (input.intendedAdministrationAt != null) {
    return true;
  }

  if (notesImplyImmediateMarPlacement(input.notes)) {
    return true;
  }

  const gate = resolveMedicationScheduleExpansionGate({
    frequencyCode: parsed,
    featureFlags: input.featureFlags,
  });

  if (gate.scheduleExpansionAllowed && isFutureSchedulingFrequency(parsed)) {
    return false;
  }

  if (medicationFrequencyMustBypassScheduleExpansion(parsed)) {
    return true;
  }

  return !gate.scheduleExpansionAllowed;
}

/** Hour-bucket placement for OrderItem fallback rows. */
export function resolveMarShiftTimelineOrderItemPlacementInstant(input: {
  createdAt: Date | string;
  intendedAdministrationAt: Date | string | null | undefined;
  frequencyCode: string | null | undefined;
  notes: string | null | undefined;
}): Date {
  if (input.intendedAdministrationAt != null) {
    const planned = new Date(input.intendedAdministrationAt);
    if (!Number.isNaN(planned.getTime())) return planned;
  }

  const parsed = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );

  if (isDirectMarFrequency(parsed) || notesImplyImmediateMarPlacement(input.notes)) {
    return new Date(input.createdAt);
  }

  if (!parsed) {
    return new Date(input.createdAt);
  }

  return new Date(input.createdAt);
}

export function resolveMarShiftTimelineOrderItemFallbackDoseKind(
  route: string | null | undefined
): "IVPB_SESSION" | "FIXED_ADMINISTRATION" {
  return isMarShiftTimelineOrderItemIvpbRoute(route) ? "IVPB_SESSION" : "FIXED_ADMINISTRATION";
}

/** Derive timeline dose status from order line + MAR / infusion session state. */
export function resolveMarShiftTimelineOrderItemFallbackDoseStatus(input: {
  orderItemCompleted: boolean;
  isIvpb: boolean;
  activeInfusionSession: boolean;
  hasCompletedAdministration: boolean;
}): MedicationDoseStatus {
  if (input.isIvpb && input.activeInfusionSession) {
    return "IN_PROGRESS";
  }

  if (input.hasCompletedAdministration || input.orderItemCompleted) {
    return "COMPLETED";
  }

  return "DUE";
}

export function marShiftTimelineOrderItemFallbackOverlapsShift(input: {
  placementInstant: Date;
  shiftStart: Date;
  shiftEnd: Date;
}): boolean {
  const time = input.placementInstant.getTime();
  return time >= input.shiftStart.getTime() && time < input.shiftEnd.getTime();
}
