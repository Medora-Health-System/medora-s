"use client";

import { useI18n } from "@/lib/i18n";
import {
  INPATIENT_STICKY_NAV_SECTIONS,
  type InpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";

export function InpatientWorkspaceSectionNav({
  active,
  onSelect,
  allowedSections,
}: {
  active: InpatientWorkspaceSection;
  onSelect: (section: InpatientWorkspaceSection) => void;
  allowedSections?: readonly InpatientWorkspaceSection[];
}) {
  const { t } = useI18n();
  const sections = allowedSections?.length
    ? INPATIENT_STICKY_NAV_SECTIONS.filter((s) => allowedSections.includes(s.id))
    : INPATIENT_STICKY_NAV_SECTIONS;

  return (
    <nav
      aria-label={t("inpatientCompactHeaderD4a32.stickyNavAria")}
      data-testid="inpatient-sticky-section-nav"
      style={{
        display: "flex",
        flexWrap: "nowrap",
        gap: 6,
        marginBottom: 12,
        padding: "8px 0",
        position: "sticky",
        top: 0,
        zIndex: 26,
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
      }}
    >
      {sections.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            data-testid={`inpatient-nav-${s.id}`}
            onClick={() => onSelect(s.id)}
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "7px 11px",
              borderRadius: 9999,
              border: isActive ? "1px solid #0f766e" : "1px solid #cbd5e1",
              background: isActive ? "#ccfbf1" : "#fff",
              color: isActive ? "#115e59" : "#334155",
              fontSize: 12,
              fontWeight: isActive ? 700 : 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            <span aria-hidden style={{ marginRight: 5 }}>
              {s.icon}
            </span>
            {t(s.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
