"use client";

import { useI18n } from "@/lib/i18n";

export type MedicalExamFamilyCardProps = {
  displayName: string;
  auditPhase: string | null;
  templateCount: number;
  usageCount: number;
  completionRate: number;
  totalChipCount: number;
  testId?: string;
};

function formatPercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export function MedicalExamFamilyCard({
  displayName,
  auditPhase,
  templateCount,
  usageCount,
  completionRate,
  totalChipCount,
  testId,
}: MedicalExamFamilyCardProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid={testId}
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{displayName}</div>
      {auditPhase ? <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{auditPhase}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12, color: "#475569" }}>
        <span>
          {t("medicalExamAnalytics.familyTemplates")} : {templateCount}
        </span>
        <span>
          {t("medicalExamAnalytics.familyChips")} : {totalChipCount}
        </span>
        <span>
          {t("medicalExamAnalytics.familyUsage")} : {usageCount}
        </span>
        <span>
          {t("medicalExamAnalytics.familyCompletion")} : {formatPercent(completionRate)}
        </span>
      </div>
    </div>
  );
}
