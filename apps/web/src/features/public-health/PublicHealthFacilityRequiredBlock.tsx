"use client";

import { useI18n } from "@/lib/i18n";

/** État explicite lorsque les pages santé publique sont ouvertes sans contexte établissement (API scoping). */
export function PublicHealthFacilityRequiredBlock() {
  const { t } = useI18n();
  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: 0, fontSize: 22, fontWeight: 600 }}>{t("publicHealthModule.facilityRequiredTitle")}</h1>
      <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.55, marginTop: 12 }}>
        {t("publicHealthModule.facilityRequiredBody")}
      </p>
    </div>
  );
}
