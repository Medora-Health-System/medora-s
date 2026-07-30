/**
 * MEDUI.D4C.7K — single enterprise encounter status transition map.
 * CLOSED → OPEN is reopen only (REOPEN_ENCOUNTER). CANCELLED remains terminal.
 */
export const ENCOUNTER_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["CLOSED", "CANCELLED"],
  CLOSED: ["OPEN"],
  CANCELLED: [],
};

export function assertCanTransitionEncounter(from: string, to: string) {
  const allowed = ENCOUNTER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid encounter transition: ${from} -> ${to}`);
  }
}

