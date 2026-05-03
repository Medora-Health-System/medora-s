import { BadRequestException } from "@nestjs/common";

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  /** Bedside / file flows may move a line directly to in-progress (e.g. IVPB start) without a separate ACK step. */
  PLACED: ["ACKNOWLEDGED", "IN_PROGRESS", "CANCELLED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["RESULTED"],
  RESULTED: ["VERIFIED"],
  VERIFIED: [],
  CANCELLED: [],
  /** Accuser réception peut partir d’un ordre encore « en attente » (file labo / imagerie). */
  /** Démarrage direct depuis la file (pharmacie / imagerie) sans étape intermédiaire. */
  PENDING: ["PLACED", "ACKNOWLEDGED", "IN_PROGRESS", "CANCELLED"],
  /** Post–signature: allow direct progression to in-progress for bedside execution (same as PLACED). */
  SIGNED: ["ACKNOWLEDGED", "IN_PROGRESS", "CANCELLED"],
};

export function assertCanTransition(from: string, to: string) {
  const allowed = ORDER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`Transition de statut interdite : ${from} → ${to}.`);
  }
}

