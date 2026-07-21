"use client";

import { useI18n } from "@/lib/i18n";
import {
  OBSERVATION_WORKSPACE_SECTIONS,
  type ObservationWorkspaceSection,
} from "./observationWorkspaceSections";

export function ObservationWorkspaceSectionNav({
  active,
  onSelect,
}: {
  active: ObservationWorkspaceSection;
  onSelect: (section: ObservationWorkspaceSection) => void;
}) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("observationD3d.sectionNavAria")}
      data-testid="observation-workspace-section-nav"
      style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
    >
      {OBSERVATION_WORKSPACE_SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 40,
              padding: "6px 12px",
              borderRadius: 9999,
              border: isActive ? "1px solid #0f766e" : "1px solid #e2e8f0",
              background: isActive ? "rgba(13,148,136,0.12)" : "#fff",
              color: isActive ? "#0f766e" : "#334155",
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {t(section.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
