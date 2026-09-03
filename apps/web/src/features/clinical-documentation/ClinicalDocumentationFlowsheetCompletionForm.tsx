"use client";

import React, { useMemo, useState } from "react";
import {
  CPR_EVENT_TYPE_OPTIONS,
  CPR_INITIAL_RHYTHM_OPTIONS,
  CPR_PATIENT_DISPOSITION_OPTIONS,
  FLOW_CPR_RECORD_CARD_ID,
  FLOW_OBSERVATION_MONITORING_CARD_ID,
  FLOW_THROMBOLYTIC_MI_CARD_ID,
  FOUNDATION_YES_NO_NA_OPTIONS,
  FOUNDATION_YES_NO_OPTIONS,
  FOUNDATION_YES_NO_UNKNOWN_OPTIONS,
  MI_THROMBOLYTIC_AGENT_OPTIONS,
  MI_THROMBOLYTIC_INDICATION_OPTIONS,
  OBSERVATION_PATIENT_STATUS_OPTIONS,
  OBSERVATION_REASON_OPTIONS,
  THROMBOLYTIC_HOLD_REASON_OPTIONS,
  validateFoundationCatalogCompletionPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationSelectField } from "./ClinicalDocumentationFieldControls";

import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

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

const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  borderRadius: 8,
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
};

type YesNo = (typeof FOUNDATION_YES_NO_OPTIONS)[number]["value"];
type YesNoUnknown = (typeof FOUNDATION_YES_NO_UNKNOWN_OPTIONS)[number]["value"];
type YesNoNa = (typeof FOUNDATION_YES_NO_NA_OPTIONS)[number]["value"];

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function YesNoField({
  label,
  value,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: YesNo;
  locale: "en" | "fr";
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={FOUNDATION_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationFlowsheetCompletionForm({
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

  const [cpr, setCpr] = useState({
    eventStartTime: nowLocalDatetimeValue(),
    eventEndTime: "",
    eventType: "CPR" as (typeof CPR_EVENT_TYPE_OPTIONS)[number]["value"],
    initialRhythm: "UNKNOWN" as (typeof CPR_INITIAL_RHYTHM_OPTIONS)[number]["value"],
    compressionsStarted: "YES" as YesNo,
    airwaySupported: "YES" as YesNo,
    defibrillationPerformed: "NO" as YesNo,
    medicationReferenceDocumented: "NOT_APPLICABLE" as YesNoNa,
    roscAchieved: "UNKNOWN" as YesNoUnknown,
    patientDisposition: "REMAINED_IN_ED" as (typeof CPR_PATIENT_DISPOSITION_OPTIONS)[number]["value"],
    providerPresent: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [miThrombolytic, setMiThrombolytic] = useState({
    administrationTime: nowLocalDatetimeValue(),
    indication: "STEMI" as (typeof MI_THROMBOLYTIC_INDICATION_OPTIONS)[number]["value"],
    agent: "TENECTEPLASE" as (typeof MI_THROMBOLYTIC_AGENT_OPTIONS)[number]["value"],
    doseVerified: "YES" as YesNo,
    contraindicationChecklistReviewed: "YES" as YesNo,
    providerOrderVerified: "YES" as YesNo,
    cardiologyNotified: "YES" as YesNo,
    ecgReviewed: "YES" as YesNo,
    bloodPressureWithinParameters: "YES" as YesNo,
    medicationAdministered: "YES" as YesNo,
    administrationHeld: "NO" as YesNo,
    holdReason: "" as (typeof THROMBOLYTIC_HOLD_REASON_OPTIONS)[number]["value"] | "",
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [observation, setObservation] = useState({
    monitoringTime: nowLocalDatetimeValue(),
    observationReason: "ED_OBSERVATION" as (typeof OBSERVATION_REASON_OPTIONS)[number]["value"],
    patientStatus: "STABLE" as (typeof OBSERVATION_PATIENT_STATUS_OPTIONS)[number]["value"],
    vitalSignsReviewed: "YES" as YesNo,
    painReviewed: "YES" as YesNo,
    safetyReviewed: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const cprProviderNotice = useMemo(
    () => cpr.providerPresent !== "YES" && cpr.providerNotified !== "YES",
    [cpr.providerPresent, cpr.providerNotified]
  );

  const miProviderNotice = useMemo(
    () => miThrombolytic.bloodPressureWithinParameters === "NO",
    [miThrombolytic.bloodPressureWithinParameters]
  );

  const observationProviderNotice = useMemo(
    () => observation.patientStatus === "WORSENED" && observation.providerNotified !== "YES",
    [observation.patientStatus, observation.providerNotified]
  );

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case FLOW_CPR_RECORD_CARD_ID:
        return {
          eventStartTime: toIsoFromLocalDatetime(cpr.eventStartTime),
          eventEndTime: cpr.eventEndTime.trim()
            ? toIsoFromLocalDatetime(cpr.eventEndTime)
            : undefined,
          eventType: cpr.eventType,
          initialRhythm: cpr.initialRhythm,
          compressionsStarted: cpr.compressionsStarted,
          airwaySupported: cpr.airwaySupported,
          defibrillationPerformed: cpr.defibrillationPerformed,
          medicationReferenceDocumented: cpr.medicationReferenceDocumented,
          roscAchieved: cpr.roscAchieved,
          patientDisposition: cpr.patientDisposition,
          providerPresent: cpr.providerPresent,
          providerNotified: cpr.providerNotified,
          notes: cpr.notes.trim() || undefined,
        };
      case FLOW_THROMBOLYTIC_MI_CARD_ID:
        return {
          administrationTime: toIsoFromLocalDatetime(miThrombolytic.administrationTime),
          indication: miThrombolytic.indication,
          agent: miThrombolytic.agent,
          doseVerified: miThrombolytic.doseVerified,
          contraindicationChecklistReviewed: miThrombolytic.contraindicationChecklistReviewed,
          providerOrderVerified: miThrombolytic.providerOrderVerified,
          cardiologyNotified: miThrombolytic.cardiologyNotified,
          ecgReviewed: miThrombolytic.ecgReviewed,
          bloodPressureWithinParameters: miThrombolytic.bloodPressureWithinParameters,
          medicationAdministered: miThrombolytic.medicationAdministered,
          administrationHeld: miThrombolytic.administrationHeld,
          holdReason:
            miThrombolytic.medicationAdministered === "NO"
              ? miThrombolytic.holdReason || undefined
              : undefined,
          providerNotified: miThrombolytic.providerNotified,
          notes: miThrombolytic.notes.trim() || undefined,
        };
      case FLOW_OBSERVATION_MONITORING_CARD_ID:
        return {
          monitoringTime: toIsoFromLocalDatetime(observation.monitoringTime),
          observationReason: observation.observationReason,
          patientStatus: observation.patientStatus,
          vitalSignsReviewed: observation.vitalSignsReviewed,
          painReviewed: observation.painReviewed,
          safetyReviewed: observation.safetyReviewed,
          providerNotified: observation.providerNotified,
          notes: observation.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateFoundationCatalogCompletionPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.flowsheetCompletion.validationError"));
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

  const providerBanner =
    (cardId === FLOW_CPR_RECORD_CARD_ID && cprProviderNotice) ||
    (cardId === FLOW_THROMBOLYTIC_MI_CARD_ID && miProviderNotice) ||
    (cardId === FLOW_OBSERVATION_MONITORING_CARD_ID && observationProviderNotice);

  return (
    <div
      data-testid="clinical-documentation-flowsheet-completion-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      {providerBanner ? (
        <p data-testid="flowsheet-provider-notification-banner" style={noticeStyle}>
          {t("clinicalDocumentation.forms.flowsheetCompletion.providerNotificationRequired")}
        </p>
      ) : null}

      <div style={rowStyle}>
        {cardId === FLOW_CPR_RECORD_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.flowsheetCompletion.eventStartTime"),
              cpr.eventStartTime,
              (v) => setCpr({ ...cpr, eventStartTime: v }),
              "flow-cpr-start-time"
            )}
            {datetimeField(
              t("clinicalDocumentation.forms.flowsheetCompletion.eventEndTime"),
              cpr.eventEndTime,
              (v) => setCpr({ ...cpr, eventEndTime: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.eventType")}
              value={cpr.eventType}
              options={CPR_EVENT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, eventType: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.initialRhythm")}
              value={cpr.initialRhythm}
              options={CPR_INITIAL_RHYTHM_OPTIONS}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, initialRhythm: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.compressionsStarted")}
              value={cpr.compressionsStarted}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, compressionsStarted: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.airwaySupported")}
              value={cpr.airwaySupported}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, airwaySupported: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.defibrillationPerformed")}
              value={cpr.defibrillationPerformed}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, defibrillationPerformed: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.medicationReferenceDocumented")}
              value={cpr.medicationReferenceDocumented}
              options={FOUNDATION_YES_NO_NA_OPTIONS}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, medicationReferenceDocumented: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.roscAchieved")}
              value={cpr.roscAchieved}
              options={FOUNDATION_YES_NO_UNKNOWN_OPTIONS}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, roscAchieved: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.patientDisposition")}
              value={cpr.patientDisposition}
              options={CPR_PATIENT_DISPOSITION_OPTIONS}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, patientDisposition: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.providerPresent")}
              value={cpr.providerPresent}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, providerPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.providerNotified")}
              value={cpr.providerNotified}
              locale={locale}
              onChange={(v) => setCpr({ ...cpr, providerNotified: v })}
              testId="flow-cpr-provider-notified"
            />
            {notesField(cpr.notes, (notes) => setCpr({ ...cpr, notes }))}
          </>
        ) : null}

        {cardId === FLOW_THROMBOLYTIC_MI_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.flowsheetCompletion.administrationTime"),
              miThrombolytic.administrationTime,
              (v) => setMiThrombolytic({ ...miThrombolytic, administrationTime: v }),
              "flow-mi-thrombolytic-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.indication")}
              value={miThrombolytic.indication}
              options={MI_THROMBOLYTIC_INDICATION_OPTIONS}
              locale={locale}
              onChange={(v) => setMiThrombolytic({ ...miThrombolytic, indication: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.agent")}
              value={miThrombolytic.agent}
              options={MI_THROMBOLYTIC_AGENT_OPTIONS}
              locale={locale}
              onChange={(v) => setMiThrombolytic({ ...miThrombolytic, agent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.doseVerified")}
              value={miThrombolytic.doseVerified}
              locale={locale}
              onChange={(v) => setMiThrombolytic({ ...miThrombolytic, doseVerified: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.bloodPressureWithinParameters")}
              value={miThrombolytic.bloodPressureWithinParameters}
              locale={locale}
              onChange={(v) =>
                setMiThrombolytic({ ...miThrombolytic, bloodPressureWithinParameters: v })
              }
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.medicationAdministered")}
              value={miThrombolytic.medicationAdministered}
              locale={locale}
              onChange={(v) =>
                setMiThrombolytic({ ...miThrombolytic, medicationAdministered: v })
              }
            />
            {miThrombolytic.medicationAdministered === "NO" ? (
              <ClinicalDocumentationSelectField
                label={t("clinicalDocumentation.forms.flowsheetCompletion.holdReason")}
                value={miThrombolytic.holdReason || THROMBOLYTIC_HOLD_REASON_OPTIONS[0].value}
                options={THROMBOLYTIC_HOLD_REASON_OPTIONS}
                locale={locale}
                onChange={(v) => setMiThrombolytic({ ...miThrombolytic, holdReason: v })}
              />
            ) : null}
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.providerNotified")}
              value={miThrombolytic.providerNotified}
              locale={locale}
              onChange={(v) => setMiThrombolytic({ ...miThrombolytic, providerNotified: v })}
            />
            {notesField(miThrombolytic.notes, (notes) =>
              setMiThrombolytic({ ...miThrombolytic, notes })
            )}
          </>
        ) : null}

        {cardId === FLOW_OBSERVATION_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.flowsheetCompletion.monitoringTime"),
              observation.monitoringTime,
              (v) => setObservation({ ...observation, monitoringTime: v }),
              "flow-observation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.observationReason")}
              value={observation.observationReason}
              options={OBSERVATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setObservation({ ...observation, observationReason: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.patientStatus")}
              value={observation.patientStatus}
              options={OBSERVATION_PATIENT_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setObservation({ ...observation, patientStatus: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.vitalSignsReviewed")}
              value={observation.vitalSignsReviewed}
              locale={locale}
              onChange={(v) => setObservation({ ...observation, vitalSignsReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.flowsheetCompletion.providerNotified")}
              value={observation.providerNotified}
              locale={locale}
              onChange={(v) => setObservation({ ...observation, providerNotified: v })}
            />
            {notesField(observation.notes, (notes) => setObservation({ ...observation, notes }))}
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

export function isEdoc23bFlowsheetCompletionFormCard(cardId: string): boolean {
  return (
    cardId === FLOW_CPR_RECORD_CARD_ID ||
    cardId === FLOW_THROMBOLYTIC_MI_CARD_ID ||
    cardId === FLOW_OBSERVATION_MONITORING_CARD_ID
  );
}
