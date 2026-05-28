import type { EmergencyChartLayoutMode } from "@/features/emergency/emergencyChartResponsiveLayout";
import type { ClinicalTouchNavigationMode } from "@/lib/clinicalTouchNavigation";

export function emergencyChartTouchNavigationMode(
  layoutMode: EmergencyChartLayoutMode
): ClinicalTouchNavigationMode {
  if (layoutMode === "desktopSplit") return "desktopInline";
  if (layoutMode === "tabletFocused") return "tabletBottomRail";
  return "compactBottomRail";
}

export function emergencyChartUsesBottomRail(layoutMode: EmergencyChartLayoutMode): boolean {
  return layoutMode === "tabletFocused" || layoutMode === "mobileStacked";
}
