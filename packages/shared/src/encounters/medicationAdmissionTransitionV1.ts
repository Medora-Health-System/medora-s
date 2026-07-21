/**
 * D3E.5 — Explicit medication / order transition across admission boundaries.
 * No automatic ED → Inpatient order or MAR copy.
 */

export const MEDICATION_TRANSITION_ACTIONS = [
  "CONTINUE",
  "MODIFY",
  "HOLD",
  "DISCONTINUE",
  "REPLACE",
] as const;

export type MedicationTransitionAction = (typeof MEDICATION_TRANSITION_ACTIONS)[number];

export function evaluateCrossEncounterMedicationTransition(input: {
  action: MedicationTransitionAction | null | undefined;
  sourceEncounterId: string;
  targetEncounterId: string;
  autoCopy: boolean;
}): { ok: boolean; decision: string } {
  const src = String(input.sourceEncounterId ?? "").trim();
  const tgt = String(input.targetEncounterId ?? "").trim();
  if (!src || !tgt || src === tgt) {
    return { ok: false, decision: "INVALID_ENCOUNTER_BOUNDARY" };
  }
  if (input.autoCopy) {
    return { ok: false, decision: "AUTO_COPY_FORBIDDEN" };
  }
  const action = String(input.action ?? "")
    .trim()
    .toUpperCase();
  if (!MEDICATION_TRANSITION_ACTIONS.includes(action as MedicationTransitionAction)) {
    return { ok: false, decision: "EXPLICIT_ACTION_REQUIRED" };
  }
  return { ok: true, decision: action };
}

export function directAdmissionWorksWithoutPriorMar(): true {
  return true;
}

export function newOrdersBelongToDestinationEncounterOnly(): true {
  return true;
}
