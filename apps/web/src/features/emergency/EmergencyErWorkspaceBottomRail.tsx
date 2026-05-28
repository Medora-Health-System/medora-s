"use client";

import React, { useEffect, useRef } from "react";
import type { ErWorkspaceSection } from "@/features/emergency/EmergencyActiveWorkspaceView";
import type { ErDashboardTile } from "@/features/emergency/EmergencyErWorkspaceSectionNav";
import type { EmergencyChartLayoutMode } from "@/features/emergency/emergencyChartResponsiveLayout";
import {
  clinicalBottomRailButtonStyle,
  clinicalBottomRailStyle,
  usesBottomClinicalRail,
} from "@/lib/clinicalTouchNavigation";
import { emergencyChartTouchNavigationMode } from "@/features/emergency/emergencyChartTouchNavigationMode";

export function EmergencyErWorkspaceBottomRail({
  tiles,
  activeSection,
  onSelect,
  layoutMode,
  ariaLabel,
}: {
  tiles: ErDashboardTile[];
  activeSection: ErWorkspaceSection;
  onSelect: (section: ErWorkspaceSection) => void;
  layoutMode: EmergencyChartLayoutMode;
  ariaLabel: string;
}) {
  const touchNavMode = emergencyChartTouchNavigationMode(layoutMode);
  const buttonRefs = useRef<Partial<Record<ErWorkspaceSection, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (!usesBottomClinicalRail(touchNavMode)) return;
    buttonRefs.current[activeSection]?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [activeSection, touchNavMode]);

  if (!usesBottomClinicalRail(touchNavMode)) return null;

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      data-testid="emergency-workspace-bottom-rail"
      data-touch-nav-mode={touchNavMode}
      style={clinicalBottomRailStyle(touchNavMode)}
    >
      {tiles.map((tile) => {
        const selected = activeSection === tile.id;
        return (
          <button
            key={tile.id}
            ref={(el) => {
              buttonRefs.current[tile.id] = el;
            }}
            type="button"
            role="tab"
            disabled={tile.disabled}
            aria-label={tile.ariaLabel}
            aria-selected={selected}
            aria-current={selected ? "true" : undefined}
            onClick={() => {
              if (!tile.disabled) onSelect(tile.id);
            }}
            style={clinicalBottomRailButtonStyle(selected, tile.disabled)}
          >
            {tile.initials}
          </button>
        );
      })}
    </nav>
  );
}
