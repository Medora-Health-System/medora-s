"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  isFacilityCareSettingPathAllowed,
  resolveDentalSpecialtiesFromCareProfile,
  resolveDentalWorkspaceAccess,
  resolveDentalWorkspaceActiveNavId,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveVisibleDentalNavItems,
  type D5a2DentalWorkspaceTab,
  D5A2_DENTAL_WORKSPACE_TABS,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

/**
 * MEDUI.D5A.2 — Dental Care workspace shell (routing only).
 * No odontogram / periodontal / orthodontic clinical implementation.
 */
export function DentalCareShell({
  children,
  title,
  subtitle,
  showWorkspaceTabs = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showWorkspaceTabs?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "/app/dental";
  const {
    roles,
    ready,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
  } = useFacilityAndRoles();

  const specialties = resolveDentalSpecialtiesFromCareProfile(careProfileJson);
  const capabilities = ready
    ? resolveFacilityModuleCapabilitiesD4c1({
        facilityType,
        careProfileJson,
        serviceLines: facilityServiceLines,
        facilityCountry,
      })
    : null;
  const pathAllowed =
    ready &&
    capabilities != null &&
    isFacilityCareSettingPathAllowed(pathname, {
      roleCodes: roles,
      facilityType,
      facilityServiceLines,
      careProfileJson,
      facilityCountry,
    });

  const access =
    ready && capabilities
      ? resolveDentalWorkspaceAccess({
          roleCodes: roles,
          dentalCareEnabled: capabilities.dentalCareEnabled,
          specialties,
        })
      : null;

  useEffect(() => {
    if (!ready) return;
    if (!pathAllowed || !access?.canAccessDentalShell) {
      router.replace("/app");
    }
  }, [ready, pathAllowed, access?.canAccessDentalShell, router]);

  if (!ready) {
    return <p style={{ padding: 24 }}>{t("common.loading")}</p>;
  }

  if (!pathAllowed || !access?.canAccessDentalShell) {
    return (
      <div style={{ padding: 24 }} data-testid="dental-care-access-denied">
        <p>{t("dentalCareD5a2.errors.accessDenied")}</p>
      </div>
    );
  }

  const navItems = resolveVisibleDentalNavItems(access);
  const activeNav = resolveDentalWorkspaceActiveNavId(pathname) ?? "dashboard";

  return (
    <div data-testid="dental-care-shell" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <header style={{ ...MEDORA_CARD_SHELL, padding: "12px 16px" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {title ?? t("dentalCareD5a2.title")}
        </h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          {subtitle ?? t("dentalCareD5a2.shellSubtitle")}
        </p>
      </header>

      <nav
        aria-label={t("dentalCareD5a2.shellNavLabel")}
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        data-testid="dental-care-top-nav"
      >
        {navItems.map((item) => {
          const active = item.id === activeNav;
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                padding: "6px 12px",
                borderRadius: 9999,
                fontSize: 13,
                textDecoration: "none",
                border: active ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                background: active ? "rgba(79,70,229,0.12)" : "#fff",
                color: "#0f172a",
                fontWeight: active ? 600 : 500,
              }}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {showWorkspaceTabs ? (
        <nav
          aria-label={t("dentalCareD5a2.workspace.tabsLabel")}
          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          data-testid="dental-workspace-tabs"
        >
          {D5A2_DENTAL_WORKSPACE_TABS.map((tab: D5a2DentalWorkspaceTab) => (
            <span
              key={tab}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
              }}
            >
              {t(`dentalCareD5a2.workspace.tabs.${tab}`)}
              {tab === "odontogram" || tab === "periodontal" ? (
                <span style={{ marginLeft: 6, color: "#94a3b8" }}>
                  ({t("dentalCareD5a2.workspace.placeholderBadge")})
                </span>
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}

      <main>{children}</main>
    </div>
  );
}
