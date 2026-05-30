"use client";

import React, { useState } from "react";
import {
  AGITATION_LEVEL_OPTIONS,
  AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID,
  BEHAVIORAL_ESCALATION_EVENT_CARD_ID,
  BEHAVIORAL_ESCALATION_REASON_OPTIONS,
  BEHAVIORAL_INTERVENTION_OPTIONS,
  BEHAVIORAL_OBSERVATION_CARD_ID,
  BEHAVIOR_TYPE_OPTIONS,
  EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS,
  ELOPEMENT_MONITORING_CARD_ID,
  ELOPEMENT_RISK_ASSESSMENT_CARD_ID,
  ELOPEMENT_RISK_LEVEL_OPTIONS,
  ENVIRONMENTAL_SAFETY_CHECK_CARD_ID,
  OBSERVER_ROLE_OPTIONS,
  ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID,
  PRECAUTION_LEVEL_OPTIONS,
  SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  SUICIDE_RISK_LEVEL_OPTIONS,
  SUICIDE_RISK_MONITORING_CARD_ID,
  SUICIDAL_IDEATION_OPTIONS,
  validateBehavioralHealthSafetyDocumentationPayloadForCard,
  VIOLENCE_RISK_OPTIONS,
  YES_NO_UNABLE_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
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

function optionalIso(local: string): string | undefined {
  return local.trim() ? toIsoFromLocalDatetime(local) : undefined;
}

export function ClinicalDocumentationBehavioralHealthForm({
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

  const [suicidePrecautions, setSuicidePrecautions] = useState({
    documentationTime: nowLocalDatetimeValue(),
    precautionLevel: "STANDARD" as (typeof PRECAUTION_LEVEL_OPTIONS)[number]["value"],
    patientChangedIntoSafeAttire: true,
    belongingsRemovedOrSecured: true,
    roomSafetyCompleted: true,
    ligatureRiskReduced: true,
    sharpsRemoved: true,
    providerNotified: false,
    familyNotified: false,
    providerNotificationTime: "",
    notes: "",
  });

  const [suicideMonitoring, setSuicideMonitoring] = useState({
    monitoringTime: nowLocalDatetimeValue(),
    riskLevel: "LOW" as (typeof SUICIDE_RISK_LEVEL_OPTIONS)[number]["value"],
    currentSuicidalIdeation: "DENIES" as (typeof SUICIDAL_IDEATION_OPTIONS)[number]["value"],
    planReported: "NO" as (typeof YES_NO_UNABLE_OPTIONS)[number]["value"],
    intentReported: "NO" as (typeof YES_NO_UNABLE_OPTIONS)[number]["value"],
    meansAccessConcern: "NO" as (typeof YES_NO_UNKNOWN_OPTIONS)[number]["value"],
    observationLevel: "STANDARD" as (typeof PRECAUTION_LEVEL_OPTIONS)[number]["value"],
    cssrsScreenCompleted: false,
    phq9Reviewed: false,
    gad7Reviewed: false,
    providerNotified: false,
    notes: "",
  });

  const [elopementRisk, setElopementRisk] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    riskLevel: "LOW" as (typeof ELOPEMENT_RISK_LEVEL_OPTIONS)[number]["value"],
    confusedOrDisoriented: false,
    attemptedToLeave: false,
    verbalizedIntentToLeave: false,
    requiresSecureArea: false,
    providerNotified: false,
    familyNotified: false,
    notes: "",
  });

  const [elopementMonitoring, setElopementMonitoring] = useState({
    monitoringTime: nowLocalDatetimeValue(),
    patientLocationConfirmed: true,
    patientInAssignedArea: true,
    doorExitRiskObserved: false,
    redirectionRequired: false,
    securityNotified: false,
    providerNotified: false,
    notes: "",
  });

  const [behavioral, setBehavioral] = useState({
    observationTime: nowLocalDatetimeValue(),
    behavior: "CALM" as (typeof BEHAVIOR_TYPE_OPTIONS)[number]["value"],
    cooperative: true,
    threatToSelf: false,
    threatToOthers: false,
    redirectionEffective: true,
    deEscalationUsed: false,
    providerNotified: false,
    notes: "",
  });

  const [agitation, setAgitation] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    agitationLevel: "NONE" as (typeof AGITATION_LEVEL_OPTIONS)[number]["value"],
    violenceRisk: "LOW" as (typeof VIOLENCE_RISK_OPTIONS)[number]["value"],
    verbalThreats: false,
    physicalAggression: false,
    propertyDestruction: false,
    weaponConcern: false,
    securityNotified: false,
    providerNotified: false,
    notes: "",
  });

  const [oneToOne, setOneToOne] = useState({
    checkTime: nowLocalDatetimeValue(),
    observerRole: "SITTER" as (typeof OBSERVER_ROLE_OPTIONS)[number]["value"],
    patientVisible: true,
    patientSafe: true,
    behaviorObserved: "CALM" as (typeof BEHAVIOR_TYPE_OPTIONS)[number]["value"],
    needsAddressed: true,
    handoffCompleted: false,
    providerNotified: false,
    notes: "",
  });

  const [environmental, setEnvironmental] = useState({
    checkTime: nowLocalDatetimeValue(),
    roomClearedOfHazards: true,
    ligatureRiskChecked: true,
    sharpsRemoved: true,
    cordsSecured: true,
    belongingsSecured: true,
    bathroomChecked: true,
    staffAwareOfPrecautions: true,
    issuesFound: false,
    issuesDescription: "",
    providerNotified: false,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    reason: "AGITATION_ESCALATED" as (typeof BEHAVIORAL_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    securityNotified: false,
    familyNotified: false,
    intervention: "DE_ESCALATION" as (typeof BEHAVIORAL_INTERVENTION_OPTIONS)[number]["value"],
    restraintDocumentationReferenced: false,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(suicidePrecautions.documentationTime),
          precautionLevel: suicidePrecautions.precautionLevel,
          patientChangedIntoSafeAttire: suicidePrecautions.patientChangedIntoSafeAttire,
          belongingsRemovedOrSecured: suicidePrecautions.belongingsRemovedOrSecured,
          roomSafetyCompleted: suicidePrecautions.roomSafetyCompleted,
          ligatureRiskReduced: suicidePrecautions.ligatureRiskReduced,
          sharpsRemoved: suicidePrecautions.sharpsRemoved,
          providerNotified: suicidePrecautions.providerNotified,
          familyNotified: suicidePrecautions.familyNotified,
          providerNotificationTime: optionalIso(suicidePrecautions.providerNotificationTime),
          notes: suicidePrecautions.notes.trim() || undefined,
        };
      case SUICIDE_RISK_MONITORING_CARD_ID:
        return {
          monitoringTime: toIsoFromLocalDatetime(suicideMonitoring.monitoringTime),
          riskLevel: suicideMonitoring.riskLevel,
          currentSuicidalIdeation: suicideMonitoring.currentSuicidalIdeation,
          planReported: suicideMonitoring.planReported,
          intentReported: suicideMonitoring.intentReported,
          meansAccessConcern: suicideMonitoring.meansAccessConcern,
          observationLevel: suicideMonitoring.observationLevel,
          cssrsScreenCompleted: suicideMonitoring.cssrsScreenCompleted,
          phq9Reviewed: suicideMonitoring.phq9Reviewed,
          gad7Reviewed: suicideMonitoring.gad7Reviewed,
          providerNotified: suicideMonitoring.providerNotified,
          notes: suicideMonitoring.notes.trim() || undefined,
        };
      case ELOPEMENT_RISK_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(elopementRisk.assessmentTime),
          riskLevel: elopementRisk.riskLevel,
          confusedOrDisoriented: elopementRisk.confusedOrDisoriented,
          attemptedToLeave: elopementRisk.attemptedToLeave,
          verbalizedIntentToLeave: elopementRisk.verbalizedIntentToLeave,
          requiresSecureArea: elopementRisk.requiresSecureArea,
          providerNotified: elopementRisk.providerNotified,
          familyNotified: elopementRisk.familyNotified,
          notes: elopementRisk.notes.trim() || undefined,
        };
      case ELOPEMENT_MONITORING_CARD_ID:
        return {
          monitoringTime: toIsoFromLocalDatetime(elopementMonitoring.monitoringTime),
          patientLocationConfirmed: elopementMonitoring.patientLocationConfirmed,
          patientInAssignedArea: elopementMonitoring.patientInAssignedArea,
          doorExitRiskObserved: elopementMonitoring.doorExitRiskObserved,
          redirectionRequired: elopementMonitoring.redirectionRequired,
          securityNotified: elopementMonitoring.securityNotified,
          providerNotified: elopementMonitoring.providerNotified,
          notes: elopementMonitoring.notes.trim() || undefined,
        };
      case BEHAVIORAL_OBSERVATION_CARD_ID:
        return {
          observationTime: toIsoFromLocalDatetime(behavioral.observationTime),
          behavior: behavioral.behavior,
          cooperative: behavioral.cooperative,
          threatToSelf: behavioral.threatToSelf,
          threatToOthers: behavioral.threatToOthers,
          redirectionEffective: behavioral.redirectionEffective,
          deEscalationUsed: behavioral.deEscalationUsed,
          providerNotified: behavioral.providerNotified,
          notes: behavioral.notes.trim() || undefined,
        };
      case AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(agitation.assessmentTime),
          agitationLevel: agitation.agitationLevel,
          violenceRisk: agitation.violenceRisk,
          verbalThreats: agitation.verbalThreats,
          physicalAggression: agitation.physicalAggression,
          propertyDestruction: agitation.propertyDestruction,
          weaponConcern: agitation.weaponConcern,
          securityNotified: agitation.securityNotified,
          providerNotified: agitation.providerNotified,
          notes: agitation.notes.trim() || undefined,
        };
      case ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID:
        return {
          checkTime: toIsoFromLocalDatetime(oneToOne.checkTime),
          observerRole: oneToOne.observerRole,
          patientVisible: oneToOne.patientVisible,
          patientSafe: oneToOne.patientSafe,
          behaviorObserved: oneToOne.behaviorObserved,
          needsAddressed: oneToOne.needsAddressed,
          handoffCompleted: oneToOne.handoffCompleted,
          providerNotified: oneToOne.providerNotified,
          notes: oneToOne.notes.trim() || undefined,
        };
      case ENVIRONMENTAL_SAFETY_CHECK_CARD_ID:
        return {
          checkTime: toIsoFromLocalDatetime(environmental.checkTime),
          roomClearedOfHazards: environmental.roomClearedOfHazards,
          ligatureRiskChecked: environmental.ligatureRiskChecked,
          sharpsRemoved: environmental.sharpsRemoved,
          cordsSecured: environmental.cordsSecured,
          belongingsSecured: environmental.belongingsSecured,
          bathroomChecked: environmental.bathroomChecked,
          staffAwareOfPrecautions: environmental.staffAwareOfPrecautions,
          issuesFound: environmental.issuesFound,
          issuesDescription: environmental.issuesDescription.trim() || undefined,
          providerNotified: environmental.providerNotified,
          notes: environmental.notes.trim() || undefined,
        };
      case BEHAVIORAL_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          reason: escalation.reason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          securityNotified: escalation.securityNotified,
          familyNotified: escalation.familyNotified,
          intervention: escalation.intervention,
          restraintDocumentationReferenced: escalation.restraintDocumentationReferenced,
          notes: escalation.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateBehavioralHealthSafetyDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.behavioralHealth.validationError"));
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

  const bool = (
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
    testId?: string
  ) => (
    <ClinicalDocumentationBooleanField
      label={label}
      value={value}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );

  return (
    <div
      data-testid="clinical-documentation-behavioral-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <div style={rowStyle}>
        {cardId === SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.documentationTime"),
              suicidePrecautions.documentationTime,
              (v) => setSuicidePrecautions({ ...suicidePrecautions, documentationTime: v }),
              "behavioral-suicide-precautions-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.precautionLevel")}
              value={suicidePrecautions.precautionLevel}
              options={PRECAUTION_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setSuicidePrecautions({ ...suicidePrecautions, precautionLevel: v })}
              testId="behavioral-precaution-level"
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.roomSafetyCompleted"),
              suicidePrecautions.roomSafetyCompleted,
              (v) => setSuicidePrecautions({ ...suicidePrecautions, roomSafetyCompleted: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.belongingsRemovedOrSecured"),
              suicidePrecautions.belongingsRemovedOrSecured,
              (v) => setSuicidePrecautions({ ...suicidePrecautions, belongingsRemovedOrSecured: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              suicidePrecautions.providerNotified,
              (v) => setSuicidePrecautions({ ...suicidePrecautions, providerNotified: v })
            )}
            {notesField(suicidePrecautions.notes, (notes) =>
              setSuicidePrecautions({ ...suicidePrecautions, notes })
            )}
          </>
        ) : null}

        {cardId === SUICIDE_RISK_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.monitoringTime"),
              suicideMonitoring.monitoringTime,
              (v) => setSuicideMonitoring({ ...suicideMonitoring, monitoringTime: v }),
              "behavioral-suicide-monitoring-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.riskLevel")}
              value={suicideMonitoring.riskLevel}
              options={SUICIDE_RISK_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setSuicideMonitoring({ ...suicideMonitoring, riskLevel: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.currentSuicidalIdeation")}
              value={suicideMonitoring.currentSuicidalIdeation}
              options={SUICIDAL_IDEATION_OPTIONS}
              locale={locale}
              onChange={(v) =>
                setSuicideMonitoring({ ...suicideMonitoring, currentSuicidalIdeation: v })
              }
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.cssrsScreenCompleted"),
              suicideMonitoring.cssrsScreenCompleted,
              (v) => setSuicideMonitoring({ ...suicideMonitoring, cssrsScreenCompleted: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              suicideMonitoring.providerNotified,
              (v) => setSuicideMonitoring({ ...suicideMonitoring, providerNotified: v })
            )}
            {notesField(suicideMonitoring.notes, (notes) =>
              setSuicideMonitoring({ ...suicideMonitoring, notes })
            )}
          </>
        ) : null}

        {cardId === ELOPEMENT_RISK_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.assessmentTime"),
              elopementRisk.assessmentTime,
              (v) => setElopementRisk({ ...elopementRisk, assessmentTime: v }),
              "behavioral-elopement-risk-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.riskLevel")}
              value={elopementRisk.riskLevel}
              options={ELOPEMENT_RISK_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setElopementRisk({ ...elopementRisk, riskLevel: v })}
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.requiresSecureArea"),
              elopementRisk.requiresSecureArea,
              (v) => setElopementRisk({ ...elopementRisk, requiresSecureArea: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              elopementRisk.providerNotified,
              (v) => setElopementRisk({ ...elopementRisk, providerNotified: v })
            )}
            {notesField(elopementRisk.notes, (notes) => setElopementRisk({ ...elopementRisk, notes }))}
          </>
        ) : null}

        {cardId === ELOPEMENT_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.monitoringTime"),
              elopementMonitoring.monitoringTime,
              (v) => setElopementMonitoring({ ...elopementMonitoring, monitoringTime: v }),
              "behavioral-elopement-monitoring-time"
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.patientLocationConfirmed"),
              elopementMonitoring.patientLocationConfirmed,
              (v) => setElopementMonitoring({ ...elopementMonitoring, patientLocationConfirmed: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.securityNotified"),
              elopementMonitoring.securityNotified,
              (v) => setElopementMonitoring({ ...elopementMonitoring, securityNotified: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              elopementMonitoring.providerNotified,
              (v) => setElopementMonitoring({ ...elopementMonitoring, providerNotified: v })
            )}
            {notesField(elopementMonitoring.notes, (notes) =>
              setElopementMonitoring({ ...elopementMonitoring, notes })
            )}
          </>
        ) : null}

        {cardId === BEHAVIORAL_OBSERVATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.observationTime"),
              behavioral.observationTime,
              (v) => setBehavioral({ ...behavioral, observationTime: v }),
              "behavioral-observation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.behavior")}
              value={behavioral.behavior}
              options={BEHAVIOR_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setBehavioral({ ...behavioral, behavior: v })}
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.threatToSelf"),
              behavioral.threatToSelf,
              (v) => setBehavioral({ ...behavioral, threatToSelf: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.threatToOthers"),
              behavioral.threatToOthers,
              (v) => setBehavioral({ ...behavioral, threatToOthers: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.deEscalationUsed"),
              behavioral.deEscalationUsed,
              (v) => setBehavioral({ ...behavioral, deEscalationUsed: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              behavioral.providerNotified,
              (v) => setBehavioral({ ...behavioral, providerNotified: v })
            )}
            {notesField(behavioral.notes, (notes) => setBehavioral({ ...behavioral, notes }))}
          </>
        ) : null}

        {cardId === AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.assessmentTime"),
              agitation.assessmentTime,
              (v) => setAgitation({ ...agitation, assessmentTime: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.agitationLevel")}
              value={agitation.agitationLevel}
              options={AGITATION_LEVEL_OPTIONS}
              locale={locale}
              onChange={(v) => setAgitation({ ...agitation, agitationLevel: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.violenceRisk")}
              value={agitation.violenceRisk}
              options={VIOLENCE_RISK_OPTIONS}
              locale={locale}
              onChange={(v) => setAgitation({ ...agitation, violenceRisk: v })}
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.weaponConcern"),
              agitation.weaponConcern,
              (v) => setAgitation({ ...agitation, weaponConcern: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.securityNotified"),
              agitation.securityNotified,
              (v) => setAgitation({ ...agitation, securityNotified: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              agitation.providerNotified,
              (v) => setAgitation({ ...agitation, providerNotified: v })
            )}
            {notesField(agitation.notes, (notes) => setAgitation({ ...agitation, notes }))}
          </>
        ) : null}

        {cardId === ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.checkTime"),
              oneToOne.checkTime,
              (v) => setOneToOne({ ...oneToOne, checkTime: v }),
              "behavioral-one-to-one-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.observerRole")}
              value={oneToOne.observerRole}
              options={OBSERVER_ROLE_OPTIONS}
              locale={locale}
              onChange={(v) => setOneToOne({ ...oneToOne, observerRole: v })}
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.patientVisible"),
              oneToOne.patientVisible,
              (v) => setOneToOne({ ...oneToOne, patientVisible: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.patientSafe"),
              oneToOne.patientSafe,
              (v) => setOneToOne({ ...oneToOne, patientSafe: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.handoffCompleted"),
              oneToOne.handoffCompleted,
              (v) => setOneToOne({ ...oneToOne, handoffCompleted: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              oneToOne.providerNotified,
              (v) => setOneToOne({ ...oneToOne, providerNotified: v })
            )}
            {notesField(oneToOne.notes, (notes) => setOneToOne({ ...oneToOne, notes }))}
          </>
        ) : null}

        {cardId === ENVIRONMENTAL_SAFETY_CHECK_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.checkTime"),
              environmental.checkTime,
              (v) => setEnvironmental({ ...environmental, checkTime: v }),
              "behavioral-environmental-time"
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.roomClearedOfHazards"),
              environmental.roomClearedOfHazards,
              (v) => setEnvironmental({ ...environmental, roomClearedOfHazards: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.issuesFound"),
              environmental.issuesFound,
              (v) => setEnvironmental({ ...environmental, issuesFound: v })
            )}
            {environmental.issuesFound ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={labelStyle}>
                  {t("clinicalDocumentation.forms.behavioralHealth.issuesDescription")}
                </span>
                <input
                  type="text"
                  value={environmental.issuesDescription}
                  onChange={(e) =>
                    setEnvironmental({ ...environmental, issuesDescription: e.target.value })
                  }
                  style={fieldStyle}
                />
              </div>
            ) : null}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              environmental.providerNotified,
              (v) => setEnvironmental({ ...environmental, providerNotified: v })
            )}
            {notesField(environmental.notes, (notes) => setEnvironmental({ ...environmental, notes }))}
          </>
        ) : null}

        {cardId === BEHAVIORAL_ESCALATION_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.eventTime"),
              escalation.eventTime,
              (v) => setEscalation({ ...escalation, eventTime: v }),
              "behavioral-escalation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.escalationReason")}
              value={escalation.reason}
              options={BEHAVIORAL_ESCALATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, reason: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.behavioralHealth.intervention")}
              value={escalation.intervention}
              options={BEHAVIORAL_INTERVENTION_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, intervention: v })}
            />
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotified"),
              escalation.providerNotified,
              (v) => setEscalation({ ...escalation, providerNotified: v })
            )}
            {datetimeField(
              t("clinicalDocumentation.forms.behavioralHealth.providerNotificationTime"),
              escalation.providerNotificationTime,
              (v) => setEscalation({ ...escalation, providerNotificationTime: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.securityNotified"),
              escalation.securityNotified,
              (v) => setEscalation({ ...escalation, securityNotified: v })
            )}
            {bool(
              t("clinicalDocumentation.forms.behavioralHealth.restraintDocumentationReferenced"),
              escalation.restraintDocumentationReferenced,
              (v) => setEscalation({ ...escalation, restraintDocumentationReferenced: v })
            )}
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

export function isEdoc16BehavioralHealthDocumentationFormCard(cardId: string): boolean {
  return (EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}
