/**
 * INP.DIS.1F — Shared visual tokens for the enterprise discharge board.
 * Presentation only — no domain logic.
 */

import type { CSSProperties } from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export const DISCHARGE_BOARD_COLORS = {
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  label: "#334155",
  green: "#047857",
  greenSoftBg: "#ecfdf5",
  greenSoftBorder: "#a7f3d0",
  blue: "#2563eb",
  blueSoftBg: "#dbeafe",
  blueSoftBorder: "#93c5fd",
  primary: "#0f766e",
  primarySoftBg: "#f0fdfa",
  danger: "#b91c1c",
  dangerSoftBg: "#fef2f2",
  dangerBorder: "#fecaca",
  attention: "#b45309",
  attentionSoftBg: "#fffbeb",
  canvas: "#f8fafc",
} as const;

export const boardCardStyle: CSSProperties = {
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: 14,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: 12,
  display: "grid",
  gap: 6,
  minWidth: 0,
  alignContent: "start",
};

export const boardSectionStyle: CSSProperties = {
  ...boardCardStyle,
  gap: 8,
};

export const fieldStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box",
};

export const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 3,
  fontSize: 12,
  fontWeight: 600,
  color: DISCHARGE_BOARD_COLORS.label,
};

export const primaryBtn: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: `1px solid ${DISCHARGE_BOARD_COLORS.primary}`,
  background: DISCHARGE_BOARD_COLORS.primary,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export const secondaryBtn: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  border: `1px solid ${DISCHARGE_BOARD_COLORS.blue}`,
  background: DISCHARGE_BOARD_COLORS.blueSoftBg,
  color: DISCHARGE_BOARD_COLORS.blue,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export const neutralBtn: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  border: `1px solid ${DISCHARGE_BOARD_COLORS.border}`,
  background: "#fff",
  color: DISCHARGE_BOARD_COLORS.label,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export const dangerBtn: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  border: `1px solid ${DISCHARGE_BOARD_COLORS.dangerBorder}`,
  background: DISCHARGE_BOARD_COLORS.dangerSoftBg,
  color: DISCHARGE_BOARD_COLORS.danger,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export const badgeComplete: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  color: DISCHARGE_BOARD_COLORS.green,
  background: DISCHARGE_BOARD_COLORS.greenSoftBg,
  border: `1px solid ${DISCHARGE_BOARD_COLORS.greenSoftBorder}`,
};

export const badgePending: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  color: DISCHARGE_BOARD_COLORS.muted,
  background: "#f8fafc",
  border: `1px solid ${DISCHARGE_BOARD_COLORS.border}`,
};

export const badgeAttention: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  color: DISCHARGE_BOARD_COLORS.attention,
  background: DISCHARGE_BOARD_COLORS.attentionSoftBg,
  border: "1px solid #fde68a",
};

export const chipBase: CSSProperties = {
  fontSize: 12,
  padding: "5px 12px",
  borderRadius: 9999,
  border: `1px solid ${DISCHARGE_BOARD_COLORS.border}`,
  background: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

export const fourColGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

export const twoColGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
  gap: 10,
};

export const identityStrip: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px 14px",
  fontSize: 13,
  color: DISCHARGE_BOARD_COLORS.label,
};

export function readinessChipStyle(status: string): CSSProperties {
  if (status === "complete") {
    return {
      ...chipBase,
      color: DISCHARGE_BOARD_COLORS.green,
      borderColor: DISCHARGE_BOARD_COLORS.greenSoftBorder,
      background: DISCHARGE_BOARD_COLORS.greenSoftBg,
    };
  }
  if (status === "attention" || status === "blocked") {
    return {
      ...chipBase,
      color: DISCHARGE_BOARD_COLORS.attention,
      borderColor: "#fde68a",
      background: DISCHARGE_BOARD_COLORS.attentionSoftBg,
    };
  }
  return {
    ...chipBase,
    color: DISCHARGE_BOARD_COLORS.muted,
  };
}

export function disabledBtn(base: CSSProperties): CSSProperties {
  return { ...base, opacity: 0.55, cursor: "not-allowed" };
}
