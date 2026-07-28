/**
 * MEDUI.D4C.5B — Active Clinic Workspace section tile row.
 * Compact circular/tile row (density rule) — no ED layout-mode / bottom-rail machinery.
 */

"use client";

import React from "react";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_ABBREV,
  CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_ACCENT,
  CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_LABEL_KEY,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "@medora/shared";

export function ClinicCareAmbulatoryWorkspaceSectionNav({
  sections,
  active,
  onSelect,
  t,
}: {
  /** Already role-filtered (getVisibleClinicCareAmbulatoryWorkspaceSections). */
  sections: readonly ClinicCareAmbulatoryWorkspaceSection[];
  active: ClinicCareAmbulatoryWorkspaceSection;
  onSelect: (section: ClinicCareAmbulatoryWorkspaceSection) => void;
  t: (key: string) => string;
}) {
  return (
    <nav
      aria-label={t("clinicCareD4c5b.tilesHeading")}
      role="tablist"
      data-testid="clinic-care-ambulatory-workspace-tiles"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "2px 0 4px",
      }}
    >
      {sections.map((section) => {
        const selected = section === active;
        const accent = CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_ACCENT[section];
        const abbrev = CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_ABBREV[section];
        const label = t(CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_LABEL_KEY[section]);
        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-current={selected ? "true" : undefined}
            aria-label={label}
            title={label}
            data-testid={`clinic-care-ambulatory-workspace-tile-${section}`}
            onClick={() => onSelect(section)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              minWidth: 58,
              padding: "6px 4px 5px",
              border: `1px solid ${selected ? accent : "#e2e8f0"}`,
              borderRadius: 12,
              background: selected ? `${accent}1a` : "#fff",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: selected ? accent : "#f1f5f9",
                color: selected ? "#fff" : "#475569",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {abbrev}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: selected ? accent : "#64748b",
                textAlign: "center",
                lineHeight: 1.15,
                maxWidth: 68,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
