/**
 * MEDUI.D4C.5B — Active Clinic Workspace section tile row.
 * Modestly larger touch targets (D4C.5B.2) — wrap labels, no clip.
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
        gap: 10,
        padding: "2px 0 6px",
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
              justifyContent: "flex-start",
              gap: 4,
              minWidth: 76,
              minHeight: 64,
              padding: "8px 8px 7px",
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
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: selected ? accent : "#f1f5f9",
                color: selected ? "#fff" : "#475569",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {abbrev}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: selected ? accent : "#64748b",
                textAlign: "center",
                lineHeight: 1.2,
                maxWidth: 88,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
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
