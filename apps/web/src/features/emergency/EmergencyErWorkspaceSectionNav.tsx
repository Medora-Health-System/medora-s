"use client";

import React, { useEffect, useRef } from "react";
import {
  MedoraCard,
  MedoraCardIdentity,
  MedoraCardInner,
} from "@/components/medora-card";
import type { ErWorkspaceSection } from "@/features/emergency/EmergencyActiveWorkspaceView";
import {
  erDashboardChipButtonStyle,
  erDashboardChipRailStyle,
  erDashboardTileGridStyle,
  type EmergencyChartLayoutMode,
  usesErDesktopTileNav,
} from "@/features/emergency/emergencyChartResponsiveLayout";
import { emergencyChartUsesBottomRail } from "@/features/emergency/emergencyChartTouchNavigationMode";

const DASHBOARD_SHORT_LABELS: Record<string, string> = {
  T: "Triage",
  ME: "Medical Exam",
  O: "Orders",
  M: "Medications",
  R: "Results",
  Dx: "Diagnostics",
  CD: "Clinical Data",
  NA: "Nurse Assessment",
  N: "Notes",
  D: "Disposition",
  S: "Summary",
};

export type ErDashboardTile = {
  kind: "section";
  id: ErWorkspaceSection;
  accent: string;
  initials: string;
  ariaLabel: string;
  disabled: boolean;
  dataTestId?: string;
};

export function EmergencyErWorkspaceSectionNav({
  tiles,
  activeSection,
  onSelect,
  layoutMode,
  heading,
}: {
  tiles: ErDashboardTile[];
  activeSection: ErWorkspaceSection;
  onSelect: (section: ErWorkspaceSection) => void;
  layoutMode: EmergencyChartLayoutMode;
  heading: string;
}) {
  const chipRefs = useRef<Partial<Record<ErWorkspaceSection, HTMLButtonElement | null>>>({});
  const desktopNav = usesErDesktopTileNav(layoutMode);
  const bottomRailNav = emergencyChartUsesBottomRail(layoutMode);

  useEffect(() => {
    if (desktopNav || bottomRailNav) return;
    chipRefs.current[activeSection]?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeSection, desktopNav, bottomRailNav]);

  if (bottomRailNav) {
    return null;
  }

  return (
    <section aria-label={heading} style={{ marginBottom: 20 }}>
      <h2
        style={{
          margin: "0 0 12px 0",
          fontSize: 13,
          fontWeight: 600,
          color: "#64748b",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {heading}
      </h2>
      {desktopNav ? (
        <div
          style={erDashboardTileGridStyle()}
          data-testid="emergency-workspace-section-nav-desktop"
          data-layout-mode={layoutMode}
        >
          {tiles.map((q) => {
            const selected = activeSection === q.id;
            return (
              <div
                key={q.id}
                style={{
                  minWidth: 0,
                  borderRadius: 16,
                  outline: selected ? "2px solid #2563eb" : "1px solid transparent",
                  outlineOffset: 0,
                  transition: "outline-color 0.12s ease",
                }}
              >
                <button
                  type="button"
                  disabled={q.disabled}
                  aria-label={q.ariaLabel}
                  aria-current={selected ? "true" : undefined}
                  data-testid={q.dataTestId}
                  onClick={() => {
                    if (!q.disabled) onSelect(q.id);
                  }}
                  style={{
                    width: "100%",
                    minWidth: 0,
                    margin: 0,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: q.disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    opacity: q.disabled ? 0.55 : 1,
                  }}
                >
                  <MedoraCard leftAccentColor={q.accent} variant="default">
                    <MedoraCardInner>
                      <MedoraCardIdentity initials={q.initials}>{null}</MedoraCardIdentity>
                      <div className="mt-1 text-[10px] leading-none text-gray-500 text-center truncate">
                        {DASHBOARD_SHORT_LABELS[q.initials]}
                      </div>
                    </MedoraCardInner>
                  </MedoraCard>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          role="tablist"
          aria-label={heading}
          style={erDashboardChipRailStyle()}
          data-testid="emergency-workspace-section-nav-mobile"
          data-layout-mode={layoutMode}
        >
          {tiles.map((q) => {
            const selected = activeSection === q.id;
            return (
              <button
                key={q.id}
                ref={(el) => {
                  chipRefs.current[q.id] = el;
                }}
                type="button"
                role="tab"
                disabled={q.disabled}
                aria-label={q.ariaLabel}
                aria-selected={selected}
                aria-current={selected ? "true" : undefined}
                onClick={() => {
                  if (!q.disabled) onSelect(q.id);
                }}
                  style={erDashboardChipButtonStyle(selected, q.disabled, layoutMode)}
              >
                {q.ariaLabel}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
