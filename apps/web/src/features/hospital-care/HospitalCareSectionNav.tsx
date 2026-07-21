"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { filterHospitalCareSectionsForRoles } from "./hospitalCareSectionAccess";
import type { HospitalCareSectionId } from "./hospitalCarePaths";

export function HospitalCareSectionNav({
  active,
}: {
  active: HospitalCareSectionId;
}) {
  const { t } = useI18n();
  const { roles, ready } = useFacilityAndRoles();
  const sections = ready
    ? filterHospitalCareSectionsForRoles(roles)
    : filterHospitalCareSectionsForRoles(["ADMIN", "PROVIDER", "RN", "LAB", "RADIOLOGY"]);

  return (
    <nav
      aria-label={t("hospitalCareD3ca.sectionNavAria")}
      data-testid="hospital-care-section-nav"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 16,
      }}
    >
      {sections.map((section) => {
        const isActive = section.id === active;
        return (
          <Link
            key={section.id}
            href={section.href}
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
              textDecoration: "none",
            }}
          >
            {t(section.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
