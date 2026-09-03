"use client";

import React, { useMemo, useState } from "react";
import {
  calculateGcsScore,
  calculateNihssChange,
  calculateNihssTotal,
  deriveGcsSeverity,
  detectNihssWorsening,
  EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS,
  FREQUENT_NEURO_FREQUENCY_OPTIONS,
  FREQUENT_NEURO_REASSESSMENT_CARD_ID,
  FREQUENT_NEURO_STATUS_OPTIONS,
  GCS_EYE_OPTIONS,
  GCS_MOTOR_OPTIONS,
  GCS_VERBAL_OPTIONS,
  GLASGOW_COMA_SCALE_CARD_ID,
  MOTOR_LIMB_GRADE_OPTIONS,
  MOTOR_STRENGTH_ASSESSMENT_CARD_ID,
  NEURO_CHECK_FACIAL_DROOP_OPTIONS,
  NEURO_CHECK_LOC_OPTIONS,
  NEURO_CHECK_ORIENTATION_OPTIONS,
  NEURO_CHECK_SENSATION_OPTIONS,
  NEURO_CHECK_SPEECH_OPTIONS,
  NEURO_CHECKS_CARD_ID,
  NEURO_ESCALATION_EVENT_CARD_ID,
  NEURO_ESCALATION_REASON_OPTIONS,
  NIHSS_FIELD_OPTIONS,
  NIHSS_REASSESSMENT_CARD_ID,
  NIHSS_SCORED_FIELD_KEYS,
  POST_THROMBOLYTIC_MONITORING_CARD_ID,
  POST_THROMBOLYTIC_THERAPY_OPTIONS,
  PRONATOR_DRIFT_OPTIONS,
  PUPILLARY_ASSESSMENT_CARD_ID,
  PUPIL_REACTION_OPTIONS,
  PUPIL_SIZE_MM_OPTIONS,
  validateStrokeNeuroReassessmentPayloadForCard,
  type NihssScoredFieldKey,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

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

export function ClinicalDocumentationStrokeNeuroReassessmentForm({
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

  const [nihssReassessment, setNihssReassessment] = useState({
    assessedAt: nowLocalDatetimeValue(),
    ...defaultNihssItems(),
    previousScore: "" as number | "",
    providerNotified: false,
    providerNotificationTime: "",
    notes: "",
  });

  const [neuroChecks, setNeuroChecks] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    levelOfConsciousness: "ALERT" as (typeof NEURO_CHECK_LOC_OPTIONS)[number]["value"],
    orientation: "X4" as (typeof NEURO_CHECK_ORIENTATION_OPTIONS)[number]["value"],
    speech: "NORMAL" as (typeof NEURO_CHECK_SPEECH_OPTIONS)[number]["value"],
    sensation: "INTACT" as (typeof NEURO_CHECK_SENSATION_OPTIONS)[number]["value"],
    facialDroop: "NONE" as (typeof NEURO_CHECK_FACIAL_DROOP_OPTIONS)[number]["value"],
    seizureActivityObserved: false,
    providerNotified: false,
    notes: "",
  });

  const [gcs, setGcs] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    eye: 4 as 4 | 3 | 2 | 1,
    verbal: 5 as 5 | 4 | 3 | 2 | 1,
    motor: 6 as 6 | 5 | 4 | 3 | 2 | 1,
    providerNotified: false,
    notes: "",
  });

  const [pupils, setPupils] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    leftPupilSize: 3,
    rightPupilSize: 3,
    leftReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    rightReaction: "BRISK" as (typeof PUPIL_REACTION_OPTIONS)[number]["value"],
    anisocoriaPresent: false,
    providerNotified: false,
    notes: "",
  });

  const [motor, setMotor] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    lue: 5,
    rue: 5,
    lle: 5,
    rle: 5,
    pronatorDrift: "NONE" as (typeof PRONATOR_DRIFT_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    reason: "NIHSS_WORSENING" as (typeof NEURO_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    responseReceived: false,
    responseTime: "",
    rapidResponseActivated: false,
    strokeAlertActivated: false,
    notes: "",
  });

  const [postThrombolytic, setPostThrombolytic] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    therapy: "TNK" as (typeof POST_THROMBOLYTIC_THERAPY_OPTIONS)[number]["value"],
    bloodPressure: "120/80",
    heartRate: 80 as number | "",
    neuroStatusStable: true,
    bleedingObserved: false,
    headachePresent: false,
    providerNotified: false,
    notes: "",
  });

  const [frequent, setFrequent] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    frequency: "Q15" as (typeof FREQUENT_NEURO_FREQUENCY_OPTIONS)[number]["value"],
    neuroStatus: "UNCHANGED" as (typeof FREQUENT_NEURO_STATUS_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const nihssTotal = useMemo(
    () => calculateNihssTotal(nihssReassessment),
    [nihssReassessment]
  );
  const nihssChange = useMemo(
    () =>
      nihssReassessment.previousScore === ""
        ? undefined
        : calculateNihssChange(nihssTotal, nihssReassessment.previousScore),
    [nihssTotal, nihssReassessment.previousScore]
  );
  const nihssWorsening = useMemo(
    () =>
      nihssReassessment.previousScore === ""
        ? false
        : detectNihssWorsening(nihssTotal, nihssReassessment.previousScore),
    [nihssTotal, nihssReassessment.previousScore]
  );

  const gcsTotal = useMemo(
    () => calculateGcsScore({ eye: gcs.eye, verbal: gcs.verbal, motor: gcs.motor }),
    [gcs]
  );
  const gcsSeverity = useMemo(() => deriveGcsSeverity(gcsTotal), [gcsTotal]);

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

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case NIHSS_REASSESSMENT_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(nihssReassessment.assessedAt),
          levelOfConsciousness: nihssReassessment.levelOfConsciousness,
          locQuestions: nihssReassessment.locQuestions,
          locCommands: nihssReassessment.locCommands,
          bestGaze: nihssReassessment.bestGaze,
          visualFields: nihssReassessment.visualFields,
          facialPalsy: nihssReassessment.facialPalsy,
          motorArmLeft: nihssReassessment.motorArmLeft,
          motorArmRight: nihssReassessment.motorArmRight,
          motorLegLeft: nihssReassessment.motorLegLeft,
          motorLegRight: nihssReassessment.motorLegRight,
          limbAtaxia: nihssReassessment.limbAtaxia,
          sensory: nihssReassessment.sensory,
          bestLanguage: nihssReassessment.bestLanguage,
          dysarthria: nihssReassessment.dysarthria,
          extinctionInattention: nihssReassessment.extinctionInattention,
          totalScore: nihssTotal,
          ...(nihssReassessment.previousScore === ""
            ? {}
            : { previousScore: nihssReassessment.previousScore }),
          ...(nihssChange !== undefined ? { scoreChange: nihssChange } : {}),
          worseningDetected: nihssWorsening,
          providerNotified: nihssReassessment.providerNotified,
          providerNotificationTime: optionalIso(nihssReassessment.providerNotificationTime),
          notes: nihssReassessment.notes.trim() || undefined,
        };
      case NEURO_CHECKS_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(neuroChecks.assessmentTime),
          levelOfConsciousness: neuroChecks.levelOfConsciousness,
          orientation: neuroChecks.orientation,
          speech: neuroChecks.speech,
          sensation: neuroChecks.sensation,
          facialDroop: neuroChecks.facialDroop,
          seizureActivityObserved: neuroChecks.seizureActivityObserved,
          providerNotified: neuroChecks.providerNotified,
          notes: neuroChecks.notes.trim() || undefined,
        };
      case GLASGOW_COMA_SCALE_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(gcs.assessmentTime),
          eye: gcs.eye,
          verbal: gcs.verbal,
          motor: gcs.motor,
          totalScore: gcsTotal,
          severityBand: gcsSeverity,
          providerNotified: gcs.providerNotified,
          notes: gcs.notes.trim() || undefined,
        };
      case PUPILLARY_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(pupils.assessmentTime),
          leftPupilSize: pupils.leftPupilSize,
          rightPupilSize: pupils.rightPupilSize,
          leftReaction: pupils.leftReaction,
          rightReaction: pupils.rightReaction,
          anisocoriaPresent: pupils.anisocoriaPresent,
          providerNotified: pupils.providerNotified,
          notes: pupils.notes.trim() || undefined,
        };
      case MOTOR_STRENGTH_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(motor.assessmentTime),
          lue: motor.lue,
          rue: motor.rue,
          lle: motor.lle,
          rle: motor.rle,
          pronatorDrift: motor.pronatorDrift,
          providerNotified: motor.providerNotified,
          notes: motor.notes.trim() || undefined,
        };
      case NEURO_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          reason: escalation.reason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          responseReceived: escalation.responseReceived,
          responseTime: optionalIso(escalation.responseTime),
          rapidResponseActivated: escalation.rapidResponseActivated,
          strokeAlertActivated: escalation.strokeAlertActivated,
          notes: escalation.notes.trim() || undefined,
        };
      case POST_THROMBOLYTIC_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(postThrombolytic.assessmentTime),
          therapy: postThrombolytic.therapy,
          bloodPressure: postThrombolytic.bloodPressure.trim(),
          heartRate: postThrombolytic.heartRate,
          neuroStatusStable: postThrombolytic.neuroStatusStable,
          bleedingObserved: postThrombolytic.bleedingObserved,
          headachePresent: postThrombolytic.headachePresent,
          providerNotified: postThrombolytic.providerNotified,
          notes: postThrombolytic.notes.trim() || undefined,
        };
      case FREQUENT_NEURO_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(frequent.assessmentTime),
          frequency: frequent.frequency,
          neuroStatus: frequent.neuroStatus,
          providerNotified: frequent.providerNotified,
          notes: frequent.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit() {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateStrokeNeuroReassessmentPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.strokeNeuro.validationError"));
      return;
    }
    await onSubmit(validated.data);
  }

  return (
    <div data-testid="clinical-documentation-stroke-neuro-form" style={formStyle}>
      {cardId === NIHSS_REASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.stroke.nihss.assessedAt")}
            value={nihssReassessment.assessedAt}
            onChange={(v) => setNihssReassessment({ ...nihssReassessment, assessedAt: v })}
            type="datetime-local"
            testId="stroke-neuro-nihss-reassessment-time"
          />
          <div style={rowStyle}>
            {NIHSS_SCORED_FIELD_KEYS.map((fieldKey) => (
              <ClinicalDocumentationScoreSelectField
                key={fieldKey}
                label={t(nihssFieldLabelKey[fieldKey])}
                value={nihssReassessment[fieldKey]}
                options={NIHSS_FIELD_OPTIONS[fieldKey]}
                locale={locale}
                onChange={(v) => setNihssReassessment({ ...nihssReassessment, [fieldKey]: v })}
              />
            ))}
          </div>
          <p data-testid="stroke-neuro-nihss-total" style={scoreBannerStyle}>
            {t("clinicalDocumentation.forms.stroke.calculatedScore")}: {nihssTotal}
            {nihssChange !== undefined ? ` (${nihssChange >= 0 ? "+" : ""}${nihssChange})` : ""}
          </p>
          <NumberField
            label={t("clinicalDocumentation.forms.strokeNeuro.previousScore")}
            value={nihssReassessment.previousScore}
            onChange={(v) => setNihssReassessment({ ...nihssReassessment, previousScore: v })}
            testId="stroke-neuro-nihss-previous"
          />
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.stroke.providerNotified")}
            value={nihssReassessment.providerNotified}
            locale={locale}
            onChange={(v) => setNihssReassessment({ ...nihssReassessment, providerNotified: v })}
          />
          {nihssReassessment.providerNotified ? (
            <TextField
              label={t("clinicalDocumentation.forms.strokeNeuro.providerNotificationTime")}
              value={nihssReassessment.providerNotificationTime}
              onChange={(v) =>
                setNihssReassessment({ ...nihssReassessment, providerNotificationTime: v })
              }
              type="datetime-local"
            />
          ) : null}
        </>
      ) : null}

      {cardId === NEURO_CHECKS_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.strokeNeuro.assessmentTime")}
            value={neuroChecks.assessmentTime}
            onChange={(v) => setNeuroChecks({ ...neuroChecks, assessmentTime: v })}
            type="datetime-local"
            testId="stroke-neuro-checks-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.levelOfConsciousness")}
              value={neuroChecks.levelOfConsciousness}
              options={NEURO_CHECK_LOC_OPTIONS}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, levelOfConsciousness: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.orientation")}
              value={neuroChecks.orientation}
              options={NEURO_CHECK_ORIENTATION_OPTIONS}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, orientation: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.speech")}
              value={neuroChecks.speech}
              options={NEURO_CHECK_SPEECH_OPTIONS}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, speech: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.sensation")}
              value={neuroChecks.sensation}
              options={NEURO_CHECK_SENSATION_OPTIONS}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, sensation: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.facialDroop")}
              value={neuroChecks.facialDroop}
              options={NEURO_CHECK_FACIAL_DROOP_OPTIONS}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, facialDroop: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.seizureActivityObserved")}
              value={neuroChecks.seizureActivityObserved}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, seizureActivityObserved: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={neuroChecks.providerNotified}
              locale={locale}
              onChange={(v) => setNeuroChecks({ ...neuroChecks, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === GLASGOW_COMA_SCALE_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.strokeNeuro.assessmentTime")}
            value={gcs.assessmentTime}
            onChange={(v) => setGcs({ ...gcs, assessmentTime: v })}
            type="datetime-local"
            testId="stroke-neuro-gcs-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.gcsEye")}
              value={gcs.eye}
              options={GCS_EYE_OPTIONS}
              locale={locale}
              onChange={(v) => setGcs({ ...gcs, eye: v as typeof gcs.eye })}
              testId="stroke-neuro-gcs-eye"
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.gcsVerbal")}
              value={gcs.verbal}
              options={GCS_VERBAL_OPTIONS}
              locale={locale}
              onChange={(v) => setGcs({ ...gcs, verbal: v as typeof gcs.verbal })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.gcsMotor")}
              value={gcs.motor}
              options={GCS_MOTOR_OPTIONS}
              locale={locale}
              onChange={(v) => setGcs({ ...gcs, motor: v as typeof gcs.motor })}
            />
          </div>
          <p data-testid="stroke-neuro-gcs-total" style={scoreBannerStyle}>
            {t("clinicalDocumentation.forms.stroke.calculatedScore")}: {gcsTotal} —{" "}
            {t(`clinicalDocumentation.forms.strokeNeuro.gcsSeverity.${gcsSeverity}`)}
          </p>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.stroke.providerNotified")}
            value={gcs.providerNotified}
            locale={locale}
            onChange={(v) => setGcs({ ...gcs, providerNotified: v })}
          />
        </>
      ) : null}

      {cardId === PUPILLARY_ASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.strokeNeuro.assessmentTime")}
            value={pupils.assessmentTime}
            onChange={(v) => setPupils({ ...pupils, assessmentTime: v })}
            type="datetime-local"
            testId="stroke-neuro-pupils-time"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.leftPupilSize")}
              value={pupils.leftPupilSize}
              options={PUPIL_SIZE_MM_OPTIONS}
              locale={locale}
              onChange={(v) => setPupils({ ...pupils, leftPupilSize: v })}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.rightPupilSize")}
              value={pupils.rightPupilSize}
              options={PUPIL_SIZE_MM_OPTIONS}
              locale={locale}
              onChange={(v) => setPupils({ ...pupils, rightPupilSize: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.leftReaction")}
              value={pupils.leftReaction}
              options={PUPIL_REACTION_OPTIONS}
              locale={locale}
              onChange={(v) => setPupils({ ...pupils, leftReaction: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.rightReaction")}
              value={pupils.rightReaction}
              options={PUPIL_REACTION_OPTIONS}
              locale={locale}
              onChange={(v) => setPupils({ ...pupils, rightReaction: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.anisocoriaPresent")}
              value={pupils.anisocoriaPresent}
              locale={locale}
              onChange={(v) => setPupils({ ...pupils, anisocoriaPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={pupils.providerNotified}
              locale={locale}
              onChange={(v) => setPupils({ ...pupils, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === MOTOR_STRENGTH_ASSESSMENT_CARD_ID ? (
        <>
          <TextField
            label={t("clinicalDocumentation.forms.strokeNeuro.assessmentTime")}
            value={motor.assessmentTime}
            onChange={(v) => setMotor({ ...motor, assessmentTime: v })}
            type="datetime-local"
            testId="stroke-neuro-motor-time"
          />
          <div style={rowStyle}>
            {(["lue", "rue", "lle", "rle"] as const).map((key) => (
              <ClinicalDocumentationScoreSelectField
                key={key}
                label={t(`clinicalDocumentation.forms.strokeNeuro.${key}`)}
                value={motor[key]}
                options={MOTOR_LIMB_GRADE_OPTIONS}
                locale={locale}
                onChange={(v) => setMotor({ ...motor, [key]: v })}
              />
            ))}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.pronatorDrift")}
              value={motor.pronatorDrift}
              options={PRONATOR_DRIFT_OPTIONS}
              locale={locale}
              onChange={(v) => setMotor({ ...motor, pronatorDrift: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={motor.providerNotified}
              locale={locale}
              onChange={(v) => setMotor({ ...motor, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === NEURO_ESCALATION_EVENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.strokeNeuro.eventTime")}
              value={escalation.eventTime}
              onChange={(v) => setEscalation({ ...escalation, eventTime: v })}
              type="datetime-local"
              testId="stroke-neuro-escalation-time"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.escalationReason")}
              value={escalation.reason}
              options={NEURO_ESCALATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, reason: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.strokeNeuro.providerNotificationTime")}
              value={escalation.providerNotificationTime}
              onChange={(v) => setEscalation({ ...escalation, providerNotificationTime: v })}
              type="datetime-local"
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={escalation.providerNotified}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, providerNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.responseReceived")}
              value={escalation.responseReceived}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, responseReceived: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.rapidResponseActivated")}
              value={escalation.rapidResponseActivated}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, rapidResponseActivated: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.strokeAlertActivated")}
              value={escalation.strokeAlertActivated}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, strokeAlertActivated: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === POST_THROMBOLYTIC_MONITORING_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.strokeNeuro.assessmentTime")}
              value={postThrombolytic.assessmentTime}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, assessmentTime: v })}
              type="datetime-local"
              testId="stroke-neuro-thrombolytic-time"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.therapy")}
              value={postThrombolytic.therapy}
              options={POST_THROMBOLYTIC_THERAPY_OPTIONS}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, therapy: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.strokeNeuro.bloodPressure")}
              value={postThrombolytic.bloodPressure}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, bloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.strokeNeuro.heartRate")}
              value={postThrombolytic.heartRate}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, heartRate: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.neuroStatusStable")}
              value={postThrombolytic.neuroStatusStable}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, neuroStatusStable: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.bleedingObserved")}
              value={postThrombolytic.bleedingObserved}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, bleedingObserved: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.strokeNeuro.headachePresent")}
              value={postThrombolytic.headachePresent}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, headachePresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={postThrombolytic.providerNotified}
              locale={locale}
              onChange={(v) => setPostThrombolytic({ ...postThrombolytic, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === FREQUENT_NEURO_REASSESSMENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.strokeNeuro.assessmentTime")}
              value={frequent.assessmentTime}
              onChange={(v) => setFrequent({ ...frequent, assessmentTime: v })}
              type="datetime-local"
              testId="stroke-neuro-frequent-time"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.frequency")}
              value={frequent.frequency}
              options={FREQUENT_NEURO_FREQUENCY_OPTIONS}
              locale={locale}
              onChange={(v) => setFrequent({ ...frequent, frequency: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.strokeNeuro.neuroStatus")}
              value={frequent.neuroStatus}
              options={FREQUENT_NEURO_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setFrequent({ ...frequent, neuroStatus: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={frequent.providerNotified}
              locale={locale}
              onChange={(v) => setFrequent({ ...frequent, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {validationError ? (
        <p data-testid="stroke-neuro-validation-error" style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-stroke-neuro-save"
        disabled={saving}
        onClick={() => void handleSubmit()}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: saving ? "#f1f5f9" : "#0f172a",
          color: saving ? "#94a3b8" : "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </div>
  );
}

export function isEdoc11StrokeNeuroReassessmentFormCard(cardId: string): boolean {
  return (EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS as readonly string[]).includes(cardId);
}
