/**
 * Shared visual tokens for Medora list cards (approved UI).
 * Presentation only — no domain logic.
 */

export const MEDORA_CARD_SHELL = {
  radius: 16,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
  leftAccentWidth: 4,
} as const;

/** Worklist / file locale « en attente de synchronisation » */
export const MEDORA_CARD_PENDING_SYNC_SHELL = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
} as const;

export const PRIORITY_BORDER: Record<string, string> = {
  ROUTINE: "#94a3b8",
  URGENT: "#f97316",
  STAT: "#ef4444",
};

export type PriorityBadgeSoft = { bg: string; text: string; border: string };

export const PRIORITY_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  ROUTINE: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  URGENT: { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  STAT: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

export const NEUTRAL_BADGE: PriorityBadgeSoft = {
  bg: "#f8fafc",
  text: "#334155",
  border: "#e2e8f0",
};

export const PATHWAY_BADGE: PriorityBadgeSoft = {
  bg: "#e0f2fe",
  text: "#0369a1",
  border: "#bae6fd",
};

export const SYNC_PENDING_BADGE: PriorityBadgeSoft = {
  bg: "#fef3c7",
  text: "#92400e",
  border: "#fde68a",
};

export function getPriorityBorder(priorityCode: string): string {
  return PRIORITY_BORDER[priorityCode] ?? PRIORITY_BORDER.ROUTINE;
}

export function getPriorityBadgeSoft(priorityCode: string): PriorityBadgeSoft {
  return PRIORITY_BADGE_SOFT[priorityCode] ?? PRIORITY_BADGE_SOFT.ROUTINE;
}
