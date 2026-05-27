import type { CSSProperties } from "react";

/** Mobile stacked cards (<768px). */
export const ER_TRACKBOARD_MOBILE_LAYOUT_MEDIA = "(max-width: 767.98px)";

/** Tablet compact cards (768–1023px). */
export const ER_TRACKBOARD_TABLET_LAYOUT_MEDIA = "(min-width: 768px) and (max-width: 1023.98px)";

/** Desktop dense rows (>=1024px). */
export const ER_TRACKBOARD_DESKTOP_LAYOUT_MEDIA = "(min-width: 1024px)";

export const ER_TRACKBOARD_TOUCH_TARGET_MIN_PX = 44;

export type ErTrackboardLayoutMode = "mobileCard" | "tabletCard" | "desktopDense";

export function resolveErTrackboardLayoutMode(viewportWidth: number): ErTrackboardLayoutMode {
  if (viewportWidth >= 1024) return "desktopDense";
  if (viewportWidth >= 768) return "tabletCard";
  return "mobileCard";
}

export function erTrackboardUsesStackedCardLayout(mode: ErTrackboardLayoutMode): boolean {
  return mode !== "desktopDense";
}

export function erTrackboardPageShellStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    minHeight: "calc(100vh - 48px)",
    backgroundColor: "#f8fafc",
    padding: mode === "mobileCard" ? "0 0 12px 0" : "0 0 8px 0",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function erTrackboardPageInnerStyle(): CSSProperties {
  return {
    maxWidth: 1152,
    margin: "0 auto",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function erTrackboardFiltersRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: mode === "mobileCard" ? "column" : "row",
    flexWrap: "wrap",
    alignItems: mode === "mobileCard" ? "stretch" : "flex-end",
    gap: mode === "mobileCard" ? 12 : 10,
    marginBottom: mode === "mobileCard" ? 20 : 28,
    width: "100%",
    minWidth: 0,
  };
}

export function erTrackboardSearchFieldStyle(): CSSProperties {
  return {
    flex: "1 1 220px",
    minWidth: 0,
    width: "100%",
  };
}

export function erTrackboardFilterActionsStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: mode === "mobileCard" ? 0 : "auto",
    width: mode === "mobileCard" ? "100%" : "auto",
  };
}

export function erTrackboardPatientListStyle(mode: ErTrackboardLayoutMode): CSSProperties {
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
      gap: 8,
    };
  }
  return {
    ...base,
    display: "flex",
    flexDirection: "column",
    gap: mode === "mobileCard" ? 10 : 6,
  };
}

export function erTrackboardTouchControlStyle(
  base: CSSProperties,
  mode: ErTrackboardLayoutMode
): CSSProperties {
  if (mode === "desktopDense") return base;
  return {
    ...base,
    minHeight: ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function erTrackboardChipRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: mode === "desktopDense" ? "flex-end" : "flex-start",
    width: "100%",
    minWidth: 0,
  };
}

export function erTrackboardOpsRegionStyle(): CSSProperties {
  return {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  };
}
