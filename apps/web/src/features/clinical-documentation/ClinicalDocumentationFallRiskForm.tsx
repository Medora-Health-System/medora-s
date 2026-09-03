"use client";

import React, { useMemo, useState } from "react";
import {
  ASSISTIVE_DEVICE_OPTIONS,
  calculateMorseFallScore,
  deriveMorseRiskLevel,
  MOBILITY_DISTANCE_UNIT_OPTIONS,
  MOBILITY_STATUS_OPTIONS,
  NEUROLOGIC_STATUS_OPTIONS,
  EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS,
  FALL_ESCALATION_EVENT_CARD_ID,
  FALL_ESCALATION_REASON_OPTIONS,
  FALL_EVENT_DOCUMENTATION_CARD_ID,
  FALL_RISK_REASSESSMENT_CARD_ID,
  GAIT_STABILITY_OPTIONS,
  MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
  MOBILITY_LEVEL_OPTIONS,
  MORSE_AMBULATORY_AID_OPTIONS,
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  MORSE_GAIT_OPTIONS,
  MORSE_HISTORY_OF_FALLING_OPTIONS,
  MORSE_IV_THERAPY_OPTIONS,
  MORSE_MENTAL_STATUS_OPTIONS,
  MORSE_RISK_LEVEL_OPTIONS,
  MORSE_SECONDARY_DIAGNOSIS_OPTIONS,
  NEAR_FALL_EVENT_CARD_ID,
  POST_FALL_ASSESSMENT_CARD_ID,
  requiresImmediateWitnessCaptureForPayload,
  SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  validateFallRiskSafetyDocumentationPayloadForCard,
  YES_NO_OPTIONS,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

import {
  ClinicalDocumentationBooleanField,
  ClinicalDocumentationSelectField,
} from "./ClinicalDocumentationFieldControls";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  minHeight: 36,
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 2,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
  gap: 8,
};

const formStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const scoreBannerStyle: React.CSSProperties = {
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 8,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
};

const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  borderRadius: 8,
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
};

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function optionalIso(local: string): string | undefined {
  return local.trim() ? toIsoFromLocalDatetime(local) : undefined;
}

export function ClinicalDocumentationFallRiskForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const locale = resolveProductUiLanguageOrDefault(language);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [morse, setMorse] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    historyOfFalling: "NO" as (typeof YES_NO_OPTIONS)[number]["value"],
    secondaryDiagnosis: "NO" as (typeof YES_NO_OPTIONS)[number]["value"],
    ambulatoryAid: "NONE" as (typeof MORSE_AMBULATORY_AID_OPTIONS)[number]["value"],
    ivTherapy: "NO" as (typeof YES_NO_OPTIONS)[number]["value"],
    gait: "NORMAL" as (typeof MORSE_GAIT_OPTIONS)[number]["value"],
    mentalStatus: "ORIENTED" as (typeof MORSE_MENTAL_STATUS_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [riskReassessment, setRiskReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    previousRiskLevel: "" as (typeof MORSE_RISK_LEVEL_OPTIONS)[number]["value"] | "",
    currentRiskLevel: "LOW" as (typeof MORSE_RISK_LEVEL_OPTIONS)[number]["value"],
    changeDetected: false,
    providerNotified: false,
    notes: "",
  });

  const [safety, setSafety] = useState({
    documentationTime: nowLocalDatetimeValue(),
    bedAlarmActive: true,
    chairAlarmActive: false,
    nonSlipFootwearApplied: true,
    callLightWithinReach: true,
    bedInLowestPosition: true,
    sideRailsAppropriate: true,
    assistiveDeviceAvailable: true,
    fallRiskBandApplied: true,
    familyEducated: false,
    patientEducated: true,
    notes: "",
  });

  const [mobility, setMobility] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    mobilityLevel: "STANDBY_ASSIST" as (typeof MOBILITY_LEVEL_OPTIONS)[number]["value"],
    ambulationDistance: 50,
    distanceUnit: "FEET" as (typeof MOBILITY_DISTANCE_UNIT_OPTIONS)[number]["value"],
    assistiveDevice: "WALKER" as (typeof ASSISTIVE_DEVICE_OPTIONS)[number]["value"],
    gaitStability: "STABLE" as (typeof GAIT_STABILITY_OPTIONS)[number]["value"],
    toleratedActivity: true,
    providerNotified: false,
    notes: "",
  });

  const [nearFall, setNearFall] = useState({
    eventTime: nowLocalDatetimeValue(),
    location: "",
    assistedToSafety: true,
    injuryObserved: false,
    providerNotified: true,
    familyNotified: false,
    notes: "",
  });

  const [fallEvent, setFallEvent] = useState({
    eventTime: nowLocalDatetimeValue(),
    witnessed: "NO" as (typeof YES_NO_OPTIONS)[number]["value"],
    location: "",
    foundBy: "",
    headStrikeSuspected: false,
    lossOfConsciousness: false,
    injuryObserved: false,
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    familyNotified: false,
    rapidResponseActivated: false,
    notes: "",
  });

  const [postFall, setPostFall] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    painPresent: false,
    injuryIdentified: false,
    neurologicStatus: "BASELINE" as "BASELINE" | "CHANGED",
    mobilityStatus: "BASELINE" as "BASELINE" | "CHANGED",
    vitalSignsObtained: true,
    providerEvaluated: false,
    imagingOrdered: false,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    reason: "HIGH_RISK_SCORE" as (typeof FALL_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    responseReceived: false,
    responseTime: "",
    additionalInterventionsOrdered: false,
    notes: "",
  });

  const morseScore = useMemo(() => calculateMorseFallScore(morse), [morse]);
  const morseRiskLevel = useMemo(() => deriveMorseRiskLevel(morseScore), [morseScore]);

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case MORSE_FALL_RISK_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(morse.assessmentTime),
          historyOfFalling: morse.historyOfFalling,
          secondaryDiagnosis: morse.secondaryDiagnosis,
          ambulatoryAid: morse.ambulatoryAid,
          ivTherapy: morse.ivTherapy,
          gait: morse.gait,
          mentalStatus: morse.mentalStatus,
          calculatedScore: morseScore,
          riskLevel: morseRiskLevel,
          providerNotified: morse.providerNotified,
          notes: morse.notes.trim() || undefined,
        };
      case FALL_RISK_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(riskReassessment.assessmentTime),
          ...(riskReassessment.previousRiskLevel
            ? { previousRiskLevel: riskReassessment.previousRiskLevel }
            : {}),
          currentRiskLevel: riskReassessment.currentRiskLevel,
          changeDetected: riskReassessment.changeDetected,
          providerNotified: riskReassessment.providerNotified,
          notes: riskReassessment.notes.trim() || undefined,
        };
      case SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(safety.documentationTime),
          bedAlarmActive: safety.bedAlarmActive,
          chairAlarmActive: safety.chairAlarmActive,
          nonSlipFootwearApplied: safety.nonSlipFootwearApplied,
          callLightWithinReach: safety.callLightWithinReach,
          bedInLowestPosition: safety.bedInLowestPosition,
          sideRailsAppropriate: safety.sideRailsAppropriate,
          assistiveDeviceAvailable: safety.assistiveDeviceAvailable,
          fallRiskBandApplied: safety.fallRiskBandApplied,
          familyEducated: safety.familyEducated,
          patientEducated: safety.patientEducated,
          notes: safety.notes.trim() || undefined,
        };
      case MOBILITY_AMBULATION_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(mobility.assessmentTime),
          mobilityLevel: mobility.mobilityLevel,
          ambulationDistance: mobility.ambulationDistance,
          distanceUnit: mobility.distanceUnit,
          assistiveDevice: mobility.assistiveDevice,
          gaitStability: mobility.gaitStability,
          toleratedActivity: mobility.toleratedActivity,
          providerNotified: mobility.providerNotified,
          notes: mobility.notes.trim() || undefined,
        };
      case NEAR_FALL_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(nearFall.eventTime),
          location: nearFall.location.trim(),
          assistedToSafety: nearFall.assistedToSafety,
          injuryObserved: nearFall.injuryObserved,
          providerNotified: nearFall.providerNotified,
          familyNotified: nearFall.familyNotified,
          notes: nearFall.notes.trim() || undefined,
        };
      case FALL_EVENT_DOCUMENTATION_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(fallEvent.eventTime),
          witnessed: fallEvent.witnessed,
          location: fallEvent.location.trim(),
          foundBy: fallEvent.foundBy.trim() || undefined,
          headStrikeSuspected: fallEvent.headStrikeSuspected,
          lossOfConsciousness: fallEvent.lossOfConsciousness,
          injuryObserved: fallEvent.injuryObserved,
          providerNotified: fallEvent.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(fallEvent.providerNotificationTime),
          familyNotified: fallEvent.familyNotified,
          rapidResponseActivated: fallEvent.rapidResponseActivated,
          notes: fallEvent.notes.trim() || undefined,
        };
      case POST_FALL_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(postFall.assessmentTime),
          painPresent: postFall.painPresent,
          injuryIdentified: postFall.injuryIdentified,
          neurologicStatus: postFall.neurologicStatus,
          mobilityStatus: postFall.mobilityStatus,
          vitalSignsObtained: postFall.vitalSignsObtained,
          providerEvaluated: postFall.providerEvaluated,
          imagingOrdered: postFall.imagingOrdered,
          notes: postFall.notes.trim() || undefined,
        };
      case FALL_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          reason: escalation.reason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          responseReceived: escalation.responseReceived,
          responseTime: optionalIso(escalation.responseTime),
          additionalInterventionsOrdered: escalation.additionalInterventionsOrdered,
          notes: escalation.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateFallRiskSafetyDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.fallRisk.validationError"));
      return;
    }
    await onSubmit(validated.data);
  };

  const draftPayload = buildPayload();
  const showWitnessNotice =
    draftPayload != null && requiresImmediateWitnessCaptureForPayload(cardId, draftPayload);

  const datetimeField = (label: string, value: string, onChange: (v: string) => void, testId?: string) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type="datetime-local"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );

  const textField = (label: string, value: string, onChange: (v: string) => void, testId?: string) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type="text"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );

  const notesField = (value: string, onChange: (v: string) => void) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, resize: "vertical" }}
      />
    </div>
  );

  return (
    <div
      data-testid="clinical-documentation-fall-risk-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {showWitnessNotice ? (
        <p data-testid="clinical-documentation-fall-risk-witness-notice" style={noticeStyle}>
          {t("clinicalDocumentation.forms.fallRisk.witnessNotice")}
        </p>
      ) : null}

      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <div style={rowStyle}>
        {cardId === MORSE_FALL_RISK_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.assessmentTime"),
              morse.assessmentTime,
              (v) => setMorse({ ...morse, assessmentTime: v }),
              "fall-morse-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.historyOfFalling")}
              value={morse.historyOfFalling}
              options={MORSE_HISTORY_OF_FALLING_OPTIONS}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, historyOfFalling: v })}
              testId="fall-morse-history"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.secondaryDiagnosis")}
              value={morse.secondaryDiagnosis}
              options={MORSE_SECONDARY_DIAGNOSIS_OPTIONS}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, secondaryDiagnosis: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.ambulatoryAid")}
              value={morse.ambulatoryAid}
              options={MORSE_AMBULATORY_AID_OPTIONS}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, ambulatoryAid: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.ivTherapy")}
              value={morse.ivTherapy}
              options={MORSE_IV_THERAPY_OPTIONS}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, ivTherapy: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.gait")}
              value={morse.gait}
              options={MORSE_GAIT_OPTIONS}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, gait: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.mentalStatus")}
              value={morse.mentalStatus}
              options={MORSE_MENTAL_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, mentalStatus: v })}
            />
            <p data-testid="fall-morse-score" style={scoreBannerStyle}>
              {t("clinicalDocumentation.forms.fallRisk.calculatedScore")}: {morseScore}
            </p>
            <p data-testid="fall-morse-risk-level" style={scoreBannerStyle}>
              {t("clinicalDocumentation.forms.fallRisk.riskLevel")}:{" "}
              {MORSE_RISK_LEVEL_OPTIONS.find((o) => o.value === morseRiskLevel)?.[
                locale === "en" ? "labelEn" : "labelFr"
              ] ?? morseRiskLevel}
            </p>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerNotified")}
              value={morse.providerNotified}
              locale={locale}
              onChange={(v) => setMorse({ ...morse, providerNotified: v })}
            />
            {notesField(morse.notes, (notes) => setMorse({ ...morse, notes }))}
          </>
        ) : null}

        {cardId === FALL_RISK_REASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.assessmentTime"),
              riskReassessment.assessmentTime,
              (v) => setRiskReassessment({ ...riskReassessment, assessmentTime: v }),
              "fall-reassessment-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.previousRiskLevel")}
              value={riskReassessment.previousRiskLevel || "LOW"}
              options={MORSE_RISK_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setRiskReassessment({ ...riskReassessment, previousRiskLevel: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.currentRiskLevel")}
              value={riskReassessment.currentRiskLevel}
              options={MORSE_RISK_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setRiskReassessment({ ...riskReassessment, currentRiskLevel: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.changeDetected")}
              value={riskReassessment.changeDetected}
              locale={locale}
              onChange={(v) => setRiskReassessment({ ...riskReassessment, changeDetected: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerNotified")}
              value={riskReassessment.providerNotified}
              locale={locale}
              onChange={(v) => setRiskReassessment({ ...riskReassessment, providerNotified: v })}
            />
            {notesField(riskReassessment.notes, (notes) => setRiskReassessment({ ...riskReassessment, notes }))}
          </>
        ) : null}

        {cardId === SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.documentationTime"),
              safety.documentationTime,
              (v) => setSafety({ ...safety, documentationTime: v }),
              "fall-safety-time"
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.bedAlarmActive")}
              value={safety.bedAlarmActive}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, bedAlarmActive: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.chairAlarmActive")}
              value={safety.chairAlarmActive}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, chairAlarmActive: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.nonSlipFootwearApplied")}
              value={safety.nonSlipFootwearApplied}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, nonSlipFootwearApplied: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.callLightWithinReach")}
              value={safety.callLightWithinReach}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, callLightWithinReach: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.bedInLowestPosition")}
              value={safety.bedInLowestPosition}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, bedInLowestPosition: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.sideRailsAppropriate")}
              value={safety.sideRailsAppropriate}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, sideRailsAppropriate: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.assistiveDeviceAvailable")}
              value={safety.assistiveDeviceAvailable}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, assistiveDeviceAvailable: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.fallRiskBandApplied")}
              value={safety.fallRiskBandApplied}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, fallRiskBandApplied: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.familyEducated")}
              value={safety.familyEducated}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, familyEducated: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.patientEducated")}
              value={safety.patientEducated}
              locale={locale}
              onChange={(v) => setSafety({ ...safety, patientEducated: v })}
            />
            {notesField(safety.notes, (notes) => setSafety({ ...safety, notes }))}
          </>
        ) : null}

        {cardId === MOBILITY_AMBULATION_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.assessmentTime"),
              mobility.assessmentTime,
              (v) => setMobility({ ...mobility, assessmentTime: v }),
              "fall-mobility-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.mobilityLevel")}
              value={mobility.mobilityLevel}
              options={MOBILITY_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setMobility({ ...mobility, mobilityLevel: v })}
            />
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.fallRisk.ambulationDistance")}</span>
              <input
                type="number"
                min={0}
                value={mobility.ambulationDistance}
                onChange={(e) =>
                  setMobility({ ...mobility, ambulationDistance: Number(e.target.value) || 0 })
                }
                style={fieldStyle}
              />
            </div>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.distanceUnit")}
              value={mobility.distanceUnit}
              options={MOBILITY_DISTANCE_UNIT_OPTIONS}
              locale={locale}
              onChange={(v) => setMobility({ ...mobility, distanceUnit: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.assistiveDevice")}
              value={mobility.assistiveDevice}
              options={ASSISTIVE_DEVICE_OPTIONS}
              locale={locale}
              onChange={(v) => setMobility({ ...mobility, assistiveDevice: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.gaitStability")}
              value={mobility.gaitStability}
              options={GAIT_STABILITY_OPTIONS}
              locale={locale}
              onChange={(v) => setMobility({ ...mobility, gaitStability: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.toleratedActivity")}
              value={mobility.toleratedActivity}
              locale={locale}
              onChange={(v) => setMobility({ ...mobility, toleratedActivity: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerNotified")}
              value={mobility.providerNotified}
              locale={locale}
              onChange={(v) => setMobility({ ...mobility, providerNotified: v })}
            />
            {notesField(mobility.notes, (notes) => setMobility({ ...mobility, notes }))}
          </>
        ) : null}

        {cardId === NEAR_FALL_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.eventTime"),
              nearFall.eventTime,
              (v) => setNearFall({ ...nearFall, eventTime: v }),
              "fall-near-time"
            )}
            {textField(
              t("clinicalDocumentation.forms.fallRisk.location"),
              nearFall.location,
              (v) => setNearFall({ ...nearFall, location: v }),
              "fall-near-location"
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.assistedToSafety")}
              value={nearFall.assistedToSafety}
              locale={locale}
              onChange={(v) => setNearFall({ ...nearFall, assistedToSafety: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.injuryObserved")}
              value={nearFall.injuryObserved}
              locale={locale}
              onChange={(v) => setNearFall({ ...nearFall, injuryObserved: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerNotified")}
              value={nearFall.providerNotified}
              locale={locale}
              onChange={(v) => setNearFall({ ...nearFall, providerNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.familyNotified")}
              value={nearFall.familyNotified}
              locale={locale}
              onChange={(v) => setNearFall({ ...nearFall, familyNotified: v })}
            />
            {notesField(nearFall.notes, (notes) => setNearFall({ ...nearFall, notes }))}
          </>
        ) : null}

        {cardId === FALL_EVENT_DOCUMENTATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.eventTime"),
              fallEvent.eventTime,
              (v) => setFallEvent({ ...fallEvent, eventTime: v }),
              "fall-event-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.witnessed")}
              value={fallEvent.witnessed}
              options={YES_NO_OPTIONS}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, witnessed: v })}
            />
            {textField(
              t("clinicalDocumentation.forms.fallRisk.location"),
              fallEvent.location,
              (v) => setFallEvent({ ...fallEvent, location: v }),
              "fall-event-location"
            )}
            {textField(
              t("clinicalDocumentation.forms.fallRisk.foundBy"),
              fallEvent.foundBy,
              (v) => setFallEvent({ ...fallEvent, foundBy: v })
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.headStrikeSuspected")}
              value={fallEvent.headStrikeSuspected}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, headStrikeSuspected: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.lossOfConsciousness")}
              value={fallEvent.lossOfConsciousness}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, lossOfConsciousness: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.injuryObserved")}
              value={fallEvent.injuryObserved}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, injuryObserved: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerNotified")}
              value={fallEvent.providerNotified}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, providerNotified: v })}
            />
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.providerNotificationTime"),
              fallEvent.providerNotificationTime,
              (v) => setFallEvent({ ...fallEvent, providerNotificationTime: v })
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.familyNotified")}
              value={fallEvent.familyNotified}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, familyNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.rapidResponseActivated")}
              value={fallEvent.rapidResponseActivated}
              locale={locale}
              onChange={(v) => setFallEvent({ ...fallEvent, rapidResponseActivated: v })}
            />
            {notesField(fallEvent.notes, (notes) => setFallEvent({ ...fallEvent, notes }))}
          </>
        ) : null}

        {cardId === POST_FALL_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.assessmentTime"),
              postFall.assessmentTime,
              (v) => setPostFall({ ...postFall, assessmentTime: v }),
              "fall-post-time"
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.painPresent")}
              value={postFall.painPresent}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, painPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.injuryIdentified")}
              value={postFall.injuryIdentified}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, injuryIdentified: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.neurologicStatus")}
              value={postFall.neurologicStatus}
              options={NEUROLOGIC_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, neurologicStatus: v as "BASELINE" | "CHANGED" })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.mobilityStatus")}
              value={postFall.mobilityStatus}
              options={MOBILITY_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, mobilityStatus: v as "BASELINE" | "CHANGED" })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.vitalSignsObtained")}
              value={postFall.vitalSignsObtained}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, vitalSignsObtained: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerEvaluated")}
              value={postFall.providerEvaluated}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, providerEvaluated: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.imagingOrdered")}
              value={postFall.imagingOrdered}
              locale={locale}
              onChange={(v) => setPostFall({ ...postFall, imagingOrdered: v })}
            />
            {notesField(postFall.notes, (notes) => setPostFall({ ...postFall, notes }))}
          </>
        ) : null}

        {cardId === FALL_ESCALATION_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.eventTime"),
              escalation.eventTime,
              (v) => setEscalation({ ...escalation, eventTime: v }),
              "fall-escalation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.fallRisk.escalationReason")}
              value={escalation.reason}
              options={FALL_ESCALATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, reason: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.providerNotified")}
              value={escalation.providerNotified}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, providerNotified: v })}
            />
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.providerNotificationTime"),
              escalation.providerNotificationTime,
              (v) => setEscalation({ ...escalation, providerNotificationTime: v })
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.responseReceived")}
              value={escalation.responseReceived}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, responseReceived: v })}
            />
            {datetimeField(
              t("clinicalDocumentation.forms.fallRisk.responseTime"),
              escalation.responseTime,
              (v) => setEscalation({ ...escalation, responseTime: v })
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.fallRisk.additionalInterventionsOrdered")}
              value={escalation.additionalInterventionsOrdered}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, additionalInterventionsOrdered: v })}
            />
            {notesField(escalation.notes, (notes) => setEscalation({ ...escalation, notes }))}
          </>
        ) : null}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: saving ? "#94a3b8" : "#0f766e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.actionSave")}
      </button>
    </div>
  );
}

export function isEdoc14FallRiskSafetyDocumentationFormCard(cardId: string): boolean {
  return (EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
