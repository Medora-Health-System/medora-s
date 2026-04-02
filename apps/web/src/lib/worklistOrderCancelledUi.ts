import type { CSSProperties } from "react";

/** Parent order cancelled — no workflow actions on worklists (online UI). */
export function orderIsCancelled(order: { status?: string | null }): boolean {
  return order.status === "CANCELLED";
}

/** Consistent badge for ordre parent « Annulée » (fond #ffebee, texte #b71c1c). */
export const WORKLIST_ORDER_CANCELLED_BADGE_STYLE: CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  backgroundColor: "#ffebee",
  color: "#b71c1c",
};
