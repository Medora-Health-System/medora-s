"use client";

import React, { useMemo, useState } from "react";
import {
  MAR_MEDICATION_RESPONSE_CODES,
  formatMarShiftTimelineClinicalDateTime,
  marPrnAdministrationRequiresPainScore,
  resolveMarMedicationResponseLabelKey,
  resolveMarMedicationResponseSeverity,
  resolveMedicationResponseAllergyReviewRecommendation,
  resolveMedicationResponseVisibilityTier,
  buildMarMedicationResponseFollowUpSummary,
  sortMarMedicationResponsesNewestFirst,
  type MarMedicationResponseCode,
  type ParsedMarMedicationResponse,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { documentMarMedicationResponse } from "@/lib/marMedicationResponseApi";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import {
  marShiftTimelineDateTimeLocalToUtcIso,
  toMarShiftTimelineDateTimeLocalValue,
} from "@/features/mar/marShiftTimelineDisplay";

export type MedicationResponseDocumentationPanelProps = {
  item: MarShiftTimelineCellItem;
  encounterId: string;
  facilityTimeZone?: string | null;
  readOnly?: boolean;
  onSaved?: () => void | Promise<void>;
};

function severityColor(severity: ReturnType<typeof resolveMarMedicationResponseSeverity>): string {
  if (severity === "safety") return "#b45309";
  if (severity === "neutral") return "#475569";
  return "#047857";
}

export function MedicationResponseDocumentationPanel({
  item,
  encounterId,
  facilityTimeZone = null,
  readOnly = false,
  onSaved,
}: MedicationResponseDocumentationPanelProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const visibilityTier = resolveMedicationResponseVisibilityTier({
    doseStatus: item.doseStatus,
    secondaryText: item.secondaryText,
    medicationLabel: item.medicationLabel ?? item.primaryText,
    frequencyCode: item.frequencyCode,
    prnIndication: item.orderPrnIndication,
    isFluidBolus: item.isFluidBolus,
    isContinuousFluid: Boolean(item.continuousFluidStatus),
  });

  const savedResponses = useMemo(
    () =>
      sortMarMedicationResponsesNewestFirst(
        (item.medicationResponses ?? []) as import("@medora/shared").ParsedMarMedicationResponse[]
      ),
    [item.medicationResponses]
  );

  const followUpSummary = useMemo(
    () =>
      buildMarMedicationResponseFollowUpSummary({
        doseStatus: item.doseStatus,
        secondaryText: item.secondaryText,
        medicationLabel: item.medicationLabel ?? item.primaryText,
        frequencyCode: item.frequencyCode,
        prnIndication: item.orderPrnIndication,
        route: item.route,
        administeredAt: item.administeredAt,
        responses: savedResponses,
      }),
    [item, savedResponses]
  );

  const [expanded, setExpanded] = useState(visibilityTier === "RECOMMENDED");
  const [responseCode, setResponseCode] = useState<MarMedicationResponseCode>("EFFECTIVE");
  const [responseDetail, setResponseDetail] = useState("");
  const [responseTimeValue, setResponseTimeValue] = useState(() =>
    toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone ?? undefined)
  );
  const [painBefore, setPainBefore] = useState("");
  const [painAfter, setPainAfter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (visibilityTier === "HIDDEN") return null;
  if (!item.medicationAdministrationId?.trim()) return null;

  const showPainFields = marPrnAdministrationRequiresPainScore({
    medicationLabel: item.medicationLabel ?? item.primaryText,
    prnIndication: item.orderPrnIndication,
    prnReasonGroup: item.prnPainScore != null ? "pain" : undefined,
  });

  const sectionTitle =
    visibilityTier === "RECOMMENDED"
      ? t("marMedicationResponse.panel.recommendedTitle")
      : t("marMedicationResponse.panel.optionalTitle");

  const formatInstant = (iso: string | null | undefined) =>
    iso?.trim()
      ? formatMarShiftTimelineClinicalDateTime(iso, dateLocale, facilityTimeZone ?? undefined)
      : null;

  const renderSavedResponse = (response: ParsedMarMedicationResponse, index: number) => {
    const labelKey = resolveMarMedicationResponseLabelKey(response.responseCode);
    const responseLabel = labelKey ? t(labelKey) : response.responseCode;
    const painLine =
      response.painBefore != null && response.painAfter != null
        ? `${t("marMedicationResponse.history.pain")}: ${response.painBefore}/10 → ${response.painAfter}/10`
        : null;

    return (
      <div
        key={`${response.documentedAt}-${index}`}
        data-testid="mar-medication-response-saved"
        style={{
          marginTop: 8,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, color: severityColor(resolveMarMedicationResponseSeverity(response.responseCode)) }}>
          {responseLabel}
        </div>
        {response.responseTime ? (
          <div style={{ marginTop: 4, color: "#475569" }}>
            {t("marMedicationResponse.panel.responseTime")}: {formatInstant(response.responseTime)}
          </div>
        ) : null}
        <div style={{ marginTop: 4, color: "#475569" }}>
          {t("marMedicationResponse.panel.documentedAt")}: {formatInstant(response.documentedAt)}
        </div>
        {painLine ? <div style={{ marginTop: 4, color: "#475569" }}>{painLine}</div> : null}
        {response.responseDetail?.trim() ? (
          <div style={{ marginTop: 4, color: "#334155" }}>
            {t("marMedicationResponse.panel.comment")}: {response.responseDetail}
          </div>
        ) : null}
        {response.responseCode === "ADVERSE_REACTION_REPORTED" ? (() => {
          const allergyReview = resolveMedicationResponseAllergyReviewRecommendation({
            responseCode: response.responseCode,
            responseDetail: response.responseDetail,
            medicationName: item.medicationLabel ?? item.primaryText,
            detectedAt: response.documentedAt,
          });
          const messageKey = allergyReview.recommendationMessageKey;
          if (!messageKey) return null;
          return (
            <div
              data-testid="mar-medication-response-allergy-review-recommendation"
              data-recommendation-level={allergyReview.recommendationLevel}
              style={{ marginTop: 6, fontSize: 12, color: "#b45309", fontWeight: 600 }}
            >
              {t("marAllergyReview.panel.recommendationLabel")}: {t(messageKey)}
            </div>
          );
        })() : null}
      </div>
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const responseTimeIso = marShiftTimelineDateTimeLocalToUtcIso(
        responseTimeValue,
        facilityTimeZone ?? undefined
      );
      await documentMarMedicationResponse({
        encounterId,
        administrationId: item.medicationAdministrationId!,
        payload: {
          responseCode,
          responseDetail: responseDetail.trim() || undefined,
          responseTime: responseTimeIso ? new Date(responseTimeIso) : undefined,
          painBefore: painBefore.trim() === "" ? undefined : Number(painBefore),
          painAfter: painAfter.trim() === "" ? undefined : Number(painAfter),
        },
      });
      setResponseDetail("");
      setPainBefore("");
      setPainAfter("");
      await onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marMedicationResponse.panel.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      data-testid="mar-medication-response-panel"
      data-visibility-tier={visibilityTier}
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          fontWeight: 600,
          color: "#0f172a",
          fontSize: 14,
        }}
      >
        <span>{sectionTitle}</span>
        <span aria-hidden>{expanded ? "▾" : "▸"}</span>
      </button>

      {followUpSummary.status === "RECOMMENDED" ? (
        <p
          data-testid="mar-medication-response-follow-up-recommended"
          style={{ margin: "8px 0 0", fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}
        >
          {t("marMedicationResponse.followUp.recommended")}
        </p>
      ) : null}
      {followUpSummary.status === "OVERDUE" ? (
        <p
          data-testid="mar-medication-response-follow-up-overdue"
          style={{ margin: "8px 0 0", fontSize: 12, color: "#b45309", fontWeight: 600 }}
        >
          {t("marMedicationResponse.followUp.overdue")}
        </p>
      ) : null}

      {savedResponses.map(renderSavedResponse)}

      {expanded ? (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marMedicationResponse.panel.responseTime")}</span>
            <input
              type="datetime-local"
              value={responseTimeValue}
              onChange={(e) => setResponseTimeValue(e.target.value)}
              disabled={readOnly || submitting}
              data-testid="mar-medication-response-time"
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marMedicationResponse.panel.response")}</span>
            <select
              value={responseCode}
              onChange={(e) => setResponseCode(e.target.value as MarMedicationResponseCode)}
              disabled={readOnly || submitting}
              data-testid="mar-medication-response-code"
            >
              {MAR_MEDICATION_RESPONSE_CODES.map((code) => {
                const key = resolveMarMedicationResponseLabelKey(code);
                return (
                  <option key={code} value={code}>
                    {key ? t(key) : code}
                  </option>
                );
              })}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marMedicationResponse.panel.comment")}</span>
            <textarea
              value={responseDetail}
              onChange={(e) => setResponseDetail(e.target.value)}
              rows={2}
              disabled={readOnly || submitting}
              data-testid="mar-medication-response-detail"
            />
          </label>

          {showPainFields ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                <span>{t("marMedicationResponse.panel.painBefore")}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={painBefore}
                  onChange={(e) => setPainBefore(e.target.value)}
                  disabled={readOnly || submitting}
                  data-testid="mar-medication-response-pain-before"
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                <span>{t("marMedicationResponse.panel.painAfter")}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={painAfter}
                  onChange={(e) => setPainAfter(e.target.value)}
                  disabled={readOnly || submitting}
                  data-testid="mar-medication-response-pain-after"
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <p data-testid="mar-medication-response-error" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
              {error}
            </p>
          ) : null}

          {!readOnly ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              data-testid="mar-medication-response-save"
              style={{
                justifySelf: "start",
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#0f766e",
                color: "#fff",
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              {submitting ? t("common.saving") : t("marMedicationResponse.panel.save")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
