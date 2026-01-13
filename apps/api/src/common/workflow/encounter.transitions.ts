export const ENCOUNTER_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

export function assertCanTransitionEncounter(from: string, to: string) {
  const allowed = ENCOUNTER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid encounter transition: ${from} -> ${to}`);
  }
}

