"use client";

import type { ReactNode } from "react";
import { EnterpriseClosedEncounterLockBadge } from "@/components/encounters/EnterpriseClosedEncounterLockBadge";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

type Props = {
  closedAt?: string | null;
  closedByDisplay?: string | null;
  careSettingLabel?: string | null;
  previouslyReopened?: boolean;
  actions?: ReactNode;
};

/**
 * MEDUI.D4C.8A — enterprise closed encounter read-only banner.
 */
export function EnterpriseClosedEncounterBanner({
  closedAt,
  closedByDisplay,
  careSettingLabel,
  previouslyReopened,
  actions,
}: Props) {
  const { t, language } = useI18n();
  const closedAtLabel = closedAt ? formatEncounterChromeDateTime(closedAt, language) : null;

  return (
    <section
      data-testid="enterprise-closed-encounter-banner"
      role="status"
      aria-live="polite"
      style={{
        marginBottom: 14,
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid #d4d4d8",
        background: "linear-gradient(180deg, #f4f4f5 0%, #fafafa 100%)",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <EnterpriseClosedEncounterLockBadge closedAtLabel={closedAtLabel} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#18181b" }}>
            {t("enterpriseClosedEncounterD4c8a.banner.title")}
          </h2>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#3f3f46", lineHeight: 1.45 }}>
          {t("enterpriseClosedEncounterD4c8a.banner.readOnly")}
        </p>
        <div style={{ fontSize: 13, color: "#52525b", lineHeight: 1.45 }}>
          {closedAtLabel ? (
            <div>
              <strong>{t("enterpriseClosedEncounterD4c8a.banner.closedAt")}</strong> {closedAtLabel}
            </div>
          ) : null}
          {closedByDisplay ? (
            <div>
              <strong>{t("enterpriseClosedEncounterD4c8a.banner.closedBy")}</strong> {closedByDisplay}
            </div>
          ) : null}
          {careSettingLabel ? (
            <div>
              <strong>{t("enterpriseClosedEncounterD4c8a.banner.careSetting")}</strong>{" "}
              {careSettingLabel}
            </div>
          ) : null}
          {previouslyReopened ? (
            <div style={{ marginTop: 4, fontWeight: 600, color: "#334155" }}>
              {t("enterpriseClosedEncounterD4c8a.banner.previouslyReopened")}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? <div style={{ flex: "0 0 auto" }}>{actions}</div> : null}
    </section>
  );
}
