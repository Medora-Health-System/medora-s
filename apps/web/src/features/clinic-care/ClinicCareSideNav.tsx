"use client";

import Link from "next/link";
import {
  resolveClinicWorkspaceAccess,
  resolveVisibleClinicSideNav,
  type ClinicWorkspaceNavId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

export function ClinicCareSideNav({ active }: { active: ClinicWorkspaceNavId }) {
  const { t } = useI18n();
  const {
    roles,
    ready,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
  } = useFacilityAndRoles();

  const items = ready
    ? resolveVisibleClinicSideNav(
        resolveClinicWorkspaceAccess({
          roleCodes: roles,
          facilityType,
          facilityServiceLines,
          careProfileJson,
          facilityCountry,
        }).access
      )
    : [];

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={t("clinicCareD4c2a.sideNavLabel")}
      data-testid="clinic-care-side-nav"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 168,
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`clinic-care-side-link-${item.id}`}
            style={{
              display: "block",
              padding: "8px 10px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              textDecoration: "none",
              border: isActive ? `1px solid ${CLINIC_CARE_SHELL.accent}` : "1px solid transparent",
              background: isActive ? "rgba(13,148,136,0.1)" : "transparent",
              color: isActive ? "#0f766e" : "#475569",
            }}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
