import type { CSSProperties } from "react";
import { CLINICAL_VIEWPORT_DESKTOP_MIN } from "@/lib/clinicalViewport";
import {
  clinicalTabletCompactPanelPadding,
  clinicalTabletCompactRowGapPx,
} from "@/lib/clinicalTabletPanelDensity";

export const DIAGNOSIS_ORDERS_DESKTOP_DENSE_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN}px)`;
export const DIAGNOSIS_ORDERS_TABLET_CARD_MEDIA = `(min-width: 768px) and (max-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN - 0.02}px)`;
export const DIAGNOSIS_ORDERS_MOBILE_CARD_MEDIA = `(max-width: 767.98px)`;

export const DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX = 44;

export type DiagnosisOrdersLayoutMode = "mobileCard" | "tabletCard" | "desktopDense";

export function resolveDiagnosisOrdersLayoutMode(viewportWidth: number): DiagnosisOrdersLayoutMode {
  if (viewportWidth >= CLINICAL_VIEWPORT_DESKTOP_MIN) return "desktopDense";
  if (viewportWidth >= 768) return "tabletCard";
  return "mobileCard";
}

export function diagnosisOrdersUsesCardLayout(mode: DiagnosisOrdersLayoutMode): boolean {
  return mode !== "desktopDense";
}

export function diagnosisOrdersUsesTabletCompactDensity(mode: DiagnosisOrdersLayoutMode): boolean {
  return mode === "tabletCard";
}

export function diagnosisOrdersListStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  const base: CSSProperties = {
    listStyle: "none",
    margin: 0,
    padding: 0,
    width: "100%",
    minWidth: 0,
  };
  if (mode === "tabletCard") {
    return {
      ...base,
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: clinicalTabletCompactRowGapPx,
    };
  }
  return {
    ...base,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
}

export function diagnosisOrdersDiagnosisCardShellStyle(mode: DiagnosisOrdersLayoutMode = "desktopDense"): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    padding: compact ? clinicalTabletCompactPanelPadding : "12px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function diagnosisOrdersTouchButtonStyle(
  base: CSSProperties,
  mode: DiagnosisOrdersLayoutMode
): CSSProperties {
  if (mode === "desktopDense") return base;
  return {
    ...base,
    minHeight: DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
}

export function diagnosisOrdersTableStyle(
  mode: DiagnosisOrdersLayoutMode,
  desktopMinWidth: number
): CSSProperties {
  return {
    width: "100%",
    minWidth: mode === "desktopDense" ? desktopMinWidth : 0,
    borderCollapse: "collapse",
    fontSize: 12,
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
  };
}

export function diagnosisOrdersTableScrollWrapStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  return {
    overflowX: mode === "desktopDense" ? "auto" : "visible",
    overflowY: "auto",
    maxHeight: mode === "tabletCard" ? "min(58vh, 480px)" : "min(65vh, 560px)",
    WebkitOverflowScrolling: "touch",
    width: "100%",
    minWidth: 0,
  };
}

export function diagnosisOrdersOrderCardShellStyle(mode: DiagnosisOrdersLayoutMode = "mobileCard"): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    padding: compact ? clinicalTabletCompactPanelPadding : "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function diagnosisOrdersOrderGroupHeaderStyle(mode: DiagnosisOrdersLayoutMode = "mobileCard"): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    padding: compact ? "4px 8px" : "6px 10px",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    border: "1px solid #cbd5e1",
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function diagnosisOrdersDomainSummaryTileStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    padding: compact ? clinicalTabletCompactPanelPadding : "8px 10px",
    borderRadius: 10,
    fontSize: 11,
    color: "#334155",
    lineHeight: 1.3,
    minHeight: compact ? 52 : 72,
    boxSizing: "border-box",
  };
}

export function diagnosisOrdersDomainSummaryListStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    margin: 0,
    paddingLeft: 14,
    maxHeight: compact ? 88 : 120,
    overflow: "auto",
  };
}

export function diagnosisOrdersQuickActionGridStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    flex: "1 1 200px",
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: compact ? clinicalTabletCompactRowGapPx : 8,
    alignContent: "start",
  };
}

export function diagnosisOrdersDomainGridStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    flex: "1 1 200px",
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: compact ? clinicalTabletCompactRowGapPx : 8,
    alignContent: "start",
  };
}

export function diagnosisOrdersSectionDividerStyle(mode: DiagnosisOrdersLayoutMode): CSSProperties {
  const compact = diagnosisOrdersUsesTabletCompactDensity(mode);
  return {
    borderTop: "1px solid #e2e8f0",
    paddingTop: compact ? 6 : 10,
  };
}

export function diagnosisOrdersLabelWrapStyle(): CSSProperties {
  return {
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0,
  };
}
