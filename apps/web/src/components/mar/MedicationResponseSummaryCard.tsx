"use client";

import React from "react";
import {
  buildMedicationResponseSummaryFieldsFromParsed,
  listMedicationResponseSideEffectKeys,
  resolveMarMedicationResponseLabelKey,
  resolveMarMedicationResponseSeverity,
  resolveMedicationResponsePainTrendLabelKey,
  type ParsedMarMedicationResponse,
} from "@medora/shared";

export type MedicationResponseSummaryCardProps = {
  response: ParsedMarMedicationResponse;
  formatInstant: (iso: string | null | undefined) => string | null;
  t: (key: string) => string;
  outcomePrefix?: string;
  compact?: boolean;
};

function severityColor(severity: ReturnType<typeof resolveMarMedicationResponseSeverity>): string {
  if (severity === "safety") return "#b45309";
  if (severity === "neutral") return "#475569";
  return "#047857";
}

export function MedicationResponseSummaryCard({
  response,
  formatInstant,
  t,
  outcomePrefix,
  compact = false,
}: MedicationResponseSummaryCardProps) {
  const labelKey = resolveMarMedicationResponseLabelKey(response.responseCode);
  const responseLabel = labelKey ? t(labelKey) : response.responseCode;
  const sideEffects = listMedicationResponseSideEffectKeys(response);
  const trendKey = resolveMedicationResponsePainTrendLabelKey(response.painResponseTrend);

  const fields = buildMedicationResponseSummaryFieldsFromParsed({
    response,
    outcomeLabel: outcomePrefix
      ? `${outcomePrefix}: ${responseLabel}`
      : `${t("marMedicationResponse.history.outcome")}: ${responseLabel}`,
    responseTimePrefix: t("marMedicationResponse.panel.responseTime"),
    documentedAtPrefix: t("marMedicationResponse.panel.documentedAt"),
    documentedByPrefix: t("marMedicationResponse.history.by"),
    documentedByUnknownLabel: `${t("marMedicationResponse.history.by")}: ${t("marMedicationResponse.history.documentedByUnknown")}`,
    painPrefix: t("marMedicationResponse.history.pain"),
    painTrendPrefix: t("marMedicationResponse.reassessment.trend"),
    sideEffectsPrefix: t("marMedicationResponse.reassessment.sideEffects"),
    commentPrefix: t("marMedicationResponse.panel.comment"),
    painTrendLabel: trendKey ? t(trendKey) : null,
    sideEffectLabels: sideEffects.map((key) => t(`marMedicationResponse.reassessment.${key}`)),
    formatInstant,
  });

  return (
    <div
      data-testid="mar-medication-response-saved"
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
            color: index === 0 ? severityColor(resolveMarMedicationResponseSeverity(response.responseCode)) : "#475569",
            fontWeight: index === 0 ? 600 : 400,
          }}
        >
          {field.text}
        </div>
      ))}
    </div>
  );
}
