"use client";

import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

/** MEDUI.D5A.2 — placeholder route panel (no business logic). */
export function DentalCarePlaceholderPanel({
  titleKey,
  bodyKey,
  testId,
}: {
  titleKey: string;
  bodyKey: string;
  testId: string;
}) {
  const { t } = useI18n();
  return (
    <div data-testid={testId} style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{t(titleKey)}</h2>
      <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>{t(bodyKey)}</p>
    </div>
  );
}
