"use client";

import React from "react";
import {
  buildMedicationResponseSummaryFields,
  listMedicationResponseSideEffectKeys,
  resolveMarMedicationResponseLabelKey,
  resolveMarMedicationResponseSeverity,
  resolveMedicationResponseDocumentedByLabel,
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
  const documentedBy = resolveMedicationResponseDocumentedByLabel(response);
  const sideEffects = listMedicationResponseSideEffectKeys(response);
  const trendKey = resolveMedicationResponsePainTrendLabelKey(response.painResponseTrend);

  const fields = buildMedicationResponseSummaryFields({
    outcomeLabel: outcomePrefix
      ? `${outcomePrefix}: ${responseLabel}`
      : `${t("marMedicationResponse.history.outcome")}: ${responseLabel}`,
    responseTimeLabel: response.responseTime
      ? `${t("marMedicationResponse.panel.responseTime")}: ${formatInstant(response.responseTime)}`
      : null,
    documentedAtLabel: response.documentedAt
      ? `${t("marMedicationResponse.panel.documentedAt")}: ${formatInstant(response.documentedAt)}`
      : null,
    documentedByLabel: documentedBy
      ? `${t("marMedicationResponse.history.by")}: ${documentedBy}`
      : null,
    documentedByUnknownLabel: `${t("marMedicationResponse.history.by")}: ${t("marMedicationResponse.history.documentedByUnknown")}`,
    painLine:
      response.painBefore != null && response.painAfter != null
        ? `${t("marMedicationResponse.history.pain")}: ${response.painBefore}/10 → ${response.painAfter}/10`
        : null,
    painTrendLine: trendKey
      ? `${t("marMedicationResponse.reassessment.trend")}: ${t(trendKey)}`
      : null,
    sideEffectsLine:
      sideEffects.length > 0
        ? `${t("marMedicationResponse.reassessment.sideEffects")}: ${sideEffects
            .map((key) => t(`marMedicationResponse.reassessment.${key}`))
            .join(", ")}`
        : null,
    commentLine: response.responseDetail?.trim()
      ? `${t("marMedicationResponse.panel.comment")}: ${response.responseDetail.trim()}`
      : null,
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
