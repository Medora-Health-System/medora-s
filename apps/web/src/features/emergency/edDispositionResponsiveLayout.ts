import type { CSSProperties } from "react";

export const ED_DISPOSITION_DESKTOP_SPLIT_MEDIA = "(min-width: 1024px)";
export const ED_DISPOSITION_TABLET_STACK_MEDIA = "(min-width: 768px) and (max-width: 1023.98px)";
export const ED_DISPOSITION_MOBILE_STACK_MEDIA = "(max-width: 767.98px)";

export const ED_DISPOSITION_TOUCH_TARGET_MIN_PX = 44;

export type EdDispositionLayoutMode = "mobileStacked" | "tabletStacked" | "desktopSplit";

export function resolveEdDispositionLayoutMode(viewportWidth: number): EdDispositionLayoutMode {
  if (viewportWidth >= 1024) return "desktopSplit";
  if (viewportWidth >= 768) return "tabletStacked";
  return "mobileStacked";
}

export function edDispositionUsesSplitLayout(mode: EdDispositionLayoutMode): boolean {
  return mode === "desktopSplit";
}

/** Single-column clinical workspace — no sticky preview column. */
export function edDispositionWorkspaceStyle(_mode: EdDispositionLayoutMode): CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

export function edDispositionPreviewAsideStyle(mode: EdDispositionLayoutMode): CSSProperties {
  if (mode === "desktopSplit") {
    return {
      position: "sticky",
      top: 12,
      alignSelf: "start",
      maxHeight: "calc(100vh - 100px)",
      overflowY: "auto",
      minWidth: 0,
    };
  }
  return { minWidth: 0, width: "100%" };
}

export function edDispositionTouchButtonStyle(
  base: CSSProperties,
  mode: EdDispositionLayoutMode
): CSSProperties {
  if (mode === "desktopSplit") return base;
  return {
    ...base,
    minHeight: ED_DISPOSITION_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function edDispositionFieldGridStyle(mode: EdDispositionLayoutMode): CSSProperties {
  if (mode === "desktopSplit") {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 8,
      width: "100%",
      minWidth: 0,
    };
  }
  return {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
    width: "100%",
    minWidth: 0,
  };
}

export function edDispositionFollowUpRowGridStyle(mode: EdDispositionLayoutMode): CSSProperties {
  if (mode === "desktopSplit") {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 6,
      width: "100%",
      minWidth: 0,
    };
  }
  return {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 6,
    width: "100%",
    minWidth: 0,
  };
}

export function edDispositionDiagnosisCardShellStyle(): CSSProperties {
  return {
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function edDispositionSectionShellStyle(): CSSProperties {
  return {
    marginTop: 8,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}
