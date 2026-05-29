"use client";

import React, { useMemo, useState } from "react";
import {
  calculateSedationRecoveryScore,
  DEFAULT_SEDATION_RECOVERY_SCORE_THRESHOLD,
  EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS,
  isSedationRecoveryCriteriaMet,
  SEDATION_AIRWAY_ASSESSMENT_OPTIONS,
  SEDATION_AIRWAY_STATUS_OPTIONS,
  SEDATION_ASA_CLASS_OPTIONS,
  SEDATION_DISCHARGE_READINESS_CARD_ID,
  SEDATION_INITIATION_CARD_ID,
  SEDATION_LEVEL_OPTIONS,
  SEDATION_MALLAMPATI_OPTIONS,
  SEDATION_MONITORING_CARD_ID,
  SEDATION_MONITORING_LEVEL_OPTIONS,
  SEDATION_NPO_STATUS_OPTIONS,
  SEDATION_OXYGEN_DELIVERY_OPTIONS,
  SEDATION_PRE_ASSESSMENT_CARD_ID,
  SEDATION_REASSESSMENT_CARD_ID,
  SEDATION_REASSESSMENT_CONDITION_OPTIONS,
  SEDATION_RECOVERY_ACTIVITY_OPTIONS,
  SEDATION_RECOVERY_CIRCULATION_OPTIONS,
  SEDATION_RECOVERY_CONSCIOUSNESS_OPTIONS,
  SEDATION_RECOVERY_LOC_OPTIONS,
  SEDATION_RECOVERY_MONITORING_CARD_ID,
  SEDATION_RECOVERY_OXYGEN_OPTIONS,
  SEDATION_RECOVERY_RESPIRATION_OPTIONS,
  SEDATION_RECOVERY_SCORE_CARD_ID,
  SEDATION_TIMEOUT_CARD_ID,
  requiresImmediateWitnessCaptureForPayload,
  validateProceduralSedationPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalDocumentationBooleanField,
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
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
};

const formStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  borderRadius: 8,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
};

const scoreBannerStyle = (met: boolean): React.CSSProperties => ({
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 8,
  background: met ? "#ecfdf5" : "#fef2f2",
  color: met ? "#047857" : "#b91c1c",
  border: `1px solid ${met ? "#a7f3d0" : "#fecaca"}`,
});

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function TextField({
  label,
  value,
  onChange,
  testId,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
  type?: string;
}) {
  return (
    <label style={{ minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  testId?: string;
}) {
  return (
    <label style={{ minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        style={fieldStyle}
      />
    </label>
  );
}

function NotesField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  return (
    <label style={{ gridColumn: "1 / -1", minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, minHeight: 48, resize: "vertical" }}
      />
    </label>
  );
}

export function ClinicalDocumentationProceduralSedationForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en" : "fr";
  const [validationError, setValidationError] = useState<string | null>(null);

  const [preAssessment, setPreAssessment] = useState({
    assessedAt: nowLocalDatetimeValue(),
    procedurePlanned: "",
    providerResponsible: "",
    consentVerified: true,
    allergiesReviewed: true,
    npoStatus: "NPO_CONFIRMED" as (typeof SEDATION_NPO_STATUS_OPTIONS)[number]["value"],
    asaClass: "ASA_II" as (typeof SEDATION_ASA_CLASS_OPTIONS)[number]["value"],
    mallampatiScore: "CLASS_II" as (typeof SEDATION_MALLAMPATI_OPTIONS)[number]["value"],
    airwayAssessment: "NORMAL" as (typeof SEDATION_AIRWAY_ASSESSMENT_OPTIONS)[number]["value"],
    baselineTemperature: "",
    baselineHeartRate: 80 as number | "",
    baselineRespRate: 16 as number | "",
    baselineBloodPressure: "120/80",
    baselineSpo2: 98 as number | "",
    baselineEtco2: "" as number | "",
    pregnancyConsidered: false,
    notes: "",
  });

  const [timeout, setTimeout] = useState({
    timeoutTime: nowLocalDatetimeValue(),
    correctPatientConfirmed: true,
    correctProcedureConfirmed: true,
    correctSiteConfirmed: true,
    providerPresent: true,
    rnPresent: true,
    monitoringEquipmentAvailable: true,
    suctionAvailable: true,
    oxygenAvailable: true,
    airwayEquipmentAvailable: true,
    reversalAgentsAvailable: true,
    emergencyEquipmentAvailable: true,
    consentVerified: true,
    plannedSedationLevel: "MODERATE" as (typeof SEDATION_LEVEL_OPTIONS)[number]["value"],
    notes: "",
  });

  const [initiation, setInitiation] = useState({
    startTime: nowLocalDatetimeValue(),
    sedationLevelTarget: "MODERATE" as (typeof SEDATION_LEVEL_OPTIONS)[number]["value"],
    oxygenDeliveryMethod: "NASAL_CANNULA" as (typeof SEDATION_OXYGEN_DELIVERY_OPTIONS)[number]["value"],
    monitoringStarted: true,
    cardiacMonitorApplied: true,
    pulseOximetryApplied: true,
    etco2MonitoringApplied: false,
    bloodPressureMonitoringApplied: true,
    ivAccessConfirmed: true,
    baselineHeartRate: 80 as number | "",
    baselineRespRate: 16 as number | "",
    baselineBloodPressure: "120/80",
    baselineSpo2: 98 as number | "",
    baselineEtco2: "" as number | "",
    medicationAdministrationDocumentedInMar: true,
    notes: "",
  });

  const [monitoring, setMonitoring] = useState({
    monitoringTime: nowLocalDatetimeValue(),
    heartRate: 78 as number | "",
    respRate: 14 as number | "",
    bloodPressure: "118/76",
    spo2: 99 as number | "",
    etco2: "" as number | "",
    oxygenDeliveryMethod: "NASAL_CANNULA" as (typeof SEDATION_OXYGEN_DELIVERY_OPTIONS)[number]["value"],
    sedationLevel: "DROWSY_RESPONDS_TO_VOICE" as (typeof SEDATION_MONITORING_LEVEL_OPTIONS)[number]["value"],
    airwayStatus: "PATENT" as (typeof SEDATION_AIRWAY_STATUS_OPTIONS)[number]["value"],
    interventionRequired: false,
    interventionDescription: "",
    adverseEventObserved: false,
    providerNotified: false,
    notes: "",
  });

  const [reassessment, setReassessment] = useState({
    reassessmentTime: nowLocalDatetimeValue(),
    patientCondition: "STABLE" as (typeof SEDATION_REASSESSMENT_CONDITION_OPTIONS)[number]["value"],
    airwayStable: true,
    hemodynamicallyStable: true,
    painControlled: true,
    nauseaVomitingPresent: false,
    providerNotified: false,
    continuedMonitoringRequired: true,
    notes: "",
  });

  const [recoveryScore, setRecoveryScore] = useState({
    scoredAt: nowLocalDatetimeValue(),
    activity: "MOVES_4_EXTREMITIES" as (typeof SEDATION_RECOVERY_ACTIVITY_OPTIONS)[number]["value"],
    respiration: "DEEP_BREATH_COUGH" as (typeof SEDATION_RECOVERY_RESPIRATION_OPTIONS)[number]["value"],
    circulation: "BP_WITHIN_20_PERCENT" as (typeof SEDATION_RECOVERY_CIRCULATION_OPTIONS)[number]["value"],
    consciousness: "FULLY_AWAKE" as (typeof SEDATION_RECOVERY_CONSCIOUSNESS_OPTIONS)[number]["value"],
    oxygenSaturation: "MAINTAINS_GREATER_92_ROOM_AIR" as (typeof SEDATION_RECOVERY_OXYGEN_OPTIONS)[number]["value"],
    notes: "",
  });

  const [recoveryMonitoring, setRecoveryMonitoring] = useState({
    monitoringTime: nowLocalDatetimeValue(),
    heartRate: 76 as number | "",
    respRate: 14 as number | "",
    bloodPressure: "116/74",
    spo2: 98 as number | "",
    etco2: "" as number | "",
    airwayStatus: "PATENT" as (typeof SEDATION_AIRWAY_STATUS_OPTIONS)[number]["value"],
    levelOfConsciousness: "AWAKE" as (typeof SEDATION_RECOVERY_LOC_OPTIONS)[number]["value"],
    painScore: "" as number | "",
    nauseaVomitingPresent: false,
    toleratingOralIntake: true,
    ambulationSafe: false,
    notes: "",
  });

  const [dischargeReadiness, setDischargeReadiness] = useState({
    assessedAt: nowLocalDatetimeValue(),
    recoveryScoreReviewed: true,
    vitalSignsStable: true,
    airwayStable: true,
    mentalStatusAtBaseline: true,
    painControlled: true,
    nauseaControlled: true,
    responsibleAdultPresent: true,
    dischargeInstructionsReviewed: true,
    providerApprovedDischarge: true,
    patientOrRepresentativeUnderstandsInstructions: true,
    notes: "",
  });

  const calculatedRecoveryTotal = useMemo(
    () =>
      calculateSedationRecoveryScore({
        activity: recoveryScore.activity,
        respiration: recoveryScore.respiration,
        circulation: recoveryScore.circulation,
        consciousness: recoveryScore.consciousness,
        oxygenSaturation: recoveryScore.oxygenSaturation,
      }),
    [recoveryScore]
  );

  const recoveryCriteriaMet = useMemo(
    () => isSedationRecoveryCriteriaMet(calculatedRecoveryTotal, DEFAULT_SEDATION_RECOVERY_SCORE_THRESHOLD),
    [calculatedRecoveryTotal]
  );

  const witnessNotice = useMemo(() => {
    const draft = buildPayload();
    return requiresImmediateWitnessCaptureForPayload(cardId, draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, preAssessment, timeout, initiation, monitoring, reassessment, recoveryScore, recoveryMonitoring, dischargeReadiness]);

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case SEDATION_PRE_ASSESSMENT_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(preAssessment.assessedAt),
          procedurePlanned: preAssessment.procedurePlanned.trim(),
          providerResponsible: preAssessment.providerResponsible.trim(),
          consentVerified: preAssessment.consentVerified,
          allergiesReviewed: preAssessment.allergiesReviewed,
          npoStatus: preAssessment.npoStatus,
          asaClass: preAssessment.asaClass,
          mallampatiScore: preAssessment.mallampatiScore,
          airwayAssessment: preAssessment.airwayAssessment,
          baselineTemperature: preAssessment.baselineTemperature.trim() || undefined,
          baselineHeartRate: preAssessment.baselineHeartRate,
          baselineRespRate: preAssessment.baselineRespRate,
          baselineBloodPressure: preAssessment.baselineBloodPressure.trim(),
          baselineSpo2: preAssessment.baselineSpo2,
          baselineEtco2: preAssessment.baselineEtco2 === "" ? undefined : preAssessment.baselineEtco2,
          pregnancyConsidered: preAssessment.pregnancyConsidered,
          notes: preAssessment.notes.trim() || undefined,
        };
      case SEDATION_TIMEOUT_CARD_ID:
        return {
          timeoutTime: toIsoFromLocalDatetime(timeout.timeoutTime),
          correctPatientConfirmed: timeout.correctPatientConfirmed,
          correctProcedureConfirmed: timeout.correctProcedureConfirmed,
          correctSiteConfirmed: timeout.correctSiteConfirmed,
          providerPresent: timeout.providerPresent,
          rnPresent: timeout.rnPresent,
          monitoringEquipmentAvailable: timeout.monitoringEquipmentAvailable,
          suctionAvailable: timeout.suctionAvailable,
          oxygenAvailable: timeout.oxygenAvailable,
          airwayEquipmentAvailable: timeout.airwayEquipmentAvailable,
          reversalAgentsAvailable: timeout.reversalAgentsAvailable,
          emergencyEquipmentAvailable: timeout.emergencyEquipmentAvailable,
          consentVerified: timeout.consentVerified,
          plannedSedationLevel: timeout.plannedSedationLevel,
          notes: timeout.notes.trim() || undefined,
        };
      case SEDATION_INITIATION_CARD_ID:
        return {
          startTime: toIsoFromLocalDatetime(initiation.startTime),
          sedationLevelTarget: initiation.sedationLevelTarget,
          oxygenDeliveryMethod: initiation.oxygenDeliveryMethod,
          monitoringStarted: initiation.monitoringStarted,
          cardiacMonitorApplied: initiation.cardiacMonitorApplied,
          pulseOximetryApplied: initiation.pulseOximetryApplied,
          etco2MonitoringApplied: initiation.etco2MonitoringApplied,
          bloodPressureMonitoringApplied: initiation.bloodPressureMonitoringApplied,
          ivAccessConfirmed: initiation.ivAccessConfirmed,
          baselineHeartRate: initiation.baselineHeartRate,
          baselineRespRate: initiation.baselineRespRate,
          baselineBloodPressure: initiation.baselineBloodPressure.trim(),
          baselineSpo2: initiation.baselineSpo2,
          baselineEtco2: initiation.baselineEtco2 === "" ? undefined : initiation.baselineEtco2,
          medicationAdministrationDocumentedInMar: initiation.medicationAdministrationDocumentedInMar,
          notes: initiation.notes.trim() || undefined,
        };
      case SEDATION_MONITORING_CARD_ID:
        return {
          monitoringTime: toIsoFromLocalDatetime(monitoring.monitoringTime),
          heartRate: monitoring.heartRate,
          respRate: monitoring.respRate,
          bloodPressure: monitoring.bloodPressure.trim(),
          spo2: monitoring.spo2,
          etco2: monitoring.etco2 === "" ? undefined : monitoring.etco2,
          oxygenDeliveryMethod: monitoring.oxygenDeliveryMethod,
          sedationLevel: monitoring.sedationLevel,
          airwayStatus: monitoring.airwayStatus,
          interventionRequired: monitoring.interventionRequired,
          interventionDescription: monitoring.interventionDescription.trim() || undefined,
          adverseEventObserved: monitoring.adverseEventObserved,
          providerNotified: monitoring.providerNotified,
          notes: monitoring.notes.trim() || undefined,
        };
      case SEDATION_REASSESSMENT_CARD_ID:
        return {
          reassessmentTime: toIsoFromLocalDatetime(reassessment.reassessmentTime),
          patientCondition: reassessment.patientCondition,
          airwayStable: reassessment.airwayStable,
          hemodynamicallyStable: reassessment.hemodynamicallyStable,
          painControlled: reassessment.painControlled,
          nauseaVomitingPresent: reassessment.nauseaVomitingPresent,
          providerNotified: reassessment.providerNotified,
          continuedMonitoringRequired: reassessment.continuedMonitoringRequired,
          notes: reassessment.notes.trim() || undefined,
        };
      case SEDATION_RECOVERY_SCORE_CARD_ID:
        return {
          scoredAt: toIsoFromLocalDatetime(recoveryScore.scoredAt),
          activity: recoveryScore.activity,
          respiration: recoveryScore.respiration,
          circulation: recoveryScore.circulation,
          consciousness: recoveryScore.consciousness,
          oxygenSaturation: recoveryScore.oxygenSaturation,
          totalScore: calculatedRecoveryTotal,
          meetsRecoveryCriteria: recoveryCriteriaMet,
          notes: recoveryScore.notes.trim() || undefined,
        };
      case SEDATION_RECOVERY_MONITORING_CARD_ID:
        return {
          monitoringTime: toIsoFromLocalDatetime(recoveryMonitoring.monitoringTime),
          heartRate: recoveryMonitoring.heartRate,
          respRate: recoveryMonitoring.respRate,
          bloodPressure: recoveryMonitoring.bloodPressure.trim(),
          spo2: recoveryMonitoring.spo2,
          etco2: recoveryMonitoring.etco2 === "" ? undefined : recoveryMonitoring.etco2,
          airwayStatus: recoveryMonitoring.airwayStatus,
          levelOfConsciousness: recoveryMonitoring.levelOfConsciousness,
          painScore: recoveryMonitoring.painScore === "" ? undefined : recoveryMonitoring.painScore,
          nauseaVomitingPresent: recoveryMonitoring.nauseaVomitingPresent,
          toleratingOralIntake: recoveryMonitoring.toleratingOralIntake,
          ambulationSafe: recoveryMonitoring.ambulationSafe,
          notes: recoveryMonitoring.notes.trim() || undefined,
        };
      case SEDATION_DISCHARGE_READINESS_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(dischargeReadiness.assessedAt),
          recoveryScoreReviewed: dischargeReadiness.recoveryScoreReviewed,
          vitalSignsStable: dischargeReadiness.vitalSignsStable,
          airwayStable: dischargeReadiness.airwayStable,
          mentalStatusAtBaseline: dischargeReadiness.mentalStatusAtBaseline,
          painControlled: dischargeReadiness.painControlled,
          nauseaControlled: dischargeReadiness.nauseaControlled,
          responsibleAdultPresent: dischargeReadiness.responsibleAdultPresent,
          dischargeInstructionsReviewed: dischargeReadiness.dischargeInstructionsReviewed,
          providerApprovedDischarge: dischargeReadiness.providerApprovedDischarge,
          patientOrRepresentativeUnderstandsInstructions:
            dischargeReadiness.patientOrRepresentativeUnderstandsInstructions,
          notes: dischargeReadiness.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit() {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateProceduralSedationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.sedation.validationError"));
      return;
    }
    await onSubmit(validated.data);
  }

  return (
    <div data-testid="clinical-documentation-sedation-form" style={formStyle}>
      {witnessNotice && cardId === SEDATION_TIMEOUT_CARD_ID ? (
        <p data-testid="sedation-timeout-witness-notice" style={noticeStyle}>
          {t("clinicalDocumentation.forms.sedation.timeoutWitnessNotice")}
        </p>
      ) : null}

      {cardId === SEDATION_PRE_ASSESSMENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.sedation.assessedAt")}
              value={preAssessment.assessedAt}
              onChange={(v) => setPreAssessment({ ...preAssessment, assessedAt: v })}
              type="datetime-local"
              testId="sedation-pre-assessed-at"
            />
            <TextField
              label={t("clinicalDocumentation.forms.sedation.procedurePlanned")}
              value={preAssessment.procedurePlanned}
              onChange={(v) => setPreAssessment({ ...preAssessment, procedurePlanned: v })}
              testId="sedation-pre-procedure"
            />
            <TextField
              label={t("clinicalDocumentation.forms.sedation.providerResponsible")}
              value={preAssessment.providerResponsible}
              onChange={(v) => setPreAssessment({ ...preAssessment, providerResponsible: v })}
              testId="sedation-pre-provider"
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.npoStatus")}
              value={preAssessment.npoStatus}
              options={SEDATION_NPO_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, npoStatus: v })}
              testId="sedation-pre-npo"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.asaClass")}
              value={preAssessment.asaClass}
              options={SEDATION_ASA_CLASS_OPTIONS}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, asaClass: v })}
              testId="sedation-pre-asa"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.mallampatiScore")}
              value={preAssessment.mallampatiScore}
              options={SEDATION_MALLAMPATI_OPTIONS}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, mallampatiScore: v })}
              testId="sedation-pre-mallampati"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.airwayAssessment")}
              value={preAssessment.airwayAssessment}
              options={SEDATION_AIRWAY_ASSESSMENT_OPTIONS}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, airwayAssessment: v })}
              testId="sedation-pre-airway"
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.consentVerified")}
              value={preAssessment.consentVerified}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, consentVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.allergiesReviewed")}
              value={preAssessment.allergiesReviewed}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, allergiesReviewed: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.pregnancyConsidered")}
              value={preAssessment.pregnancyConsidered}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, pregnancyConsidered: v })}
            />
          </div>
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.baselineHeartRate")}
              value={preAssessment.baselineHeartRate}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineHeartRate: v })}
              testId="sedation-pre-hr"
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.baselineRespRate")}
              value={preAssessment.baselineRespRate}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineRespRate: v })}
              testId="sedation-pre-rr"
            />
            <TextField
              label={t("clinicalDocumentation.forms.sedation.baselineBloodPressure")}
              value={preAssessment.baselineBloodPressure}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineBloodPressure: v })}
              testId="sedation-pre-bp"
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.baselineSpo2")}
              value={preAssessment.baselineSpo2}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineSpo2: v })}
              testId="sedation-pre-spo2"
            />
          </div>
          <NotesField
            label={t("clinicalDocumentation.forms.sedation.notes")}
            value={preAssessment.notes}
            onChange={(v) => setPreAssessment({ ...preAssessment, notes: v })}
            testId="sedation-pre-notes"
          />
        </>
      ) : null}

      {cardId === SEDATION_TIMEOUT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.sedation.timeoutTime")}
              value={timeout.timeoutTime}
              onChange={(v) => setTimeout({ ...timeout, timeoutTime: v })}
              type="datetime-local"
              testId="sedation-timeout-time"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.plannedSedationLevel")}
              value={timeout.plannedSedationLevel}
              options={SEDATION_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setTimeout({ ...timeout, plannedSedationLevel: v })}
              testId="sedation-timeout-level"
            />
          </div>
          <div style={rowStyle}>
            {(
              [
                ["correctPatientConfirmed", "correctPatientConfirmed"],
                ["correctProcedureConfirmed", "correctProcedureConfirmed"],
                ["correctSiteConfirmed", "correctSiteConfirmed"],
                ["providerPresent", "providerPresent"],
                ["rnPresent", "rnPresent"],
                ["monitoringEquipmentAvailable", "monitoringEquipmentAvailable"],
                ["suctionAvailable", "suctionAvailable"],
                ["oxygenAvailable", "oxygenAvailable"],
                ["airwayEquipmentAvailable", "airwayEquipmentAvailable"],
                ["reversalAgentsAvailable", "reversalAgentsAvailable"],
                ["emergencyEquipmentAvailable", "emergencyEquipmentAvailable"],
                ["consentVerified", "consentVerified"],
              ] as const
            ).map(([key, i18nKey]) => (
              <ClinicalDocumentationBooleanField
                key={key}
                label={t(`clinicalDocumentation.forms.sedation.${i18nKey}`)}
                value={timeout[key]}
                locale={locale}
                onChange={(v) => setTimeout({ ...timeout, [key]: v })}
              />
            ))}
          </div>
          <NotesField
            label={t("clinicalDocumentation.forms.sedation.notes")}
            value={timeout.notes}
            onChange={(v) => setTimeout({ ...timeout, notes: v })}
            testId="sedation-timeout-notes"
          />
        </>
      ) : null}

      {cardId === SEDATION_INITIATION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.sedation.startTime")}
              value={initiation.startTime}
              onChange={(v) => setInitiation({ ...initiation, startTime: v })}
              type="datetime-local"
              testId="sedation-init-start"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.sedationLevelTarget")}
              value={initiation.sedationLevelTarget}
              options={SEDATION_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, sedationLevelTarget: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.oxygenDeliveryMethod")}
              value={initiation.oxygenDeliveryMethod}
              options={SEDATION_OXYGEN_DELIVERY_OPTIONS}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, oxygenDeliveryMethod: v })}
            />
          </div>
          <div style={rowStyle}>
            {(
              [
                "monitoringStarted",
                "cardiacMonitorApplied",
                "pulseOximetryApplied",
                "etco2MonitoringApplied",
                "bloodPressureMonitoringApplied",
                "ivAccessConfirmed",
                "medicationAdministrationDocumentedInMar",
              ] as const
            ).map((key) => (
              <ClinicalDocumentationBooleanField
                key={key}
                label={t(`clinicalDocumentation.forms.sedation.${key}`)}
                value={initiation[key]}
                locale={locale}
                onChange={(v) => setInitiation({ ...initiation, [key]: v })}
              />
            ))}
          </div>
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.baselineHeartRate")}
              value={initiation.baselineHeartRate}
              onChange={(v) => setInitiation({ ...initiation, baselineHeartRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.baselineRespRate")}
              value={initiation.baselineRespRate}
              onChange={(v) => setInitiation({ ...initiation, baselineRespRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.sedation.baselineBloodPressure")}
              value={initiation.baselineBloodPressure}
              onChange={(v) => setInitiation({ ...initiation, baselineBloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.baselineSpo2")}
              value={initiation.baselineSpo2}
              onChange={(v) => setInitiation({ ...initiation, baselineSpo2: v })}
            />
          </div>
          <NotesField
            label={t("clinicalDocumentation.forms.sedation.notes")}
            value={initiation.notes}
            onChange={(v) => setInitiation({ ...initiation, notes: v })}
          />
        </>
      ) : null}

      {cardId === SEDATION_MONITORING_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.sedation.monitoringTime")}
              value={monitoring.monitoringTime}
              onChange={(v) => setMonitoring({ ...monitoring, monitoringTime: v })}
              type="datetime-local"
              testId="sedation-monitoring-time"
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.heartRate")}
              value={monitoring.heartRate}
              onChange={(v) => setMonitoring({ ...monitoring, heartRate: v })}
              testId="sedation-monitoring-hr"
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.respRate")}
              value={monitoring.respRate}
              onChange={(v) => setMonitoring({ ...monitoring, respRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.sedation.bloodPressure")}
              value={monitoring.bloodPressure}
              onChange={(v) => setMonitoring({ ...monitoring, bloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.spo2")}
              value={monitoring.spo2}
              onChange={(v) => setMonitoring({ ...monitoring, spo2: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.oxygenDeliveryMethod")}
              value={monitoring.oxygenDeliveryMethod}
              options={SEDATION_OXYGEN_DELIVERY_OPTIONS}
              locale={locale}
              onChange={(v) => setMonitoring({ ...monitoring, oxygenDeliveryMethod: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.sedationLevel")}
              value={monitoring.sedationLevel}
              options={SEDATION_MONITORING_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setMonitoring({ ...monitoring, sedationLevel: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.airwayStatus")}
              value={monitoring.airwayStatus}
              options={SEDATION_AIRWAY_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setMonitoring({ ...monitoring, airwayStatus: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.interventionRequired")}
              value={monitoring.interventionRequired}
              locale={locale}
              onChange={(v) => setMonitoring({ ...monitoring, interventionRequired: v })}
            />
            {monitoring.interventionRequired ? (
              <TextField
                label={t("clinicalDocumentation.forms.sedation.interventionDescription")}
                value={monitoring.interventionDescription}
                onChange={(v) => setMonitoring({ ...monitoring, interventionDescription: v })}
                testId="sedation-monitoring-intervention"
              />
            ) : null}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.adverseEventObserved")}
              value={monitoring.adverseEventObserved}
              locale={locale}
              onChange={(v) => setMonitoring({ ...monitoring, adverseEventObserved: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.providerNotified")}
              value={monitoring.providerNotified}
              locale={locale}
              onChange={(v) => setMonitoring({ ...monitoring, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === SEDATION_REASSESSMENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.sedation.reassessmentTime")}
              value={reassessment.reassessmentTime}
              onChange={(v) => setReassessment({ ...reassessment, reassessmentTime: v })}
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.patientCondition")}
              value={reassessment.patientCondition}
              options={SEDATION_REASSESSMENT_CONDITION_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, patientCondition: v })}
            />
          </div>
          <div style={rowStyle}>
            {(
              [
                "airwayStable",
                "hemodynamicallyStable",
                "painControlled",
                "nauseaVomitingPresent",
                "providerNotified",
                "continuedMonitoringRequired",
              ] as const
            ).map((key) => (
              <ClinicalDocumentationBooleanField
                key={key}
                label={t(`clinicalDocumentation.forms.sedation.${key}`)}
                value={reassessment[key]}
                locale={locale}
                onChange={(v) => setReassessment({ ...reassessment, [key]: v })}
              />
            ))}
          </div>
        </>
      ) : null}

      {cardId === SEDATION_RECOVERY_SCORE_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.sedation.scoredAt")}
            value={recoveryScore.scoredAt}
            onChange={(v) => setRecoveryScore({ ...recoveryScore, scoredAt: v })}
            type="datetime-local"
            testId="sedation-recovery-scored-at"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.sedation.activity")}
              value={recoveryScore.activity}
              options={SEDATION_RECOVERY_ACTIVITY_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryScore({ ...recoveryScore, activity: v })}
              testId="sedation-recovery-activity"
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.sedation.respiration")}
              value={recoveryScore.respiration}
              options={SEDATION_RECOVERY_RESPIRATION_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryScore({ ...recoveryScore, respiration: v })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.sedation.circulation")}
              value={recoveryScore.circulation}
              options={SEDATION_RECOVERY_CIRCULATION_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryScore({ ...recoveryScore, circulation: v })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.sedation.consciousness")}
              value={recoveryScore.consciousness}
              options={SEDATION_RECOVERY_CONSCIOUSNESS_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryScore({ ...recoveryScore, consciousness: v })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.sedation.oxygenSaturation")}
              value={recoveryScore.oxygenSaturation}
              options={SEDATION_RECOVERY_OXYGEN_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryScore({ ...recoveryScore, oxygenSaturation: v })}
            />
          </div>
          <p data-testid="sedation-recovery-total" style={scoreBannerStyle(recoveryCriteriaMet)}>
            {t("clinicalDocumentation.forms.sedation.totalScore")}: {calculatedRecoveryTotal} / 10 —{" "}
            {recoveryCriteriaMet
              ? t("clinicalDocumentation.forms.sedation.recoveryCriteriaMet")
              : t("clinicalDocumentation.forms.sedation.recoveryCriteriaNotMet")}
          </p>
        </>
      ) : null}

      {cardId === SEDATION_RECOVERY_MONITORING_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.sedation.monitoringTime")}
              value={recoveryMonitoring.monitoringTime}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, monitoringTime: v })}
              type="datetime-local"
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.heartRate")}
              value={recoveryMonitoring.heartRate}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, heartRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.respRate")}
              value={recoveryMonitoring.respRate}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, respRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.sedation.bloodPressure")}
              value={recoveryMonitoring.bloodPressure}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, bloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.spo2")}
              value={recoveryMonitoring.spo2}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, spo2: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.airwayStatus")}
              value={recoveryMonitoring.airwayStatus}
              options={SEDATION_AIRWAY_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, airwayStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sedation.levelOfConsciousness")}
              value={recoveryMonitoring.levelOfConsciousness}
              options={SEDATION_RECOVERY_LOC_OPTIONS}
              locale={locale}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, levelOfConsciousness: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.sedation.painScore")}
              value={recoveryMonitoring.painScore}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, painScore: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.sedation.nauseaVomitingPresent")}
              value={recoveryMonitoring.nauseaVomitingPresent}
              locale={locale}
              onChange={(v) => setRecoveryMonitoring({ ...recoveryMonitoring, nauseaVomitingPresent: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === SEDATION_DISCHARGE_READINESS_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.sedation.assessedAt")}
            value={dischargeReadiness.assessedAt}
            onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, assessedAt: v })}
            type="datetime-local"
            testId="sedation-discharge-assessed-at"
          />
          <div style={rowStyle}>
            {(
              [
                "recoveryScoreReviewed",
                "vitalSignsStable",
                "airwayStable",
                "mentalStatusAtBaseline",
                "painControlled",
                "nauseaControlled",
                "responsibleAdultPresent",
                "dischargeInstructionsReviewed",
                "providerApprovedDischarge",
                "patientOrRepresentativeUnderstandsInstructions",
              ] as const
            ).map((key) => (
              <ClinicalDocumentationBooleanField
                key={key}
                label={t(`clinicalDocumentation.forms.sedation.${key}`)}
                value={dischargeReadiness[key]}
                locale={locale}
                onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, [key]: v })}
              />
            ))}
          </div>
          <NotesField
            label={t("clinicalDocumentation.forms.sedation.notes")}
            value={dischargeReadiness.notes}
            onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, notes: v })}
          />
        </>
      ) : null}

      {validationError ? (
        <p data-testid="sedation-validation-error" style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-sedation-save"
        disabled={saving}
        onClick={() => void handleSubmit()}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: saving ? "#f1f5f9" : "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {t("clinicalDocumentation.saveEntry")}
      </button>
    </div>
  );
}

export function isEdoc10ProceduralSedationFormCard(cardId: string): boolean {
  return (EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
