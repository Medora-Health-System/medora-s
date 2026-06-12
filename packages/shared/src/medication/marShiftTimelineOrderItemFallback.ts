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
import {
  isMarShiftTimelineHoldNotes,
  resolveMarShiftTimelineTerminalOutcome,
} from "./marShiftTimelineTerminalActions.js";

const NOW_STAT_NOTES_PATTERN = /\b(now|stat|asap|imm[eé]diat|urgent)\b/i;

/** NOW/STAT auto-default planned admin skew band (browser vs facility +1h artifact). */
export const MAR_NOW_AUTO_PLANNED_ARTIFACT_MIN_SKEW_MS = 50 * 60 * 1000;
export const MAR_NOW_AUTO_PLANNED_ARTIFACT_MAX_SKEW_MS = 70 * 60 * 1000;

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

/**
 * Detect legacy/auto NOW planned-administration timestamps (~+1h from createdAt)
 * caused by browser-local defaults. User-selected times outside this band are explicit.
 */
export function isNowStatAutoDefaultPlannedAdminArtifact(input: {
  createdAt: Date | string;
  intendedAdministrationAt: Date | string | null | undefined;
  frequencyCode: string | null | undefined;
}): boolean {
  if (input.intendedAdministrationAt == null) return false;
  const parsed = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );
  if (parsed !== "NOW" && parsed !== "STAT") return false;
  const created = new Date(input.createdAt);
  const planned = new Date(input.intendedAdministrationAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(planned.getTime())) return false;
  const absDiffMs = Math.abs(planned.getTime() - created.getTime());
  return (
    absDiffMs >= MAR_NOW_AUTO_PLANNED_ARTIFACT_MIN_SKEW_MS &&
    absDiffMs <= MAR_NOW_AUTO_PLANNED_ARTIFACT_MAX_SKEW_MS
  );
}

/** Hour-bucket placement for OrderItem fallback rows. */
export function resolveMarShiftTimelineOrderItemPlacementInstant(input: {
  createdAt: Date | string;
  intendedAdministrationAt: Date | string | null | undefined;
  frequencyCode: string | null | undefined;
  notes: string | null | undefined;
}): Date {
  const createdAt = new Date(input.createdAt);
  const parsed = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );
  const intended =
    input.intendedAdministrationAt != null ? new Date(input.intendedAdministrationAt) : null;
  const intendedValid =
    intended != null && !Number.isNaN(intended.getTime()) ? intended : null;

  const isImmediate =
    parsed === "NOW" ||
    parsed === "STAT" ||
    notesImplyImmediateMarPlacement(input.notes);

  if (isImmediate) {
    if (
      intendedValid &&
      !isNowStatAutoDefaultPlannedAdminArtifact({
        createdAt,
        intendedAdministrationAt: intendedValid,
        frequencyCode: input.frequencyCode,
      })
    ) {
      return intendedValid;
    }
    return createdAt;
  }

  if (intendedValid) return intendedValid;

  if (isDirectMarFrequency(parsed) || !parsed) {
    return createdAt;
  }

  return createdAt;
}

export function resolveMarShiftTimelineOrderItemFallbackDoseKind(
  route: string | null | undefined
): "IVPB_SESSION" | "FIXED_ADMINISTRATION" {
  return isMarShiftTimelineOrderItemIvpbRoute(route) ? "IVPB_SESSION" : "FIXED_ADMINISTRATION";
}

function isMarShiftTimelineAdministrationCompletionMarAction(
  marAction: string | null | undefined
): boolean {
  const action = marAction?.trim().toLowerCase();
  return action === "administered";
}

/** Derive timeline dose status from order line + MAR / infusion session state. */
export function resolveMarShiftTimelineOrderItemFallbackDoseStatus(input: {
  orderItemCompleted: boolean;
  isIvpb: boolean;
  activeInfusionSession: boolean;
  /** NOW/STAT IVPB fallback may lack InfusionSession row; order line IN_PROGRESS implies active infusion. */
  orderItemInProgress?: boolean;
  hasCompletedAdministration: boolean;
  terminalMarAction?: string | null;
  terminalMarNotes?: string | null;
}): MedicationDoseStatus {
  if (
    input.isIvpb &&
    (input.activeInfusionSession || input.orderItemInProgress === true)
  ) {
    return "IN_PROGRESS";
  }

  const terminalOutcome = resolveMarShiftTimelineTerminalOutcome({
    marAction: input.terminalMarAction,
    notes: input.terminalMarNotes,
  });
  if (terminalOutcome === "REFUSED") {
    return "COMPLETED";
  }
  if (
    terminalOutcome === "HELD" ||
    (input.terminalMarAction?.trim().toLowerCase() === "md_changed" &&
      isMarShiftTimelineHoldNotes(input.terminalMarNotes))
  ) {
    return "HELD";
  }

  if (input.hasCompletedAdministration || input.orderItemCompleted) {
    return "COMPLETED";
  }

  return "DUE";
}

export function marShiftTimelineOrderItemFallbackHasCompletedAdministration(input: {
  terminalMarAction?: string | null;
  hasInfusionStopMar?: boolean;
}): boolean {
  if (input.hasInfusionStopMar) return true;
  return isMarShiftTimelineAdministrationCompletionMarAction(input.terminalMarAction);
}

export function marShiftTimelineOrderItemFallbackOverlapsShift(input: {
  placementInstant: Date;
  shiftStart: Date;
  shiftEnd: Date;
}): boolean {
  const time = input.placementInstant.getTime();
  return time >= input.shiftStart.getTime() && time < input.shiftEnd.getTime();
}
