/**
 * Cross-surface observation encounter refresh (encounter chart + hospitalisation board).
 * Dispatch after disposition, acknowledgement, or close so list UIs do not stay stale.
 */

export const MEDORA_OBSERVATION_ENCOUNTER_REFRESH = "medora:observation-encounter-refresh";

export type ObservationEncounterRefreshDetail = {
  encounterId: string;
  facilityId: string;
};

export function dispatchObservationEncounterRefresh(detail: ObservationEncounterRefreshDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEDORA_OBSERVATION_ENCOUNTER_REFRESH, { detail }));
}
