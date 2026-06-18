"use client";

import { useI18n } from "@/lib/i18n";
import type { RevenueClaimAuditSummaryCounts, RevenueClaimAuditStatus } from "@medora/shared";

type RevenueClaimAuditSummaryProps = {
  counts: RevenueClaimAuditSummaryCounts;
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  padding: "12px 14px",
  minWidth: 140,
  flex: "1 1 140px",
};

export function RevenueClaimAuditSummary({ counts }: RevenueClaimAuditSummaryProps) {
  const { t } = useI18n();

  const items: { key: keyof RevenueClaimAuditSummaryCounts; labelKey: string }[] = [
    { key: "accepted", labelKey: "revenueClaimAudit.summary.accepted" },
    { key: "rejected", labelKey: "revenueClaimAudit.summary.rejected" },
    { key: "needsCorrection", labelKey: "revenueClaimAudit.summary.needsCorrection" },
    { key: "pendingAck", labelKey: "revenueClaimAudit.summary.pendingAck" },
  ];

  return (
    <div
      data-testid="revenue-claim-audit-summary"
      style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
    >
      {items.map((item) => (
        <div key={item.key} data-testid={`revenue-claim-audit-summary-${item.key}`} style={cardStyle}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{t(item.labelKey)}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
            {counts[item.key]}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RevenueClaimAuditStatusBadge({
  status,
}: {
  status: RevenueClaimAuditStatus;
}) {
  const { t } = useI18n();
  const label = t(`revenueClaimAudit.status.${status}`);
  const palette: Record<RevenueClaimAuditStatus, { bg: string; color: string; border: string }> = {
    REVIEW_REQUIRED: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    READY_FOR_RESUBMISSION: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
    ACCEPTED: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
    PENDING_ACK: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    INFO_ONLY: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  };
  const colors = palette[status];
  return (
    <span
      data-testid={`revenue-claim-audit-status-${status.toLowerCase()}`}
      style={{
        display: "inline-block",
        borderRadius: 9999,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.color,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
