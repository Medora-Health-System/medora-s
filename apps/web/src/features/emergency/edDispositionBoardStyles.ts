/**
 * ED.HOSP.1B — visual tokens for the ED disposition board.
 * Presentation only. Copied Medora shell language; not inpatient discharge domain styles.
 */

import type { CSSProperties } from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export const ED_DISPOSITION_BOARD_COLORS = {
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  label: "#334155",
  green: "#047857",
  greenSoftBg: "#ecfdf5",
  greenSoftBorder: "#a7f3d0",
  primary: "#0f766e",
  canvas: "#f8fafc",
  pendingBg: "#fffbeb",
  pendingBorder: "#fde68a",
  pendingText: "#92400e",
} as const;

export const edBoardCardStyle: CSSProperties = {
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: 14,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: 12,
  display: "grid",
  gap: 6,
  minWidth: 0,
  maxWidth: "100%",
  alignContent: "start",
  boxSizing: "border-box",
};

export const edBoardSectionStyle: CSSProperties = {
  ...edBoardCardStyle,
  gap: 8,
};

export const edReadinessChipStyle = (
  state: "ready" | "pending"
): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.2,
  border:
    state === "ready"
      ? `1px solid ${ED_DISPOSITION_BOARD_COLORS.greenSoftBorder}`
      : `1px solid ${ED_DISPOSITION_BOARD_COLORS.pendingBorder}`,
  background:
    state === "ready"
      ? ED_DISPOSITION_BOARD_COLORS.greenSoftBg
      : ED_DISPOSITION_BOARD_COLORS.pendingBg,
  color:
    state === "ready"
      ? ED_DISPOSITION_BOARD_COLORS.green
      : ED_DISPOSITION_BOARD_COLORS.pendingText,
  minWidth: 0,
});
