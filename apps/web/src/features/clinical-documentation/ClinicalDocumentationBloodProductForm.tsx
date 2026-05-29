"use client";

import React, { useMemo, useState } from "react";
import {
  BLOOD_PRODUCT_COMPLETION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_REACTION_CARD_ID,
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_SPECIAL_REQUIREMENT_OPTIONS,
  BLOOD_PRODUCT_TYPE_OPTIONS,
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  BLOOD_REACTION_SYMPTOM_OPTIONS,
  BLOOD_REACTION_TYPE_OPTIONS,
  BLOOD_REASSESSMENT_SYMPTOM_OPTIONS,
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID,
  MTP_EVENT_TYPE_OPTIONS,
  validateBloodProductPayloadForCard,
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

function CheckboxMulti({
  label,
  options,
  selected,
  locale,
  onChange,
  testIdPrefix,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; labelEn: string; labelFr: string }>;
  selected: string[];
  locale: "en" | "fr";
  onChange: (next: string[]) => void;
  testIdPrefix: string;
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
            >
              <input
                type="checkbox"
                data-testid={`${testIdPrefix}-${opt.value}`}
                checked={checked}
                onChange={() => {
                  onChange(
                    checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]
                  );
                }}
              />
              {locale === "en" ? opt.labelEn : opt.labelFr}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ClinicalDocumentationBloodProductForm({
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
    productType: "PRBC" as (typeof BLOOD_PRODUCT_TYPE_OPTIONS)[number]["value"],
    unitIdentifier: "",
    patientIdentityVerified: true,
    bloodTypeVerified: true,
    crossmatchVerified: true,
    expirationVerified: true,
    consentVerified: true,
    specialRequirements: "NONE" as (typeof BLOOD_PRODUCT_SPECIAL_REQUIREMENT_OPTIONS)[number]["value"],
    verificationNotes: "",
  });

  const [initiation, setInitiation] = useState({
    startTime: nowLocalDatetimeValue(),
    productType: "PRBC" as (typeof BLOOD_PRODUCT_TYPE_OPTIONS)[number]["value"],
    unitIdentifier: "",
    baselineTemperature: "37.0",
    baselineHeartRate: 80,
    baselineRespRate: 16,
    baselineBloodPressure: "120/80",
    baselineSpo2: 98,
    preMedicationAdministered: false,
    preMedicationNotes: "",
    providerOrderVerified: true,
    consentVerified: true,
    administrationStarted: true,
    notes: "",
  });

  const [reassessment, setReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    temperature: "37.0",
    heartRate: 82,
    respRate: 16,
    bloodPressure: "118/76",
    spo2: 97,
    symptomsPresent: false,
    symptomChecklist: [] as string[],
    providerNotified: false,
    continuedAdministration: true,
    notes: "",
  });

  const [reaction, setReaction] = useState({
    reactionTime: nowLocalDatetimeValue(),
    reactionType: "SUSPECTED" as (typeof BLOOD_REACTION_TYPE_OPTIONS)[number]["value"],
    symptoms: ["FEVER"] as string[],
    transfusionStopped: true,
    providerNotified: true,
    bloodBankNotified: true,
    reactionWorkupStarted: true,
    notes: "",
  });

  const [completion, setCompletion] = useState({
    completionTime: nowLocalDatetimeValue(),
    productType: "PRBC" as (typeof BLOOD_PRODUCT_TYPE_OPTIONS)[number]["value"],
    unitIdentifier: "",
    volumeInfusedMl: 250,
    transfusionCompleted: true,
    reactionOccurred: false,
    postVitalsReviewed: true,
    providerNotified: false,
    notes: "",
  });

  const [mtp, setMtp] = useState({
    eventTime: nowLocalDatetimeValue(),
    eventType: "ACTIVATED" as (typeof MTP_EVENT_TYPE_OPTIONS)[number]["value"],
    initiatedBy: "",
    reason: "",
    notes: "",
  });

  const witnessNotice = useMemo(() => {
    if (cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID) {
      return t("clinicalDocumentation.forms.bloodProduct.verificationWitnessNotice");
    }
    if (cardId === BLOOD_PRODUCT_INITIATION_CARD_ID) {
      return t("clinicalDocumentation.forms.bloodProduct.initiationWitnessNotice");
    }
    if (cardId === BLOOD_PRODUCT_COMPLETION_CARD_ID) {
      return t("clinicalDocumentation.forms.bloodProduct.completionWitnessNotice");
    }
    return null;
  }, [cardId, t]);

  async function save() {
    setValidationError(null);
    let payload: Record<string, unknown>;
    switch (cardId) {
      case BLOOD_PRODUCT_VERIFICATION_CARD_ID:
        payload = {
          ...verification,
          verificationTime: toIsoFromLocalDatetime(verification.verificationTime),
        };
        break;
      case BLOOD_PRODUCT_INITIATION_CARD_ID:
        payload = {
          ...initiation,
          startTime: toIsoFromLocalDatetime(initiation.startTime),
        };
        break;
      case BLOOD_PRODUCT_REASSESSMENT_CARD_ID:
        payload = {
          ...reassessment,
          assessmentTime: toIsoFromLocalDatetime(reassessment.assessmentTime),
        };
        break;
      case BLOOD_PRODUCT_REACTION_CARD_ID:
        payload = {
          ...reaction,
          reactionTime: toIsoFromLocalDatetime(reaction.reactionTime),
        };
        break;
      case BLOOD_PRODUCT_COMPLETION_CARD_ID:
        payload = {
          ...completion,
          completionTime: toIsoFromLocalDatetime(completion.completionTime),
        };
        break;
      case MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID:
        payload = {
          ...mtp,
          eventTime: toIsoFromLocalDatetime(mtp.eventTime),
        };
        break;
      default:
        return;
    }
    const result = validateBloodProductPayloadForCard(cardId, payload);
    if (!result.ok) {
      setValidationError(t("clinicalDocumentation.forms.bloodProduct.validationError"));
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <div
      data-testid="clinical-documentation-blood-product-form"
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {witnessNotice ? (
        <p
          data-testid="clinical-documentation-blood-product-witness-notice"
          style={{ margin: 0, fontSize: 12, color: "#b45309", fontWeight: 600 }}
        >
          {witnessNotice}
        </p>
      ) : null}

      {cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.verificationTime")}
              value={verification.verificationTime}
              onChange={(v) => setVerification({ ...verification, verificationTime: v })}
              testId="blood-verification-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.productType")}
              value={verification.productType}
              options={BLOOD_PRODUCT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, productType: v })}
              testId="blood-verification-product-type"
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.unitIdentifier")}
              value={verification.unitIdentifier}
              onChange={(v) => setVerification({ ...verification, unitIdentifier: v })}
              testId="blood-verification-unit-id"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.specialRequirements")}
              value={verification.specialRequirements}
              options={BLOOD_PRODUCT_SPECIAL_REQUIREMENT_OPTIONS}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, specialRequirements: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.patientIdentityVerified")}
              value={verification.patientIdentityVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, patientIdentityVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.bloodTypeVerified")}
              value={verification.bloodTypeVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, bloodTypeVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.crossmatchVerified")}
              value={verification.crossmatchVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, crossmatchVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.expirationVerified")}
              value={verification.expirationVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, expirationVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.consentVerified")}
              value={verification.consentVerified}
              locale={locale}
              onChange={(v) => setVerification({ ...verification, consentVerified: v })}
            />
          </div>
          <TextField
            label={t("clinicalDocumentation.forms.bloodProduct.verificationNotes")}
            value={verification.verificationNotes}
            onChange={(v) => setVerification({ ...verification, verificationNotes: v })}
          />
        </>
      ) : null}

      {cardId === BLOOD_PRODUCT_INITIATION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.startTime")}
              value={initiation.startTime}
              onChange={(v) => setInitiation({ ...initiation, startTime: v })}
              testId="blood-initiation-start-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.productType")}
              value={initiation.productType}
              options={BLOOD_PRODUCT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, productType: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.unitIdentifier")}
              value={initiation.unitIdentifier}
              onChange={(v) => setInitiation({ ...initiation, unitIdentifier: v })}
              testId="blood-initiation-unit-id"
            />
          </div>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineTemperature")}
              value={initiation.baselineTemperature}
              onChange={(v) => setInitiation({ ...initiation, baselineTemperature: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineHeartRate")}
              value={initiation.baselineHeartRate}
              onChange={(v) => setInitiation({ ...initiation, baselineHeartRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineRespRate")}
              value={initiation.baselineRespRate}
              onChange={(v) => setInitiation({ ...initiation, baselineRespRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineBloodPressure")}
              value={initiation.baselineBloodPressure}
              onChange={(v) => setInitiation({ ...initiation, baselineBloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineSpo2")}
              value={initiation.baselineSpo2}
              onChange={(v) => setInitiation({ ...initiation, baselineSpo2: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.preMedicationAdministered")}
              value={initiation.preMedicationAdministered}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, preMedicationAdministered: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.providerOrderVerified")}
              value={initiation.providerOrderVerified}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, providerOrderVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.consentVerified")}
              value={initiation.consentVerified}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, consentVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.administrationStarted")}
              value={initiation.administrationStarted}
              locale={locale}
              onChange={(v) => setInitiation({ ...initiation, administrationStarted: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === BLOOD_PRODUCT_REASSESSMENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.assessmentTime")}
              value={reassessment.assessmentTime}
              onChange={(v) => setReassessment({ ...reassessment, assessmentTime: v })}
              testId="blood-reassessment-time"
              type="datetime-local"
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.temperature")}
              value={reassessment.temperature}
              onChange={(v) => setReassessment({ ...reassessment, temperature: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.heartRate")}
              value={reassessment.heartRate}
              onChange={(v) => setReassessment({ ...reassessment, heartRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.respRate")}
              value={reassessment.respRate}
              onChange={(v) => setReassessment({ ...reassessment, respRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.bloodPressure")}
              value={reassessment.bloodPressure}
              onChange={(v) => setReassessment({ ...reassessment, bloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.spo2")}
              value={reassessment.spo2}
              onChange={(v) => setReassessment({ ...reassessment, spo2: v })}
            />
          </div>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.bloodProduct.symptomsPresent")}
            value={reassessment.symptomsPresent}
            locale={locale}
            onChange={(v) => setReassessment({ ...reassessment, symptomsPresent: v })}
          />
          {reassessment.symptomsPresent ? (
            <CheckboxMulti
              label={t("clinicalDocumentation.forms.bloodProduct.symptomChecklist")}
              options={BLOOD_REASSESSMENT_SYMPTOM_OPTIONS}
              selected={reassessment.symptomChecklist}
              locale={locale}
              onChange={(symptomChecklist) => setReassessment({ ...reassessment, symptomChecklist })}
              testIdPrefix="blood-reassessment-symptom"
            />
          ) : null}
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.providerNotified")}
              value={reassessment.providerNotified}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, providerNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.continuedAdministration")}
              value={reassessment.continuedAdministration}
              locale={locale}
              onChange={(v) => setReassessment({ ...reassessment, continuedAdministration: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === BLOOD_PRODUCT_REACTION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.reactionTime")}
              value={reaction.reactionTime}
              onChange={(v) => setReaction({ ...reaction, reactionTime: v })}
              testId="blood-reaction-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.reactionType")}
              value={reaction.reactionType}
              options={BLOOD_REACTION_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setReaction({ ...reaction, reactionType: v })}
              testId="blood-reaction-type"
            />
          </div>
          <CheckboxMulti
            label={t("clinicalDocumentation.forms.bloodProduct.reactionSymptoms")}
            options={BLOOD_REACTION_SYMPTOM_OPTIONS}
            selected={reaction.symptoms}
            locale={locale}
            onChange={(symptoms) => setReaction({ ...reaction, symptoms })}
            testIdPrefix="blood-reaction-symptom"
          />
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.transfusionStopped")}
              value={reaction.transfusionStopped}
              locale={locale}
              onChange={(v) => setReaction({ ...reaction, transfusionStopped: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.providerNotified")}
              value={reaction.providerNotified}
              locale={locale}
              onChange={(v) => setReaction({ ...reaction, providerNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.bloodBankNotified")}
              value={reaction.bloodBankNotified}
              locale={locale}
              onChange={(v) => setReaction({ ...reaction, bloodBankNotified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.reactionWorkupStarted")}
              value={reaction.reactionWorkupStarted}
              locale={locale}
              onChange={(v) => setReaction({ ...reaction, reactionWorkupStarted: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === BLOOD_PRODUCT_COMPLETION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.completionTime")}
              value={completion.completionTime}
              onChange={(v) => setCompletion({ ...completion, completionTime: v })}
              testId="blood-completion-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.productType")}
              value={completion.productType}
              options={BLOOD_PRODUCT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, productType: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.unitIdentifier")}
              value={completion.unitIdentifier}
              onChange={(v) => setCompletion({ ...completion, unitIdentifier: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.volumeInfusedMl")}
              value={completion.volumeInfusedMl}
              onChange={(v) => setCompletion({ ...completion, volumeInfusedMl: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.transfusionCompleted")}
              value={completion.transfusionCompleted}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, transfusionCompleted: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.reactionOccurred")}
              value={completion.reactionOccurred}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, reactionOccurred: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.postVitalsReviewed")}
              value={completion.postVitalsReviewed}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, postVitalsReviewed: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.providerNotified")}
              value={completion.providerNotified}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, providerNotified: v })}
            />
          </div>
        </>
      ) : null}

      {cardId === MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.eventTime")}
              value={mtp.eventTime}
              onChange={(v) => setMtp({ ...mtp, eventTime: v })}
              testId="blood-mtp-event-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.eventType")}
              value={mtp.eventType}
              options={MTP_EVENT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setMtp({ ...mtp, eventType: v })}
              testId="blood-mtp-event-type"
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.initiatedBy")}
              value={mtp.initiatedBy}
              onChange={(v) => setMtp({ ...mtp, initiatedBy: v })}
              testId="blood-mtp-initiated-by"
            />
          </div>
          <TextField
            label={t("clinicalDocumentation.forms.bloodProduct.reason")}
            value={mtp.reason}
            onChange={(v) => setMtp({ ...mtp, reason: v })}
            testId="blood-mtp-reason"
          />
        </>
      ) : null}

      {validationError ? (
        <p style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-blood-product-save"
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

export function isEdoc7BloodProductFormCard(cardId: string): boolean {
  return (EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
