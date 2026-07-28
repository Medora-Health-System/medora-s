"use client";

import Link from "next/link";
import {
  resolveClinicWorkspaceAccess,
  resolveVisibleClinicTopTabs,
  type ClinicWorkspaceNavId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

export function ClinicCareTopNav({ active }: { active: ClinicWorkspaceNavId }) {
  const { t } = useI18n();
  const {
    roles,
    ready,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
  } = useFacilityAndRoles();

  const tabs = ready
    ? resolveVisibleClinicTopTabs(
        resolveClinicWorkspaceAccess({
          roleCodes: roles,
          facilityType,
          facilityServiceLines,
          careProfileJson,
          facilityCountry,
        }).access
      )
    : [];

  return (
    <nav
      aria-label={t("clinicCareD4c2.shellNavLabel")}
      data-testid="clinic-care-top-nav"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
      }}
    >
      {tabs.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`clinic-care-top-tab-${item.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: isActive ? 700 : 600,
              textDecoration: "none",
              border: isActive ? `1px solid ${CLINIC_CARE_SHELL.accent}` : `1px solid ${CLINIC_CARE_SHELL.border}`,
              background: isActive ? "rgba(13,148,136,0.12)" : "#fff",
              color: isActive ? "#0f766e" : "#334155",
            }}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
