"use client";

import React, { useMemo, useState } from "react";
import {
  EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  HIGH_ALERT_INFUSION_COMPLETION_CARD_ID,
  HIGH_ALERT_INFUSION_HOLD_CARD_ID,
  HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
  HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID,
  HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
  HIGH_ALERT_MEDICATION_TYPE_OPTIONS,
  INFUSION_HOLD_REASON_OPTIONS,
  INFUSION_ROUTE_OPTIONS,
  PAIN_SCORE_0_10_OPTIONS,
  SEDATION_SCORE_0_10_OPTIONS,
  TITRATION_REASON_FOR_CHANGE_OPTIONS,
  validateHighAlertInfusionPayloadForCard,
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
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testId?: string;
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={fieldStyle}
      />
    </div>
  );
}

export function ClinicalDocumentationHighAlertInfusionForm({
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

  const [verification, setVerification] = useState({
    verificationTime: nowLocalDatetimeValue(),
    medicationType: "HEPARIN" as (typeof HIGH_ALERT_MEDICATION_TYPE_OPTIONS)[number]["value"],
    medicationName: "",
    concentration: "",
    orderedRate: "",
    orderedDose: "",
    weightKg: "" as string,
    weightBasedCalculationVerified: true,
    pumpProgrammingVerified: true,
    lineTracingVerified: true,
    patientVerified: true,
    providerOrderVerified: true,
    independentDoubleCheckPerformed: true,
    verificationNotes: "",
  });

  const [initiation, setInitiation] = useState({
    startTime: nowLocalDatetimeValue(),
    medicationType: "HEPARIN" as (typeof HIGH_ALERT_MEDICATION_TYPE_OPTIONS)[number]["value"],
    medicationName: "",
    orderedRate: "",
    programmedRate: "",
    route: "IV" as (typeof INFUSION_ROUTE_OPTIONS)[number]["value"],
    pumpIdentifier: "",
    baselineHeartRate: 80,
    baselineBloodPressure: "120/80",
    baselineRespRate: 16,
    baselineSpo2: 98,
    baselineMentalStatus: "",
    providerOrderVerified: true,
    administrationStarted: true,
    notes: "",
  });

  const [titration, setTitration] = useState({
    titrationTime: nowLocalDatetimeValue(),
    medicationType: "HEPARIN" as (typeof HIGH_ALERT_MEDICATION_TYPE_OPTIONS)[number]["value"],
    previousRate: "",
    newRate: "",
    reasonForChange: "PROTOCOL" as (typeof TITRATION_REASON_FOR_CHANGE_OPTIONS)[number]["value"],
    providerAware: true,
    secondCheckerRequired: false,
    titrationNotes: "",
  });

  const [reassessment, setReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    heartRate: 82,
    bloodPressure: "118/76",
    respRate: 16,
    spo2: 97,
    documentPainScore: false,
    painScore: 0,
    documentSedationScore: false,
    sedationScore: 0,
    neurologicStatus: "",
    adverseEffectsPresent: false,
    providerNotified: false,
    continuedInfusion: true,
    notes: "",
  });

  const [hold, setHold] = useState({
    holdTime: nowLocalDatetimeValue(),
    reason: "PROVIDER_ORDER" as (typeof INFUSION_HOLD_REASON_OPTIONS)[number]["value"],
    providerNotified: true,
    restartPlanned: true,
    notes: "",
  });

  const [completion, setCompletion] = useState({
    completionTime: nowLocalDatetimeValue(),
    medicationType: "HEPARIN" as (typeof HIGH_ALERT_MEDICATION_TYPE_OPTIONS)[number]["value"],
    finalRate: "",
    completedAsOrdered: true,
    adverseEventOccurred: false,
    providerNotified: false,
    notes: "",
  });

  const witnessNotice = useMemo(() => {
    if (cardId === HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID) {
      return t("clinicalDocumentation.forms.highAlertInfusion.verificationWitnessNotice");
    }
    if (cardId === HIGH_ALERT_INFUSION_INITIATION_CARD_ID) {
      return t("clinicalDocumentation.forms.highAlertInfusion.initiationWitnessNotice");
    }
    if (cardId === HIGH_ALERT_INFUSION_TITRATION_CARD_ID) {
      return t("clinicalDocumentation.forms.highAlertInfusion.titrationWitnessNotice");
    }
    if (cardId === HIGH_ALERT_INFUSION_COMPLETION_CARD_ID) {
      return t("clinicalDocumentation.forms.highAlertInfusion.completionWitnessNotice");
    }
    return null;
  }, [cardId, t]);

  async function save() {
    setValidationError(null);
    let payload: Record<string, unknown>;
    switch (cardId) {
      case HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID:
        payload = {
          ...verification,
          verificationTime: toIsoFromLocalDatetime(verification.verificationTime),
          weightKg:
            verification.weightKg.trim() === ""
              ? undefined
              : Number(verification.weightKg),
        };
        break;
      case HIGH_ALERT_INFUSION_INITIATION_CARD_ID:
        payload = {
          ...initiation,
          startTime: toIsoFromLocalDatetime(initiation.startTime),
          pumpIdentifier: initiation.pumpIdentifier.trim() || undefined,
          baselineMentalStatus: initiation.baselineMentalStatus.trim() || undefined,
          notes: initiation.notes.trim() || undefined,
        };
        break;
      case HIGH_ALERT_INFUSION_TITRATION_CARD_ID:
        payload = {
          ...titration,
          titrationTime: toIsoFromLocalDatetime(titration.titrationTime),
          titrationNotes: titration.titrationNotes.trim() || undefined,
        };
        break;
      case HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID:
        payload = {
          assessmentTime: toIsoFromLocalDatetime(reassessment.assessmentTime),
          heartRate: reassessment.heartRate,
          bloodPressure: reassessment.bloodPressure,
          respRate: reassessment.respRate,
          spo2: reassessment.spo2,
          adverseEffectsPresent: reassessment.adverseEffectsPresent,
          providerNotified: reassessment.providerNotified,
          continuedInfusion: reassessment.continuedInfusion,
          notes: reassessment.notes.trim() || undefined,
          neurologicStatus: reassessment.neurologicStatus.trim() || undefined,
          ...(reassessment.documentPainScore ? { painScore: reassessment.painScore } : {}),
          ...(reassessment.documentSedationScore
            ? { sedationScore: reassessment.sedationScore }
            : {}),
        };
        break;
      case HIGH_ALERT_INFUSION_HOLD_CARD_ID:
        payload = {
          ...hold,
          holdTime: toIsoFromLocalDatetime(hold.holdTime),
          notes: hold.notes.trim() || undefined,
        };
        break;
      case HIGH_ALERT_INFUSION_COMPLETION_CARD_ID:
        payload = {
          ...completion,
          completionTime: toIsoFromLocalDatetime(completion.completionTime),
          notes: completion.notes.trim() || undefined,
        };
        break;
      default:
        return;
    }
    const result = validateHighAlertInfusionPayloadForCard(cardId, payload);
    if (!result.ok) {
      setValidationError(t("clinicalDocumentation.forms.highAlertInfusion.validationError"));
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <div
      data-testid="clinical-documentation-high-alert-infusion-form"
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {witnessNotice ? (
        <p
          data-testid="clinical-documentation-high-alert-infusion-witness-notice"
          style={{ margin: 0, fontSize: 12, color: "#b45309", fontWeight: 600 }}
        >
          {witnessNotice}
        </p>
      ) : null}

      {cardId === HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.verificationTime")}
              value={verification.verificationTime}
              onChange={(v) => setVerification({ ...verification, verificationTime: v })}
              testId="infusion-verification-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.medicationType")}
              value={verification.medicationType}
              options={HIGH_ALERT_MEDICATION_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, medicationType: v })}
              testId="infusion-verification-med-type"
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.medicationName")}
              value={verification.medicationName}
              onChange={(v) => setVerification({ ...verification, medicationName: v })}
              testId="infusion-verification-med-name"
            />
          </div>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.concentration")}
              value={verification.concentration}
              onChange={(v) => setVerification({ ...verification, concentration: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.orderedRate")}
              value={verification.orderedRate}
              onChange={(v) => setVerification({ ...verification, orderedRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.orderedDose")}
              value={verification.orderedDose}
              onChange={(v) => setVerification({ ...verification, orderedDose: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.weightKg")}
              value={verification.weightKg}
              onChange={(v) => setVerification({ ...verification, weightKg: v })}
              type="number"
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.weightBasedCalculationVerified")}
              value={verification.weightBasedCalculationVerified}
              locale={locale}
              onChange={(v) =>
                setVerification({ ...verification, weightBasedCalculationVerified: v })
              }
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.pumpProgrammingVerified")}
              value={verification.pumpProgrammingVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, pumpProgrammingVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.lineTracingVerified")}
              value={verification.lineTracingVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, lineTracingVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.patientVerified")}
              value={verification.patientVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, patientVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.providerOrderVerified")}
              value={verification.providerOrderVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, providerOrderVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t(
                "clinicalDocumentation.forms.highAlertInfusion.independentDoubleCheckPerformed"
              )}
              value={verification.independentDoubleCheckPerformed}
              locale={locale}
              onChange={(v) =>
                setVerification({ ...verification, independentDoubleCheckPerformed: v })
              }
            />
          </div>
        </>
      ) : null}

      {cardId === HIGH_ALERT_INFUSION_INITIATION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.startTime")}
              value={initiation.startTime}
              onChange={(v) => setInitiation({ ...initiation, startTime: v })}
              testId="infusion-initiation-start-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.medicationType")}
              value={initiation.medicationType}
              options={HIGH_ALERT_MEDICATION_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, medicationType: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.medicationName")}
              value={initiation.medicationName}
              onChange={(v) => setInitiation({ ...initiation, medicationName: v })}
              testId="infusion-initiation-med-name"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.route")}
              value={initiation.route}
              options={INFUSION_ROUTE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, route: v })}
            />
          </div>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.orderedRate")}
              value={initiation.orderedRate}
              onChange={(v) => setInitiation({ ...initiation, orderedRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.programmedRate")}
              value={initiation.programmedRate}
              onChange={(v) => setInitiation({ ...initiation, programmedRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.highAlertInfusion.baselineHeartRate")}
              value={initiation.baselineHeartRate}
              onChange={(v) => setInitiation({ ...initiation, baselineHeartRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.baselineBloodPressure")}
              value={initiation.baselineBloodPressure}
              onChange={(v) => setInitiation({ ...initiation, baselineBloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.highAlertInfusion.baselineRespRate")}
              value={initiation.baselineRespRate}
              onChange={(v) => setInitiation({ ...initiation, baselineRespRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.highAlertInfusion.baselineSpo2")}
              value={initiation.baselineSpo2}
              onChange={(v) => setInitiation({ ...initiation, baselineSpo2: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.providerOrderVerified")}
              value={initiation.providerOrderVerified}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, providerOrderVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.administrationStarted")}
              value={initiation.administrationStarted}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, administrationStarted: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === HIGH_ALERT_INFUSION_TITRATION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.titrationTime")}
              value={titration.titrationTime}
              onChange={(v) => setTitration({ ...titration, titrationTime: v })}
              testId="infusion-titration-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.medicationType")}
              value={titration.medicationType}
              options={HIGH_ALERT_MEDICATION_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setTitration({ ...titration, medicationType: v })}
              testId="infusion-titration-med-type"
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.previousRate")}
              value={titration.previousRate}
              onChange={(v) => setTitration({ ...titration, previousRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.newRate")}
              value={titration.newRate}
              onChange={(v) => setTitration({ ...titration, newRate: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.reasonForChange")}
              value={titration.reasonForChange}
              options={TITRATION_REASON_FOR_CHANGE_OPTIONS}
              locale={locale}
              onChange={(v) => setTitration({ ...titration, reasonForChange: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.providerAware")}
              value={titration.providerAware}
              locale={locale}
              onChange={(v) => setTitration({ ...titration, providerAware: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.secondCheckerRequired")}
              value={titration.secondCheckerRequired}
              locale={locale}
              onChange={(v) => setTitration({ ...titration, secondCheckerRequired: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.assessmentTime")}
              value={reassessment.assessmentTime}
              onChange={(v) => setReassessment({ ...reassessment, assessmentTime: v })}
              testId="infusion-reassessment-time"
              type="datetime-local"
            />
            <NumberField
              label={t("clinicalDocumentation.forms.highAlertInfusion.heartRate")}
              value={reassessment.heartRate}
              onChange={(v) => setReassessment({ ...reassessment, heartRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.bloodPressure")}
              value={reassessment.bloodPressure}
              onChange={(v) => setReassessment({ ...reassessment, bloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.highAlertInfusion.respRate")}
              value={reassessment.respRate}
              onChange={(v) => setReassessment({ ...reassessment, respRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.highAlertInfusion.spo2")}
              value={reassessment.spo2}
              onChange={(v) => setReassessment({ ...reassessment, spo2: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.documentPainScore")}
              value={reassessment.documentPainScore}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, documentPainScore: v })}
            />
            {reassessment.documentPainScore ? (
              <ClinicalDocumentationScoreSelectField
                label={t("clinicalDocumentation.forms.highAlertInfusion.painScore")}
                value={reassessment.painScore}
                options={PAIN_SCORE_0_10_OPTIONS}
                locale={locale}
                onChange={(v) => setReassessment({ ...reassessment, painScore: v })}
              />
            ) : null}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.documentSedationScore")}
              value={reassessment.documentSedationScore}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, documentSedationScore: v })}
            />
            {reassessment.documentSedationScore ? (
              <ClinicalDocumentationScoreSelectField
                label={t("clinicalDocumentation.forms.highAlertInfusion.sedationScore")}
                value={reassessment.sedationScore}
                options={SEDATION_SCORE_0_10_OPTIONS}
                locale={locale}
                onChange={(v) => setReassessment({ ...reassessment, sedationScore: v })}
              />
            ) : null}
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.adverseEffectsPresent")}
              value={reassessment.adverseEffectsPresent}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, adverseEffectsPresent: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.continuedInfusion")}
              value={reassessment.continuedInfusion}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, continuedInfusion: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === HIGH_ALERT_INFUSION_HOLD_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.holdTime")}
              value={hold.holdTime}
              onChange={(v) => setHold({ ...hold, holdTime: v })}
              testId="infusion-hold-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.holdReason")}
              value={hold.reason}
              options={INFUSION_HOLD_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setHold({ ...hold, reason: v })}
              testId="infusion-hold-reason"
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.providerNotified")}
              value={hold.providerNotified}
              locale={locale}
              onChange={(v) => setHold({ ...hold, providerNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.restartPlanned")}
              value={hold.restartPlanned}
              locale={locale}
              onChange={(v) => setHold({ ...hold, restartPlanned: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === HIGH_ALERT_INFUSION_COMPLETION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.completionTime")}
              value={completion.completionTime}
              onChange={(v) => setCompletion({ ...completion, completionTime: v })}
              testId="infusion-completion-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.highAlertInfusion.medicationType")}
              value={completion.medicationType}
              options={HIGH_ALERT_MEDICATION_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, medicationType: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.highAlertInfusion.finalRate")}
              value={completion.finalRate}
              onChange={(v) => setCompletion({ ...completion, finalRate: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.completedAsOrdered")}
              value={completion.completedAsOrdered}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, completedAsOrdered: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.adverseEventOccurred")}
              value={completion.adverseEventOccurred}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, adverseEventOccurred: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.highAlertInfusion.providerNotified")}
              value={completion.providerNotified}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {validationError ? (
        <p style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-high-alert-infusion-save"
        disabled={saving}
        onClick={() => void save()}
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

export function isEdoc8HighAlertInfusionFormCard(cardId: string): boolean {
  return (EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
