"use client";

import React, { useState } from "react";
import {
  BREATH_SOUNDS_LOCATION_OPTIONS,
  BREATH_SOUNDS_OPTIONS,
  COUGH_OPTIONS,
  CPAP_BIPAP_MODE_OPTIONS,
  CPAP_BIPAP_MONITORING_CARD_ID,
  CPAP_PATIENT_TOLERANCE_OPTIONS,
  EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS,
  FLOW_UNIT_OPTIONS,
  INTERVENTION_PERFORMED_OPTIONS,
  MASK_FIT_OPTIONS,
  NEBULIZER_MEDICATION_OPTIONS,
  NEBULIZER_REASSESSMENT_CARD_ID,
  OXYGEN_DEVICE_OPTIONS,
  OXYGEN_INITIATION_REASON_OPTIONS,
  OXYGEN_THERAPY_INITIATION_CARD_ID,
  OXYGEN_TITRATION_CARD_ID,
  OXYGEN_TITRATION_REASON_OPTIONS,
  PATIENT_POSITION_OPTIONS,
  PEAK_FLOW_DOCUMENTATION_CARD_ID,
  PEAK_FLOW_EFFORT_QUALITY_OPTIONS,
  RESP_ASSESSMENT_CARD_ID,
  RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID,
  RESPIRATORY_MENTAL_STATUS_OPTIONS,
  SKIN_INTEGRITY_OPTIONS,
  VENTILATOR_MODE_OPTIONS,
  VENTILATOR_OBSERVATION_CARD_ID,
  WORK_OF_BREATHING_OPTIONS,
  validateRespiratoryDocumentationPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
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

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  testId,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
  testId?: string;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type="number"
        data-testid={testId}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? "" : Number(raw));
        }}
        style={fieldStyle}
      />
    </label>
  );
}

function TextField({
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
    <label style={labelStyle}>
      {label}
      <input
        type="text"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </label>
  );
}

function DateTimeField({
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
    <label style={labelStyle}>
      {label}
      <input
        type="datetime-local"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </label>
  );
}

export function ClinicalDocumentationRespiratoryForm({
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

  const [assessment, setAssessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    respiratoryRate: 18 as number | "",
    spo2: 98 as number | "",
    oxygenDevice: "ROOM_AIR" as (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"],
    oxygenFlowRate: "" as number | "",
    workOfBreathing: "NORMAL" as (typeof WORK_OF_BREATHING_OPTIONS)[number]["value"],
    breathSounds: "CLEAR" as (typeof BREATH_SOUNDS_OPTIONS)[number]["value"],
    breathSoundsLocation: "BILATERAL" as (typeof BREATH_SOUNDS_LOCATION_OPTIONS)[number]["value"],
    cough: "NONE" as (typeof COUGH_OPTIONS)[number]["value"],
    sputumPresent: false,
    sputumDescription: "",
    accessoryMuscleUse: false,
    retractions: false,
    cyanosis: false,
    patientPosition: "SEMI_FOWLER" as (typeof PATIENT_POSITION_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [oxygenInit, setOxygenInit] = useState({
    startedAt: nowLocalDatetimeValue(),
    oxygenDevice: "NASAL_CANNULA" as (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"],
    flowRate: 2 as number | "",
    flowUnit: "LPM" as (typeof FLOW_UNIT_OPTIONS)[number]["value"],
    spo2Before: 88 as number | "",
    spo2After: "" as number | "",
    reason: "HYPOXIA" as (typeof OXYGEN_INITIATION_REASON_OPTIONS)[number]["value"],
    providerOrderVerified: true,
    patientTolerated: true,
    notes: "",
  });

  const [oxygenTitration, setOxygenTitration] = useState({
    titrationTime: nowLocalDatetimeValue(),
    previousDevice: "NASAL_CANNULA" as (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"],
    newDevice: "SIMPLE_MASK" as (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"],
    previousFlowRate: 2 as number | "",
    newFlowRate: 6 as number | "",
    flowUnit: "LPM" as (typeof FLOW_UNIT_OPTIONS)[number]["value"],
    spo2Before: 90 as number | "",
    spo2After: 95 as number | "",
    reason: "SPO2_LOW" as (typeof OXYGEN_TITRATION_REASON_OPTIONS)[number]["value"],
    providerNotified: false,
    patientTolerated: true,
    notes: "",
  });

  const [nebulizer, setNebulizer] = useState({
    reassessmentTime: nowLocalDatetimeValue(),
    treatmentMedicationReferenced: "ALBUTEROL" as (typeof NEBULIZER_MEDICATION_OPTIONS)[number]["value"],
    treatmentDocumentedInMar: true,
    respiratoryRate: 22 as number | "",
    spo2: 94 as number | "",
    breathSoundsAfter: "WHEEZING" as (typeof BREATH_SOUNDS_OPTIONS)[number]["value"],
    workOfBreathingAfter: "MILD_INCREASED" as (typeof WORK_OF_BREATHING_OPTIONS)[number]["value"],
    patientReportsImprovement: true,
    adverseEffectObserved: false,
    providerNotified: false,
    notes: "",
  });

  const [cpapBipap, setCpapBipap] = useState({
    monitoringTime: nowLocalDatetimeValue(),
    mode: "CPAP" as (typeof CPAP_BIPAP_MODE_OPTIONS)[number]["value"],
    deviceSettingSummary: "CPAP 8 cmH₂O",
    fio2Percent: "" as number | "",
    respiratoryRate: 18 as number | "",
    spo2: 96 as number | "",
    maskFit: "GOOD" as (typeof MASK_FIT_OPTIONS)[number]["value"],
    skinIntegrity: "INTACT" as (typeof SKIN_INTEGRITY_OPTIONS)[number]["value"],
    patientTolerance: "TOLERATING" as (typeof CPAP_PATIENT_TOLERANCE_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [distress, setDistress] = useState({
    reassessmentTime: nowLocalDatetimeValue(),
    respiratoryRate: 28 as number | "",
    spo2: 89 as number | "",
    workOfBreathing: "SEVERE_DISTRESS" as (typeof WORK_OF_BREATHING_OPTIONS)[number]["value"],
    oxygenDevice: "NON_REBREATHER" as (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"],
    oxygenFlowRate: 15 as number | "",
    accessoryMuscleUse: true,
    retractions: true,
    mentalStatus: "ANXIOUS" as (typeof RESPIRATORY_MENTAL_STATUS_OPTIONS)[number]["value"],
    interventionPerformed: "OXYGEN_INCREASED" as (typeof INTERVENTION_PERFORMED_OPTIONS)[number]["value"],
    providerNotified: true,
    rapidResponseActivated: false,
    notes: "",
  });

  const [ventilator, setVentilator] = useState({
    observationTime: nowLocalDatetimeValue(),
    ventilatorMode: "AC" as (typeof VENTILATOR_MODE_OPTIONS)[number]["value"],
    fio2Percent: 40 as number | "",
    peep: 5 as number | "",
    tidalVolume: "" as number | "",
    respiratoryRateSet: 12 as number | "",
    respiratoryRateObserved: 12 as number | "",
    spo2: 97 as number | "",
    etco2: "" as number | "",
    airwaySecured: true,
    alarmObserved: false,
    alarmDescription: "",
    rtNotified: false,
    providerNotified: false,
    notes: "",
  });

  const [peakFlow, setPeakFlow] = useState({
    measuredAt: nowLocalDatetimeValue(),
    preTreatmentPeakFlow: 250 as number | "",
    postTreatmentPeakFlow: "" as number | "",
    personalBestKnown: false,
    personalBestValue: "" as number | "",
    effortQuality: "GOOD" as (typeof PEAK_FLOW_EFFORT_QUALITY_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case RESP_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(assessment.assessmentTime),
          respiratoryRate: assessment.respiratoryRate,
          spo2: assessment.spo2,
          oxygenDevice: assessment.oxygenDevice,
          oxygenFlowRate:
            assessment.oxygenFlowRate === "" ? undefined : assessment.oxygenFlowRate,
          workOfBreathing: assessment.workOfBreathing,
          breathSounds: assessment.breathSounds,
          breathSoundsLocation: assessment.breathSoundsLocation,
          cough: assessment.cough,
          sputumPresent: assessment.sputumPresent,
          sputumDescription: assessment.sputumPresent
            ? assessment.sputumDescription.trim() || undefined
            : undefined,
          accessoryMuscleUse: assessment.accessoryMuscleUse,
          retractions: assessment.retractions,
          cyanosis: assessment.cyanosis,
          patientPosition: assessment.patientPosition,
          providerNotified: assessment.providerNotified,
          notes: assessment.notes.trim() || undefined,
        };
      case OXYGEN_THERAPY_INITIATION_CARD_ID:
        return {
          startedAt: toIsoFromLocalDatetime(oxygenInit.startedAt),
          oxygenDevice: oxygenInit.oxygenDevice,
          flowRate: oxygenInit.flowRate === "" ? 0 : oxygenInit.flowRate,
          flowUnit: oxygenInit.flowUnit,
          spo2Before: oxygenInit.spo2Before,
          spo2After: oxygenInit.spo2After === "" ? undefined : oxygenInit.spo2After,
          reason: oxygenInit.reason,
          providerOrderVerified: oxygenInit.providerOrderVerified,
          patientTolerated: oxygenInit.patientTolerated,
          notes: oxygenInit.notes.trim() || undefined,
        };
      case OXYGEN_TITRATION_CARD_ID:
        return {
          titrationTime: toIsoFromLocalDatetime(oxygenTitration.titrationTime),
          previousDevice: oxygenTitration.previousDevice,
          newDevice: oxygenTitration.newDevice,
          previousFlowRate:
            oxygenTitration.previousFlowRate === ""
              ? undefined
              : oxygenTitration.previousFlowRate,
          newFlowRate: oxygenTitration.newFlowRate === "" ? 0 : oxygenTitration.newFlowRate,
          flowUnit: oxygenTitration.flowUnit,
          spo2Before: oxygenTitration.spo2Before,
          spo2After: oxygenTitration.spo2After,
          reason: oxygenTitration.reason,
          providerNotified: oxygenTitration.providerNotified,
          patientTolerated: oxygenTitration.patientTolerated,
          notes: oxygenTitration.notes.trim() || undefined,
        };
      case NEBULIZER_REASSESSMENT_CARD_ID:
        return {
          reassessmentTime: toIsoFromLocalDatetime(nebulizer.reassessmentTime),
          treatmentMedicationReferenced: nebulizer.treatmentMedicationReferenced,
          treatmentDocumentedInMar: nebulizer.treatmentDocumentedInMar,
          respiratoryRate: nebulizer.respiratoryRate,
          spo2: nebulizer.spo2,
          breathSoundsAfter: nebulizer.breathSoundsAfter,
          workOfBreathingAfter: nebulizer.workOfBreathingAfter,
          patientReportsImprovement: nebulizer.patientReportsImprovement,
          adverseEffectObserved: nebulizer.adverseEffectObserved,
          providerNotified: nebulizer.providerNotified,
          notes: nebulizer.notes.trim() || undefined,
        };
      case CPAP_BIPAP_MONITORING_CARD_ID:
        return {
          monitoringTime: toIsoFromLocalDatetime(cpapBipap.monitoringTime),
          mode: cpapBipap.mode,
          deviceSettingSummary: cpapBipap.deviceSettingSummary.trim(),
          fio2Percent: cpapBipap.fio2Percent === "" ? undefined : cpapBipap.fio2Percent,
          respiratoryRate: cpapBipap.respiratoryRate,
          spo2: cpapBipap.spo2,
          maskFit: cpapBipap.maskFit,
          skinIntegrity: cpapBipap.skinIntegrity,
          patientTolerance: cpapBipap.patientTolerance,
          providerNotified: cpapBipap.providerNotified,
          notes: cpapBipap.notes.trim() || undefined,
        };
      case RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID:
        return {
          reassessmentTime: toIsoFromLocalDatetime(distress.reassessmentTime),
          respiratoryRate: distress.respiratoryRate,
          spo2: distress.spo2,
          workOfBreathing: distress.workOfBreathing,
          oxygenDevice: distress.oxygenDevice,
          oxygenFlowRate: distress.oxygenFlowRate === "" ? undefined : distress.oxygenFlowRate,
          accessoryMuscleUse: distress.accessoryMuscleUse,
          retractions: distress.retractions,
          mentalStatus: distress.mentalStatus,
          interventionPerformed: distress.interventionPerformed,
          providerNotified: distress.providerNotified,
          rapidResponseActivated: distress.rapidResponseActivated,
          notes: distress.notes.trim() || undefined,
        };
      case VENTILATOR_OBSERVATION_CARD_ID:
        return {
          observationTime: toIsoFromLocalDatetime(ventilator.observationTime),
          ventilatorMode: ventilator.ventilatorMode,
          fio2Percent: ventilator.fio2Percent === "" ? undefined : ventilator.fio2Percent,
          peep: ventilator.peep === "" ? undefined : ventilator.peep,
          tidalVolume: ventilator.tidalVolume === "" ? undefined : ventilator.tidalVolume,
          respiratoryRateSet:
            ventilator.respiratoryRateSet === "" ? undefined : ventilator.respiratoryRateSet,
          respiratoryRateObserved: ventilator.respiratoryRateObserved,
          spo2: ventilator.spo2,
          etco2: ventilator.etco2 === "" ? undefined : ventilator.etco2,
          airwaySecured: ventilator.airwaySecured,
          alarmObserved: ventilator.alarmObserved,
          alarmDescription: ventilator.alarmObserved
            ? ventilator.alarmDescription.trim() || undefined
            : undefined,
          rtNotified: ventilator.rtNotified,
          providerNotified: ventilator.providerNotified,
          notes: ventilator.notes.trim() || undefined,
        };
      case PEAK_FLOW_DOCUMENTATION_CARD_ID:
        return {
          measuredAt: toIsoFromLocalDatetime(peakFlow.measuredAt),
          preTreatmentPeakFlow:
            peakFlow.preTreatmentPeakFlow === "" ? undefined : peakFlow.preTreatmentPeakFlow,
          postTreatmentPeakFlow:
            peakFlow.postTreatmentPeakFlow === "" ? undefined : peakFlow.postTreatmentPeakFlow,
          personalBestKnown: peakFlow.personalBestKnown,
          personalBestValue:
            peakFlow.personalBestKnown && peakFlow.personalBestValue !== ""
              ? peakFlow.personalBestValue
              : undefined,
          effortQuality: peakFlow.effortQuality,
          providerNotified: peakFlow.providerNotified,
          notes: peakFlow.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const payload = buildPayload();
    const result = validateRespiratoryDocumentationPayloadForCard(cardId, payload);
    if (!result.ok) {
      setValidationError(t("clinicalDocumentation.forms.respiratory.validationError"));
      return;
    }
    await onSubmit(result.data);
  }

  function renderOxygenDeviceSelect(
    labelKey: string,
    value: (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"],
    onChange: (v: (typeof OXYGEN_DEVICE_OPTIONS)[number]["value"]) => void
  ) {
    return (
      <ClinicalDocumentationSelectField
        label={t(labelKey)}
        value={value}
        options={OXYGEN_DEVICE_OPTIONS}
        locale={locale}
        onChange={onChange}
      />
    );
  }

  return (
    <form
      data-testid="clinical-documentation-respiratory-form"
      onSubmit={handleSubmit}
      style={formStyle}
    >
      {cardId === RESP_ASSESSMENT_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.assessmentTime")}
            value={assessment.assessmentTime}
            onChange={(v) => setAssessment((s) => ({ ...s, assessmentTime: v }))}
            testId="resp-assessment-time"
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.respiratoryRate")}
              value={assessment.respiratoryRate}
              onChange={(v) => setAssessment((s) => ({ ...s, respiratoryRate: v }))}
              min={1}
              max={80}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2")}
              value={assessment.spo2}
              onChange={(v) => setAssessment((s) => ({ ...s, spo2: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            {renderOxygenDeviceSelect(
              "clinicalDocumentation.forms.respiratory.oxygenDevice",
              assessment.oxygenDevice,
              (v) => setAssessment((s) => ({ ...s, oxygenDevice: v }))
            )}
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.oxygenFlowRate")}
              value={assessment.oxygenFlowRate}
              onChange={(v) => setAssessment((s) => ({ ...s, oxygenFlowRate: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.workOfBreathing")}
              value={assessment.workOfBreathing}
              options={WORK_OF_BREATHING_OPTIONS}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, workOfBreathing: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.breathSounds")}
              value={assessment.breathSounds}
              options={BREATH_SOUNDS_OPTIONS}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, breathSounds: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.breathSoundsLocation")}
              value={assessment.breathSoundsLocation}
              options={BREATH_SOUNDS_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, breathSoundsLocation: v }))}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.cough")}
              value={assessment.cough}
              options={COUGH_OPTIONS}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, cough: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.patientPosition")}
              value={assessment.patientPosition}
              options={PATIENT_POSITION_OPTIONS}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, patientPosition: v }))}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.sputumPresent")}
              value={assessment.sputumPresent}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, sputumPresent: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.accessoryMuscleUse")}
              value={assessment.accessoryMuscleUse}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, accessoryMuscleUse: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.retractions")}
              value={assessment.retractions}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, retractions: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.cyanosis")}
              value={assessment.cyanosis}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, cyanosis: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={assessment.providerNotified}
              locale={locale}
              onChange={(v) => setAssessment((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
          {assessment.sputumPresent ? (
            <TextField
              label={t("clinicalDocumentation.forms.respiratory.sputumDescription")}
              value={assessment.sputumDescription}
              onChange={(v) => setAssessment((s) => ({ ...s, sputumDescription: v }))}
            />
          ) : null}
        </>
      ) : null}

      {cardId === OXYGEN_THERAPY_INITIATION_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.startedAt")}
            value={oxygenInit.startedAt}
            onChange={(v) => setOxygenInit((s) => ({ ...s, startedAt: v }))}
            testId="resp-oxygen-init-time"
          />
          <div style={rowStyle}>
            {renderOxygenDeviceSelect(
              "clinicalDocumentation.forms.respiratory.oxygenDevice",
              oxygenInit.oxygenDevice,
              (v) => setOxygenInit((s) => ({ ...s, oxygenDevice: v }))
            )}
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.flowRate")}
              value={oxygenInit.flowRate}
              onChange={(v) => setOxygenInit((s) => ({ ...s, flowRate: v }))}
              min={0}
              max={100}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.flowUnit")}
              value={oxygenInit.flowUnit}
              options={FLOW_UNIT_OPTIONS}
              locale={locale}
              onChange={(v) => setOxygenInit((s) => ({ ...s, flowUnit: v }))}
            />
          </div>
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2Before")}
              value={oxygenInit.spo2Before}
              onChange={(v) => setOxygenInit((s) => ({ ...s, spo2Before: v }))}
              min={0}
              max={100}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2After")}
              value={oxygenInit.spo2After}
              onChange={(v) => setOxygenInit((s) => ({ ...s, spo2After: v }))}
              min={0}
              max={100}
            />
          </div>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.respiratory.reason")}
            value={oxygenInit.reason}
            options={OXYGEN_INITIATION_REASON_OPTIONS}
            locale={locale}
            onChange={(v) => setOxygenInit((s) => ({ ...s, reason: v }))}
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerOrderVerified")}
              value={oxygenInit.providerOrderVerified}
              locale={locale}
              onChange={(v) => setOxygenInit((s) => ({ ...s, providerOrderVerified: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.patientTolerated")}
              value={oxygenInit.patientTolerated}
              locale={locale}
              onChange={(v) => setOxygenInit((s) => ({ ...s, patientTolerated: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === OXYGEN_TITRATION_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.titrationTime")}
            value={oxygenTitration.titrationTime}
            onChange={(v) => setOxygenTitration((s) => ({ ...s, titrationTime: v }))}
            testId="resp-oxygen-titration-time"
          />
          <div style={rowStyle}>
            {renderOxygenDeviceSelect(
              "clinicalDocumentation.forms.respiratory.previousDevice",
              oxygenTitration.previousDevice,
              (v) => setOxygenTitration((s) => ({ ...s, previousDevice: v }))
            )}
            {renderOxygenDeviceSelect(
              "clinicalDocumentation.forms.respiratory.newDevice",
              oxygenTitration.newDevice,
              (v) => setOxygenTitration((s) => ({ ...s, newDevice: v }))
            )}
          </div>
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.previousFlowRate")}
              value={oxygenTitration.previousFlowRate}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, previousFlowRate: v }))}
              min={0}
              max={100}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.newFlowRate")}
              value={oxygenTitration.newFlowRate}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, newFlowRate: v }))}
              min={0}
              max={100}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.flowUnit")}
              value={oxygenTitration.flowUnit}
              options={FLOW_UNIT_OPTIONS}
              locale={locale}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, flowUnit: v }))}
            />
          </div>
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2Before")}
              value={oxygenTitration.spo2Before}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, spo2Before: v }))}
              min={0}
              max={100}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2After")}
              value={oxygenTitration.spo2After}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, spo2After: v }))}
              min={0}
              max={100}
            />
          </div>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.respiratory.reason")}
            value={oxygenTitration.reason}
            options={OXYGEN_TITRATION_REASON_OPTIONS}
            locale={locale}
            onChange={(v) => setOxygenTitration((s) => ({ ...s, reason: v }))}
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={oxygenTitration.providerNotified}
              locale={locale}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, providerNotified: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.patientTolerated")}
              value={oxygenTitration.patientTolerated}
              locale={locale}
              onChange={(v) => setOxygenTitration((s) => ({ ...s, patientTolerated: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === NEBULIZER_REASSESSMENT_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.reassessmentTime")}
            value={nebulizer.reassessmentTime}
            onChange={(v) => setNebulizer((s) => ({ ...s, reassessmentTime: v }))}
            testId="resp-nebulizer-time"
          />
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.respiratory.treatmentMedicationReferenced")}
            value={nebulizer.treatmentMedicationReferenced}
            options={NEBULIZER_MEDICATION_OPTIONS}
            locale={locale}
            onChange={(v) => setNebulizer((s) => ({ ...s, treatmentMedicationReferenced: v }))}
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.respiratoryRate")}
              value={nebulizer.respiratoryRate}
              onChange={(v) => setNebulizer((s) => ({ ...s, respiratoryRate: v }))}
              min={1}
              max={80}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2")}
              value={nebulizer.spo2}
              onChange={(v) => setNebulizer((s) => ({ ...s, spo2: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.breathSoundsAfter")}
              value={nebulizer.breathSoundsAfter}
              options={BREATH_SOUNDS_OPTIONS}
              locale={locale}
              onChange={(v) => setNebulizer((s) => ({ ...s, breathSoundsAfter: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.workOfBreathingAfter")}
              value={nebulizer.workOfBreathingAfter}
              options={WORK_OF_BREATHING_OPTIONS}
              locale={locale}
              onChange={(v) => setNebulizer((s) => ({ ...s, workOfBreathingAfter: v }))}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.treatmentDocumentedInMar")}
              value={nebulizer.treatmentDocumentedInMar}
              locale={locale}
              onChange={(v) => setNebulizer((s) => ({ ...s, treatmentDocumentedInMar: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.patientReportsImprovement")}
              value={nebulizer.patientReportsImprovement}
              locale={locale}
              onChange={(v) => setNebulizer((s) => ({ ...s, patientReportsImprovement: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.adverseEffectObserved")}
              value={nebulizer.adverseEffectObserved}
              locale={locale}
              onChange={(v) => setNebulizer((s) => ({ ...s, adverseEffectObserved: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={nebulizer.providerNotified}
              locale={locale}
              onChange={(v) => setNebulizer((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === CPAP_BIPAP_MONITORING_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.monitoringTime")}
            value={cpapBipap.monitoringTime}
            onChange={(v) => setCpapBipap((s) => ({ ...s, monitoringTime: v }))}
            testId="resp-cpap-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.mode")}
              value={cpapBipap.mode}
              options={CPAP_BIPAP_MODE_OPTIONS}
              locale={locale}
              onChange={(v) => setCpapBipap((s) => ({ ...s, mode: v }))}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.fio2Percent")}
              value={cpapBipap.fio2Percent}
              onChange={(v) => setCpapBipap((s) => ({ ...s, fio2Percent: v }))}
              min={21}
              max={100}
            />
          </div>
          <TextField
            label={t("clinicalDocumentation.forms.respiratory.deviceSettingSummary")}
            value={cpapBipap.deviceSettingSummary}
            onChange={(v) => setCpapBipap((s) => ({ ...s, deviceSettingSummary: v }))}
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.respiratoryRate")}
              value={cpapBipap.respiratoryRate}
              onChange={(v) => setCpapBipap((s) => ({ ...s, respiratoryRate: v }))}
              min={1}
              max={80}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2")}
              value={cpapBipap.spo2}
              onChange={(v) => setCpapBipap((s) => ({ ...s, spo2: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.maskFit")}
              value={cpapBipap.maskFit}
              options={MASK_FIT_OPTIONS}
              locale={locale}
              onChange={(v) => setCpapBipap((s) => ({ ...s, maskFit: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.skinIntegrity")}
              value={cpapBipap.skinIntegrity}
              options={SKIN_INTEGRITY_OPTIONS}
              locale={locale}
              onChange={(v) => setCpapBipap((s) => ({ ...s, skinIntegrity: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.patientTolerance")}
              value={cpapBipap.patientTolerance}
              options={CPAP_PATIENT_TOLERANCE_OPTIONS}
              locale={locale}
              onChange={(v) => setCpapBipap((s) => ({ ...s, patientTolerance: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={cpapBipap.providerNotified}
              locale={locale}
              onChange={(v) => setCpapBipap((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.reassessmentTime")}
            value={distress.reassessmentTime}
            onChange={(v) => setDistress((s) => ({ ...s, reassessmentTime: v }))}
            testId="resp-distress-time"
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.respiratoryRate")}
              value={distress.respiratoryRate}
              onChange={(v) => setDistress((s) => ({ ...s, respiratoryRate: v }))}
              min={1}
              max={80}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2")}
              value={distress.spo2}
              onChange={(v) => setDistress((s) => ({ ...s, spo2: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.workOfBreathing")}
              value={distress.workOfBreathing}
              options={WORK_OF_BREATHING_OPTIONS}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, workOfBreathing: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.mentalStatus")}
              value={distress.mentalStatus}
              options={RESPIRATORY_MENTAL_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, mentalStatus: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.respiratory.interventionPerformed")}
              value={distress.interventionPerformed}
              options={INTERVENTION_PERFORMED_OPTIONS}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, interventionPerformed: v }))}
            />
          </div>
          <div style={rowStyle}>
            {renderOxygenDeviceSelect(
              "clinicalDocumentation.forms.respiratory.oxygenDevice",
              distress.oxygenDevice,
              (v) => setDistress((s) => ({ ...s, oxygenDevice: v }))
            )}
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.oxygenFlowRate")}
              value={distress.oxygenFlowRate}
              onChange={(v) => setDistress((s) => ({ ...s, oxygenFlowRate: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.accessoryMuscleUse")}
              value={distress.accessoryMuscleUse}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, accessoryMuscleUse: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.retractions")}
              value={distress.retractions}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, retractions: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={distress.providerNotified}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, providerNotified: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.rapidResponseActivated")}
              value={distress.rapidResponseActivated}
              locale={locale}
              onChange={(v) => setDistress((s) => ({ ...s, rapidResponseActivated: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === VENTILATOR_OBSERVATION_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.observationTime")}
            value={ventilator.observationTime}
            onChange={(v) => setVentilator((s) => ({ ...s, observationTime: v }))}
            testId="resp-ventilator-time"
          />
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.respiratory.ventilatorMode")}
            value={ventilator.ventilatorMode}
            options={VENTILATOR_MODE_OPTIONS}
            locale={locale}
            onChange={(v) => setVentilator((s) => ({ ...s, ventilatorMode: v }))}
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.fio2Percent")}
              value={ventilator.fio2Percent}
              onChange={(v) => setVentilator((s) => ({ ...s, fio2Percent: v }))}
              min={21}
              max={100}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.peep")}
              value={ventilator.peep}
              onChange={(v) => setVentilator((s) => ({ ...s, peep: v }))}
              min={0}
              max={30}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.respiratoryRateObserved")}
              value={ventilator.respiratoryRateObserved}
              onChange={(v) => setVentilator((s) => ({ ...s, respiratoryRateObserved: v }))}
              min={1}
              max={80}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.spo2")}
              value={ventilator.spo2}
              onChange={(v) => setVentilator((s) => ({ ...s, spo2: v }))}
              min={0}
              max={100}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.airwaySecured")}
              value={ventilator.airwaySecured}
              locale={locale}
              onChange={(v) => setVentilator((s) => ({ ...s, airwaySecured: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.alarmObserved")}
              value={ventilator.alarmObserved}
              locale={locale}
              onChange={(v) => setVentilator((s) => ({ ...s, alarmObserved: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.rtNotified")}
              value={ventilator.rtNotified}
              locale={locale}
              onChange={(v) => setVentilator((s) => ({ ...s, rtNotified: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={ventilator.providerNotified}
              locale={locale}
              onChange={(v) => setVentilator((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
          {ventilator.alarmObserved ? (
            <TextField
              label={t("clinicalDocumentation.forms.respiratory.alarmDescription")}
              value={ventilator.alarmDescription}
              onChange={(v) => setVentilator((s) => ({ ...s, alarmDescription: v }))}
            />
          ) : null}
        </>
      ) : null}

      {cardId === PEAK_FLOW_DOCUMENTATION_CARD_ID ? (
        <>
          <DateTimeField
            label={t("clinicalDocumentation.forms.respiratory.measuredAt")}
            value={peakFlow.measuredAt}
            onChange={(v) => setPeakFlow((s) => ({ ...s, measuredAt: v }))}
            testId="resp-peak-flow-time"
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.preTreatmentPeakFlow")}
              value={peakFlow.preTreatmentPeakFlow}
              onChange={(v) => setPeakFlow((s) => ({ ...s, preTreatmentPeakFlow: v }))}
              min={1}
              max={800}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.respiratory.postTreatmentPeakFlow")}
              value={peakFlow.postTreatmentPeakFlow}
              onChange={(v) => setPeakFlow((s) => ({ ...s, postTreatmentPeakFlow: v }))}
              min={1}
              max={800}
            />
          </div>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.respiratory.effortQuality")}
            value={peakFlow.effortQuality}
            options={PEAK_FLOW_EFFORT_QUALITY_OPTIONS}
            locale={locale}
            onChange={(v) => setPeakFlow((s) => ({ ...s, effortQuality: v }))}
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.personalBestKnown")}
              value={peakFlow.personalBestKnown}
              locale={locale}
              onChange={(v) => setPeakFlow((s) => ({ ...s, personalBestKnown: v }))}
            />
            {peakFlow.personalBestKnown ? (
              <NumberField
                label={t("clinicalDocumentation.forms.respiratory.personalBestValue")}
                value={peakFlow.personalBestValue}
                onChange={(v) => setPeakFlow((s) => ({ ...s, personalBestValue: v }))}
                min={1}
                max={800}
              />
            ) : null}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.respiratory.providerNotified")}
              value={peakFlow.providerNotified}
              locale={locale}
              onChange={(v) => setPeakFlow((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
        </>
      ) : null}

      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: saving ? "#94a3b8" : "#0f172a",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </form>
  );
}

export function isEdoc12RespiratoryDocumentationFormCard(cardId: string): boolean {
  return (EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
