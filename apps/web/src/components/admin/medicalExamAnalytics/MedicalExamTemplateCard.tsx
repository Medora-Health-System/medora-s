"use client";

import { useI18n } from "@/lib/i18n";

export type MedicalExamTemplateCardProps = {
  templateId: string;
  familyId: string | null;
  governanceOwnerId: string | null;
  usageCount: number;
  completionRate: number;
  abandonmentCount: number;
  catalogChipCount: number;
  rankLabel?: string;
  testId?: string;
};

function formatPercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export function MedicalExamTemplateCard({
  templateId,
  familyId,
  governanceOwnerId,
  usageCount,
  completionRate,
  abandonmentCount,
  catalogChipCount,
  rankLabel,
  testId,
}: MedicalExamTemplateCardProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid={testId}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#fff",
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>{templateId}</span>
        {rankLabel ? <span style={{ color: "#64748b" }}>{rankLabel}</span> : null}
      </div>
      <div style={{ color: "#64748b", marginTop: 4 }}>
        {familyId ?? "—"} · {governanceOwnerId ?? "—"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, color: "#475569" }}>
        <span>
          {t("medicalExamAnalytics.templateUsage")} : {usageCount}
        </span>
        <span>
          {t("medicalExamAnalytics.templateChips")} : {catalogChipCount}
        </span>
        <span>
          {t("medicalExamAnalytics.templateCompletion")} : {formatPercent(completionRate)}
        </span>
        <span>
          {t("medicalExamAnalytics.templateAbandonment")} : {abandonmentCount}
        </span>
      </div>
    </div>
  );
}
