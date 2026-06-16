"use client";

import type { ProviderDocumentationDashboardCardStatus } from "@/lib/providerDocumentationDashboardContracts";

export type MedicalExamHealthCardProps = {
  label: string;
  count: number;
  status: ProviderDocumentationDashboardCardStatus;
  statusLabel: string;
  helperText?: string;
  testId?: string;
};

export function MedicalExamHealthCard({
  label,
  count,
  status,
  statusLabel,
  helperText,
  testId,
}: MedicalExamHealthCardProps) {
  const statusColor =
    status === "pass" ? "#166534" : status === "warning" ? "#92400e" : status === "fail" ? "#991b1b" : "#475569";

  return (
    <div
      data-testid={testId}
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{label}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>{count}</div>
      {helperText ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{helperText}</div> : null}
    </div>
  );
}
