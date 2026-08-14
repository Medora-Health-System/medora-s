"use client";

import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";

const LEGEND: Array<{ key: string; color: string }> = [
  { key: "CARIES", color: "#ef4444" },
  { key: "EXISTING_RESTORATION", color: "#38bdf8" },
  { key: "MISSING", color: "#94a3b8" },
  { key: "CROWN", color: "#fbbf24" },
  { key: "IMPLANT", color: "#64748b" },
  { key: "FRACTURE", color: "#f97316" },
  { key: "ROOT_CANAL_TREATED", color: "#a78bfa" },
  { key: "PLANNED", color: "#fde68a" },
];

export function DentalOdontogramLegend() {
  const { t } = useI18n();
  return (
    <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }} data-testid="dental-odontogram-legend">
      <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>{t("dentalCareD5a4.legend.title")}</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {LEGEND.map((item) => (
          <span key={item.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: item.color,
                border: "1px solid #cbd5e1",
              }}
            />
            {t(`dentalCareD5a4.findings.${item.key}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
