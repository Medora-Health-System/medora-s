"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  RESPIRATORY_MEDICATION_RESPONSE_CODES,
  formatMarShiftTimelineClinicalDateTime,
  resolveRespiratoryMedicationResponseLabelKey,
  resolveMedicationResponseVisibilityTier,
  sortRespiratoryMedicationResponsesNewestFirst,
  canDocumentMedicationResponse,
  canShowMedicationResponsePanel,
  toMedicationResponseEditabilityInput,
  resolveMedicationResponsePanelState,
  shouldShowMedicationResponseForm,
  shouldShowMedicationResponseSubmitButton,
  shouldShowAddAdditionalResponseButton,
  shouldDefaultExpandMedicationResponsePanel,
  shouldUseRespiratoryMedicationResponsePathway,
  type RespiratoryMedicationResponseCode,
  type ParsedRespiratoryMedicationResponse,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { documentMarRespiratoryMedicationResponse } from "@/lib/marRespiratoryMedicationResponseApi";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import {
  marShiftTimelineDateTimeLocalToUtcIso,
  toMarShiftTimelineDateTimeLocalValue,
} from "@/features/mar/marShiftTimelineDisplay";
import { RespiratoryMedicationResponseSummaryCard } from "@/components/mar/RespiratoryMedicationResponseSummaryCard";

export type RespiratoryMedicationResponseDocumentationPanelProps = {
  item: MarShiftTimelineCellItem;
  encounterId: string;
  facilityTimeZone?: string | null;
  readOnly?: boolean;
  onSaved?: () => void | Promise<void>;
};

export function RespiratoryMedicationResponseDocumentationPanel({
  item,
  encounterId,
  facilityTimeZone = null,
  readOnly: _readOnly = false,
  onSaved,
}: RespiratoryMedicationResponseDocumentationPanelProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const submitLockRef = useRef(false);

  const isRespiratoryPathway = shouldUseRespiratoryMedicationResponsePathway({
    medicationLabel: item.medicationLabel ?? item.primaryText,
    genericName: item.medicationLabel ?? item.primaryText,
    manualLabel: item.primaryText,
    manualSecondaryText: item.secondaryText,
  });

  const editabilityInput = useMemo(() => toMedicationResponseEditabilityInput(item), [item]);
  const showPanel = isRespiratoryPathway && canShowMedicationResponsePanel(editabilityInput);
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
      sortRespiratoryMedicationResponsesNewestFirst(
        (item.respiratoryMedicationResponses ?? []) as ParsedRespiratoryMedicationResponse[]
      ),
    [item.respiratoryMedicationResponses]
  );

  const [expanded, setExpanded] = useState(() =>
    shouldDefaultExpandMedicationResponsePanel({
      responseCount: savedResponses.length,
      visibilityRecommended: visibilityTier === "RECOMMENDED",
      awaitingReassessment: false,
      responseOverdue: item.medicationResponseFollowUp?.status === "OVERDUE",
    })
  );
  const [addingAdditional, setAddingAdditional] = useState(false);
  const [responseCode, setResponseCode] = useState<RespiratoryMedicationResponseCode>("IMPROVED_BREATHING");
  const [responseDetail, setResponseDetail] = useState("");
  const [responseTimeValue, setResponseTimeValue] = useState(() =>
    toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone ?? undefined)
  );
  const [respiratoryRateBefore, setRespiratoryRateBefore] = useState("");
  const [respiratoryRateAfter, setRespiratoryRateAfter] = useState("");
  const [oxygenBefore, setOxygenBefore] = useState("");
  const [oxygenAfter, setOxygenAfter] = useState("");
  const [wheezingBefore, setWheezingBefore] = useState<boolean | null>(null);
  const [wheezingAfter, setWheezingAfter] = useState<boolean | null>(null);
  const [workOfBreathing, setWorkOfBreathing] = useState("");
  const [nebulizerCompletion, setNebulizerCompletion] = useState(false);
  const [mdiSpacerUsed, setMdiSpacerUsed] = useState(false);
  const [treatmentRefused, setTreatmentRefused] = useState(false);
  const [treatmentInterrupted, setTreatmentInterrupted] = useState(false);
  const [noAdverseReaction, setNoAdverseReaction] = useState(false);
  const [patientTolerated, setPatientTolerated] = useState(false);
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
    setResponseCode("IMPROVED_BREATHING");
    setResponseDetail("");
    setResponseTimeValue(
      toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone ?? undefined)
    );
    setRespiratoryRateBefore("");
    setRespiratoryRateAfter("");
    setOxygenBefore("");
    setOxygenAfter("");
    setWheezingBefore(null);
    setWheezingAfter(null);
    setWorkOfBreathing("");
    setNebulizerCompletion(false);
    setMdiSpacerUsed(false);
    setTreatmentRefused(false);
    setTreatmentInterrupted(false);
    setNoAdverseReaction(false);
    setPatientTolerated(false);
    setError(null);
  };

  const handleCancelForm = () => {
    resetForm();
    if (savedResponses.length > 0) {
      setAddingAdditional(false);
      setExpanded(false);
    }
  };

  if (!showPanel) return null;

  const sectionTitle =
    visibilityTier === "RECOMMENDED"
      ? t("marRespiratoryMedicationResponse.panel.recommendedTitle")
      : t("marRespiratoryMedicationResponse.panel.optionalTitle");

  const formatInstant = (iso: string | null | undefined) =>
    iso?.trim()
      ? formatMarShiftTimelineClinicalDateTime(iso, dateLocale, facilityTimeZone ?? undefined)
      : null;

  const parseOptionalInt = (value: string, min: number, max: number) => {
    if (value.trim() === "") return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) return undefined;
    return Math.round(n);
  };

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
      await documentMarRespiratoryMedicationResponse({
        encounterId,
        administrationId: item.medicationAdministrationId!,
        payload: {
          responseCode,
          responseDetail: responseDetail.trim() || undefined,
          responseTime: responseTimeIso ? new Date(responseTimeIso) : undefined,
          respiratoryRateBefore: parseOptionalInt(respiratoryRateBefore, 0, 80),
          respiratoryRateAfter: parseOptionalInt(respiratoryRateAfter, 0, 80),
          oxygenSaturationBefore: parseOptionalInt(oxygenBefore, 0, 100),
          oxygenSaturationAfter: parseOptionalInt(oxygenAfter, 0, 100),
          wheezingBefore: wheezingBefore ?? undefined,
          wheezingAfter: wheezingAfter ?? undefined,
          workOfBreathing: workOfBreathing.trim() || undefined,
          nebulizerCompletion: nebulizerCompletion || undefined,
          mdiSpacerUsed: mdiSpacerUsed || undefined,
          treatmentRefused: treatmentRefused || undefined,
          treatmentInterrupted: treatmentInterrupted || undefined,
          noAdverseReaction: noAdverseReaction || undefined,
          patientTolerated: patientTolerated || undefined,
        },
      });
      resetForm();
      setAddingAdditional(false);
      setExpanded(false);
      await onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marRespiratoryMedicationResponse.panel.saveError"));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section
      data-testid="mar-respiratory-medication-response-panel"
      data-visibility-tier={visibilityTier}
      data-panel-state={panelState}
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

      {savedResponses.map((response, index) => (
        <RespiratoryMedicationResponseSummaryCard
          key={`${response.documentedAt}-${index}`}
          response={response}
          formatInstant={formatInstant}
          t={t}
        />
      ))}

      {showAddAdditionalButton ? (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setAddingAdditional(true);
            setExpanded(true);
          }}
          data-testid="mar-respiratory-medication-response-add-additional"
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
          {t("marRespiratoryMedicationResponse.panel.addAdditionalResponse")}
        </button>
      ) : null}

      {showForm ? (
        <div
          data-testid="mar-respiratory-medication-response-form"
          style={{ marginTop: 10, display: "grid", gap: 10 }}
        >
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marRespiratoryMedicationResponse.panel.responseTime")}</span>
            <input
              type="datetime-local"
              value={responseTimeValue}
              onChange={(e) => setResponseTimeValue(e.target.value)}
              disabled={submitting}
              data-testid="mar-respiratory-medication-response-time"
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marRespiratoryMedicationResponse.panel.response")}</span>
            <select
              value={responseCode}
              onChange={(e) => setResponseCode(e.target.value as RespiratoryMedicationResponseCode)}
              disabled={submitting}
              data-testid="mar-respiratory-medication-response-code"
            >
              {RESPIRATORY_MEDICATION_RESPONSE_CODES.map((code) => {
                const key = resolveRespiratoryMedicationResponseLabelKey(code);
                return (
                  <option key={code} value={code}>
                    {key ? t(key) : code}
                  </option>
                );
              })}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <span>{t("marRespiratoryMedicationResponse.panel.respiratoryRateBefore")}</span>
              <input
                type="number"
                min={0}
                max={80}
                value={respiratoryRateBefore}
                onChange={(e) => setRespiratoryRateBefore(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <span>{t("marRespiratoryMedicationResponse.panel.respiratoryRateAfter")}</span>
              <input
                type="number"
                min={0}
                max={80}
                value={respiratoryRateAfter}
                onChange={(e) => setRespiratoryRateAfter(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <span>{t("marRespiratoryMedicationResponse.panel.oxygenBefore")}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={oxygenBefore}
                onChange={(e) => setOxygenBefore(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <span>{t("marRespiratoryMedicationResponse.panel.oxygenAfter")}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={oxygenAfter}
                onChange={(e) => setOxygenAfter(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marRespiratoryMedicationResponse.panel.workOfBreathing")}</span>
            <input
              value={workOfBreathing}
              onChange={(e) => setWorkOfBreathing(e.target.value)}
              disabled={submitting}
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            <span>{t("marRespiratoryMedicationResponse.panel.comment")}</span>
            <textarea
              value={responseDetail}
              onChange={(e) => setResponseDetail(e.target.value)}
              rows={2}
              disabled={submitting}
            />
          </label>

          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t("marRespiratoryMedicationResponse.panel.clinicalFlags")}
            </legend>
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              {(
                [
                  ["nebulizerCompletion", nebulizerCompletion, setNebulizerCompletion],
                  ["mdiSpacerUsed", mdiSpacerUsed, setMdiSpacerUsed],
                  ["treatmentRefused", treatmentRefused, setTreatmentRefused],
                  ["treatmentInterrupted", treatmentInterrupted, setTreatmentInterrupted],
                  ["noAdverseReaction", noAdverseReaction, setNoAdverseReaction],
                  ["patientTolerated", patientTolerated, setPatientTolerated],
                ] as const
              ).map(([key, checked, setter]) => (
                <label key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setter(e.target.checked)}
                    disabled={submitting}
                  />
                  {t(`marRespiratoryMedicationResponse.panel.${key}`)}
                </label>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p data-testid="mar-respiratory-medication-response-error" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
              {error}
            </p>
          ) : null}

          {showSubmitButton ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                data-testid="mar-respiratory-medication-response-submit"
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
                {submitting ? t("common.saving") : t("marRespiratoryMedicationResponse.panel.submitResponse")}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
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
