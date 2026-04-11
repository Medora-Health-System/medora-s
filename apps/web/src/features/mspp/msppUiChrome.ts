/**
 * Shared presentation tokens for MSPP portal pages (Medora-aligned shells only).
 */
import type { CSSProperties } from "react";
import { MEDORA_CARD_SHELL, NEUTRAL_BADGE, PATHWAY_BADGE } from "@/components/medora-card";

export const MSPP_PAGE_TITLE: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: "1.75rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "#0f172a",
  lineHeight: 1.2,
};

export const MSPP_PAGE_SUBTITLE: CSSProperties = {
  marginTop: 0,
  marginBottom: 4,
  fontSize: 15,
  lineHeight: 1.55,
  color: "#64748b",
  maxWidth: 720,
};

export const MSPP_PAGE_SHELL: CSSProperties = {
  maxWidth: 1120,
  marginLeft: "auto",
  marginRight: "auto",
  paddingBottom: 40,
};

export const MSPP_SECTION_CARD: CSSProperties = {
  backgroundColor: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: "22px 24px",
  marginBottom: 18,
};

/** Narrative / interpretation blocks — subtle pathway accent (Medora token). */
export const MSPP_NARRATIVE_CARD: CSSProperties = {
  ...MSPP_SECTION_CARD,
  borderLeft: `${MEDORA_CARD_SHELL.leftAccentWidth}px solid ${PATHWAY_BADGE.border}`,
};

/** Surveillance / status panel — neutral accent (non-alarmist). */
export const MSPP_SURVEILLANCE_CARD: CSSProperties = {
  ...MSPP_SECTION_CARD,
  borderLeft: `${MEDORA_CARD_SHELL.leftAccentWidth}px solid ${NEUTRAL_BADGE.border}`,
};

/** Minister / executive national signal — pathway accent, calm surface. */
export const MSPP_MINISTER_SIGNAL_CARD: CSSProperties = {
  ...MSPP_SECTION_CARD,
  background: "#f8fafc",
  borderTop: `3px solid ${PATHWAY_BADGE.border}`,
  borderLeft: `${MEDORA_CARD_SHELL.leftAccentWidth}px solid ${PATHWAY_BADGE.border}`,
};

/** Watchlist tile (department or disease column). */
export const MSPP_WATCHLIST_TILE: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  minWidth: 0,
};

export const MSPP_SECTION_TITLE: CSSProperties = {
  marginTop: 0,
  marginBottom: 6,
  fontSize: "1.0625rem",
  fontWeight: 700,
  color: "#0f172a",
};

export const MSPP_SECTION_SUBTITLE: CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 13,
  lineHeight: 1.5,
  color: "#64748b",
};

export const MSPP_NAV_ROW: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  marginBottom: 22,
};

export const MSPP_NAV_LINK: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 9999,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#1d4ed8",
  textDecoration: "none",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

export const MSPP_KPI_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 14,
};

export const MSPP_KPI_TILE: CSSProperties = {
  padding: "18px 20px",
  background: "#f8fafc",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

export const MSPP_KPI_LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  marginBottom: 6,
};

export const MSPP_KPI_VALUE: CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: "#0f172a",
  lineHeight: 1,
  fontVariantNumeric: "tabular-nums" as const,
};

export const MSPP_CHART_WELL: CSSProperties = {
  marginTop: 4,
  padding: 16,
  background: "#f8fafc",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

export const MSPP_TABLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

export const MSPP_TABLE_HEAD_CELL: CSSProperties = {
  textAlign: "left",
  padding: "11px 12px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  background: "#f8fafc",
};

export const MSPP_TABLE_CELL: CSSProperties = {
  padding: "11px 12px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
  color: "#334155",
};

export const MSPP_ERROR_CALLOUT: CSSProperties = {
  ...MSPP_SECTION_CARD,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
};

export const MSPP_FILTER_LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

export const MSPP_INPUT: CSSProperties = {
  padding: "10px 12px",
  minWidth: 220,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  background: "#fff",
  color: "#0f172a",
  outline: "none",
};

export const MSPP_EMPTY_STATE: CSSProperties = {
  margin: 0,
  padding: "20px 16px",
  textAlign: "center" as const,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.5,
  background: "#f8fafc",
  borderRadius: 12,
  border: "1px dashed #e2e8f0",
};

export const MSPP_BTN_ROW: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const btnBase: CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 10,
  cursor: "pointer",
  border: "1px solid transparent",
};

export const MSPP_BTN_APPROVE: CSSProperties = {
  ...btnBase,
  background: "#eff6ff",
  borderColor: "#93c5fd",
  color: "#1d4ed8",
};

export const MSPP_BTN_REJECT: CSSProperties = {
  ...btnBase,
  background: "#fff",
  borderColor: "#fecaca",
  color: "#b91c1c",
};

/** Remise en file après rejet (action réversible, traçabilité conservée). */
export const MSPP_BTN_REQUEUE: CSSProperties = {
  ...btnBase,
  background: "#f0fdf4",
  borderColor: "#86efac",
  color: "#166534",
};

/** Primary action for print (Rapport MSPP). */
export const MSPP_PRINT_BUTTON: CSSProperties = {
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  cursor: "pointer",
};

export const MSPP_MUTED_INLINE: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
};

export const MSPP_NARRATIVE_MUTED: CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginTop: 0,
  lineHeight: 1.55,
};

export const MSPP_NARRATIVE_LIST: CSSProperties = {
  margin: "10px 0 0",
  paddingLeft: 22,
  fontSize: 14,
  color: "#334155",
  lineHeight: 1.5,
};
