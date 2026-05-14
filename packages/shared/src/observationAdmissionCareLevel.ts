/**
 * Phase 13G-B — Align admission « niveau de soins » with observation / short-stay workflow gates.
 * Mirrors FR catalog option and tolerant string heuristics (same rules as web encounterAdmission).
 */

/** Canonical FR option from admission packet (`CARE_LEVEL_OPTIONS_FR[3]` in web). */
export const OBSERVATION_SHORT_STAY_CARE_LEVEL_OPTION_FR = "Observation" as const;

export function isObservationShortStayCareLevel(careLevel: string | null | undefined): boolean {
  const raw = (careLevel ?? "").trim();
  if (!raw) return false;
  if (raw === OBSERVATION_SHORT_STAY_CARE_LEVEL_OPTION_FR) return true;
  const lower = raw.toLowerCase();
  return (
    lower.includes("observation") ||
    lower.includes("court séjour") ||
    lower.includes("court sejour") ||
    lower.includes("short stay")
  );
}
