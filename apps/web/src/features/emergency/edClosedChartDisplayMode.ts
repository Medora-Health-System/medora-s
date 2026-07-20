/**
 * Display modes for Encounter Clinical Summary reuse.
 * CLOSED_READ_ONLY is presentation/navigation only — same data contract as ACTIVE_SUMMARY.
 */

export const EncounterClinicalSummaryDisplayMode = {
  ACTIVE_SUMMARY: "ACTIVE_SUMMARY",
  CLOSED_READ_ONLY: "CLOSED_READ_ONLY",
} as const;

export type EncounterClinicalSummaryDisplayMode =
  (typeof EncounterClinicalSummaryDisplayMode)[keyof typeof EncounterClinicalSummaryDisplayMode];

/** Authoritative closed lifecycle from server encounter status (not client table labels). */
export function isEdEncounterClosedForArchive(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toUpperCase();
  return s === "CLOSED" || s === "CANCELLED";
}

export function resolveEncounterClinicalSummaryDisplayMode(
  status: string | null | undefined
): EncounterClinicalSummaryDisplayMode {
  return isEdEncounterClosedForArchive(status)
    ? EncounterClinicalSummaryDisplayMode.CLOSED_READ_ONLY
    : EncounterClinicalSummaryDisplayMode.ACTIVE_SUMMARY;
}

/** Trackboard deep-link restoring All Encounters archive view. */
export function emergencyAllEncountersArchivePath(): string {
  return "/app/emergency/trackboard?board=allEncounters";
}
