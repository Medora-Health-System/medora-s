"use client";

import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

/**
 * MEDUI.D5A.2 — Active Dental Workspace routing shell (tabs only; no clinical engines).
 */
export function DentalCareActiveWorkspaceView() {
  const { t } = useI18n();

  return (
    <div data-testid="dental-active-workspace" style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{t("dentalCareD5a2.workspace.title")}</h2>
      <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
        {t("dentalCareD5a2.workspace.body")}
      </p>
      <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#475569", fontSize: 13 }}>
        <li>{t("dentalCareD5a2.workspace.reuseNote")}</li>
        <li>{t("dentalCareD5a2.workspace.noOdontogram")}</li>
        <li>{t("dentalCareD5a2.workspace.noOrthoCase")}</li>
      </ul>
    </div>
  );
}
