import { isIvpbSessionDoseKind } from "./medicationDoseKind.js";

/** MAR cell fields used to decide whether an active infusion may be stopped. */
export type MarShiftTimelineInfusionStopItem = {
  doseStatus?: string;
  doseKind?: string | null;
  clinicalAction?: string | null;
  startedAt?: string | null;
  stoppedAt?: string | null;
  medicationInfusionRuntime?: {
    status?: string;
    startedAt?: string | null;
    stoppedAt?: string | null;
  } | null;
};

export function isMarShiftTimelineActiveInfusionRuntimeStatus(
  status: string | null | undefined
): boolean {
  const normalized = status?.trim().toUpperCase() ?? "";
  return normalized === "RUNNING" || normalized === "PAUSED";
}

/** True when an IVPB / medication infusion session is running and still needs a STOP. */
export function isMarShiftTimelineActiveInfusionSessionItem(
  item: MarShiftTimelineInfusionStopItem
): boolean {
  const doseStatus = item.doseStatus?.trim().toUpperCase() ?? "";
  if (
    doseStatus === "COMPLETED" ||
    doseStatus === "CANCELLED" ||
    doseStatus === "MISSED" ||
    doseStatus === "REFUSED" ||
    doseStatus === "HELD"
  ) {
    return false;
  }

  const runtime = item.medicationInfusionRuntime;
  if (runtime?.stoppedAt?.trim()) return false;
  const runtimeStatus = runtime?.status?.trim().toUpperCase() ?? "";
  if (runtimeStatus === "COMPLETED" || runtimeStatus === "STOPPED") return false;
  if (isMarShiftTimelineActiveInfusionRuntimeStatus(runtime?.status)) {
    return true;
  }

  if (item.stoppedAt?.trim()) return false;

  if (doseStatus === "IN_PROGRESS" && item.startedAt?.trim()) {
    return true;
  }

  if (item.startedAt?.trim()) {
    const isIvpb =
      isIvpbSessionDoseKind(item.doseKind) ||
      item.clinicalAction === "STOP_INFUSION" ||
      item.clinicalAction === "START_INFUSION";
    if (isIvpb) return true;
  }

  return false;
}

/** Stop Infusion drawer action is eligible when clinical action says so or runtime proves active session. */
export function isMarShiftTimelineStopInfusionActionEligible(
  item: MarShiftTimelineInfusionStopItem
): boolean {
  if (item.clinicalAction === "VIEW_ADMINISTRATION") return false;
  if (item.clinicalAction === "STOP_INFUSION") return true;
  return isMarShiftTimelineActiveInfusionSessionItem(item);
}

/** Active infusion awaiting closure must remain mutable even on historical MAR review. */
export function isMarShiftTimelineItemRequiresInfusionStopClosure(
  item: MarShiftTimelineInfusionStopItem
): boolean {
  return isMarShiftTimelineStopInfusionActionEligible(item);
}
