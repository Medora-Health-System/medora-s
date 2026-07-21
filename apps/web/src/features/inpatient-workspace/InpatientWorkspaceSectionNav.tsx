"use client";

import { useI18n } from "@/lib/i18n";
import {
  INPATIENT_WORKSPACE_SECTIONS,
  type InpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";

export function InpatientWorkspaceSectionNav({
  active,
  onSelect,
}: {
  active: InpatientWorkspaceSection;
  onSelect: (section: InpatientWorkspaceSection) => void;
}) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t("inpatientD3e.sectionNavAria")}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
      }}
    >
      {INPATIENT_WORKSPACE_SECTIONS.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            data-testid={`inpatient-nav-${s.id}`}
            onClick={() => onSelect(s.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 9999,
              border: isActive ? "1px solid #0f766e" : "1px solid #cbd5e1",
              background: isActive ? "#ccfbf1" : "#fff",
              color: isActive ? "#115e59" : "#334155",
              fontSize: 12,
              fontWeight: isActive ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {t(s.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
