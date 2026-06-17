/** Terminal MAR dose statuses — cells are read-only (M1.8B.7K.10B.11B). */
export const MAR_SHIFT_TIMELINE_TERMINAL_STATUSES = [
  "COMPLETED",
  "DONE",
  "ADMINISTERED",
  "REFUSED",
  "HELD",
  "MISSED",
  "CANCELLED",
  "SUPERSEDED",
] as const;

/** Terminal clinical actions — view-only drawer (not VIEW_UPCOMING). */
export const MAR_SHIFT_TIMELINE_TERMINAL_CLINICAL_ACTIONS = [
  "VIEW_ADMINISTRATION",
  "VIEW_HELD",
  "VIEW_MISSED",
  "VIEW_CANCELED",
] as const;

export type MarShiftTimelineActionabilityItem = {
  doseStatus: string;
  readOnly?: boolean;
  clinicalAction?: string | null;
  secondaryText?: string | null;
};

export function isMarShiftTimelineTerminalStatus(
  status: string,
  secondaryText?: string | null
): boolean {
  const normalized = status.trim().toUpperCase();
  const secondary = secondaryText?.trim().toUpperCase() ?? "";

  if (
    (MAR_SHIFT_TIMELINE_TERMINAL_STATUSES as readonly string[]).includes(normalized)
  ) {
    return true;
  }
  if (secondary === "DONE" || secondary === "REFUSED" || secondary === "HELD") {
    return true;
  }
  return false;
}

export function isMarShiftTimelineTerminalClinicalAction(
  action: string | null | undefined
): boolean {
  if (!action?.trim()) return false;
  return (MAR_SHIFT_TIMELINE_TERMINAL_CLINICAL_ACTIONS as readonly string[]).includes(action);
}

/** Non-terminal MAR cells remain actionable (administer, refuse, hold, etc.). */
export function isMarShiftTimelineItemActionable(
  item: MarShiftTimelineActionabilityItem
): boolean {
  if (isMarShiftTimelineTerminalStatus(item.doseStatus, item.secondaryText)) {
    return false;
  }
  if (isMarShiftTimelineTerminalClinicalAction(item.clinicalAction)) {
    return false;
  }
  return true;
}
