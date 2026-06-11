import type { MarShiftTimelineDrawerAction } from "@/lib/marShiftTimelineApi";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import type { MedicationPassQueueItem } from "@/lib/medicationPassQueueApi";
import type { MedicationSafetyGovernanceDisplayInput } from "@medora/shared";
import { marInfusionStartWitnessRequired, type MarHighAlertRouteOptions } from "@/components/medication/MarHighAlertFields";
import { datetimeLocalValueToUtcIso } from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";

export type MarShiftTimelineInfusionStartInput = {
  notes?: string;
  highAlertVerifierUserId?: string;
  highAlertVerifierDisplayName?: string;
};

export type MarShiftTimelineInfusionStopInput = {
  notes?: string;
  stopTimeLocal?: string;
};

export type MarShiftTimelineActionHandlers = {
  disabled: boolean;
  busy: boolean;
  /** Resolves true when infusion start completed; false when witness modal opened. */
  onRequestStartInfusion: (item: MarShiftTimelineCellItem) => Promise<boolean>;
  onExecuteStopInfusion: (
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

export function buildMarShiftTimelineStopPayload(input: MarShiftTimelineInfusionStopInput): {
  notes?: string;
  stoppedAt?: string;
} {
  const notes = input.notes?.trim() || undefined;
  const stopTimeLocal = input.stopTimeLocal?.trim();
  const stoppedAtIso = stopTimeLocal ? datetimeLocalValueToUtcIso(stopTimeLocal) : null;
  return {
    ...(notes ? { notes } : {}),
    ...(stoppedAtIso ? { stoppedAt: stoppedAtIso } : {}),
  };
}

/** START API does not accept startedAt — effective start is server clock at confirmation. */
export const MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED = false;

export function isMarShiftTimelineActionEnabled(
  action: MarShiftTimelineDrawerAction,
  item: MarShiftTimelineCellItem,
  handlers: MarShiftTimelineActionHandlers | null | undefined
): boolean {
  if (!handlers || handlers.disabled || handlers.busy) return false;
  if (item.readOnly) return false;
  if (action === "START_INFUSION") return item.clinicalAction === "START_INFUSION";
  if (action === "STOP_INFUSION") return item.clinicalAction === "STOP_INFUSION";
  return false;
}

export function isMarShiftTimelineActionShowComingSoon(
  action: MarShiftTimelineDrawerAction,
  item: MarShiftTimelineCellItem
): boolean {
  if (action === "ADMINISTER") return item.clinicalAction === "ADMINISTER";
  if (action === "REFUSE" || action === "HOLD" || action === "VIEW_ORDER") return true;
  return false;
}
