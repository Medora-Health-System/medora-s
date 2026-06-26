"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  filterMedicationOrderLifecycleEventsForItem,
  medicationOrderLifecycleEventLabelKey,
} from "@/lib/medicationOrderLifecycleHistory";

export function MedicationOrderLifecycleHistoryModal({
  open,
  onClose,
  orderItemId,
  orderId,
  orderEvents,
  medicationLabel,
}: {
  open: boolean;
  onClose: () => void;
  orderItemId: string;
  orderId: string;
  orderEvents: unknown[];
  medicationLabel: string;
}) {
  const { t, language } = useI18n();
  const rows = useMemo(
    () => filterMedicationOrderLifecycleEventsForItem(orderEvents, orderItemId, orderId),
    [orderEvents, orderItemId, orderId]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-lifecycle-history-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(100%, 560px)",
          maxHeight: "min(80vh, 640px)",
          overflow: "auto",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 12px 40px rgba(15,23,42,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="medication-lifecycle-history-title" style={{ margin: "0 0 4px" }}>
          {t("medicationOrderLifecycle.historyTitle")}
        </h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>{medicationLabel}</p>
        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("medicationOrderLifecycle.historyEmpty")}
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid="medication-lifecycle-history-row"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <strong>{t(medicationOrderLifecycleEventLabelKey(row.eventType))}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  {t("medicationOrderLifecycle.historyPerformedAt")}:{" "}
                  {formatEncounterChromeDateTime(row.performedAt, language)}
                </div>
                {row.performedByDisplayName ? (
                  <div style={{ color: "#64748b" }}>
                    {t("medicationOrderLifecycle.historyPerformedBy")}: {row.performedByDisplayName}
                  </div>
                ) : null}
                {row.reason ? (
                  <div>
                    {t("medicationOrderLifecycle.summary.reason")}: {row.reason}
                  </div>
                ) : null}
                {row.note ? (
                  <div>
                    {t("medicationOrderLifecycle.summary.note")}: {row.note}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnStyle}>
            {t("medicationOrderLifecycle.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
