/**
 * ED.HOSP.1B/1C — visual grammar for the ED Disposition board.
 *
 * Matches InpatientDischargeBoard *presentation* (compact chips, four-col
 * summary, wrapping choice group, sticky actions) without importing inpatient
 * clinical engines, readiness JSON, or lifecycle.
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
  pendingBg: "#f8fafc",
  pendingBorder: "#e2e8f0",
  pendingText: "#64748b",
  blue: "#2563eb",
  blueSoftBg: "#eff6ff",
  blueSoftBorder: "#93c5fd",
} as const;

export const ED_DISPOSITION_BOARD_MAX_WIDTH = 1480;
export const ED_DISPOSITION_BOARD_PAD = 16;
export const ED_DISPOSITION_BOARD_GAP = 12;
export const ED_DISPOSITION_SECTION_RADIUS = 14;
export const ED_DISPOSITION_CHIP_RADIUS = 9999;

/** Compact one-line/two-line chip — same density as inpatient `chipBase`. */
export const edChipBase: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 1,
  padding: "5px 12px",
  borderRadius: ED_DISPOSITION_CHIP_RADIUS,
  fontSize: 12,
  fontWeight: 800,
  border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.border}`,
  background: "#fff",
  color: ED_DISPOSITION_BOARD_COLORS.label,
  lineHeight: 1.2,
  width: "fit-content",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: 0,
  height: "auto",
  flex: "0 0 auto",
  alignSelf: "flex-start",
  boxSizing: "border-box",
};

export const edReadinessChipStyle = (state: "ready" | "pending"): CSSProperties => {
  if (state === "ready") {
    return {
      ...edChipBase,
      background: ED_DISPOSITION_BOARD_COLORS.greenSoftBg,
      borderColor: ED_DISPOSITION_BOARD_COLORS.greenSoftBorder,
      color: ED_DISPOSITION_BOARD_COLORS.green,
    };
  }
  return {
    ...edChipBase,
    background: ED_DISPOSITION_BOARD_COLORS.pendingBg,
    borderColor: ED_DISPOSITION_BOARD_COLORS.pendingBorder,
    color: ED_DISPOSITION_BOARD_COLORS.pendingText,
  };
};

export const edBoardCardStyle: CSSProperties = {
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: ED_DISPOSITION_SECTION_RADIUS,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: 12,
  display: "grid",
  gap: 6,
  minWidth: 0,
  maxWidth: "100%",
  width: "100%",
  minHeight: 0,
  alignContent: "start",
  alignSelf: "start",
  boxSizing: "border-box",
};

export const edBoardSectionStyle: CSSProperties = {
  ...edBoardCardStyle,
  padding: ED_DISPOSITION_BOARD_PAD,
  gap: 10,
  overflow: "hidden",
};

export const edBoardTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  margin: 0,
  minWidth: 0,
  color: ED_DISPOSITION_BOARD_COLORS.text,
  lineHeight: 1.2,
};

export const edSectionHeadingStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: ED_DISPOSITION_BOARD_COLORS.muted,
};

export const edFourColGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  alignItems: "start",
};

export const edReadinessRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "flex-start",
  alignContent: "flex-start",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: 0,
};

export const edOutcomeChoiceGroupStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

export const edOutcomeChoiceLabelStyle = (selected: boolean, disabled: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 10,
  border: selected ? `2px solid ${ED_DISPOSITION_BOARD_COLORS.blue}` : `1px solid #cbd5e1`,
  background: selected ? ED_DISPOSITION_BOARD_COLORS.blueSoftBg : disabled ? "#f8fafc" : "#fff",
  color: disabled ? "#94a3b8" : ED_DISPOSITION_BOARD_COLORS.text,
  fontSize: 13,
  fontWeight: selected ? 800 : 650,
  cursor: disabled ? "not-allowed" : "pointer",
  width: "fit-content",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: 0,
  height: "auto",
  flex: "0 1 auto",
  alignSelf: "flex-start",
  boxSizing: "border-box",
});

export const edSecondaryBtnStyle: CSSProperties = {
  border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.blueSoftBorder}`,
  background: ED_DISPOSITION_BOARD_COLORS.blueSoftBg,
  color: ED_DISPOSITION_BOARD_COLORS.blue,
  borderRadius: 10,
  padding: "7px 12px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

export const edPrimaryBtnStyle: CSSProperties = {
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

export const edNeutralBtnStyle: CSSProperties = {
  border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.border}`,
  background: "#fff",
  color: ED_DISPOSITION_BOARD_COLORS.label,
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

export const edActionBarStyle: CSSProperties = {
  ...edBoardSectionStyle,
  position: "sticky",
  bottom: 8,
  zIndex: 2,
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

export const edFactRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  lineHeight: 1.35,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

export const edBadgeCompleteStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  color: ED_DISPOSITION_BOARD_COLORS.green,
  background: ED_DISPOSITION_BOARD_COLORS.greenSoftBg,
  border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.greenSoftBorder}`,
};

export const edBadgePendingStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  color: ED_DISPOSITION_BOARD_COLORS.muted,
  background: "#f8fafc",
  border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.border}`,
};

export const ED_DISPOSITION_RESPONSIVE_CSS = `
.ed-disposition-board {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font-size: 13px;
  color: ${ED_DISPOSITION_BOARD_COLORS.text};
}
.ed-disposition-board *,
.ed-disposition-board *::before,
.ed-disposition-board *::after {
  box-sizing: border-box;
}
.ed-disposition-four-col {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  align-items: start;
}
.ed-disposition-readiness {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  align-content: flex-start;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
}
.ed-disposition-readiness [data-ed-readiness-chip] {
  min-height: 0 !important;
  height: auto !important;
  flex: 0 0 auto !important;
  align-self: flex-start !important;
  width: fit-content;
  max-width: 100%;
}
.ed-disposition-outcome-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
@media (max-width: 1199px) {
  .ed-disposition-four-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 799px) {
  .ed-disposition-four-col { grid-template-columns: minmax(0, 1fr); }
  .ed-disposition-outcome-group label { width: 100%; }
}
.ed-observation-order-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.ed-observation-order-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
@media (max-width: 1199px) {
  .ed-observation-order-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 799px) {
  .ed-observation-order-grid { grid-template-columns: minmax(0, 1fr); }
  .ed-observation-order-context { grid-template-columns: minmax(0, 1fr); }
}
.ed-admission-order-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.ed-admission-order-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
@media (max-width: 1199px) {
  .ed-admission-order-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 799px) {
  .ed-admission-order-grid { grid-template-columns: minmax(0, 1fr); }
  .ed-admission-order-context { grid-template-columns: minmax(0, 1fr); }
}
`;
