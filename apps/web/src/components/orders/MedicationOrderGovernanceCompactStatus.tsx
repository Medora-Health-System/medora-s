"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { MedicationOrderLifecycleReadOnlyBadge } from "@/components/orders/MedicationOrderLifecycleReadOnlyBadge";

export type MedicationOrderGovernanceCompactStatusProps = {
  orderItem: Record<string, unknown>;
  ordersRaw?: unknown[];
  marExecutionSummary?: string | null;
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.35,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
};

export function MedicationOrderGovernanceCompactStatus({
  orderItem,
  ordersRaw = [],
  marExecutionSummary = null,
}: MedicationOrderGovernanceCompactStatusProps) {
  const { t } = useI18n();
  const marLabel = useMemo(
    () => (marExecutionSummary ? t(marExecutionSummary) : null),
    [marExecutionSummary, t]
  );

  return (
    <div
      data-testid="medication-order-governance-compact-status"
      style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
    >
      {marLabel ? (
        <span data-testid="medication-order-mar-compact-badge" style={pillStyle}>
          {marLabel}
        </span>
      ) : null}
      <MedicationOrderLifecycleReadOnlyBadge item={orderItem} orders={ordersRaw} compact />
    </div>
  );
}
