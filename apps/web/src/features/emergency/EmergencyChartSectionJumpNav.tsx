"use client";

import React, { useCallback } from "react";
import {
  erDashboardChipButtonStyle,
  erDashboardChipRailStyle,
} from "@/features/emergency/emergencyChartResponsiveLayout";

export type EmergencyChartJumpSection = {
  targetId: string;
  label: string;
};

export function EmergencyChartSectionJumpNav({
  sections,
  heading,
}: {
  sections: EmergencyChartJumpSection[];
  heading: string;
}) {
  const jumpToSection = useCallback((targetId: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <nav aria-label={heading} style={{ marginBottom: 16 }} data-testid="emergency-chart-section-jump-nav">
      <h2
        style={{
          margin: "0 0 10px 0",
          fontSize: 13,
          fontWeight: 600,
          color: "#64748b",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {heading}
      </h2>
      <div role="list" style={erDashboardChipRailStyle()}>
        {sections.map((section) => (
          <button
            key={section.targetId}
            type="button"
            role="listitem"
            aria-label={section.label}
            onClick={() => jumpToSection(section.targetId)}
            style={erDashboardChipButtonStyle(false, false)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
