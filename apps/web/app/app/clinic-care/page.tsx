"use client";

import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";

/**
 * MEDUI.D4C.1 — Clinic Care routing placeholder.
 * Full colorful trackboard + shell redesign → MEDUI.D4C.2.
 */
export default function ClinicCarePlaceholderPage() {
  const { t } = useI18n();

  return (
    <main style={{ padding: 16, maxWidth: 960 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>{t("clinicCareD4c1.title")}</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>{t("clinicCareD4c1.subtitle")}</p>
      </header>
      <section
        style={{
          ...MEDORA_CARD_SHELL,
          padding: 16,
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 }}>{t("clinicCareD4c1.placeholderBody")}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c1.deferredNote")}</p>
      </section>
    </main>
  );
}
