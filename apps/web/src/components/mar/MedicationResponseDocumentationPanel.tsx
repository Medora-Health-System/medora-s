"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  MAR_MEDICATION_RESPONSE_CODES,
  formatMarShiftTimelineClinicalDateTime,
  marPrnAdministrationRequiresPainScore,
  resolveMarMedicationResponseLabelKey,
  resolveMedicationResponseVisibilityTier,
  buildMarMedicationResponseFollowUpSummary,
  sortMarMedicationResponsesNewestFirst,
  requiresEnterprisePainReassessment,
  canDocumentMedicationResponse,
  canShowMedicationResponsePanel,
  isMedicationResponseRequired,
  toMedicationResponseEditabilityInput,
  resolveMedicationResponsePanelState,
  shouldShowMedicationResponseForm,
  shouldShowMedicationResponseSubmitButton,
  shouldShowAddAdditionalResponseButton,
  shouldDefaultExpandMedicationResponsePanel,
  resolveMarMedicationResponseBadgeLabelKey,
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
import { MedicationResponseSummaryCard } from "@/components/mar/MedicationResponseSummaryCard";

export type MedicationResponseDocumentationPanelProps = {
  item: MarShiftTimelineCellItem;
  encounterId: string;
  facilityTimeZone?: string | null;
  readOnly?: boolean;
  onSaved?: () => void | Promise<void>;
};

export function MedicationResponseDocumentationPanel({
  item,
  encounterId,
  facilityTimeZone = null,
  readOnly: _readOnly = false,
  onSaved,
}: MedicationResponseDocumentationPanelProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const submitLockRef = useRef(false);

  const editabilityInput = useMemo(() => toMedicationResponseEditabilityInput(item), [item]);
  const showPanel = canShowMedicationResponsePanel(editabilityInput);
  const responseEditable = canDocumentMedicationResponse(editabilityInput);

  const visibilityTier = resolveMedicationResponseVisibilityTier({
    doseStatus: item.doseStatus,
    secondaryText: item.secondaryText,
    medicationLabel: item.medicationLabel ?? item.primaryText,
    genericName: item.medicationLabel ?? item.primaryText,
    frequencyCode: item.frequencyCode,
    prnIndication: item.orderPrnIndication,
    isFluidBolus: item.isFluidBolus,
    isContinuousFluid: Boolean(item.continuousFluidStatus),
  });

  const savedResponses = useMemo(
    () =>
      sortMarMedicationResponsesNewestFirst(
        (item.medicationResponses ?? []) as ParsedMarMedicationResponse[]
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

  const awaitingReassessment = item.secondaryText === "AWAITING_REASSESSMENT";
  const responseOverdue = followUpSummary.status === "OVERDUE";

  const [expanded, setExpanded] = useState(() =>
    shouldDefaultExpandMedicationResponsePanel({
      responseCount: item.medicationResponses?.length ?? 0,
      visibilityRecommended: visibilityTier === "RECOMMENDED",
      awaitingReassessment,
      responseOverdue,
    })
  );
  const [addingAdditional, setAddingAdditional] = useState(false);
  const [responseCode, setResponseCode] = useState<MarMedicationResponseCode>("EFFECTIVE");
  const [responseDetail, setResponseDetail] = useState("");
  const [responseTimeValue, setResponseTimeValue] = useState(() =>
    toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone ?? undefined)
  );
  const [painBefore, setPainBefore] = useState("");
  const [painAfter, setPainAfter] = useState("");
  const [painResponseTrend, setPainResponseTrend] = useState<"IMPROVED" | "SAME" | "WORSE" | "">("");
  const [noAdverseReaction, setNoAdverseReaction] = useState(false);
  const [nausea, setNausea] = useState(false);
  const [vomiting, setVomiting] = useState(false);
  const [itching, setItching] = useState(false);
  const [sedation, setSedation] = useState(false);
  const [dizziness, setDizziness] = useState(false);
  const [constipation, setConstipation] = useState(false);
  const [respiratoryDepression, setRespiratoryDepression] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelState = resolveMedicationResponsePanelState({
    responseCount: savedResponses.length,
    expanded,
    addingAdditional,
  });
  const showForm = responseEditable && shouldShowMedicationResponseForm(panelState);
  const showSubmitButton = responseEditable && shouldShowMedicationResponseSubmitButton(panelState);
  const showAddAdditionalButton = shouldShowAddAdditionalResponseButton(panelState, responseEditable);

  const resetForm = () => {
    setResponseCode("EFFECTIVE");
    setResponseDetail("");
    setResponseTimeValue(
      toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone ?? undefined)
    );
    setPainBefore("");
    setPainAfter("");
    setPainResponseTrend("");
    setNoAdverseReaction(false);
    setNausea(false);
    setVomiting(false);
    setItching(false);
    setSedation(false);
    setDizziness(false);
    setConstipation(false);
    setRespiratoryDepression(false);
    setError(null);
  };

  const handleCancelForm = () => {
    resetForm();
    if (savedResponses.length > 0) {
      setAddingAdditional(false);
      setExpanded(false);
    }
  };

  const handleAddAdditionalResponse = () => {
    resetForm();
    setAddingAdditional(true);
    setExpanded(true);
  };

  if (!showPanel) return null;

  const showPainFields = marPrnAdministrationRequiresPainScore({
    medicationLabel: item.medicationLabel ?? item.primaryText,
    prnIndication: item.orderPrnIndication,
    prnReasonGroup: item.prnPainScore != null ? "pain" : undefined,
  });
  const enterprisePainReassessment = requiresEnterprisePainReassessment({
    medicationLabel: item.medicationLabel ?? item.primaryText,
    prnIndication: item.orderPrnIndication,
    directionsSig: item.orderPrnIndication,
    frequencyCode: item.frequencyCode,
  });
  const responseRequired = isMedicationResponseRequired(editabilityInput);

  const sectionTitle = responseRequired
    ? t("marMedicationResponse.panel.requiredTitle")
    : visibilityTier === "RECOMMENDED"
      ? t("marMedicationResponse.panel.recommendedTitle")
      : t("marMedicationResponse.panel.optionalTitle");

  const responseCountBadge =
    savedResponses.length > 0
      ? t(resolveMarMedicationResponseBadgeLabelKey(savedResponses.length)).replace(
          "{count}",
          String(savedResponses.length)
        )
      : null;

  const formatInstant = (iso: string | null | undefined) =>
    iso?.trim()
      ? formatMarShiftTimelineClinicalDateTime(iso, dateLocale, facilityTimeZone ?? undefined)
      : null;

  const handleSubmit = async () => {
    if (submitLockRef.current || submitting || !showSubmitButton) return;
    submitLockRef.current = true;
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
          painResponseTrend: painResponseTrend || undefined,
          noAdverseReaction: noAdverseReaction || undefined,
          nausea: nausea || undefined,
          vomiting: vomiting || undefined,
          itching: itching || undefined,
          sedation: sedation || undefined,
          dizziness: dizziness || undefined,
          constipation: constipation || undefined,
          respiratoryDepression: respiratoryDepression || undefined,
        },
      });
      resetForm();
      setAddingAdditional(false);
      setExpanded(false);
      await onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marMedicationResponse.panel.saveError"));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section
      data-testid="mar-medication-response-panel"
      data-visibility-tier={visibilityTier}
      data-panel-state={panelState}
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: awaitingReassessment || responseOverdue ? "1px solid #d97706" : "1px solid #e2e8f0",
        background: awaitingReassessment || responseOverdue ? "#fef3c7" : "#ffffff",
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
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{sectionTitle}</span>
          {responseCountBadge ? (
            <span
              data-testid="mar-medication-response-count-badge"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#047857",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: 9999,
                padding: "2px 8px",
              }}
            >
              {responseCountBadge}
            </span>
          ) : null}
        </span>
        <span aria-hidden>{expanded ? "▾" : "▸"}</span>
      </button>

      {awaitingReassessment ? (
        <p
          data-testid="mar-medication-response-awaiting-reassessment"
          style={{ margin: "8px 0 0", fontSize: 12, color: "#92400e", fontWeight: 700 }}
        >
          {t("marMedicationResponse.reassessment.awaiting")}
        </p>
      ) : null}

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

      {responseOverdue ? (
        <p
          data-testid="mar-medication-response-overdue-title"
          style={{ margin: "8px 0 0", fontSize: 12, color: "#b45309", fontWeight: 700 }}
        >
          {t("marMedicationResponse.panel.overdueTitle")}
        </p>
      ) : null}

      {!responseEditable && !item.medicationAdministrationId?.trim() ? (
        <p
          data-testid="mar-medication-response-missing-administration"
          style={{ margin: "8px 0 0", fontSize: 12, color: "#b45309", fontWeight: 600 }}
        >
          {t("marMedicationResponse.panel.missingAdministrationId")}
        </p>
      ) : null}

      {savedResponses.map((response, index) => (
        <MedicationResponseSummaryCard
          key={`${response.documentedAt}-${index}`}
          response={response}
          formatInstant={formatInstant}
          t={t}
        />
      ))}

      {showAddAdditionalButton ? (
        <button
          type="button"
          onClick={handleAddAdditionalResponse}
          data-testid="mar-medication-response-add-additional"
          style={{
            marginTop: 10,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f766e",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("marMedicationResponse.panel.addAdditionalResponse")}
        </button>
      ) : null}

      {showForm ? (
        <div
          data-testid="mar-medication-response-form"
          style={{ marginTop: 10, display: "grid", gap: 10 }}
        >
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marMedicationResponse.panel.responseTime")}</span>
            <input
              type="datetime-local"
              value={responseTimeValue}
              onChange={(e) => setResponseTimeValue(e.target.value)}
              disabled={submitting}
              data-testid="mar-medication-response-time"
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marMedicationResponse.panel.response")}</span>
            <select
              value={responseCode}
              onChange={(e) => setResponseCode(e.target.value as MarMedicationResponseCode)}
              disabled={submitting}
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
              disabled={submitting}
              data-testid="mar-medication-response-detail"
            />
          </label>

          {showPainFields || enterprisePainReassessment ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  <span>{t("marMedicationResponse.panel.painBefore")}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={painBefore}
                    onChange={(e) => setPainBefore(e.target.value)}
                    disabled={submitting}
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
                    disabled={submitting}
                    data-testid="mar-medication-response-pain-after"
                  />
                </label>
              </div>
              {enterprisePainReassessment ? (
                <>
                  <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                    <span>{t("marMedicationResponse.reassessment.trend")}</span>
                    <select
                      value={painResponseTrend}
                      onChange={(e) =>
                        setPainResponseTrend(e.target.value as "IMPROVED" | "SAME" | "WORSE" | "")
                      }
                      disabled={submitting}
                      data-testid="mar-medication-response-pain-trend"
                    >
                      <option value="">{t("marMedicationResponse.reassessment.trendPlaceholder")}</option>
                      <option value="IMPROVED">{t("marMedicationResponse.reassessment.improved")}</option>
                      <option value="SAME">{t("marMedicationResponse.reassessment.same")}</option>
                      <option value="WORSE">{t("marMedicationResponse.reassessment.worse")}</option>
                    </select>
                  </label>
                  <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
                    <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {t("marMedicationResponse.reassessment.sideEffects")}
                    </legend>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      {(
                        [
                          ["noAdverseReaction", noAdverseReaction, setNoAdverseReaction],
                          ["nausea", nausea, setNausea],
                          ["vomiting", vomiting, setVomiting],
                          ["itching", itching, setItching],
                          ["sedation", sedation, setSedation],
                          ["dizziness", dizziness, setDizziness],
                          ["constipation", constipation, setConstipation],
                          ["respiratoryDepression", respiratoryDepression, setRespiratoryDepression],
                        ] as const
                      ).map(([key, checked, setter]) => (
                        <label key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setter(e.target.checked)}
                            disabled={submitting}
                          />
                          {t(`marMedicationResponse.reassessment.${key}`)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p data-testid="mar-medication-response-error" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
              {error}
            </p>
          ) : null}

          {showSubmitButton ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                data-testid="mar-medication-response-submit"
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#0f766e",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? t("common.saving") : t("marMedicationResponse.panel.submitResponse")}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
                data-testid="mar-medication-response-cancel"
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
