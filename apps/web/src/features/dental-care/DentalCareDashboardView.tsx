"use client";

import {
  D5A2_DENTAL_DASHBOARD_SECTIONS,
  projectDentalDashboardShellPlaceholders,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

/**
 * MEDUI.D5A.2 — Dental dashboard shell. Cards are placeholders; no Dental repositories.
 */
export function DentalCareDashboardView() {
  const { t } = useI18n();
  const placeholders = projectDentalDashboardShellPlaceholders();

  return (
    <div data-testid="dental-care-dashboard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("dentalCareD5a2.dashboard.intro")}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {D5A2_DENTAL_DASHBOARD_SECTIONS.map((section) => (
          <article
            key={section}
            data-testid={`dental-dashboard-card-${section}`}
            style={{ ...MEDORA_CARD_SHELL, padding: 14 }}
          >
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {t(`dentalCareD5a2.dashboard.sections.${section}`)}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a2.dashboard.placeholder")}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
              {placeholders[section].status}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
