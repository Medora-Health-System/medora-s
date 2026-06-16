"use client";

import type { ProviderDocumentationDashboardCardStatus } from "@/lib/providerDocumentationDashboardContracts";

const STATUS_COLORS: Record<ProviderDocumentationDashboardCardStatus, { bg: string; border: string; text: string }> = {
  pass: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  fail: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  neutral: { bg: "#f8fafc", border: "#e2e8f0", text: "#334155" },
};

export type MedicalExamMetricCardProps = {
  label: string;
  value: string | number;
  status?: ProviderDocumentationDashboardCardStatus;
  testId?: string;
};

export function MedicalExamMetricCard({ label, value, status = "neutral", testId }: MedicalExamMetricCardProps) {
  const colors = STATUS_COLORS[status];
  return (
    <div
      data-testid={testId}
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}
