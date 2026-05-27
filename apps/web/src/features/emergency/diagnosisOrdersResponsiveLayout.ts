import type { CSSProperties } from "react";

export const DIAGNOSIS_ORDERS_DESKTOP_DENSE_MEDIA = "(min-width: 1024px)";
export const DIAGNOSIS_ORDERS_TABLET_CARD_MEDIA = "(min-width: 768px) and (max-width: 1023.98px)";
export const DIAGNOSIS_ORDERS_MOBILE_CARD_MEDIA = "(max-width: 767.98px)";

export const DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX = 44;

export type DiagnosisOrdersLayoutMode = "mobileCard" | "tabletCard" | "desktopDense";

export function resolveDiagnosisOrdersLayoutMode(viewportWidth: number): DiagnosisOrdersLayoutMode {
  if (viewportWidth >= 1024) return "desktopDense";
  if (viewportWidth >= 768) return "tabletCard";
  return "mobileCard";
}

export function diagnosisOrdersUsesCardLayout(mode: DiagnosisOrdersLayoutMode): boolean {
  return mode !== "desktopDense";
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
      gap: 10,
    };
  }
  return {
    ...base,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
}

export function diagnosisOrdersDiagnosisCardShellStyle(): CSSProperties {
  return {
    padding: "12px 14px",
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
    maxHeight: "min(65vh, 560px)",
    WebkitOverflowScrolling: "touch",
    width: "100%",
    minWidth: 0,
  };
}

export function diagnosisOrdersOrderCardShellStyle(): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function diagnosisOrdersOrderGroupHeaderStyle(): CSSProperties {
  return {
    padding: "6px 10px",
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

export function diagnosisOrdersLabelWrapStyle(): CSSProperties {
  return {
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0,
  };
}
