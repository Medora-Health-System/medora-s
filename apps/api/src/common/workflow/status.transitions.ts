export const ORDER_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["ACKNOWLEDGED", "CANCELLED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["RESULTED"],
  RESULTED: ["VERIFIED"],
  VERIFIED: [],
  CANCELLED: [],
  /** Accuser réception peut partir d’un ordre encore « en attente » (file labo / imagerie). */
  /** Démarrage direct depuis la file (pharmacie / imagerie) sans étape intermédiaire. */
  PENDING: ["PLACED", "ACKNOWLEDGED", "IN_PROGRESS", "CANCELLED"],
  SIGNED: ["ACKNOWLEDGED", "CANCELLED"],
};

export function assertCanTransition(from: string, to: string) {
  const allowed = ORDER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}

