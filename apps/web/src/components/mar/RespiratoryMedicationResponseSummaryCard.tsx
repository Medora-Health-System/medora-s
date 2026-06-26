"use client";

import React from "react";
import {
  buildRespiratoryMedicationResponseSummaryFields,
  resolveRespiratoryMedicationResponseLabelKey,
  type ParsedRespiratoryMedicationResponse,
} from "@medora/shared";

export type RespiratoryMedicationResponseSummaryCardProps = {
  response: ParsedRespiratoryMedicationResponse;
  formatInstant: (iso: string | null | undefined) => string | null;
  t: (key: string) => string;
  outcomePrefix?: string;
  compact?: boolean;
};

export function RespiratoryMedicationResponseSummaryCard({
  response,
  formatInstant,
  t,
  outcomePrefix,
  compact = false,
}: RespiratoryMedicationResponseSummaryCardProps) {
  const labelKey = resolveRespiratoryMedicationResponseLabelKey(response.responseCode);
  const responseLabel = labelKey ? t(labelKey) : response.responseCode;

  const fields = buildRespiratoryMedicationResponseSummaryFields({
    response,
    outcomeLabel: outcomePrefix
      ? `${outcomePrefix}: ${responseLabel}`
      : `${t("marRespiratoryMedicationResponse.history.outcome")}: ${responseLabel}`,
    responseTimePrefix: t("marRespiratoryMedicationResponse.panel.responseTime"),
    documentedAtPrefix: t("marRespiratoryMedicationResponse.panel.documentedAt"),
    documentedByPrefix: t("marRespiratoryMedicationResponse.history.by"),
    documentedByUnknownLabel: `${t("marRespiratoryMedicationResponse.history.by")}: ${t("marRespiratoryMedicationResponse.history.documentedByUnknown")}`,
    respiratoryRatePrefix: t("marRespiratoryMedicationResponse.panel.respiratoryRate"),
    oxygenPrefix: t("marRespiratoryMedicationResponse.panel.oxygenSaturation"),
    wheezingPrefix: t("marRespiratoryMedicationResponse.panel.wheezing"),
    workOfBreathingPrefix: t("marRespiratoryMedicationResponse.panel.workOfBreathing"),
    nebulizerPrefix: t("marRespiratoryMedicationResponse.panel.nebulizerCompleted"),
    spacerPrefix: t("marRespiratoryMedicationResponse.panel.mdiSpacerUsed"),
    commentPrefix: t("marRespiratoryMedicationResponse.panel.comment"),
    yesLabel: t("common.yes"),
    noLabel: t("common.no"),
    formatInstant,
  });

  return (
    <div
      data-testid="mar-respiratory-medication-response-saved"
      style={{
        marginTop: 8,
        padding: compact ? "6px 8px" : "8px 10px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        fontSize: compact ? 12 : 13,
      }}
    >
      {fields.map((field, index) => (
        <div
          key={`${field.testId ?? "field"}-${index}`}
          data-testid={field.testId}
          style={{
            marginTop: index === 0 ? 0 : 4,
            color: index === 0 ? "#047857" : "#475569",
            fontWeight: index === 0 ? 600 : 400,
          }}
        >
          {field.text}
        </div>
      ))}
    </div>
  );
}
