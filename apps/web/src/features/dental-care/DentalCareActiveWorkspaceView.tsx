"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

/**
 * MEDUI.D5A.3 — Legacy /workspace route points users to the encounter worklist.
 * Canonical active workspace is /app/dental/encounters/:encounterId.
 */
export function DentalCareActiveWorkspaceView() {
  const { t } = useI18n();

  return (
    <div data-testid="dental-active-workspace" style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{t("dentalCareD5a2.workspace.title")}</h2>
      <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
        {t("dentalCareD5a3.worklist.intro")}
      </p>
      <p style={{ margin: "12px 0 0" }}>
        <Link href="/app/dental" style={{ fontWeight: 600 }}>
          {t("dentalCareD5a3.backToDental")}
        </Link>
      </p>
    </div>
  );
}
