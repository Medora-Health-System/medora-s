"use client";

import React from "react";
import type { MarAdministrationCorrectedBadge } from "@/features/mar/marClinicalCorrectionWorkflow";

export function MedicationAdministrationCorrectionBadge({
  badge,
  t,
  formatClinicalTime,
}: {
  badge: MarAdministrationCorrectedBadge;
  t: (key: string) => string;
  formatClinicalTime: (iso: string) => string;
}) {
  if (!badge.show) return null;

  const tooltipParts: string[] = [];
  if (badge.correctedByDisplay) {
    tooltipParts.push(
      `${t("marClinicalCorrection.badge.correctedBy")}: ${badge.correctedByDisplay}`
    );
  }
  if (badge.correctedAtIso) {
    tooltipParts.push(
      `${t("marClinicalCorrection.badge.correctedAt")}: ${formatClinicalTime(badge.correctedAtIso)}`
    );
  }
  if (badge.latestReasonLabelKey) {
    tooltipParts.push(`${t("marClinicalCorrection.badge.latestReason")}: ${t(badge.latestReasonLabelKey)}`);
  }

  return (
    <span
      data-testid="mar-clinical-correction-badge"
      title={tooltipParts.join(" · ")}
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 9999,
        background: badge.readOnly ? "#f1f5f9" : "#fff7ed",
        color: badge.readOnly ? "#475569" : "#9a3412",
        border: badge.readOnly ? "1px solid #cbd5e1" : "1px solid #fdba74",
        letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}
    >
      {t("marClinicalCorrection.badge.label")}
    </span>
  );
}
