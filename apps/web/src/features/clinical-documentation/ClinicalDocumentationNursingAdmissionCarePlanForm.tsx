"use client";

import React, { useState } from "react";
import {
  EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS,
  HEAD_TO_TOE_ASSESSMENT_CARD_ID,
  NURSING_ADMISSION_ASSESSMENT_CARD_ID,
  NURSING_ADMISSION_SOURCE_OPTIONS,
  NURSING_BASELINE_MOBILITY_OPTIONS,
  NURSING_CARE_PLAN_GOAL_OPTIONS,
  NURSING_CARE_PLAN_INITIATION_CARD_ID,
  NURSING_CARE_PLAN_UPDATE_CARD_ID,
  NURSING_CARDIAC_STATUS_OPTIONS,
  NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID,
  NURSING_GI_STATUS_OPTIONS,
  NURSING_GOAL_STATUS_OPTIONS,
  NURSING_GOAL_TYPE_OPTIONS,
  NURSING_GU_STATUS_OPTIONS,
  NURSING_HANDOFF_SHIFT_REPORT_CARD_ID,
  NURSING_HANDOFF_TYPE_OPTIONS,
  NURSING_INTERVENTION_OPTIONS,
  NURSING_INTERVENTION_STATUS_OPTIONS,
  NURSING_MENTAL_STATUS_OPTIONS,
  NURSING_MOBILITY_STATUS_OPTIONS,
  NURSING_OUTCOME_STATUS_OPTIONS,
  NURSING_PAIN_STATUS_OPTIONS,
  NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID,
  NURSING_PATIENT_PROGRESS_OPTIONS,
  NURSING_PRIMARY_PROBLEM_OPTIONS,
  NURSING_PROBLEM_LIST_CARD_ID,
  NURSING_PROBLEM_LIST_OPTIONS,
  NURSING_PROBLEM_STATUS_OPTIONS,
  NURSING_RECEIVING_ROLE_OPTIONS,
  NURSING_RESPIRATORY_STATUS_OPTIONS,
  NURSING_SAFETY_STATUS_OPTIONS,
  NURSING_SHIFT_ASSESSMENT_CARD_ID,
  NURSING_SHIFT_OPTIONS,
  NURSING_SKIN_STATUS_OPTIONS,
  NURSING_SYSTEM_OPTIONS,
  NURSING_SYSTEM_STATUS_OPTIONS,
  NURSING_WDL_ASSESSMENT_OPTIONS,
  NURSING_YES_NO_NOT_APPLICABLE_OPTIONS,
  NURSING_YES_NO_OPTIONS,
  NURSING_YES_NO_UNABLE_OPTIONS,
  NURSING_YES_NO_UNKNOWN_OPTIONS,
  SYSTEMS_ASSESSMENT_CARD_ID,
  formatClinicalDocumentationOptionLabel,
  validateNursingAdmissionCarePlanDocumentationPayloadForCard,
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

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

type YesNo = (typeof NURSING_YES_NO_OPTIONS)[number]["value"];
type YesNoUnknown = (typeof NURSING_YES_NO_UNKNOWN_OPTIONS)[number]["value"];
type YesNoNa = (typeof NURSING_YES_NO_NOT_APPLICABLE_OPTIONS)[number]["value"];
type YesNoUnable = (typeof NURSING_YES_NO_UNABLE_OPTIONS)[number]["value"];
type InterventionValue = (typeof NURSING_INTERVENTION_OPTIONS)[number]["value"];
type WdlValue = (typeof NURSING_WDL_ASSESSMENT_OPTIONS)[number]["value"];

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
      options={NURSING_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

function InterventionCheckboxGroup({
  label,
  selected,
  locale,
  onChange,
}: {
  label: string;
  selected: InterventionValue[];
  locale: "en" | "fr";
  onChange: (values: InterventionValue[]) => void;
}) {
  const toggle = (value: InterventionValue) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{label}</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 6,
        }}
        data-testid="nursing-interventions-planned"
      >
        {NURSING_INTERVENTION_OPTIONS.map((option) => (
          <label
            key={option.value}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155" }}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {formatClinicalDocumentationOptionLabel(option, locale)}
          </label>
        ))}
      </div>
    </div>
  );
}

export function ClinicalDocumentationNursingAdmissionCarePlanForm({
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

  const [admission, setAdmission] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    admissionSource: "ED" as (typeof NURSING_ADMISSION_SOURCE_OPTIONS)[number]["value"],
    admissionReason: "",
    baselineMentalStatus: "ALERT_ORIENTED" as (typeof NURSING_MENTAL_STATUS_OPTIONS)[number]["value"],
    baselineMobility: "INDEPENDENT" as (typeof NURSING_BASELINE_MOBILITY_OPTIONS)[number]["value"],
    fallRiskReviewed: "YES" as YesNo,
    skinAssessmentCompleted: "YES" as YesNo,
    painAssessmentCompleted: "YES" as YesNo,
    belongingsReviewed: "YES" as YesNo,
    homeMedicationsReviewed: "YES" as YesNo,
    allergiesReviewed: "YES" as YesNo,
    advanceDirectivesReviewed: "UNKNOWN" as YesNoUnknown,
    infectionScreeningCompleted: "YES" as YesNo,
    educationNeedsIdentified: "NO" as YesNo,
    interpreterNeeded: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [shift, setShift] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    shift: "DAY" as (typeof NURSING_SHIFT_OPTIONS)[number]["value"],
    mentalStatus: "ALERT_ORIENTED" as (typeof NURSING_MENTAL_STATUS_OPTIONS)[number]["value"],
    respiratoryStatus: "STABLE" as (typeof NURSING_RESPIRATORY_STATUS_OPTIONS)[number]["value"],
    cardiacStatus: "STABLE" as (typeof NURSING_CARDIAC_STATUS_OPTIONS)[number]["value"],
    giStatus: "NORMAL" as (typeof NURSING_GI_STATUS_OPTIONS)[number]["value"],
    guStatus: "NORMAL" as (typeof NURSING_GU_STATUS_OPTIONS)[number]["value"],
    skinStatus: "INTACT" as (typeof NURSING_SKIN_STATUS_OPTIONS)[number]["value"],
    mobilityStatus: "INDEPENDENT" as (typeof NURSING_MOBILITY_STATUS_OPTIONS)[number]["value"],
    painStatus: "NO_PAIN" as (typeof NURSING_PAIN_STATUS_OPTIONS)[number]["value"],
    safetyStatus: "STANDARD" as (typeof NURSING_SAFETY_STATUS_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [headToToe, setHeadToToe] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    neuro: "WDL" as WdlValue,
    respiratory: "WDL" as WdlValue,
    cardiac: "WDL" as WdlValue,
    gastrointestinal: "WDL" as WdlValue,
    genitourinary: "WDL" as WdlValue,
    skin: "WDL" as WdlValue,
    musculoskeletal: "WDL" as WdlValue,
    psychosocial: "WDL" as WdlValue,
    abnormalFindingsPresent: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [systems, setSystems] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    system: "RESPIRATORY" as (typeof NURSING_SYSTEM_OPTIONS)[number]["value"],
    status: "WDL" as (typeof NURSING_SYSTEM_STATUS_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [carePlanInitiation, setCarePlanInitiation] = useState({
    initiatedAt: nowLocalDatetimeValue(),
    primaryNursingProblem: "FALL_RISK" as (typeof NURSING_PRIMARY_PROBLEM_OPTIONS)[number]["value"],
    goal: "NO_FALLS" as (typeof NURSING_CARE_PLAN_GOAL_OPTIONS)[number]["value"],
    interventionsPlanned: ["SAFETY_PRECAUTIONS"] as InterventionValue[],
    patientParticipated: "YES" as YesNoUnable,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [carePlanUpdate, setCarePlanUpdate] = useState({
    updatedAt: nowLocalDatetimeValue(),
    problemAddressed: "",
    goalStatus: "IN_PROGRESS" as (typeof NURSING_GOAL_STATUS_OPTIONS)[number]["value"],
    interventionStatus: "CONTINUED" as (typeof NURSING_INTERVENTION_STATUS_OPTIONS)[number]["value"],
    patientProgress: "UNCHANGED" as (typeof NURSING_PATIENT_PROGRESS_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [goalsOutcomes, setGoalsOutcomes] = useState({
    documentedAt: nowLocalDatetimeValue(),
    goalType: "MOBILITY" as (typeof NURSING_GOAL_TYPE_OPTIONS)[number]["value"],
    goalDescription: "",
    outcomeStatus: "IN_PROGRESS" as (typeof NURSING_OUTCOME_STATUS_OPTIONS)[number]["value"],
    barrierPresent: "NO" as YesNo,
    barrierDescription: "",
    notes: "",
  });

  const [problemList, setProblemList] = useState({
    documentedAt: nowLocalDatetimeValue(),
    problem: "PAIN" as (typeof NURSING_PROBLEM_LIST_OPTIONS)[number]["value"],
    status: "ACTIVE" as (typeof NURSING_PROBLEM_STATUS_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [handoff, setHandoff] = useState({
    handoffTime: nowLocalDatetimeValue(),
    handoffType: "SHIFT_CHANGE" as (typeof NURSING_HANDOFF_TYPE_OPTIONS)[number]["value"],
    receivingRole: "RN" as (typeof NURSING_RECEIVING_ROLE_OPTIONS)[number]["value"],
    highRiskConcernsPresent: "NO" as YesNo,
    openTasksReviewed: "YES" as YesNo,
    medicationConcernsReviewed: "YES" as YesNo,
    fallRiskReviewed: "YES" as YesNo,
    linesTubesDrainsReviewed: "YES" as YesNo,
    pendingLabsImagingReviewed: "YES" as YesNo,
    familyCommunicationNeeds: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [dischargeReadiness, setDischargeReadiness] = useState({
    reviewTime: nowLocalDatetimeValue(),
    vitalSignsStable: "YES" as YesNo,
    painControlled: "YES" as YesNo,
    mobilitySafe: "YES" as YesNo,
    educationCompleted: "YES" as YesNo,
    medicationsReviewed: "YES" as YesNo,
    followUpReviewed: "YES" as YesNo,
    transportationConfirmed: "YES" as YesNo,
    responsibleAdultPresent: "NOT_APPLICABLE" as YesNoNa,
    barriersPresent: "NO" as YesNo,
    barrierDescription: "",
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case NURSING_ADMISSION_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(admission.assessmentTime),
          admissionSource: admission.admissionSource,
          admissionReason: admission.admissionReason.trim(),
          baselineMentalStatus: admission.baselineMentalStatus,
          baselineMobility: admission.baselineMobility,
          fallRiskReviewed: admission.fallRiskReviewed,
          skinAssessmentCompleted: admission.skinAssessmentCompleted,
          painAssessmentCompleted: admission.painAssessmentCompleted,
          belongingsReviewed: admission.belongingsReviewed,
          homeMedicationsReviewed: admission.homeMedicationsReviewed,
          allergiesReviewed: admission.allergiesReviewed,
          advanceDirectivesReviewed: admission.advanceDirectivesReviewed,
          infectionScreeningCompleted: admission.infectionScreeningCompleted,
          educationNeedsIdentified: admission.educationNeedsIdentified,
          interpreterNeeded: admission.interpreterNeeded,
          providerNotified: admission.providerNotified,
          notes: admission.notes.trim() || undefined,
        };
      case NURSING_SHIFT_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(shift.assessmentTime),
          shift: shift.shift,
          mentalStatus: shift.mentalStatus,
          respiratoryStatus: shift.respiratoryStatus,
          cardiacStatus: shift.cardiacStatus,
          giStatus: shift.giStatus,
          guStatus: shift.guStatus,
          skinStatus: shift.skinStatus,
          mobilityStatus: shift.mobilityStatus,
          painStatus: shift.painStatus,
          safetyStatus: shift.safetyStatus,
          providerNotified: shift.providerNotified,
          notes: shift.notes.trim() || undefined,
        };
      case HEAD_TO_TOE_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(headToToe.assessmentTime),
          neuro: headToToe.neuro,
          respiratory: headToToe.respiratory,
          cardiac: headToToe.cardiac,
          gastrointestinal: headToToe.gastrointestinal,
          genitourinary: headToToe.genitourinary,
          skin: headToToe.skin,
          musculoskeletal: headToToe.musculoskeletal,
          psychosocial: headToToe.psychosocial,
          abnormalFindingsPresent: headToToe.abnormalFindingsPresent,
          providerNotified: headToToe.providerNotified,
          notes: headToToe.notes.trim() || undefined,
        };
      case SYSTEMS_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(systems.assessmentTime),
          system: systems.system,
          status: systems.status,
          providerNotified: systems.providerNotified,
          notes: systems.notes.trim() || undefined,
        };
      case NURSING_CARE_PLAN_INITIATION_CARD_ID:
        return {
          initiatedAt: toIsoFromLocalDatetime(carePlanInitiation.initiatedAt),
          primaryNursingProblem: carePlanInitiation.primaryNursingProblem,
          goal: carePlanInitiation.goal,
          interventionsPlanned: carePlanInitiation.interventionsPlanned,
          patientParticipated: carePlanInitiation.patientParticipated,
          providerNotified: carePlanInitiation.providerNotified,
          notes: carePlanInitiation.notes.trim() || undefined,
        };
      case NURSING_CARE_PLAN_UPDATE_CARD_ID:
        return {
          updatedAt: toIsoFromLocalDatetime(carePlanUpdate.updatedAt),
          problemAddressed: carePlanUpdate.problemAddressed.trim(),
          goalStatus: carePlanUpdate.goalStatus,
          interventionStatus: carePlanUpdate.interventionStatus,
          patientProgress: carePlanUpdate.patientProgress,
          providerNotified: carePlanUpdate.providerNotified,
          notes: carePlanUpdate.notes.trim() || undefined,
        };
      case NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(goalsOutcomes.documentedAt),
          goalType: goalsOutcomes.goalType,
          goalDescription: goalsOutcomes.goalDescription.trim(),
          outcomeStatus: goalsOutcomes.outcomeStatus,
          barrierPresent: goalsOutcomes.barrierPresent,
          barrierDescription: goalsOutcomes.barrierDescription.trim() || undefined,
          notes: goalsOutcomes.notes.trim() || undefined,
        };
      case NURSING_PROBLEM_LIST_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(problemList.documentedAt),
          problem: problemList.problem,
          status: problemList.status,
          providerNotified: problemList.providerNotified,
          notes: problemList.notes.trim() || undefined,
        };
      case NURSING_HANDOFF_SHIFT_REPORT_CARD_ID:
        return {
          handoffTime: toIsoFromLocalDatetime(handoff.handoffTime),
          handoffType: handoff.handoffType,
          receivingRole: handoff.receivingRole,
          highRiskConcernsPresent: handoff.highRiskConcernsPresent,
          openTasksReviewed: handoff.openTasksReviewed,
          medicationConcernsReviewed: handoff.medicationConcernsReviewed,
          fallRiskReviewed: handoff.fallRiskReviewed,
          linesTubesDrainsReviewed: handoff.linesTubesDrainsReviewed,
          pendingLabsImagingReviewed: handoff.pendingLabsImagingReviewed,
          familyCommunicationNeeds: handoff.familyCommunicationNeeds,
          providerNotified: handoff.providerNotified,
          notes: handoff.notes.trim() || undefined,
        };
      case NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID:
        return {
          reviewTime: toIsoFromLocalDatetime(dischargeReadiness.reviewTime),
          vitalSignsStable: dischargeReadiness.vitalSignsStable,
          painControlled: dischargeReadiness.painControlled,
          mobilitySafe: dischargeReadiness.mobilitySafe,
          educationCompleted: dischargeReadiness.educationCompleted,
          medicationsReviewed: dischargeReadiness.medicationsReviewed,
          followUpReviewed: dischargeReadiness.followUpReviewed,
          transportationConfirmed: dischargeReadiness.transportationConfirmed,
          responsibleAdultPresent: dischargeReadiness.responsibleAdultPresent,
          barriersPresent: dischargeReadiness.barriersPresent,
          barrierDescription: dischargeReadiness.barrierDescription.trim() || undefined,
          providerNotified: dischargeReadiness.providerNotified,
          notes: dischargeReadiness.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateNursingAdmissionCarePlanDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.nursingAdmissionCarePlan.validationError"));
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

  const textField = (label: string, value: string, onChange: (v: string) => void, testId?: string) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="text"
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

  const wdlField = (
    label: string,
    value: WdlValue,
    onChange: (v: WdlValue) => void
  ) => (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={NURSING_WDL_ASSESSMENT_OPTIONS}
      locale={locale}
      onChange={onChange}
    />
  );

  return (
    <div
      data-testid="clinical-documentation-nursing-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <div style={rowStyle}>
        {cardId === NURSING_ADMISSION_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.assessmentTime"),
              admission.assessmentTime,
              (v) => setAdmission({ ...admission, assessmentTime: v }),
              "nursing-admission-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.admissionSource")}
              value={admission.admissionSource}
              options={NURSING_ADMISSION_SOURCE_OPTIONS}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, admissionSource: v })}
            />
            {textField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.admissionReason"),
              admission.admissionReason,
              (v) => setAdmission({ ...admission, admissionReason: v }),
              "nursing-admission-reason"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.baselineMentalStatus")}
              value={admission.baselineMentalStatus}
              options={NURSING_MENTAL_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, baselineMentalStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.baselineMobility")}
              value={admission.baselineMobility}
              options={NURSING_BASELINE_MOBILITY_OPTIONS}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, baselineMobility: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.fallRiskReviewed")}
              value={admission.fallRiskReviewed}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, fallRiskReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.skinAssessmentCompleted")}
              value={admission.skinAssessmentCompleted}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, skinAssessmentCompleted: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.painAssessmentCompleted")}
              value={admission.painAssessmentCompleted}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, painAssessmentCompleted: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.allergiesReviewed")}
              value={admission.allergiesReviewed}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, allergiesReviewed: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.advanceDirectivesReviewed")}
              value={admission.advanceDirectivesReviewed}
              options={NURSING_YES_NO_UNKNOWN_OPTIONS}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, advanceDirectivesReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={admission.providerNotified}
              locale={locale}
              onChange={(v) => setAdmission({ ...admission, providerNotified: v })}
            />
            {notesField(admission.notes, (notes) => setAdmission({ ...admission, notes }))}
          </>
        ) : null}

        {cardId === NURSING_SHIFT_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.assessmentTime"),
              shift.assessmentTime,
              (v) => setShift({ ...shift, assessmentTime: v }),
              "nursing-shift-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.shift")}
              value={shift.shift}
              options={NURSING_SHIFT_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, shift: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.mentalStatus")}
              value={shift.mentalStatus}
              options={NURSING_MENTAL_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, mentalStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.respiratoryStatus")}
              value={shift.respiratoryStatus}
              options={NURSING_RESPIRATORY_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, respiratoryStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.cardiacStatus")}
              value={shift.cardiacStatus}
              options={NURSING_CARDIAC_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, cardiacStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.painStatus")}
              value={shift.painStatus}
              options={NURSING_PAIN_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, painStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.skinStatus")}
              value={shift.skinStatus}
              options={NURSING_SKIN_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, skinStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.safetyStatus")}
              value={shift.safetyStatus}
              options={NURSING_SAFETY_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setShift({ ...shift, safetyStatus: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={shift.providerNotified}
              locale={locale}
              onChange={(v) => setShift({ ...shift, providerNotified: v })}
            />
            {notesField(shift.notes, (notes) => setShift({ ...shift, notes }))}
          </>
        ) : null}

        {cardId === HEAD_TO_TOE_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.assessmentTime"),
              headToToe.assessmentTime,
              (v) => setHeadToToe({ ...headToToe, assessmentTime: v }),
              "nursing-head-to-toe-time"
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.neuro"),
              headToToe.neuro,
              (v) => setHeadToToe({ ...headToToe, neuro: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.respiratory"),
              headToToe.respiratory,
              (v) => setHeadToToe({ ...headToToe, respiratory: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.cardiac"),
              headToToe.cardiac,
              (v) => setHeadToToe({ ...headToToe, cardiac: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.gastrointestinal"),
              headToToe.gastrointestinal,
              (v) => setHeadToToe({ ...headToToe, gastrointestinal: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.genitourinary"),
              headToToe.genitourinary,
              (v) => setHeadToToe({ ...headToToe, genitourinary: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.skin"),
              headToToe.skin,
              (v) => setHeadToToe({ ...headToToe, skin: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.musculoskeletal"),
              headToToe.musculoskeletal,
              (v) => setHeadToToe({ ...headToToe, musculoskeletal: v })
            )}
            {wdlField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.psychosocial"),
              headToToe.psychosocial,
              (v) => setHeadToToe({ ...headToToe, psychosocial: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.abnormalFindingsPresent")}
              value={headToToe.abnormalFindingsPresent}
              locale={locale}
              onChange={(v) => setHeadToToe({ ...headToToe, abnormalFindingsPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={headToToe.providerNotified}
              locale={locale}
              onChange={(v) => setHeadToToe({ ...headToToe, providerNotified: v })}
            />
            {notesField(headToToe.notes, (notes) => setHeadToToe({ ...headToToe, notes }))}
          </>
        ) : null}

        {cardId === SYSTEMS_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.assessmentTime"),
              systems.assessmentTime,
              (v) => setSystems({ ...systems, assessmentTime: v }),
              "nursing-systems-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.system")}
              value={systems.system}
              options={NURSING_SYSTEM_OPTIONS}
              locale={locale}
              onChange={(v) => setSystems({ ...systems, system: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.status")}
              value={systems.status}
              options={NURSING_SYSTEM_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setSystems({ ...systems, status: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={systems.providerNotified}
              locale={locale}
              onChange={(v) => setSystems({ ...systems, providerNotified: v })}
            />
            {notesField(systems.notes, (notes) => setSystems({ ...systems, notes }))}
          </>
        ) : null}

        {cardId === NURSING_CARE_PLAN_INITIATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.initiatedAt"),
              carePlanInitiation.initiatedAt,
              (v) => setCarePlanInitiation({ ...carePlanInitiation, initiatedAt: v }),
              "nursing-care-plan-initiation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.primaryNursingProblem")}
              value={carePlanInitiation.primaryNursingProblem}
              options={NURSING_PRIMARY_PROBLEM_OPTIONS}
              locale={locale}
              onChange={(v) => setCarePlanInitiation({ ...carePlanInitiation, primaryNursingProblem: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.goal")}
              value={carePlanInitiation.goal}
              options={NURSING_CARE_PLAN_GOAL_OPTIONS}
              locale={locale}
              onChange={(v) => setCarePlanInitiation({ ...carePlanInitiation, goal: v })}
            />
            <InterventionCheckboxGroup
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.interventionsPlanned")}
              selected={carePlanInitiation.interventionsPlanned}
              locale={locale}
              onChange={(interventionsPlanned) =>
                setCarePlanInitiation({ ...carePlanInitiation, interventionsPlanned })
              }
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.patientParticipated")}
              value={carePlanInitiation.patientParticipated}
              options={NURSING_YES_NO_UNABLE_OPTIONS}
              locale={locale}
              onChange={(v) => setCarePlanInitiation({ ...carePlanInitiation, patientParticipated: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={carePlanInitiation.providerNotified}
              locale={locale}
              onChange={(v) => setCarePlanInitiation({ ...carePlanInitiation, providerNotified: v })}
            />
            {notesField(carePlanInitiation.notes, (notes) =>
              setCarePlanInitiation({ ...carePlanInitiation, notes })
            )}
          </>
        ) : null}

        {cardId === NURSING_CARE_PLAN_UPDATE_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.updatedAt"),
              carePlanUpdate.updatedAt,
              (v) => setCarePlanUpdate({ ...carePlanUpdate, updatedAt: v }),
              "nursing-care-plan-update-time"
            )}
            {textField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.problemAddressed"),
              carePlanUpdate.problemAddressed,
              (v) => setCarePlanUpdate({ ...carePlanUpdate, problemAddressed: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.goalStatus")}
              value={carePlanUpdate.goalStatus}
              options={NURSING_GOAL_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setCarePlanUpdate({ ...carePlanUpdate, goalStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.interventionStatus")}
              value={carePlanUpdate.interventionStatus}
              options={NURSING_INTERVENTION_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setCarePlanUpdate({ ...carePlanUpdate, interventionStatus: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.patientProgress")}
              value={carePlanUpdate.patientProgress}
              options={NURSING_PATIENT_PROGRESS_OPTIONS}
              locale={locale}
              onChange={(v) => setCarePlanUpdate({ ...carePlanUpdate, patientProgress: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={carePlanUpdate.providerNotified}
              locale={locale}
              onChange={(v) => setCarePlanUpdate({ ...carePlanUpdate, providerNotified: v })}
            />
            {notesField(carePlanUpdate.notes, (notes) => setCarePlanUpdate({ ...carePlanUpdate, notes }))}
          </>
        ) : null}

        {cardId === NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.documentedAt"),
              goalsOutcomes.documentedAt,
              (v) => setGoalsOutcomes({ ...goalsOutcomes, documentedAt: v }),
              "nursing-goals-outcomes-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.goalType")}
              value={goalsOutcomes.goalType}
              options={NURSING_GOAL_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setGoalsOutcomes({ ...goalsOutcomes, goalType: v })}
            />
            {textField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.goalDescription"),
              goalsOutcomes.goalDescription,
              (v) => setGoalsOutcomes({ ...goalsOutcomes, goalDescription: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.outcomeStatus")}
              value={goalsOutcomes.outcomeStatus}
              options={NURSING_OUTCOME_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setGoalsOutcomes({ ...goalsOutcomes, outcomeStatus: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.barrierPresent")}
              value={goalsOutcomes.barrierPresent}
              locale={locale}
              onChange={(v) => setGoalsOutcomes({ ...goalsOutcomes, barrierPresent: v })}
            />
            {goalsOutcomes.barrierPresent === "YES"
              ? textField(
                  t("clinicalDocumentation.forms.nursingAdmissionCarePlan.barrierDescription"),
                  goalsOutcomes.barrierDescription,
                  (v) => setGoalsOutcomes({ ...goalsOutcomes, barrierDescription: v })
                )
              : null}
            {notesField(goalsOutcomes.notes, (notes) => setGoalsOutcomes({ ...goalsOutcomes, notes }))}
          </>
        ) : null}

        {cardId === NURSING_PROBLEM_LIST_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.documentedAt"),
              problemList.documentedAt,
              (v) => setProblemList({ ...problemList, documentedAt: v }),
              "nursing-problem-list-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.problem")}
              value={problemList.problem}
              options={NURSING_PROBLEM_LIST_OPTIONS}
              locale={locale}
              onChange={(v) => setProblemList({ ...problemList, problem: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.status")}
              value={problemList.status}
              options={NURSING_PROBLEM_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setProblemList({ ...problemList, status: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={problemList.providerNotified}
              locale={locale}
              onChange={(v) => setProblemList({ ...problemList, providerNotified: v })}
            />
            {notesField(problemList.notes, (notes) => setProblemList({ ...problemList, notes }))}
          </>
        ) : null}

        {cardId === NURSING_HANDOFF_SHIFT_REPORT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.handoffTime"),
              handoff.handoffTime,
              (v) => setHandoff({ ...handoff, handoffTime: v }),
              "nursing-handoff-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.handoffType")}
              value={handoff.handoffType}
              options={NURSING_HANDOFF_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, handoffType: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.receivingRole")}
              value={handoff.receivingRole}
              options={NURSING_RECEIVING_ROLE_OPTIONS}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, receivingRole: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.highRiskConcernsPresent")}
              value={handoff.highRiskConcernsPresent}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, highRiskConcernsPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.openTasksReviewed")}
              value={handoff.openTasksReviewed}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, openTasksReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.medicationConcernsReviewed")}
              value={handoff.medicationConcernsReviewed}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, medicationConcernsReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.fallRiskReviewed")}
              value={handoff.fallRiskReviewed}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, fallRiskReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.linesTubesDrainsReviewed")}
              value={handoff.linesTubesDrainsReviewed}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, linesTubesDrainsReviewed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={handoff.providerNotified}
              locale={locale}
              onChange={(v) => setHandoff({ ...handoff, providerNotified: v })}
            />
            {notesField(handoff.notes, (notes) => setHandoff({ ...handoff, notes }))}
          </>
        ) : null}

        {cardId === NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.nursingAdmissionCarePlan.reviewTime"),
              dischargeReadiness.reviewTime,
              (v) => setDischargeReadiness({ ...dischargeReadiness, reviewTime: v }),
              "nursing-discharge-readiness-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.vitalSignsStable")}
              value={dischargeReadiness.vitalSignsStable}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, vitalSignsStable: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.painControlled")}
              value={dischargeReadiness.painControlled}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, painControlled: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.mobilitySafe")}
              value={dischargeReadiness.mobilitySafe}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, mobilitySafe: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.educationCompleted")}
              value={dischargeReadiness.educationCompleted}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, educationCompleted: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.medicationsReviewed")}
              value={dischargeReadiness.medicationsReviewed}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, medicationsReviewed: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.responsibleAdultPresent")}
              value={dischargeReadiness.responsibleAdultPresent}
              options={NURSING_YES_NO_NOT_APPLICABLE_OPTIONS}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, responsibleAdultPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.barriersPresent")}
              value={dischargeReadiness.barriersPresent}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, barriersPresent: v })}
            />
            {dischargeReadiness.barriersPresent === "YES"
              ? textField(
                  t("clinicalDocumentation.forms.nursingAdmissionCarePlan.barrierDescription"),
                  dischargeReadiness.barrierDescription,
                  (v) => setDischargeReadiness({ ...dischargeReadiness, barrierDescription: v })
                )
              : null}
            <YesNoField
              label={t("clinicalDocumentation.forms.nursingAdmissionCarePlan.providerNotified")}
              value={dischargeReadiness.providerNotified}
              locale={locale}
              onChange={(v) => setDischargeReadiness({ ...dischargeReadiness, providerNotified: v })}
            />
            {notesField(dischargeReadiness.notes, (notes) =>
              setDischargeReadiness({ ...dischargeReadiness, notes })
            )}
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

export function isEdoc19NursingAdmissionCarePlanDocumentationFormCard(cardId: string): boolean {
  return (EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}
