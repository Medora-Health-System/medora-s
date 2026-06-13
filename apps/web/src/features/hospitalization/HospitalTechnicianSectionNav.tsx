"use client";

import React, { useEffect, useRef } from "react";
import {
  MedoraCard,
  MedoraCardIdentity,
  MedoraCardInner,
} from "@/components/medora-card";
import type { HospitalTechnicianSection } from "./hospitalTechnicianSections";
import {
  erDashboardChipButtonStyle,
  erDashboardChipRailStyle,
  erDashboardTileGridStyle,
  type EmergencyChartLayoutMode,
  usesErDesktopTileNav,
} from "@/features/emergency/emergencyChartResponsiveLayout";
import { emergencyChartUsesBottomRail } from "@/features/emergency/emergencyChartTouchNavigationMode";

export type HospitalTechnicianDashboardTile = {
  kind: "section";
  id: HospitalTechnicianSection;
  accent: string;
  initials: string;
  ariaLabel: string;
};

export function HospitalTechnicianSectionNav({
  tiles,
  activeSection,
  onSelect,
  layoutMode,
  heading,
}: {
  tiles: HospitalTechnicianDashboardTile[];
  activeSection: HospitalTechnicianSection;
  onSelect: (section: HospitalTechnicianSection) => void;
  layoutMode: EmergencyChartLayoutMode;
  heading: string;
}) {
  const chipRefs = useRef<Partial<Record<HospitalTechnicianSection, HTMLButtonElement | null>>>({});
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
        <div style={erDashboardTileGridStyle()}>
          {tiles.map((tile) => {
            const active = tile.id === activeSection;
            return (
              <button
                key={tile.id}
                type="button"
                aria-label={tile.ariaLabel}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(tile.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "14px 10px",
                  borderRadius: 12,
                  border: active ? `2px solid ${tile.accent}` : "1px solid #e2e8f0",
                  backgroundColor: active ? "#fff" : "#f8fafc",
                  cursor: "pointer",
                  minHeight: 72,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: active ? tile.accent : "#64748b",
                  }}
                >
                  {tile.initials}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={erDashboardChipRailStyle()}>
          {tiles.map((tile) => {
            const active = tile.id === activeSection;
            return (
              <button
                key={tile.id}
                ref={(el) => {
                  chipRefs.current[tile.id] = el;
                }}
                type="button"
                aria-label={tile.ariaLabel}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(tile.id)}
                style={erDashboardChipButtonStyle(active, false, layoutMode)}
              >
                {tile.initials}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function HospitalTechnicianBottomRail({
  tiles,
  activeSection,
  onSelect,
}: {
  tiles: HospitalTechnicianDashboardTile[];
  activeSection: HospitalTechnicianSection;
  onSelect: (section: HospitalTechnicianSection) => void;
}) {
  return (
    <nav
      aria-label="Hospital technician workspace"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "flex",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#fff",
        padding: "6px 8px calc(6px + env(safe-area-inset-bottom))",
        gap: 6,
      }}
    >
      {tiles.map((tile) => {
        const active = tile.id === activeSection;
        return (
          <button
            key={tile.id}
            type="button"
            aria-label={tile.ariaLabel}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(tile.id)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: 10,
              border: active ? `2px solid ${tile.accent}` : "1px solid #e2e8f0",
              backgroundColor: active ? "#f8fafc" : "#fff",
              fontSize: 11,
              fontWeight: 700,
              color: active ? tile.accent : "#64748b",
              cursor: "pointer",
            }}
          >
            {tile.initials}
          </button>
        );
      })}
    </nav>
  );
}

export function HospitalTechnicianPlaceholderCard({
  initials,
  title,
  subline,
  accent,
}: {
  initials: string;
  title: string;
  subline?: string;
  accent: string;
}) {
  return (
    <MedoraCard leftAccentColor={accent} variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials={initials}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{title}</p>
          {subline ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>{subline}</p>
          ) : null}
        </MedoraCardIdentity>
      </MedoraCardInner>
    </MedoraCard>
  );
}
