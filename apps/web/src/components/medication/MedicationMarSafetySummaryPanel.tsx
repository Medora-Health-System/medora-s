"use client";

import React from "react";
import {
  getMedicationSafetyWarningSummary,
  medicationSafetyGovernanceHasDisplay,
  type MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export function MedicationMarSafetySummaryPanel({
  governance,
  density = "default",
}: {
  governance: MedicationSafetyGovernanceDisplayInput;
  density?: "default" | "compact";
}) {
  const { t } = useI18n();
  const lines = getMedicationSafetyWarningSummary(governance);
  if (!medicationSafetyGovernanceHasDisplay(governance) || lines.length === 0) return null;

  const pad = density === "compact" ? "8px 10px" : "10px 12px";
  const fontSize = density === "compact" ? 12 : 13;

  return (
    <section
      role="region"
      aria-label={t("marGovernance.summaryTitle")}
      style={{
        marginTop: density === "compact" ? 8 : 10,
        padding: pad,
        borderRadius: 8,
        border: "1px solid #fde68a",
        backgroundColor: "#fffbeb",
        fontSize,
        color: "#78350f",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#92400e" }}>{t("marGovernance.summaryTitle")}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {lines.map((line) => {
          const label = t(`marGovernance.summary.${line.labelKey}`);
          let valueText: string | null = null;
          if (line.kind === "pharmacy_verification" && line.value) {
            const statusKey = `marGovernance.pharmacyStatus.${line.value}`;
            const translated = t(statusKey);
            valueText = translated !== statusKey ? translated : line.value;
          } else if (line.value) {
            valueText = line.value;
          }
          const text =
            valueText != null && valueText !== ""
              ? t("marGovernance.summaryValue").replace("{label}", label).replace("{value}", valueText)
              : label;
          return (
            <li key={`${line.kind}-${line.labelKey}`} style={{ marginBottom: 4 }}>
              {text}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
