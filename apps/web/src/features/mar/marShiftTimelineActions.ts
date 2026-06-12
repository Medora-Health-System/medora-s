import type { MarShiftTimelineDrawerAction } from "@/lib/marShiftTimelineApi";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import type { MedicationPassQueueItem } from "@/lib/medicationPassQueueApi";
import type { MedicationSafetyGovernanceDisplayInput } from "@medora/shared";
import { marInfusionStartWitnessRequired, type MarHighAlertRouteOptions } from "@/components/medication/MarHighAlertFields";
import { marShiftTimelineDateTimeLocalToUtcIso } from "@/features/mar/marShiftTimelineDisplay";

export type MarShiftTimelineInfusionStartInput = {
  notes?: string;
  /** UTC ISO start instant (from facility-local datetime-local when edited). */
  startedAt?: string;
};

export type MarShiftTimelineInfusionStopInput = {
  notes?: string;
  /** UTC ISO stop instant (from facility-local datetime-local when edited). */
  stoppedAt?: string;
};

export type MarShiftTimelineRefuseHoldInput = {
  reasonCode: string;
  otherText?: string;
  administeredAtIso: string;
};

export type MarShiftTimelineActionHandlers = {
  disabled: boolean;
  busy: boolean;
  onRequestAdminister: (item: MarShiftTimelineCellItem) => Promise<void>;
  /** Resolves true when infusion start completed; false when witness modal opened. */
  onRequestStartInfusion: (
    item: MarShiftTimelineCellItem,
    input: MarShiftTimelineInfusionStartInput
  ) => Promise<boolean>;
  onExecuteStopInfusion: (
    item: MarShiftTimelineCellItem,
    input: MarShiftTimelineInfusionStopInput
  ) => Promise<void>;
  onExecuteRefuse: (
    item: MarShiftTimelineCellItem,
    input: MarShiftTimelineRefuseHoldInput
  ) => Promise<void>;
  onExecuteHold: (
    item: MarShiftTimelineCellItem,
    input: MarShiftTimelineRefuseHoldInput
  ) => Promise<void>;
  onExecuteStartFluid?: (item: MarShiftTimelineCellItem) => Promise<void>;
  onExecutePauseFluid?: (item: MarShiftTimelineCellItem) => Promise<void>;
  onExecuteResumeFluid?: (item: MarShiftTimelineCellItem) => Promise<void>;
  onExecuteStopFluid?: (
    item: MarShiftTimelineCellItem,
    input: MarShiftTimelineInfusionStopInput
  ) => Promise<void>;
  onExecuteStartBolus?: (item: MarShiftTimelineCellItem) => Promise<void>;
  onExecuteCompleteBolus?: (
    item: MarShiftTimelineCellItem,
    input: MarShiftTimelineInfusionStopInput
  ) => Promise<void>;
};

export function resolveMarShiftTimelineItemGovernance(
  item: MarShiftTimelineCellItem,
  passQueueItem: MedicationPassQueueItem | null | undefined
): MedicationSafetyGovernanceDisplayInput {
  const summary = passQueueItem?.highAlertSummary;
  return {
    isHighAlert: summary?.isHighAlert === true,
    highAlertClass: summary?.highAlertClass ?? null,
    requiresDoubleSign: summary?.requiresDoubleSign === true || item.requiresWitness,
    requiresWitness: summary?.requiresWitness === true || item.requiresWitness,
    isControlled: summary?.isControlled === true,
    wasteDocumentationRecommended: false,
  };
}

export function marShiftTimelineInfusionStartRouteOptions(
  item: MarShiftTimelineCellItem
): MarHighAlertRouteOptions {
  return {
    route: item.route,
    orderRoute: item.route,
    marRoute: item.route,
    isContinuousInfusion: true,
    infusionPhase: "INFUSION_START",
  };
}

export function marShiftTimelineStartWitnessRequired(
  item: MarShiftTimelineCellItem,
  passQueueItem: MedicationPassQueueItem | null | undefined
): boolean {
  const governance = resolveMarShiftTimelineItemGovernance(item, passQueueItem);
  return marInfusionStartWitnessRequired(governance, marShiftTimelineInfusionStartRouteOptions(item));
}

export function findPassQueueItemForTimelineCell(
  item: MarShiftTimelineCellItem,
  passQueueItems: readonly MedicationPassQueueItem[]
): MedicationPassQueueItem | undefined {
  return passQueueItems.find(
    (pq) =>
      pq.medicationDoseInstanceId === item.medicationDoseInstanceId ||
      pq.orderItemId === item.orderItemId
  );
}

export function resolveMarShiftTimelineOrderId(
  item: MarShiftTimelineCellItem,
  passQueueItem: MedicationPassQueueItem | null | undefined
): string {
  return passQueueItem?.orderId?.trim() || item.orderItemId;
}

export function buildMarShiftTimelineStartPayload(
  input: { startTimeLocal?: string; notes?: string },
  facilityTimeZone?: string | null
): MarShiftTimelineInfusionStartInput {
  const notes = input.notes?.trim() || undefined;
  const startedAt = input.startTimeLocal?.trim()
    ? marShiftTimelineDateTimeLocalToUtcIso(input.startTimeLocal, facilityTimeZone) ?? undefined
    : undefined;
  return {
    ...(notes ? { notes } : {}),
    ...(startedAt ? { startedAt } : {}),
  };
}

export type MarShiftTimelineStopTimeValidation =
  | { ok: true }
  | { ok: false; reason: "before_start" | "invalid_stop_time" };

export function validateMarShiftTimelineStopTime(
  item: MarShiftTimelineCellItem,
  stopTimeLocal: string,
  facilityTimeZone?: string | null
): MarShiftTimelineStopTimeValidation {
  const startIso = item.startedAt?.trim();
  const stopLocal = stopTimeLocal?.trim();
  if (!startIso || !stopLocal) return { ok: true };
  const stopIso = marShiftTimelineDateTimeLocalToUtcIso(stopLocal, facilityTimeZone);
  if (!stopIso) return { ok: false, reason: "invalid_stop_time" };
  if (new Date(stopIso).getTime() < new Date(startIso).getTime()) {
    return { ok: false, reason: "before_start" };
  }
  return { ok: true };
}

export function buildMarShiftTimelineStopPayload(
  input: { stopTimeLocal?: string; notes?: string },
  facilityTimeZone?: string | null
): MarShiftTimelineInfusionStopInput {
  const notes = input.notes?.trim() || undefined;
  const stoppedAt = input.stopTimeLocal?.trim()
    ? marShiftTimelineDateTimeLocalToUtcIso(input.stopTimeLocal, facilityTimeZone) ?? undefined
    : undefined;
  return {
    ...(notes ? { notes } : {}),
    ...(stoppedAt ? { stoppedAt } : {}),
  };
}

/** POST /orders/items/:id/infusion/start accepts optional `startedAt` (M1.8B.7K.8). */
export const MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED = true;

function isMarShiftTimelineRefuseHoldEligible(item: MarShiftTimelineCellItem): boolean {
  return (
    item.clinicalAction === "ADMINISTER" ||
    item.clinicalAction === "START_INFUSION" ||
    item.clinicalAction === "START_BOLUS"
  );
}

export function isMarShiftTimelineActionEnabled(
  action: MarShiftTimelineDrawerAction,
  item: MarShiftTimelineCellItem,
  handlers: MarShiftTimelineActionHandlers | null | undefined
): boolean {
  if (!handlers || handlers.disabled || handlers.busy) return false;
  if (item.readOnly) return false;
  if (action === "ADMINISTER") return item.clinicalAction === "ADMINISTER";
  if (action === "START_INFUSION") return item.clinicalAction === "START_INFUSION";
  if (action === "STOP_INFUSION") return item.clinicalAction === "STOP_INFUSION";
  if (action === "START_FLUID") return item.clinicalAction === "START_FLUID";
  if (action === "PAUSE_FLUID") {
    return item.clinicalAction === "STOP_FLUID" && item.continuousFluidStatus === "RUNNING";
  }
  if (action === "RESUME_FLUID") return item.clinicalAction === "RESUME_FLUID";
  if (action === "STOP_FLUID") {
    return (
      item.clinicalAction === "STOP_FLUID" || item.clinicalAction === "RESUME_FLUID"
    );
  }
  if (action === "START_BOLUS") return item.clinicalAction === "START_BOLUS";
  if (action === "COMPLETE_BOLUS") return item.clinicalAction === "COMPLETE_BOLUS";
  if (action === "REFUSE" || action === "HOLD") {
    return isMarShiftTimelineRefuseHoldEligible(item);
  }
  return false;
}

export function isMarShiftTimelineActionShowComingSoon(
  action: MarShiftTimelineDrawerAction,
  _item: MarShiftTimelineCellItem
): boolean {
  return action === "VIEW_ORDER";
}
