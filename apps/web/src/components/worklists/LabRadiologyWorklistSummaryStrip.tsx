"use client";

import React from "react";
import type { LabRadWorklistOperationalSummary } from "@medora/shared";

export function LabRadiologyWorklistSummaryStrip({
  summary,
  t,
}: {
  summary: LabRadWorklistOperationalSummary;
  t: (key: string) => string;
}) {
  const cells = [
    { label: t("labRadEscalation.summaryActive"), value: summary.totalActive },
    { label: t("labRadEscalation.summaryNeedsEscalation"), value: summary.needsEscalation },
    { label: t("labRadEscalation.summaryCriticalDelay"), value: summary.criticalDelay },
    { label: t("labRadEscalation.summaryAwaitingAck"), value: summary.awaitingAcknowledgement },
    { label: t("labRadEscalation.summaryShiftHandoff"), value: summary.shiftHandoffReview },
    { label: t("labRadEscalation.summaryAdjustedTime"), value: summary.adjustedClinicalTime },
  ];

  return (
    <div
      role="status"
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fff",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {t("labRadEscalation.summaryTitle")}
      </div>
      <p style={{ margin: "0 0 10px 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>
        {t("labRadEscalation.summaryHint")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              minWidth: 100,
              padding: "8px 10px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
