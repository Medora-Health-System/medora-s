import type { CSSProperties } from "react";

/** Desktop multi-column split (>=1280px). */
export const PROVIDER_DOCUMENTATION_DESKTOP_SPLIT_MEDIA = "(min-width: 1280px)";

/** Tablet landscape split (1024–1279px). */
export const PROVIDER_DOCUMENTATION_TABLET_SPLIT_MEDIA = "(min-width: 1024px)";

export type ProviderDocumentationLayoutMode = "stacked" | "tabletSplit" | "desktopSplit";

export const PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX = 44;

export function resolveProviderDocumentationLayoutMode(viewportWidth: number): ProviderDocumentationLayoutMode {
  if (viewportWidth >= 1280) return "desktopSplit";
  if (viewportWidth >= 1024) return "tabletSplit";
  return "stacked";
}

export function providerDocumentationWorkspaceLayoutStyle(
  mode: ProviderDocumentationLayoutMode
): CSSProperties {
  const base: CSSProperties = { width: "100%", minWidth: 0 };
  switch (mode) {
    case "desktopSplit":
      return {
        ...base,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)",
        gap: 14,
        alignItems: "start",
      };
    case "tabletSplit":
      return {
        ...base,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 260px)",
        gap: 14,
        alignItems: "start",
      };
    default:
      return {
        ...base,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      };
  }
}

export function providerDocumentationSummaryAsideStyle(
  mode: ProviderDocumentationLayoutMode
): CSSProperties {
  const base: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  };
  if (mode === "stacked") {
    return { ...base, width: "100%" };
  }
  return {
    ...base,
    position: "sticky",
    top: 12,
    alignSelf: "start",
    maxHeight: "calc(100vh - 100px)",
    overflowY: "auto",
  };
}

export function providerDocumentationStickyHeaderStyle(
  mode: ProviderDocumentationLayoutMode
): CSSProperties {
  const base: CSSProperties = {
    zIndex: 40,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    padding: "8px 12px",
  };
  if (mode === "stacked") {
    return { ...base, position: "relative" };
  }
  return { ...base, position: "sticky", top: 8 };
}

export function providerDocumentationTouchFriendlyButtonStyle(base: CSSProperties): CSSProperties {
  return {
    ...base,
    minHeight: PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX,
    padding: "10px 12px",
  };
}
