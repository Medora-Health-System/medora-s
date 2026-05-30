"use client";

import React, { useMemo, useState } from "react";
import {
  calculateGcsTotal,
  calculateNihssTotal,
  deriveGcsSeverityBand,
  deriveNihssSeverity,
  EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS,
  FACIAL_SYMMETRY_OPTIONS,
  GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
  GCS_EYE_OPTIONS,
  GCS_MOTOR_OPTIONS,
  GCS_VERBAL_OPTIONS,
  MOTOR_STRENGTH_GRADE_OPTIONS,
  MONITORING_INTERVAL_OPTIONS,
  NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
  NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
  NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
  NEUROLOGICAL_REASSESSMENT_CARD_ID,
  NEURO_MENTAL_STATUS_OPTIONS,
  NEURO_STATUS_OPTIONS,
  NIHSS_ASSESSMENT_CARD_ID,
  NIHSS_FIELD_OPTIONS,
  NIHSS_SCORED_FIELD_KEYS,
  POSTICTAL_STATE_OPTIONS,
  PUPIL_REACTION_OPTIONS,
  NEURO_PUPIL_SIZE_MM_OPTIONS,
  SEIZURE_EVENT_DOCUMENTATION_CARD_ID,
  SEIZURE_TYPE_OPTIONS,
  SENSATION_STATUS_OPTIONS,
  SPEECH_STATUS_OPTIONS,
  STROKE_ALERT_EVENT_CARD_ID,
  validateNeurologicalDocumentationPayloadForCard,
  requiresNeurologicalReassessmentProviderNotification,
  type NihssScoredFieldKey,
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
  const trimmed = local.trim();
  if (!trimmed) return undefined;
  return toIsoFromLocalDatetime(trimmed);
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }}
      />
    </label>
  );
}

const defaultNihssItems = () => ({
  levelOfConsciousness: 0,
  locQuestions: 0,
  locCommands: 0,
  bestGaze: 0,
  visualFields: 0,
  facialPalsy: 0,
  motorArmLeft: 0,
  motorArmRight: 0,
  motorLegLeft: 0,
  motorLegRight: 0,
  limbAtaxia: 0,
  sensory: 0,
  bestLanguage: 0,
  dysarthria: 0,
  extinctionInattention: 0,
});

const nihssFieldLabelKey: Record<NihssScoredFieldKey, string> = {
  levelOfConsciousness: "clinicalDocumentation.forms.stroke.nihss.loc",
  locQuestions: "clinicalDocumentation.forms.stroke.nihss.locQuestions",
  locCommands: "clinicalDocumentation.forms.stroke.nihss.locCommands",
  bestGaze: "clinicalDocumentation.forms.stroke.nihss.bestGaze",
  visualFields: "clinicalDocumentation.forms.stroke.nihss.visualFields",
  facialPalsy: "clinicalDocumentation.forms.stroke.nihss.facialPalsy",
  motorArmLeft: "clinicalDocumentation.forms.stroke.nihss.motorArmLeft",
  motorArmRight: "clinicalDocumentation.forms.stroke.nihss.motorArmRight",
  motorLegLeft: "clinicalDocumentation.forms.stroke.nihss.motorLegLeft",
  motorLegRight: "clinicalDocumentation.forms.stroke.nihss.motorLegRight",
  limbAtaxia: "clinicalDocumentation.forms.stroke.nihss.limbAtaxia",
  sensory: "clinicalDocumentation.forms.stroke.nihss.sensory",
  bestLanguage: "clinicalDocumentation.forms.stroke.nihss.bestLanguage",
  dysarthria: "clinicalDocumentation.forms.stroke.nihss.dysarthria",
  extinctionInattention: "clinicalDocumentation.forms.stroke.nihss.extinctionInattention",
};

export function ClinicalDocumentationNeurologicalForm({
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

  const [initial, setInitial] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    orientationPerson: true,
    orientationPlace: true,
    orientationTime: true,
    orientationSituation: true,
    speechStatus: "CLEAR" as (typeof SPEECH_STATUS_OPTIONS)[number]["value"],
    facialSymmetry: "SYMMETRIC" as (typeof FACIAL_SYMMETRY_OPTIONS)[number]["value"],
    leftArmStrength: "5/5" as (typeof MOTOR_STRENGTH_GRADE_OPTIONS)[number]["value"],
    rightArmStrength: "5/5" as (typeof MOTOR_STRENGTH_GRADE_OPTIONS)[number]["value"],
    leftLegStrength: "5/5" as (typeof MOTOR_STRENGTH_GRADE_OPTIONS)[number]["value"],
    rightLegStrength: "5/5" as (typeof MOTOR_STRENGTH_GRADE_OPTIONS)[number]["value"],
    sensationStatus: "INTACT" as (typeof SENSATION_STATUS_OPTIONS)[number]["value"],
    leftPupilSizeMm: 3,
    rightPupilSizeMm: 3,
    leftPupilReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    rightPupilReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    notes: "",
  });

  const [reassessment, setReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    mentalStatus: "ALERT" as (typeof NEURO_MENTAL_STATUS_OPTIONS)[number]["value"],
    orientationChanged: false,
    motorChanged: false,
    sensoryChanged: false,
    speechChanged: false,
    priorSpeechStatus: "CLEAR" as (typeof SPEECH_STATUS_OPTIONS)[number]["value"],
    speechStatus: "CLEAR" as (typeof SPEECH_STATUS_OPTIONS)[number]["value"],
    pupilChanged: false,
    leftPupilSizeMm: 3,
    rightPupilSizeMm: 3,
    leftPupilReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    rightPupilReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    newDeficit: false,
    newUnilateralWeakness: false,
    providerNotified: false,
    providerNotificationTime: "",
    notes: "",
  });

  const [gcs, setGcs] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    eyeOpening: 4 as 1 | 2 | 3 | 4,
    verbalResponse: 5 as 1 | 2 | 3 | 4 | 5,
    motorResponse: 6 as 1 | 2 | 3 | 4 | 5 | 6,
    priorGcsTotal: "" as number | "",
    providerNotified: false,
    providerNotificationTime: "",
    notes: "",
  });

  const [strokeAlert, setStrokeAlert] = useState({
    lastKnownWell: nowLocalDatetimeValue(),
    symptomOnsetTime: nowLocalDatetimeValue(),
    strokeAlertActivated: true,
    activationTime: nowLocalDatetimeValue(),
    provider: "",
    neurologyNotified: true,
    ctOrdered: false,
    thrombolyticCandidate: false,
    contraindications: "",
    notes: "",
  });

  const [nihss, setNihss] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    ...defaultNihssItems(),
    priorNihssTotal: "" as number | "",
    providerNotified: false,
    providerNotificationTime: "",
    notes: "",
  });

  const [seizure, setSeizure] = useState({
    witnessed: true,
    startTime: nowLocalDatetimeValue(),
    endTime: nowLocalDatetimeValue(),
    durationMinutes: 2,
    seizureType: "FOCAL" as (typeof SEIZURE_TYPE_OPTIONS)[number]["value"],
    auraPresent: false,
    incontinence: false,
    injury: false,
    postictalState: "MILD" as (typeof POSTICTAL_STATE_OPTIONS)[number]["value"],
    benzodiazepineAdministered: false,
    rescueMedicationGiven: false,
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    notes: "",
  });

  const [postThrombolytic, setPostThrombolytic] = useState({
    administrationTime: nowLocalDatetimeValue(),
    monitoringInterval: "15_MIN" as (typeof MONITORING_INTERVAL_OPTIONS)[number]["value"],
    neuroStatus: "STABLE" as (typeof NEURO_STATUS_OPTIONS)[number]["value"],
    systolicBp: 120,
    diastolicBp: 80,
    bleedingSigns: false,
    neurologicalWorsening: false,
    providerNotified: false,
    providerNotificationTime: "",
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    newDeficit: true,
    mentalStatusDecline: false,
    gcsDrop: false,
    pupilChange: false,
    leftPupilSizeMm: 3,
    rightPupilSizeMm: 3,
    leftPupilReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    rightPupilReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    strokeSymptoms: false,
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    notes: "",
  });

  const gcsTotal = useMemo(
    () =>
      calculateGcsTotal({
        eyeOpening: gcs.eyeOpening,
        verbalResponse: gcs.verbalResponse,
        motorResponse: gcs.motorResponse,
      }),
    [gcs.eyeOpening, gcs.verbalResponse, gcs.motorResponse]
  );
  const gcsSeverity = useMemo(() => deriveGcsSeverityBand(gcsTotal), [gcsTotal]);

  const nihssTotal = useMemo(() => calculateNihssTotal(nihss), [nihss]);
  const nihssSeverity = useMemo(() => deriveNihssSeverity(nihssTotal), [nihssTotal]);

  const reassessmentRequiresProviderNotification = useMemo(
    () =>
      requiresNeurologicalReassessmentProviderNotification({
        newDeficit: reassessment.newDeficit,
        newUnilateralWeakness: reassessment.newUnilateralWeakness,
        mentalStatus: reassessment.mentalStatus,
        leftPupilReaction: reassessment.leftPupilReaction,
        rightPupilReaction: reassessment.rightPupilReaction,
        priorSpeechStatus: reassessment.priorSpeechStatus,
        speechStatus: reassessment.speechStatus,
      }),
    [reassessment]
  );

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(initial.assessmentTime),
          orientationPerson: initial.orientationPerson,
          orientationPlace: initial.orientationPlace,
          orientationTime: initial.orientationTime,
          orientationSituation: initial.orientationSituation,
          speechStatus: initial.speechStatus,
          facialSymmetry: initial.facialSymmetry,
          leftArmStrength: initial.leftArmStrength,
          rightArmStrength: initial.rightArmStrength,
          leftLegStrength: initial.leftLegStrength,
          rightLegStrength: initial.rightLegStrength,
          sensationStatus: initial.sensationStatus,
          leftPupilSizeMm: initial.leftPupilSizeMm,
          rightPupilSizeMm: initial.rightPupilSizeMm,
          leftPupilReaction: initial.leftPupilReaction,
          rightPupilReaction: initial.rightPupilReaction,
          notes: initial.notes.trim() || undefined,
        };
      case NEUROLOGICAL_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(reassessment.assessmentTime),
          mentalStatus: reassessment.mentalStatus,
          orientationChanged: reassessment.orientationChanged,
          motorChanged: reassessment.motorChanged,
          sensoryChanged: reassessment.sensoryChanged,
          speechChanged: reassessment.speechChanged,
          priorSpeechStatus: reassessment.priorSpeechStatus,
          speechStatus: reassessment.speechStatus,
          pupilChanged: reassessment.pupilChanged,
          leftPupilSizeMm: reassessment.leftPupilSizeMm,
          rightPupilSizeMm: reassessment.rightPupilSizeMm,
          leftPupilReaction: reassessment.leftPupilReaction,
          rightPupilReaction: reassessment.rightPupilReaction,
          newDeficit: reassessment.newDeficit,
          newUnilateralWeakness: reassessment.newUnilateralWeakness,
          providerNotified: reassessment.providerNotified,
          providerNotificationTime: optionalIso(reassessment.providerNotificationTime),
          notes: reassessment.notes.trim() || undefined,
        };
      case GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(gcs.assessmentTime),
          eyeOpening: gcs.eyeOpening,
          verbalResponse: gcs.verbalResponse,
          motorResponse: gcs.motorResponse,
          calculatedTotal: gcsTotal,
          severity: gcsSeverity,
          priorGcsTotal: gcs.priorGcsTotal === "" ? undefined : gcs.priorGcsTotal,
          providerNotified: gcs.providerNotified,
          providerNotificationTime: optionalIso(gcs.providerNotificationTime),
          notes: gcs.notes.trim() || undefined,
        };
      case STROKE_ALERT_EVENT_CARD_ID:
        return {
          lastKnownWell: toIsoFromLocalDatetime(strokeAlert.lastKnownWell),
          symptomOnsetTime: toIsoFromLocalDatetime(strokeAlert.symptomOnsetTime),
          strokeAlertActivated: strokeAlert.strokeAlertActivated,
          activationTime: optionalIso(strokeAlert.activationTime),
          provider: strokeAlert.provider.trim(),
          neurologyNotified: strokeAlert.neurologyNotified,
          ctOrdered: strokeAlert.ctOrdered,
          thrombolyticCandidate: strokeAlert.thrombolyticCandidate,
          contraindications: strokeAlert.contraindications.trim() || undefined,
          notes: strokeAlert.notes.trim() || undefined,
        };
      case NIHSS_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(nihss.assessmentTime),
          levelOfConsciousness: nihss.levelOfConsciousness,
          locQuestions: nihss.locQuestions,
          locCommands: nihss.locCommands,
          bestGaze: nihss.bestGaze,
          visualFields: nihss.visualFields,
          facialPalsy: nihss.facialPalsy,
          motorArmLeft: nihss.motorArmLeft,
          motorArmRight: nihss.motorArmRight,
          motorLegLeft: nihss.motorLegLeft,
          motorLegRight: nihss.motorLegRight,
          limbAtaxia: nihss.limbAtaxia,
          sensory: nihss.sensory,
          bestLanguage: nihss.bestLanguage,
          dysarthria: nihss.dysarthria,
          extinctionInattention: nihss.extinctionInattention,
          calculatedTotal: nihssTotal,
          severity: nihssSeverity,
          priorNihssTotal: nihss.priorNihssTotal === "" ? undefined : nihss.priorNihssTotal,
          providerNotified: nihss.providerNotified,
          providerNotificationTime: optionalIso(nihss.providerNotificationTime),
          notes: nihss.notes.trim() || undefined,
        };
      case SEIZURE_EVENT_DOCUMENTATION_CARD_ID:
        return {
          witnessed: seizure.witnessed,
          startTime: toIsoFromLocalDatetime(seizure.startTime),
          endTime: toIsoFromLocalDatetime(seizure.endTime),
          durationMinutes: seizure.durationMinutes,
          seizureType: seizure.seizureType,
          auraPresent: seizure.auraPresent,
          incontinence: seizure.incontinence,
          injury: seizure.injury,
          postictalState: seizure.postictalState,
          benzodiazepineAdministered: seizure.benzodiazepineAdministered,
          rescueMedicationGiven: seizure.rescueMedicationGiven,
          providerNotified: seizure.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(seizure.providerNotificationTime),
          notes: seizure.notes.trim() || undefined,
        };
      case NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID:
        return {
          administrationTime: toIsoFromLocalDatetime(postThrombolytic.administrationTime),
          monitoringInterval: postThrombolytic.monitoringInterval,
          neuroStatus: postThrombolytic.neuroStatus,
          systolicBp: postThrombolytic.systolicBp,
          diastolicBp: postThrombolytic.diastolicBp,
          bleedingSigns: postThrombolytic.bleedingSigns,
          neurologicalWorsening: postThrombolytic.neurologicalWorsening,
          providerNotified: postThrombolytic.providerNotified,
          providerNotificationTime: optionalIso(postThrombolytic.providerNotificationTime),
          notes: postThrombolytic.notes.trim() || undefined,
        };
      case NEUROLOGICAL_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          newDeficit: escalation.newDeficit,
          mentalStatusDecline: escalation.mentalStatusDecline,
          gcsDrop: escalation.gcsDrop,
          pupilChange: escalation.pupilChange,
          ...(escalation.pupilChange
            ? {
                leftPupilSizeMm: escalation.leftPupilSizeMm,
                rightPupilSizeMm: escalation.rightPupilSizeMm,
                leftPupilReaction: escalation.leftPupilReaction,
                rightPupilReaction: escalation.rightPupilReaction,
              }
            : {}),
          strokeSymptoms: escalation.strokeSymptoms,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          notes: escalation.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateNeurologicalDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.neurological.validationError"));
      return;
    }
    await onSubmit(validated.data);
  }

  return (
    <form
      data-testid="clinical-documentation-neurological-form"
      onSubmit={handleSubmit}
      style={formStyle}
    >
      {cardId === NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.assessmentTime")}
            value={initial.assessmentTime}
            onChange={(v) => setInitial({ ...initial, assessmentTime: v })}
            type="datetime-local"
            testId="neuro-initial-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.orientationPerson")}
              value={initial.orientationPerson}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, orientationPerson: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.orientationPlace")}
              value={initial.orientationPlace}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, orientationPlace: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.orientationTime")}
              value={initial.orientationTime}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, orientationTime: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.orientationSituation")}
              value={initial.orientationSituation}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, orientationSituation: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.speechStatus")}
              value={initial.speechStatus}
              options={SPEECH_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, speechStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.facialSymmetry")}
              value={initial.facialSymmetry}
              options={FACIAL_SYMMETRY_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, facialSymmetry: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.leftArmStrength")}
              value={initial.leftArmStrength}
              options={MOTOR_STRENGTH_GRADE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, leftArmStrength: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.rightArmStrength")}
              value={initial.rightArmStrength}
              options={MOTOR_STRENGTH_GRADE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, rightArmStrength: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.leftLegStrength")}
              value={initial.leftLegStrength}
              options={MOTOR_STRENGTH_GRADE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, leftLegStrength: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.rightLegStrength")}
              value={initial.rightLegStrength}
              options={MOTOR_STRENGTH_GRADE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, rightLegStrength: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.sensationStatus")}
              value={initial.sensationStatus}
              options={SENSATION_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, sensationStatus: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.neurological.leftPupilSizeMm")}
              value={initial.leftPupilSizeMm}
              options={NEURO_PUPIL_SIZE_MM_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, leftPupilSizeMm: v })}
              testId="neuro-initial-left-pupil-size"
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.neurological.rightPupilSizeMm")}
              value={initial.rightPupilSizeMm}
              options={NEURO_PUPIL_SIZE_MM_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, rightPupilSizeMm: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.leftPupilReaction")}
              value={initial.leftPupilReaction}
              options={PUPIL_REACTION_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, leftPupilReaction: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.rightPupilReaction")}
              value={initial.rightPupilReaction}
              options={PUPIL_REACTION_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial({ ...initial, rightPupilReaction: v })}
            />
          </div>
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={initial.notes}
            onChange={(v) => setInitial({ ...initial, notes: v })}
          />
        </>
      ) : null}

      {cardId === NEUROLOGICAL_REASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.assessmentTime")}
            value={reassessment.assessmentTime}
            onChange={(v) => setReassessment({ ...reassessment, assessmentTime: v })}
            type="datetime-local"
            testId="neuro-reassessment-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.mentalStatus")}
              value={reassessment.mentalStatus}
              options={NEURO_MENTAL_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, mentalStatus: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.orientationChanged")}
              value={reassessment.orientationChanged}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, orientationChanged: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.motorChanged")}
              value={reassessment.motorChanged}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, motorChanged: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.sensoryChanged")}
              value={reassessment.sensoryChanged}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, sensoryChanged: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.speechChanged")}
              value={reassessment.speechChanged}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, speechChanged: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.priorSpeechStatus")}
              value={reassessment.priorSpeechStatus}
              options={SPEECH_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, priorSpeechStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.speechStatus")}
              value={reassessment.speechStatus}
              options={SPEECH_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, speechStatus: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.pupilChanged")}
              value={reassessment.pupilChanged}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, pupilChanged: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.newDeficit")}
              value={reassessment.newDeficit}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, newDeficit: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.newUnilateralWeakness")}
              value={reassessment.newUnilateralWeakness}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, newUnilateralWeakness: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.providerNotified")}
              value={reassessment.providerNotified}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, providerNotified: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.neurological.leftPupilSizeMm")}
              value={reassessment.leftPupilSizeMm}
              options={NEURO_PUPIL_SIZE_MM_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, leftPupilSizeMm: v })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.neurological.rightPupilSizeMm")}
              value={reassessment.rightPupilSizeMm}
              options={NEURO_PUPIL_SIZE_MM_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, rightPupilSizeMm: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.leftPupilReaction")}
              value={reassessment.leftPupilReaction}
              options={PUPIL_REACTION_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, leftPupilReaction: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.rightPupilReaction")}
              value={reassessment.rightPupilReaction}
              options={PUPIL_REACTION_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, rightPupilReaction: v })}
            />
          </div>
          {reassessment.providerNotified || reassessmentRequiresProviderNotification ? (
            <TextField
              label={t("clinicalDocumentation.forms.neurological.providerNotificationTime")}
              value={reassessment.providerNotificationTime}
              onChange={(v) =>
                setReassessment({ ...reassessment, providerNotificationTime: v })
              }
              type="datetime-local"
              testId="neuro-reassessment-provider-time"
            />
          ) : null}
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={reassessment.notes}
            onChange={(v) => setReassessment({ ...reassessment, notes: v })}
          />
        </>
      ) : null}

      {cardId === GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.assessmentTime")}
            value={gcs.assessmentTime}
            onChange={(v) => setGcs({ ...gcs, assessmentTime: v })}
            type="datetime-local"
            testId="neuro-gcs-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.gcsEye")}
              value={gcs.eyeOpening}
              options={GCS_EYE_OPTIONS}
              locale={locale}
              onChange={(v) => setGcs({ ...gcs, eyeOpening: v as typeof gcs.eyeOpening })}
              testId="neuro-gcs-eye"
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.gcsVerbal")}
              value={gcs.verbalResponse}
              options={GCS_VERBAL_OPTIONS}
              locale={locale}
              onChange={(v) => setGcs({ ...gcs, verbalResponse: v as typeof gcs.verbalResponse })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.gcsMotor")}
              value={gcs.motorResponse}
              options={GCS_MOTOR_OPTIONS}
              locale={locale}
              onChange={(v) => setGcs({ ...gcs, motorResponse: v as typeof gcs.motorResponse })}
            />
          </div>
          <p data-testid="neuro-gcs-total" style={scoreBannerStyle}>
            {t("clinicalDocumentation.forms.neurological.calculatedTotal")}: {gcsTotal} —{" "}
            {t(`clinicalDocumentation.forms.neurological.gcsSeverity.${gcsSeverity}`)}
          </p>
          <NumberField
            label={t("clinicalDocumentation.forms.neurological.priorGcsTotal")}
            value={gcs.priorGcsTotal}
            onChange={(v) => setGcs({ ...gcs, priorGcsTotal: v })}
          />
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.neurological.providerNotified")}
            value={gcs.providerNotified}
            locale={locale}
            onChange={(v) => setGcs({ ...gcs, providerNotified: v })}
          />
          {gcs.providerNotified ? (
            <TextField
              label={t("clinicalDocumentation.forms.neurological.providerNotificationTime")}
              value={gcs.providerNotificationTime}
              onChange={(v) => setGcs({ ...gcs, providerNotificationTime: v })}
              type="datetime-local"
            />
          ) : null}
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={gcs.notes}
            onChange={(v) => setGcs({ ...gcs, notes: v })}
          />
        </>
      ) : null}

      {cardId === STROKE_ALERT_EVENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.lastKnownWell")}
            value={strokeAlert.lastKnownWell}
            onChange={(v) => setStrokeAlert({ ...strokeAlert, lastKnownWell: v })}
            type="datetime-local"
            testId="neuro-stroke-alert-lkw"
          />
          <TextField
            label={t("clinicalDocumentation.forms.neurological.symptomOnsetTime")}
            value={strokeAlert.symptomOnsetTime}
            onChange={(v) => setStrokeAlert({ ...strokeAlert, symptomOnsetTime: v })}
            type="datetime-local"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.strokeAlertActivated")}
              value={strokeAlert.strokeAlertActivated}
              locale={locale}
              onChange={(v) => setStrokeAlert({ ...strokeAlert, strokeAlertActivated: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.neurologyNotified")}
              value={strokeAlert.neurologyNotified}
              locale={locale}
              onChange={(v) => setStrokeAlert({ ...strokeAlert, neurologyNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.ctOrdered")}
              value={strokeAlert.ctOrdered}
              locale={locale}
              onChange={(v) => setStrokeAlert({ ...strokeAlert, ctOrdered: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.thrombolyticCandidate")}
              value={strokeAlert.thrombolyticCandidate}
              locale={locale}
              onChange={(v) => setStrokeAlert({ ...strokeAlert, thrombolyticCandidate: v })}
            />
          </div>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.activationTime")}
            value={strokeAlert.activationTime}
            onChange={(v) => setStrokeAlert({ ...strokeAlert, activationTime: v })}
            type="datetime-local"
          />
          <TextField
            label={t("clinicalDocumentation.forms.neurological.provider")}
            value={strokeAlert.provider}
            onChange={(v) => setStrokeAlert({ ...strokeAlert, provider: v })}
          />
          <TextField
            label={t("clinicalDocumentation.forms.neurological.contraindications")}
            value={strokeAlert.contraindications}
            onChange={(v) => setStrokeAlert({ ...strokeAlert, contraindications: v })}
          />
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={strokeAlert.notes}
            onChange={(v) => setStrokeAlert({ ...strokeAlert, notes: v })}
          />
        </>
      ) : null}

      {cardId === NIHSS_ASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.assessmentTime")}
            value={nihss.assessmentTime}
            onChange={(v) => setNihss({ ...nihss, assessmentTime: v })}
            type="datetime-local"
            testId="neuro-nihss-time"
          />
          <div style={rowStyle}>
            {NIHSS_SCORED_FIELD_KEYS.map((fieldKey) => (
              <ClinicalDocumentationScoreSelectField
                key={fieldKey}
                label={t(nihssFieldLabelKey[fieldKey])}
                value={nihss[fieldKey]}
                options={NIHSS_FIELD_OPTIONS[fieldKey]}
                locale={locale}
                onChange={(v) => setNihss({ ...nihss, [fieldKey]: v })}
              />
            ))}
          </div>
          <p data-testid="neuro-nihss-total" style={scoreBannerStyle}>
            {t("clinicalDocumentation.forms.neurological.calculatedTotal")}: {nihssTotal} —{" "}
            {t(`clinicalDocumentation.forms.neurological.nihssSeverity.${nihssSeverity}`)}
          </p>
          <NumberField
            label={t("clinicalDocumentation.forms.neurological.priorNihssTotal")}
            value={nihss.priorNihssTotal}
            onChange={(v) => setNihss({ ...nihss, priorNihssTotal: v })}
          />
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.neurological.providerNotified")}
            value={nihss.providerNotified}
            locale={locale}
            onChange={(v) => setNihss({ ...nihss, providerNotified: v })}
          />
          {nihss.providerNotified ? (
            <TextField
              label={t("clinicalDocumentation.forms.neurological.providerNotificationTime")}
              value={nihss.providerNotificationTime}
              onChange={(v) => setNihss({ ...nihss, providerNotificationTime: v })}
              type="datetime-local"
            />
          ) : null}
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={nihss.notes}
            onChange={(v) => setNihss({ ...nihss, notes: v })}
          />
        </>
      ) : null}

      {cardId === SEIZURE_EVENT_DOCUMENTATION_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.startTime")}
            value={seizure.startTime}
            onChange={(v) => setSeizure({ ...seizure, startTime: v })}
            type="datetime-local"
            testId="neuro-seizure-start"
          />
          <TextField
            label={t("clinicalDocumentation.forms.neurological.endTime")}
            value={seizure.endTime}
            onChange={(v) => setSeizure({ ...seizure, endTime: v })}
            type="datetime-local"
          />
          <div style={rowStyle}>
            <NumberField
              label={t("clinicalDocumentation.forms.neurological.durationMinutes")}
              value={seizure.durationMinutes}
              onChange={(v) => setSeizure({ ...seizure, durationMinutes: v === "" ? 0 : v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.seizureType")}
              value={seizure.seizureType}
              options={SEIZURE_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, seizureType: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.postictalState")}
              value={seizure.postictalState}
              options={POSTICTAL_STATE_OPTIONS}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, postictalState: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.witnessed")}
              value={seizure.witnessed}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, witnessed: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.auraPresent")}
              value={seizure.auraPresent}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, auraPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.incontinence")}
              value={seizure.incontinence}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, incontinence: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.injury")}
              value={seizure.injury}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, injury: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.benzodiazepineAdministered")}
              value={seizure.benzodiazepineAdministered}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, benzodiazepineAdministered: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.rescueMedicationGiven")}
              value={seizure.rescueMedicationGiven}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, rescueMedicationGiven: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.providerNotified")}
              value={seizure.providerNotified}
              locale={locale}
              onChange={(v) => setSeizure({ ...seizure, providerNotified: v })}
            />
          </div>
          {seizure.providerNotified ? (
            <TextField
              label={t("clinicalDocumentation.forms.neurological.providerNotificationTime")}
              value={seizure.providerNotificationTime}
              onChange={(v) => setSeizure({ ...seizure, providerNotificationTime: v })}
              type="datetime-local"
            />
          ) : null}
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={seizure.notes}
            onChange={(v) => setSeizure({ ...seizure, notes: v })}
          />
        </>
      ) : null}

      {cardId === NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.administrationTime")}
            value={postThrombolytic.administrationTime}
            onChange={(v) => setPostThrombolytic({ ...postThrombolytic, administrationTime: v })}
            type="datetime-local"
            testId="neuro-post-tpa-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.monitoringInterval")}
              value={postThrombolytic.monitoringInterval}
              options={MONITORING_INTERVAL_OPTIONS}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, monitoringInterval: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.neurological.neuroStatus")}
              value={postThrombolytic.neuroStatus}
              options={NEURO_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, neuroStatus: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.neurological.systolicBp")}
              value={postThrombolytic.systolicBp}
              onChange={(v) =>
                setPostThrombolytic({ ...postThrombolytic, systolicBp: v === "" ? 0 : v })
              }
            />
            <NumberField
              label={t("clinicalDocumentation.forms.neurological.diastolicBp")}
              value={postThrombolytic.diastolicBp}
              onChange={(v) =>
                setPostThrombolytic({ ...postThrombolytic, diastolicBp: v === "" ? 0 : v })
              }
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.bleedingSigns")}
              value={postThrombolytic.bleedingSigns}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, bleedingSigns: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.neurologicalWorsening")}
              value={postThrombolytic.neurologicalWorsening}
              locale={locale}
              onChange={(v) =>
                setPostThrombolytic({ ...postThrombolytic, neurologicalWorsening: v })
              }
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.providerNotified")}
              value={postThrombolytic.providerNotified}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, providerNotified: v })}
            />
          </div>
          {postThrombolytic.providerNotified ? (
            <TextField
              label={t("clinicalDocumentation.forms.neurological.providerNotificationTime")}
              value={postThrombolytic.providerNotificationTime}
              onChange={(v) =>
                setPostThrombolytic({ ...postThrombolytic, providerNotificationTime: v })
              }
              type="datetime-local"
            />
          ) : null}
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={postThrombolytic.notes}
            onChange={(v) => setPostThrombolytic({ ...postThrombolytic, notes: v })}
          />
        </>
      ) : null}

      {cardId === NEUROLOGICAL_ESCALATION_EVENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.neurological.eventTime")}
            value={escalation.eventTime}
            onChange={(v) => setEscalation({ ...escalation, eventTime: v })}
            type="datetime-local"
            testId="neuro-escalation-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.newDeficit")}
              value={escalation.newDeficit}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, newDeficit: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.mentalStatusDecline")}
              value={escalation.mentalStatusDecline}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, mentalStatusDecline: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.gcsDrop")}
              value={escalation.gcsDrop}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, gcsDrop: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.pupilChange")}
              value={escalation.pupilChange}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, pupilChange: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.strokeSymptoms")}
              value={escalation.strokeSymptoms}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, strokeSymptoms: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.neurological.providerNotified")}
              value={escalation.providerNotified}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, providerNotified: v })}
            />
          </div>
          {escalation.pupilChange ? (
            <div style={rowStyle}>
              <ClinicalDocumentationScoreSelectField
                label={t("clinicalDocumentation.forms.neurological.leftPupilSizeMm")}
                value={escalation.leftPupilSizeMm}
                options={NEURO_PUPIL_SIZE_MM_OPTIONS}
                locale={locale}
                onChange={(v) => setEscalation({ ...escalation, leftPupilSizeMm: v })}
              />
              <ClinicalDocumentationScoreSelectField
                label={t("clinicalDocumentation.forms.neurological.rightPupilSizeMm")}
                value={escalation.rightPupilSizeMm}
                options={NEURO_PUPIL_SIZE_MM_OPTIONS}
                locale={locale}
                onChange={(v) => setEscalation({ ...escalation, rightPupilSizeMm: v })}
              />
              <ClinicalDocumentationSelectField
                label={t("clinicalDocumentation.forms.neurological.leftPupilReaction")}
                value={escalation.leftPupilReaction}
                options={PUPIL_REACTION_OPTIONS}
                locale={locale}
                onChange={(v) => setEscalation({ ...escalation, leftPupilReaction: v })}
              />
              <ClinicalDocumentationSelectField
                label={t("clinicalDocumentation.forms.neurological.rightPupilReaction")}
                value={escalation.rightPupilReaction}
                options={PUPIL_REACTION_OPTIONS}
                locale={locale}
                onChange={(v) => setEscalation({ ...escalation, rightPupilReaction: v })}
              />
            </div>
          ) : null}
          {escalation.providerNotified ? (
            <TextField
              label={t("clinicalDocumentation.forms.neurological.providerNotificationTime")}
              value={escalation.providerNotificationTime}
              onChange={(v) => setEscalation({ ...escalation, providerNotificationTime: v })}
              type="datetime-local"
            />
          ) : null}
          <NotesField
            label={t("clinicalDocumentation.forms.neurological.notes")}
            value={escalation.notes}
            onChange={(v) => setEscalation({ ...escalation, notes: v })}
          />
        </>
      ) : null}

      {validationError ? (
        <p role="alert" style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>
          {validationError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: saving ? "#94a3b8" : "#2563eb",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </form>
  );
}

export function isEdoc14NeurologicalDocumentationFormCard(cardId: string): boolean {
  return (EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
