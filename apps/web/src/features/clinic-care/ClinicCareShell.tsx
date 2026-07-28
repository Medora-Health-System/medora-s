"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isClinicWorkspacePathAllowed,
  resolveClinicWorkspaceAccess,
  resolveClinicWorkspaceActiveNavId,
  resolveClinicWorkspaceLandingPath,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { ClinicCareTopNav } from "./ClinicCareTopNav";
import { ClinicCareSideNav } from "./ClinicCareSideNav";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

/**
 * MEDUI.D4C.2A — persistent Clinic Care workspace shell.
 * Subroutes replace the center panel only; top/side nav stay mounted via layout.
 */
export function ClinicCareShell({
  children,
  title,
  subtitle,
  showKpiRegion = false,
  kpiSlot,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** KPIs belong on Trackboard / Today's Visits (D4C.2), not every subroute. */
  showKpiRegion?: boolean;
  kpiSlot?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "/app/clinic-care";
  const {
    roles,
    ready,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
  } = useFacilityAndRoles();

  const active = resolveClinicWorkspaceActiveNavId(pathname) ?? "trackboard";
  const resolved = ready
    ? resolveClinicWorkspaceAccess({
        roleCodes: roles,
        facilityType,
        facilityServiceLines,
        careProfileJson,
        facilityCountry,
      })
    : null;

  useEffect(() => {
    if (!ready || !resolved) return;
    if (!resolved.access.canAccessClinicCareShell) {
      router.replace("/app");
      return;
    }
    if (!isClinicWorkspacePathAllowed(pathname, resolved.access)) {
      router.replace(
        resolveClinicWorkspaceLandingPath({
          professionGroup: resolved.professionGroup,
          access: resolved.access,
        })
      );
    }
  }, [ready, resolved, pathname, router]);

  const denied =
    ready &&
    resolved &&
    (!resolved.access.canAccessClinicCareShell ||
      !isClinicWorkspacePathAllowed(pathname, resolved.access));

  return (
    <div
      data-testid="clinic-care-shell"
      style={{
        minHeight: "calc(100vh - 48px)",
        background: CLINIC_CARE_SHELL.canvas,
        padding: "12px 16px 24px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.25rem, 2.2vw, 1.55rem)",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {title ?? t("clinicCareD4c2.title")}
            </h1>
            {subtitle ? (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{subtitle}</p>
            ) : (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                {t("clinicCareD4c2a.workspaceSubtitle")}
              </p>
            )}
          </div>
          {actions}
        </header>

        <ClinicCareTopNav active={active} />

        {showKpiRegion && kpiSlot ? (
          <div data-testid="clinic-care-kpi-region" style={{ marginBottom: 12 }}>
            {kpiSlot}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ClinicCareSideNav active={active} />
          <div
            style={{
              ...MEDORA_CARD_SHELL,
              borderRadius: MEDORA_CARD_SHELL.radius,
              border: MEDORA_CARD_SHELL.border,
              background: MEDORA_CARD_SHELL.background,
              boxShadow: MEDORA_CARD_SHELL.boxShadow,
              padding: 12,
              flex: 1,
              minWidth: 0,
            }}
            data-testid="clinic-care-main-panel"
          >
            {denied ? (
              <p
                style={{ fontSize: 13, color: "#b91c1c", margin: 0 }}
                role="alert"
                data-testid="clinic-care-access-denied"
              >
                {t("clinicCareD4c2.errors.accessDenied")}
              </p>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
