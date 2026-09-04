"use client";

import React, { useMemo, useState } from "react";
import {
  BLOOD_PRODUCT_COMPLETION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
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
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";
import { formatClinicalDocumentationOptionLabel } from "@medora/shared";

import {
  ClinicalDocumentationBooleanField,
  ClinicalDocumentationSelectField,
} from "./ClinicalDocumentationFieldControls";
import {
  BloodProductVolumeSelect,
  isValidBloodProductUnitVolumeMl,
} from "./BloodProductVolumeSelect";

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
  locale: string;
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
              {formatClinicalDocumentationOptionLabel(opt, locale)}
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
  const locale = resolveProductUiLanguageOrDefault(language);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [verification, setVerification] = useState({
    verificationTime: nowLocalDatetimeValue(),
    productType: "PRBC" as (typeof BLOOD_PRODUCT_TYPE_OPTIONS)[number]["value"],
    unitIdentifier: "",
    unitVolumeMl: 250,
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
    unitVolumeMl: 250,
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

  const [preAssessment, setPreAssessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    productType: "PRBC" as (typeof BLOOD_PRODUCT_TYPE_OPTIONS)[number]["value"],
    unitIdentifier: "",
    unitVolumeMl: 250,
    baselineTemperature: "37.0",
    baselineHeartRate: 80,
    baselineRespRate: 16,
    baselineBloodPressure: "120/80",
    baselineSpo2: 98,
    patientIdentityVerified: true,
    consentVerified: true,
    symptomsPresent: false,
    symptomChecklist: [] as string[],
    notes: "",
  });

  const [reaction, setReaction] = useState({
    reactionTime: nowLocalDatetimeValue(),
    reactionType: "NO_REACTION" as (typeof BLOOD_REACTION_TYPE_OPTIONS)[number]["value"],
    symptoms: [] as string[],
    providerNotified: false,
    interventionRequired: false,
    transfusionStopped: false,
    bloodBankNotified: false,
    reactionWorkupStarted: false,
    notes: "",
  });

  const [completion, setCompletion] = useState({
    completionTime: nowLocalDatetimeValue(),
    endTime: nowLocalDatetimeValue(),
    productType: "PRBC" as (typeof BLOOD_PRODUCT_TYPE_OPTIONS)[number]["value"],
    unitIdentifier: "",
    volumeInfusedMl: 250,
    postTemperature: "37.0",
    postHeartRate: 80,
    postRespRate: 16,
    postBloodPressure: "120/80",
    postSpo2: 98,
    reactionObserved: false,
    transfusionCompleted: true,
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
    return null;
  }, [cardId, t]);

  const reactionDocumented = reaction.reactionType !== "NO_REACTION";

  async function save() {
    setValidationError(null);
    if (
      cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID &&
      !isValidBloodProductUnitVolumeMl(verification.unitVolumeMl)
    ) {
      setValidationError(t("clinicalDocumentation.forms.bloodProduct.validationError"));
      return;
    }
    if (
      cardId === BLOOD_PRODUCT_INITIATION_CARD_ID &&
      !isValidBloodProductUnitVolumeMl(initiation.unitVolumeMl)
    ) {
      setValidationError(t("clinicalDocumentation.forms.bloodProduct.validationError"));
      return;
    }
    if (
      cardId === BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID &&
      !isValidBloodProductUnitVolumeMl(preAssessment.unitVolumeMl)
    ) {
      setValidationError(t("clinicalDocumentation.forms.bloodProduct.validationError"));
      return;
    }
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
      case BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID:
        payload = {
          assessmentTime: toIsoFromLocalDatetime(preAssessment.assessmentTime),
          productType: preAssessment.productType,
          unitIdentifier: preAssessment.unitIdentifier,
          unitVolumeMl: preAssessment.unitVolumeMl,
          baselineTemperature: preAssessment.baselineTemperature,
          baselineHeartRate: preAssessment.baselineHeartRate,
          baselineRespRate: preAssessment.baselineRespRate,
          baselineBloodPressure: preAssessment.baselineBloodPressure,
          baselineSpo2: preAssessment.baselineSpo2,
          patientIdentityVerified: preAssessment.patientIdentityVerified,
          consentVerified: preAssessment.consentVerified,
          symptomsPresent: preAssessment.symptomsPresent,
          symptomChecklist: preAssessment.symptomChecklist,
          notes: preAssessment.notes || undefined,
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
          endTime: toIsoFromLocalDatetime(completion.endTime),
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
            <BloodProductVolumeSelect
              unitVolumeMl={verification.unitVolumeMl}
              onChangeVolumeMl={(unitVolumeMl) =>
                setVerification({ ...verification, unitVolumeMl })
              }
              testIdPrefix="blood-verification"
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
            <BloodProductVolumeSelect
              unitVolumeMl={initiation.unitVolumeMl}
              onChangeVolumeMl={(unitVolumeMl) => setInitiation({ ...initiation, unitVolumeMl })}
              testIdPrefix="blood-initiation"
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

      {cardId === BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.assessmentTime")}
              value={preAssessment.assessmentTime}
              onChange={(v) => setPreAssessment({ ...preAssessment, assessmentTime: v })}
              testId="blood-pre-assessment-time"
              type="datetime-local"
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.bloodProduct.productType")}
              value={preAssessment.productType}
              options={BLOOD_PRODUCT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, productType: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.unitIdentifier")}
              value={preAssessment.unitIdentifier}
              onChange={(v) => setPreAssessment({ ...preAssessment, unitIdentifier: v })}
              testId="blood-pre-assessment-unit-id"
            />
            <BloodProductVolumeSelect
              unitVolumeMl={preAssessment.unitVolumeMl}
              onChangeVolumeMl={(unitVolumeMl) =>
                setPreAssessment({ ...preAssessment, unitVolumeMl })
              }
              testIdPrefix="blood-pre-assessment"
            />
          </div>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineTemperature")}
              value={preAssessment.baselineTemperature}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineTemperature: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineHeartRate")}
              value={preAssessment.baselineHeartRate}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineHeartRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineRespRate")}
              value={preAssessment.baselineRespRate}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineRespRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineBloodPressure")}
              value={preAssessment.baselineBloodPressure}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineBloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.baselineSpo2")}
              value={preAssessment.baselineSpo2}
              onChange={(v) => setPreAssessment({ ...preAssessment, baselineSpo2: v })}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.patientIdentityVerified")}
              value={preAssessment.patientIdentityVerified}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, patientIdentityVerified: v })}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.bloodProduct.consentVerified")}
              value={preAssessment.consentVerified}
              locale={locale}
              onChange={(v) => setPreAssessment({ ...preAssessment, consentVerified: v })}
            />
          </div>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.bloodProduct.symptomsPresent")}
            value={preAssessment.symptomsPresent}
            locale={locale}
            onChange={(v) => setPreAssessment({ ...preAssessment, symptomsPresent: v })}
          />
          {preAssessment.symptomsPresent ? (
            <CheckboxMulti
              label={t("clinicalDocumentation.forms.bloodProduct.symptomChecklist")}
              options={BLOOD_REASSESSMENT_SYMPTOM_OPTIONS}
              selected={preAssessment.symptomChecklist}
              locale={locale}
              onChange={(symptomChecklist) =>
                setPreAssessment({ ...preAssessment, symptomChecklist })
              }
              testIdPrefix="blood-pre-assessment-symptom"
            />
          ) : null}
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
              onChange={(symptomChecklist) =>
                setReassessment({ ...reassessment, symptomChecklist })
              }
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
          {reactionDocumented ? (
            <>
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
                  label={t("clinicalDocumentation.forms.bloodProduct.providerNotified")}
                  value={reaction.providerNotified}
                  locale={locale}
                  onChange={(v) => setReaction({ ...reaction, providerNotified: v })}
                />
                <ClinicalDocumentationBooleanField
                  label={t("clinicalDocumentation.forms.bloodProduct.interventionRequired")}
                  value={reaction.interventionRequired}
                  locale={locale}
                  onChange={(v) => setReaction({ ...reaction, interventionRequired: v })}
                />
                <ClinicalDocumentationBooleanField
                  label={t("clinicalDocumentation.forms.bloodProduct.transfusionStopped")}
                  value={reaction.transfusionStopped}
                  locale={locale}
                  onChange={(v) => setReaction({ ...reaction, transfusionStopped: v })}
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
        </>
      ) : null}

      {cardId === BLOOD_PRODUCT_COMPLETION_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.completionTime")}
              value={completion.completionTime}
              onChange={(v) => setCompletion({ ...completion, completionTime: v })}
              testId="blood-completion-completion-time"
              type="datetime-local"
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.endTime")}
              value={completion.endTime}
              onChange={(v) => setCompletion({ ...completion, endTime: v })}
              testId="blood-completion-end-time"
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
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.postTemperature")}
              value={completion.postTemperature}
              onChange={(v) => setCompletion({ ...completion, postTemperature: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.postHeartRate")}
              value={completion.postHeartRate}
              onChange={(v) => setCompletion({ ...completion, postHeartRate: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.postRespRate")}
              value={completion.postRespRate}
              onChange={(v) => setCompletion({ ...completion, postRespRate: v })}
            />
            <TextField
              label={t("clinicalDocumentation.forms.bloodProduct.postBloodPressure")}
              value={completion.postBloodPressure}
              onChange={(v) => setCompletion({ ...completion, postBloodPressure: v })}
            />
            <NumberField
              label={t("clinicalDocumentation.forms.bloodProduct.postSpo2")}
              value={completion.postSpo2}
              onChange={(v) => setCompletion({ ...completion, postSpo2: v })}
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
              label={t("clinicalDocumentation.forms.bloodProduct.reactionObserved")}
              value={completion.reactionObserved}
              locale={locale}
              onChange={(v) => setCompletion({ ...completion, reactionObserved: v })}
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
