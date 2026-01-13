export const ORDER_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["ACKNOWLEDGED", "CANCELLED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["RESULTED"],
  RESULTED: ["VERIFIED"],
  VERIFIED: [],
  CANCELLED: [],
  PENDING: ["PLACED", "CANCELLED"],
  SIGNED: ["ACKNOWLEDGED", "CANCELLED"],
};

export function assertCanTransition(from: string, to: string) {
  const allowed = ORDER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}

