"use client";

import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";

const FUTURE_LANES = [
  "icu",
  "or",
  "pacu",
  "cathLab",
  "rehab",
  "hospice",
  "external",
] as const;

export function HospitalCareTransfersShellView() {
  const { t } = useI18n();

  return (
    <HospitalCareShell
      active="transfers"
      title={t("hospitalCareD3ca.transfers.title")}
      subtitle={t("hospitalCareD3ca.transfers.subtitle")}
    >
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
        {t("hospitalCareD3ca.transfers.empty")}
      </p>
      <ul
        style={{
          margin: "12px 0 0",
          paddingLeft: 18,
          fontSize: 13,
          color: "#475569",
          lineHeight: 1.6,
        }}
      >
        {FUTURE_LANES.map((lane) => (
          <li key={lane}>{t(`hospitalCareD3ca.transfers.future.${lane}`)}</li>
        ))}
      </ul>
    </HospitalCareShell>
  );
}
