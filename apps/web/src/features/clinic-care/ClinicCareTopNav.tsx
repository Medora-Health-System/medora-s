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

/**
 * Keep the Clinic home navigation intentionally compact. These routes still exist and
 * remain protected by the normal capability/role guards; they are only removed from
 * the top shortcut strip to reduce visual duplication inside the Clinic workspace.
 *
 * Registration and Administration already live in the global left navigation. Public
 * Health remains available only from the jurisdiction-aware global navigation.
 */
const CLINIC_COMPACT_TOP_NAV_HIDDEN_IDS = new Set<ClinicWorkspaceNavId>([
  "registration",
  "provider",
  "orders",
  "results",
  "patients",
  "encounters",
  "publicHealth",
  "administration",
  "billing", // Billing belongs in the permission-gated global sidebar, not Clinic Care tabs.
]);

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
      ).filter((item) => !CLINIC_COMPACT_TOP_NAV_HIDDEN_IDS.has(item.id))
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
