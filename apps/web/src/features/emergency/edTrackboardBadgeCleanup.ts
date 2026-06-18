import type { EdLifecycleBoardView } from "@/features/emergency/edEncounterLifecycleNavigation";

const ENCOUNTER_LIST_VIEWS: readonly EdLifecycleBoardView[] = [
  "trackboard",
  "myPatients",
  "incompleteCharts",
] as const;

export function isEncounterListBoardView(view: EdLifecycleBoardView): boolean {
  return (ENCOUNTER_LIST_VIEWS as readonly string[]).includes(view);
}

/**
 * Bed occupancy chip (Occupied, etc.) is hidden on encounter row cards.
 * Room label + Bed Board retain occupancy context.
 */
export function shouldShowTrackboardBedStatusChip(_view?: EdLifecycleBoardView): boolean {
  return false;
}

/**
 * "Assigned to you" duplicates Nurse: me / Provider: me on encounter row cards.
 */
export function shouldShowTrackboardOwnershipBadge(_view?: EdLifecycleBoardView): boolean {
  return false;
}
