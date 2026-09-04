"use client";

import React, { useState } from "react";
import {
  ARRHYTHMIA_EVENT_CARD_ID,
  ARRHYTHMIA_EVENT_TYPE_OPTIONS,
  CARDIAC_ESCALATION_EVENT_CARD_ID,
  CARDIAC_ESCALATION_REASON_OPTIONS,
  CARDIAC_RHYTHM_OPTIONS,
  CARDIAC_YES_NO_OPTIONS,
  CHEST_PAIN_REASSESSMENT_CARD_ID,
  CONTINUOUS_CARDIAC_MONITORING_CARD_ID,
  ECG_12_LEAD_DOCUMENTATION_CARD_ID,
  ECG_REASON_OPTIONS,
  EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS,
  MONITOR_TYPE_OPTIONS,
  PACEMAKER_MONITORING_CARD_ID,
  PAIN_SCORE_0_10_OPTIONS,
  QTC_MONITORING_CARD_ID,
  RHYTHM_STRIP_DOCUMENTATION_CARD_ID,
  STEMI_ACTIVATION_REASON_OPTIONS,
  STEMI_ALERT_EVENT_CARD_ID,
  STRIP_INTERPRETATION_OPTIONS,
  TELEMETRY_REASSESSMENT_CARD_ID,
  validateCardiacMonitoringDocumentationPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

import {
  ClinicalDocumentationScoreSelectField,
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

type YesNo = (typeof CARDIAC_YES_NO_OPTIONS)[number]["value"];

function YesNoField({
  label,
  value,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: YesNo;
  locale: string;
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={CARDIAC_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationCardiacMonitoringForm({
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

  const [continuous, setContinuous] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    monitorType: "TELEMETRY" as (typeof MONITOR_TYPE_OPTIONS)[number]["value"],
    rhythm: "SINUS_RHYTHM" as (typeof CARDIAC_RHYTHM_OPTIONS)[number]["value"],
    heartRate: 80,
    ectopyPresent: "NO" as YesNo,
    alarmEventsPresent: "NO" as YesNo,
    patientSymptomatic: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [telemetry, setTelemetry] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    currentRhythm: "SINUS_RHYTHM" as (typeof CARDIAC_RHYTHM_OPTIONS)[number]["value"],
    heartRate: 80,
    bloodPressure: "120/80",
    symptomatic: "NO" as YesNo,
    chestPain: "NO" as YesNo,
    palpitations: "NO" as YesNo,
    shortnessOfBreath: "NO" as YesNo,
    changeFromPrevious: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [arrhythmia, setArrhythmia] = useState({
    eventTime: nowLocalDatetimeValue(),
    eventType: "SVT" as (typeof ARRHYTHMIA_EVENT_TYPE_OPTIONS)[number]["value"],
    durationMinutes: 5,
    patientSymptomatic: "YES" as YesNo,
    bloodPressureAffected: "NO" as YesNo,
    interventionRequired: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    providerNotificationTime: "",
    notes: "",
  });

  const [rhythmStrip, setRhythmStrip] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    rhythm: "SINUS_RHYTHM" as (typeof CARDIAC_RHYTHM_OPTIONS)[number]["value"],
    rate: 80,
    stripReviewedByClinician: "YES" as YesNo,
    reviewerName: "",
    interpretation: "NORMAL" as (typeof STRIP_INTERPRETATION_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [ecg, setEcg] = useState({
    ecgTime: nowLocalDatetimeValue(),
    reason: "CHEST_PAIN" as (typeof ECG_REASON_OPTIONS)[number]["value"],
    performed: "YES" as YesNo,
    transmittedToProvider: "YES" as YesNo,
    providerReviewed: "NO" as YesNo,
    criticalFindingPresent: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    providerNotificationTime: "",
    notes: "",
  });

  const [chestPain, setChestPain] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    painScore: 5,
    painImproved: "NO" as YesNo,
    painResolved: "NO" as YesNo,
    radiationPresent: "NO" as YesNo,
    shortnessOfBreath: "NO" as YesNo,
    diaphoresis: "NO" as YesNo,
    repeatECGPerformed: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [stemi, setStemi] = useState({
    activationTime: nowLocalDatetimeValue(),
    activationReason: "STEMI" as (typeof STEMI_ACTIVATION_REASON_OPTIONS)[number]["value"],
    cathLabActivated: "NO" as YesNo,
    providerAtBedside: "NO" as YesNo,
    cardiologyNotified: "YES" as YesNo,
    transferRequired: "NO" as YesNo,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    escalationReason: "CHEST_PAIN" as (typeof CARDIAC_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: "YES" as YesNo,
    providerNotificationTime: nowLocalDatetimeValue(),
    responseReceived: "NO" as YesNo,
    responseTime: "",
    notes: "",
  });

  const [pacemaker, setPacemaker] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    pacedRhythmObserved: "YES" as YesNo,
    capturePresent: "YES" as YesNo,
    patientStable: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [qtc, setQtc] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    qtcValue: 440,
    highRiskMedicationPresent: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case CONTINUOUS_CARDIAC_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(continuous.assessmentTime),
          monitorType: continuous.monitorType,
          rhythm: continuous.rhythm,
          heartRate: continuous.heartRate,
          ectopyPresent: continuous.ectopyPresent,
          alarmEventsPresent: continuous.alarmEventsPresent,
          patientSymptomatic: continuous.patientSymptomatic,
          providerNotified: continuous.providerNotified,
          notes: continuous.notes.trim() || undefined,
        };
      case TELEMETRY_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(telemetry.assessmentTime),
          currentRhythm: telemetry.currentRhythm,
          heartRate: telemetry.heartRate,
          bloodPressure: telemetry.bloodPressure.trim(),
          symptomatic: telemetry.symptomatic,
          chestPain: telemetry.chestPain,
          palpitations: telemetry.palpitations,
          shortnessOfBreath: telemetry.shortnessOfBreath,
          changeFromPrevious: telemetry.changeFromPrevious,
          providerNotified: telemetry.providerNotified,
          notes: telemetry.notes.trim() || undefined,
        };
      case ARRHYTHMIA_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(arrhythmia.eventTime),
          eventType: arrhythmia.eventType,
          durationMinutes: arrhythmia.durationMinutes,
          patientSymptomatic: arrhythmia.patientSymptomatic,
          bloodPressureAffected: arrhythmia.bloodPressureAffected,
          interventionRequired: arrhythmia.interventionRequired,
          providerNotified: arrhythmia.providerNotified,
          providerNotificationTime: optionalIso(arrhythmia.providerNotificationTime),
          notes: arrhythmia.notes.trim() || undefined,
        };
      case RHYTHM_STRIP_DOCUMENTATION_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(rhythmStrip.assessmentTime),
          rhythm: rhythmStrip.rhythm,
          rate: rhythmStrip.rate,
          stripReviewedByClinician: rhythmStrip.stripReviewedByClinician,
          reviewerName: rhythmStrip.reviewerName.trim() || undefined,
          interpretation: rhythmStrip.interpretation,
          providerNotified: rhythmStrip.providerNotified,
          notes: rhythmStrip.notes.trim() || undefined,
        };
      case ECG_12_LEAD_DOCUMENTATION_CARD_ID:
        return {
          ecgTime: toIsoFromLocalDatetime(ecg.ecgTime),
          reason: ecg.reason,
          performed: ecg.performed,
          transmittedToProvider: ecg.transmittedToProvider,
          providerReviewed: ecg.providerReviewed,
          criticalFindingPresent: ecg.criticalFindingPresent,
          providerNotified: ecg.providerNotified,
          providerNotificationTime: optionalIso(ecg.providerNotificationTime),
          notes: ecg.notes.trim() || undefined,
        };
      case CHEST_PAIN_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(chestPain.assessmentTime),
          painScore: chestPain.painScore,
          painImproved: chestPain.painImproved,
          painResolved: chestPain.painResolved,
          radiationPresent: chestPain.radiationPresent,
          shortnessOfBreath: chestPain.shortnessOfBreath,
          diaphoresis: chestPain.diaphoresis,
          repeatECGPerformed: chestPain.repeatECGPerformed,
          providerNotified: chestPain.providerNotified,
          notes: chestPain.notes.trim() || undefined,
        };
      case STEMI_ALERT_EVENT_CARD_ID:
        return {
          activationTime: toIsoFromLocalDatetime(stemi.activationTime),
          activationReason: stemi.activationReason,
          cathLabActivated: stemi.cathLabActivated,
          providerAtBedside: stemi.providerAtBedside,
          cardiologyNotified: stemi.cardiologyNotified,
          transferRequired: stemi.transferRequired,
          notes: stemi.notes.trim() || undefined,
        };
      case CARDIAC_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          escalationReason: escalation.escalationReason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          responseReceived: escalation.responseReceived,
          responseTime: optionalIso(escalation.responseTime),
          notes: escalation.notes.trim() || undefined,
        };
      case PACEMAKER_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(pacemaker.assessmentTime),
          pacedRhythmObserved: pacemaker.pacedRhythmObserved,
          capturePresent: pacemaker.capturePresent,
          patientStable: pacemaker.patientStable,
          providerNotified: pacemaker.providerNotified,
          notes: pacemaker.notes.trim() || undefined,
        };
      case QTC_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(qtc.assessmentTime),
          qtcValue: qtc.qtcValue,
          highRiskMedicationPresent: qtc.highRiskMedicationPresent,
          providerNotified: qtc.providerNotified,
          notes: qtc.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateCardiacMonitoringDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.cardiacMonitoring.validationError"));
      return;
    }
    await onSubmit(validated.data);
  };

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
      data-testid="clinical-documentation-cardiac-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <div style={rowStyle}>
        {cardId === CONTINUOUS_CARDIAC_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.assessmentTime"),
              continuous.assessmentTime,
              (v) => setContinuous({ ...continuous, assessmentTime: v }),
              "cardiac-continuous-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.monitorType")}
              value={continuous.monitorType}
              options={MONITOR_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setContinuous({ ...continuous, monitorType: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.rhythm")}
              value={continuous.rhythm}
              options={CARDIAC_RHYTHM_OPTIONS}
              locale={locale}
              onChange={(v) => setContinuous({ ...continuous, rhythm: v })}
              testId="cardiac-continuous-rhythm"
            />
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.cardiacMonitoring.heartRate")}</span>
              <input
                type="number"
                min={0}
                max={300}
                data-testid="cardiac-continuous-hr"
                value={continuous.heartRate}
                onChange={(e) =>
                  setContinuous({ ...continuous, heartRate: Number(e.target.value) || 0 })
                }
                style={fieldStyle}
              />
            </div>
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.ectopyPresent")}
              value={continuous.ectopyPresent}
              locale={locale}
              onChange={(v) => setContinuous({ ...continuous, ectopyPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.alarmEventsPresent")}
              value={continuous.alarmEventsPresent}
              locale={locale}
              onChange={(v) => setContinuous({ ...continuous, alarmEventsPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.patientSymptomatic")}
              value={continuous.patientSymptomatic}
              locale={locale}
              onChange={(v) => setContinuous({ ...continuous, patientSymptomatic: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={continuous.providerNotified}
              locale={locale}
              onChange={(v) => setContinuous({ ...continuous, providerNotified: v })}
            />
            {notesField(continuous.notes, (notes) => setContinuous({ ...continuous, notes }))}
          </>
        ) : null}

        {cardId === TELEMETRY_REASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.assessmentTime"),
              telemetry.assessmentTime,
              (v) => setTelemetry({ ...telemetry, assessmentTime: v }),
              "cardiac-telemetry-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.rhythm")}
              value={telemetry.currentRhythm}
              options={CARDIAC_RHYTHM_OPTIONS}
              locale={locale}
              onChange={(v) => setTelemetry({ ...telemetry, currentRhythm: v })}
            />
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.cardiacMonitoring.heartRate")}</span>
              <input
                type="number"
                min={0}
                max={300}
                value={telemetry.heartRate}
                onChange={(e) =>
                  setTelemetry({ ...telemetry, heartRate: Number(e.target.value) || 0 })
                }
                style={fieldStyle}
              />
            </div>
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.cardiacMonitoring.bloodPressure")}</span>
              <input
                type="text"
                value={telemetry.bloodPressure}
                onChange={(e) => setTelemetry({ ...telemetry, bloodPressure: e.target.value })}
                style={fieldStyle}
              />
            </div>
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.symptomatic")}
              value={telemetry.symptomatic}
              locale={locale}
              onChange={(v) => setTelemetry({ ...telemetry, symptomatic: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.chestPain")}
              value={telemetry.chestPain}
              locale={locale}
              onChange={(v) => setTelemetry({ ...telemetry, chestPain: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={telemetry.providerNotified}
              locale={locale}
              onChange={(v) => setTelemetry({ ...telemetry, providerNotified: v })}
            />
            {notesField(telemetry.notes, (notes) => setTelemetry({ ...telemetry, notes }))}
          </>
        ) : null}

        {cardId === ARRHYTHMIA_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.eventTime"),
              arrhythmia.eventTime,
              (v) => setArrhythmia({ ...arrhythmia, eventTime: v }),
              "cardiac-arrhythmia-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.eventType")}
              value={arrhythmia.eventType}
              options={ARRHYTHMIA_EVENT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setArrhythmia({ ...arrhythmia, eventType: v })}
            />
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.cardiacMonitoring.durationMinutes")}</span>
              <input
                type="number"
                min={0}
                value={arrhythmia.durationMinutes}
                onChange={(e) =>
                  setArrhythmia({ ...arrhythmia, durationMinutes: Number(e.target.value) || 0 })
                }
                style={fieldStyle}
              />
            </div>
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.interventionRequired")}
              value={arrhythmia.interventionRequired}
              locale={locale}
              onChange={(v) => setArrhythmia({ ...arrhythmia, interventionRequired: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.bloodPressureAffected")}
              value={arrhythmia.bloodPressureAffected}
              locale={locale}
              onChange={(v) => setArrhythmia({ ...arrhythmia, bloodPressureAffected: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={arrhythmia.providerNotified}
              locale={locale}
              onChange={(v) => setArrhythmia({ ...arrhythmia, providerNotified: v })}
            />
            {notesField(arrhythmia.notes, (notes) => setArrhythmia({ ...arrhythmia, notes }))}
          </>
        ) : null}

        {cardId === RHYTHM_STRIP_DOCUMENTATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.assessmentTime"),
              rhythmStrip.assessmentTime,
              (v) => setRhythmStrip({ ...rhythmStrip, assessmentTime: v }),
              "cardiac-strip-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.rhythm")}
              value={rhythmStrip.rhythm}
              options={CARDIAC_RHYTHM_OPTIONS}
              locale={locale}
              onChange={(v) => setRhythmStrip({ ...rhythmStrip, rhythm: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.interpretation")}
              value={rhythmStrip.interpretation}
              options={STRIP_INTERPRETATION_OPTIONS}
              locale={locale}
              onChange={(v) => setRhythmStrip({ ...rhythmStrip, interpretation: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={rhythmStrip.providerNotified}
              locale={locale}
              onChange={(v) => setRhythmStrip({ ...rhythmStrip, providerNotified: v })}
            />
            {notesField(rhythmStrip.notes, (notes) => setRhythmStrip({ ...rhythmStrip, notes }))}
          </>
        ) : null}

        {cardId === ECG_12_LEAD_DOCUMENTATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.ecgTime"),
              ecg.ecgTime,
              (v) => setEcg({ ...ecg, ecgTime: v }),
              "cardiac-ecg-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.ecgReason")}
              value={ecg.reason}
              options={ECG_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEcg({ ...ecg, reason: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.criticalFindingPresent")}
              value={ecg.criticalFindingPresent}
              locale={locale}
              onChange={(v) => setEcg({ ...ecg, criticalFindingPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerReviewed")}
              value={ecg.providerReviewed}
              locale={locale}
              onChange={(v) => setEcg({ ...ecg, providerReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={ecg.providerNotified}
              locale={locale}
              onChange={(v) => setEcg({ ...ecg, providerNotified: v })}
            />
            {notesField(ecg.notes, (notes) => setEcg({ ...ecg, notes }))}
          </>
        ) : null}

        {cardId === CHEST_PAIN_REASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.assessmentTime"),
              chestPain.assessmentTime,
              (v) => setChestPain({ ...chestPain, assessmentTime: v }),
              "cardiac-chest-pain-time"
            )}
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.painScore")}
              value={chestPain.painScore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setChestPain({ ...chestPain, painScore: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.painImproved")}
              value={chestPain.painImproved}
              locale={locale}
              onChange={(v) => setChestPain({ ...chestPain, painImproved: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.repeatECGPerformed")}
              value={chestPain.repeatECGPerformed}
              locale={locale}
              onChange={(v) => setChestPain({ ...chestPain, repeatECGPerformed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={chestPain.providerNotified}
              locale={locale}
              onChange={(v) => setChestPain({ ...chestPain, providerNotified: v })}
            />
            {notesField(chestPain.notes, (notes) => setChestPain({ ...chestPain, notes }))}
          </>
        ) : null}

        {cardId === STEMI_ALERT_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.activationTime"),
              stemi.activationTime,
              (v) => setStemi({ ...stemi, activationTime: v }),
              "cardiac-stemi-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.activationReason")}
              value={stemi.activationReason}
              options={STEMI_ACTIVATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setStemi({ ...stemi, activationReason: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.cathLabActivated")}
              value={stemi.cathLabActivated}
              locale={locale}
              onChange={(v) => setStemi({ ...stemi, cathLabActivated: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.cardiologyNotified")}
              value={stemi.cardiologyNotified}
              locale={locale}
              onChange={(v) => setStemi({ ...stemi, cardiologyNotified: v })}
            />
            {notesField(stemi.notes, (notes) => setStemi({ ...stemi, notes }))}
          </>
        ) : null}

        {cardId === CARDIAC_ESCALATION_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.eventTime"),
              escalation.eventTime,
              (v) => setEscalation({ ...escalation, eventTime: v }),
              "cardiac-escalation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.escalationReason")}
              value={escalation.escalationReason}
              options={CARDIAC_ESCALATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, escalationReason: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={escalation.providerNotified}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, providerNotified: v })}
            />
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.providerNotificationTime"),
              escalation.providerNotificationTime,
              (v) => setEscalation({ ...escalation, providerNotificationTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.responseReceived")}
              value={escalation.responseReceived}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, responseReceived: v })}
            />
            {notesField(escalation.notes, (notes) => setEscalation({ ...escalation, notes }))}
          </>
        ) : null}

        {cardId === PACEMAKER_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.assessmentTime"),
              pacemaker.assessmentTime,
              (v) => setPacemaker({ ...pacemaker, assessmentTime: v }),
              "cardiac-pacemaker-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.pacedRhythmObserved")}
              value={pacemaker.pacedRhythmObserved}
              locale={locale}
              onChange={(v) => setPacemaker({ ...pacemaker, pacedRhythmObserved: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.capturePresent")}
              value={pacemaker.capturePresent}
              locale={locale}
              onChange={(v) => setPacemaker({ ...pacemaker, capturePresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={pacemaker.providerNotified}
              locale={locale}
              onChange={(v) => setPacemaker({ ...pacemaker, providerNotified: v })}
            />
            {notesField(pacemaker.notes, (notes) => setPacemaker({ ...pacemaker, notes }))}
          </>
        ) : null}

        {cardId === QTC_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.cardiacMonitoring.assessmentTime"),
              qtc.assessmentTime,
              (v) => setQtc({ ...qtc, assessmentTime: v }),
              "cardiac-qtc-time"
            )}
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.cardiacMonitoring.qtcValue")}</span>
              <input
                type="number"
                min={200}
                max={700}
                data-testid="cardiac-qtc-value"
                value={qtc.qtcValue}
                onChange={(e) => setQtc({ ...qtc, qtcValue: Number(e.target.value) || 0 })}
                style={fieldStyle}
              />
            </div>
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.highRiskMedicationPresent")}
              value={qtc.highRiskMedicationPresent}
              locale={locale}
              onChange={(v) => setQtc({ ...qtc, highRiskMedicationPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.cardiacMonitoring.providerNotified")}
              value={qtc.providerNotified}
              locale={locale}
              onChange={(v) => setQtc({ ...qtc, providerNotified: v })}
            />
            {notesField(qtc.notes, (notes) => setQtc({ ...qtc, notes }))}
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

export function isEdoc15CardiacMonitoringDocumentationFormCard(cardId: string): boolean {
  return (EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
