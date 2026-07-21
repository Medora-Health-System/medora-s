"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareSectionNav } from "./HospitalCareSectionNav";
import { canAccessHospitalCareSection } from "./hospitalCareSectionAccess";
import {
  HOSPITAL_CARE_HOME,
  type HospitalCareSectionId,
} from "./hospitalCarePaths";

export function HospitalCareShell({
  active,
  title,
  subtitle,
  children,
  actions,
}: {
  active: HospitalCareSectionId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const { roles, ready } = useFacilityAndRoles();
  const denied =
    ready && active !== "home" && !canAccessHospitalCareSection(active, roles);

  return (
    <div
      data-testid="hospital-care-shell"
      style={{
        minHeight: "calc(100vh - 48px)",
        background: "#f8fafc",
        padding: "16px 16px 32px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            {active !== "home" ? (
              <Link
                href={HOSPITAL_CARE_HOME}
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  color: "#0f766e",
                  marginBottom: 6,
                  textDecoration: "none",
                }}
              >
                {t("hospitalCareD3ca.backHome")}
              </Link>
            ) : null}
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 1.45,
                  maxWidth: 640,
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions}
        </div>

        <HospitalCareSectionNav active={active} />

        <div
          style={{
            ...MEDORA_CARD_SHELL,
            borderRadius: MEDORA_CARD_SHELL.radius,
            border: MEDORA_CARD_SHELL.border,
            background: MEDORA_CARD_SHELL.background,
            boxShadow: MEDORA_CARD_SHELL.boxShadow,
            padding: 16,
          }}
        >
          {denied ? (
            <p
              style={{ fontSize: 13, color: "#b91c1c" }}
              role="alert"
              data-testid="hospital-care-access-denied"
            >
              {t("hospitalCareD3ca.accessDenied")}
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
