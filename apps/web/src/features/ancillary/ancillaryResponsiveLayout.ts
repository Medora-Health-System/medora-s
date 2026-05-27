import type { CSSProperties } from "react";

export const ANCILLARY_DESKTOP_DENSE_MEDIA = "(min-width: 1024px)";
export const ANCILLARY_TABLET_CARD_MEDIA = "(min-width: 768px) and (max-width: 1023.98px)";
export const ANCILLARY_MOBILE_CARD_MEDIA = "(max-width: 767.98px)";

export const ANCILLARY_TOUCH_TARGET_MIN_PX = 44;

export type AncillaryLayoutMode = "mobileCard" | "tabletCard" | "desktopDense";

export function resolveAncillaryLayoutMode(viewportWidth: number): AncillaryLayoutMode {
  if (viewportWidth >= 1024) return "desktopDense";
  if (viewportWidth >= 768) return "tabletCard";
  return "mobileCard";
}

export function ancillaryUsesStackedCardLayout(mode: AncillaryLayoutMode): boolean {
  return mode !== "desktopDense";
}

export function ancillaryWorklistPageShellStyle(): CSSProperties {
  return {
    minHeight: "calc(100vh - 48px)",
    backgroundColor: "#f8fafc",
    padding: "0 0 24px 0",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function ancillaryWorklistPageInnerStyle(): CSSProperties {
  return {
    maxWidth: 1152,
    margin: "0 auto",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "0 12px",
  };
}

export function ancillaryWorklistQueueListStyle(mode: AncillaryLayoutMode): CSSProperties {
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
      gap: 12,
    };
  }
  return {
    ...base,
    display: "flex",
    flexDirection: "column",
    gap: mode === "mobileCard" ? 12 : 12,
  };
}

export function ancillaryWorklistFiltersRowStyle(mode: AncillaryLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: mode === "mobileCard" ? "column" : "column",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    width: "100%",
    minWidth: 0,
  };
}

export function ancillaryWorklistSearchInputStyle(): CSSProperties {
  return {
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    padding: "0 12px",
    fontSize: 13,
    color: "#0f172a",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
    width: "100%",
    maxWidth: 480,
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function ancillaryTouchControlStyle(
  base: CSSProperties,
  mode: AncillaryLayoutMode
): CSSProperties {
  if (mode === "desktopDense") return base;
  return {
    ...base,
    minHeight: ANCILLARY_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
}

export function ancillaryWorklistActionStackStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "stretch",
    width: "100%",
    minWidth: 0,
  };
}

export function ancillaryWorklistActionRowStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  };
}
