/** Same window as MAR tab — “due soon” before scheduled administration (display only). */
export const MAR_INTENDED_DUE_SOON_BEFORE_MS = 60 * 60 * 1000;

export type MedicationMarIntendedUrgency = "overdue" | "dueSoon";

/**
 * Mirrors `MedicationAdministrationTab` intended-time display rules (no scheduling authority).
 */
export function medicationMarIntendedTimingUrgency(
  intendedAtIso: string | null | undefined,
  nowMs: number,
  isAdministered: boolean
): MedicationMarIntendedUrgency | null {
  if (isAdministered) return null;
  const raw = intendedAtIso != null ? String(intendedAtIso).trim() : "";
  if (!raw) return null;
  const due = new Date(raw).getTime();
  if (Number.isNaN(due)) return null;
  if (nowMs > due) return "overdue";
  const msUntil = due - nowMs;
  if (msUntil >= 0 && msUntil <= MAR_INTENDED_DUE_SOON_BEFORE_MS) return "dueSoon";
  return null;
}
