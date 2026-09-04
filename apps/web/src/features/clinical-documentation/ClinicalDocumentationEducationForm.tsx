"use client";

import React, { useState } from "react";
import {
  CAREGIVER_EDUCATION_SESSION_CARD_ID,
  DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
  DISEASE_SPECIFIC_EDUCATION_CARD_ID,
  EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS,
  EDU_AUDIENCE_OPTIONS,
  EDU_BARRIER_TYPE_OPTIONS,
  EDU_CAREGIVER_RELATIONSHIP_OPTIONS,
  EDU_CAREGIVER_TOPIC_OPTIONS,
  EDU_DISEASE_CONDITION_OPTIONS,
  EDU_EQUIPMENT_TYPE_OPTIONS,
  EDU_PATIENT_TOPIC_OPTIONS,
  EDU_REFUSAL_REASON_OPTIONS,
  EDU_TEACH_BACK_STATUS_OPTIONS,
  EDU_TEACH_BACK_TOPIC_OPTIONS,
  EDU_UNDERSTANDING_OPTIONS,
  EDU_YES_NO_OPTIONS,
  EDU_YES_NO_UNKNOWN_OPTIONS,
  EDUCATION_REFUSAL_OR_INABILITY_CARD_ID,
  EQUIPMENT_EDUCATION_CARD_ID,
  FOLLOW_UP_REVIEW_CARD_ID,
  LEARNING_BARRIER_ASSESSMENT_CARD_ID,
  MEDICATION_EDUCATION_REVIEW_CARD_ID,
  PATIENT_EDUCATION_SESSION_CARD_ID,
  TEACH_BACK_VERIFICATION_CARD_ID,
  validatePatientEducationDischargeTeachingDocumentationPayloadForCard,
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

type YesNo = (typeof EDU_YES_NO_OPTIONS)[number]["value"];
type YesNoUnknown = (typeof EDU_YES_NO_UNKNOWN_OPTIONS)[number]["value"];
type Understanding = (typeof EDU_UNDERSTANDING_OPTIONS)[number]["value"];
type TeachBackStatus = (typeof EDU_TEACH_BACK_STATUS_OPTIONS)[number]["value"];

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </label>
  );
}

function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }}
      />
    </label>
  );
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
  locale: string;
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={EDU_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationEducationForm({
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

  const [patientSession, setPatientSession] = useState({
    educationTime: nowLocalDatetimeValue(),
    topic: "SAFETY" as (typeof EDU_PATIENT_TOPIC_OPTIONS)[number]["value"],
    audience: "PATIENT" as (typeof EDU_AUDIENCE_OPTIONS)[number]["value"],
    interpreterUsed: "NO" as YesNo,
    educationProvided: "YES" as YesNo,
    understandingDemonstrated: "YES" as Understanding,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [caregiverSession, setCaregiverSession] = useState({
    educationTime: nowLocalDatetimeValue(),
    caregiverPresent: "YES" as YesNo,
    caregiverRelationship: "SPOUSE" as (typeof EDU_CAREGIVER_RELATIONSHIP_OPTIONS)[number]["value"],
    educationTopic: "SAFETY" as (typeof EDU_CAREGIVER_TOPIC_OPTIONS)[number]["value"],
    teachBackCompleted: "YES" as YesNo,
    understandingDemonstrated: "YES" as Understanding,
    notes: "",
  });

  const [medReview, setMedReview] = useState({
    reviewTime: nowLocalDatetimeValue(),
    medicationsReviewed: "YES" as YesNo,
    highRiskMedicationIncluded: "NO" as YesNo,
    sideEffectsReviewed: "YES" as YesNo,
    adherenceDiscussed: "YES" as YesNo,
    teachBackCompleted: "YES" as YesNo,
    understandingDemonstrated: "YES" as Understanding,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [dischargeReview, setDischargeReview] = useState({
    reviewTime: nowLocalDatetimeValue(),
    instructionsReviewed: "YES" as YesNo,
    warningSignsReviewed: "YES" as YesNo,
    activityRestrictionsReviewed: "YES" as YesNo,
    dietInstructionsReviewed: "YES" as YesNo,
    followUpReviewed: "YES" as YesNo,
    teachBackCompleted: "YES" as YesNo,
    understandingDemonstrated: "YES" as Understanding,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [teachBack, setTeachBack] = useState({
    verificationTime: nowLocalDatetimeValue(),
    topicReviewed: "DISCHARGE" as (typeof EDU_TEACH_BACK_TOPIC_OPTIONS)[number]["value"],
    teachBackSuccessful: "YES" as TeachBackStatus,
    additionalEducationRequired: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [followUp, setFollowUp] = useState({
    reviewTime: nowLocalDatetimeValue(),
    followUpDiscussed: "YES" as YesNo,
    appointmentNeeded: "NO" as YesNo,
    appointmentScheduled: "UNKNOWN" as YesNoUnknown,
    specialistFollowUpNeeded: "NO" as YesNo,
    transportationConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [equipment, setEquipment] = useState({
    educationTime: nowLocalDatetimeValue(),
    equipmentType: "OXYGEN" as (typeof EDU_EQUIPMENT_TYPE_OPTIONS)[number]["value"],
    demonstrationProvided: "YES" as YesNo,
    returnDemonstrationCompleted: "YES" as YesNo,
    understandingDemonstrated: "YES" as Understanding,
    notes: "",
  });

  const [diseaseSpecific, setDiseaseSpecific] = useState({
    educationTime: nowLocalDatetimeValue(),
    condition: "DIABETES" as (typeof EDU_DISEASE_CONDITION_OPTIONS)[number]["value"],
    educationProvided: "YES" as YesNo,
    teachBackCompleted: "YES" as YesNo,
    understandingDemonstrated: "YES" as Understanding,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [learningBarrier, setLearningBarrier] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    barrierPresent: "NO" as YesNo,
    barrierType: "NONE" as (typeof EDU_BARRIER_TYPE_OPTIONS)[number]["value"],
    interpreterNeeded: "NO" as YesNo,
    caregiverInvolved: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [refusal, setRefusal] = useState({
    documentationTime: nowLocalDatetimeValue(),
    reason: "PATIENT_REFUSED" as (typeof EDU_REFUSAL_REASON_OPTIONS)[number]["value"],
    additionalAttemptsPlanned: "YES" as YesNo,
    providerNotified: "YES" as YesNo,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case PATIENT_EDUCATION_SESSION_CARD_ID:
        return {
          educationTime: toIsoFromLocalDatetime(patientSession.educationTime),
          topic: patientSession.topic,
          audience: patientSession.audience,
          interpreterUsed: patientSession.interpreterUsed,
          educationProvided: patientSession.educationProvided,
          understandingDemonstrated: patientSession.understandingDemonstrated,
          providerNotified: patientSession.providerNotified,
          ...(patientSession.notes.trim() ? { notes: patientSession.notes.trim() } : {}),
        };
      case CAREGIVER_EDUCATION_SESSION_CARD_ID:
        return {
          educationTime: toIsoFromLocalDatetime(caregiverSession.educationTime),
          caregiverPresent: caregiverSession.caregiverPresent,
          caregiverRelationship: caregiverSession.caregiverRelationship,
          educationTopic: caregiverSession.educationTopic,
          teachBackCompleted: caregiverSession.teachBackCompleted,
          understandingDemonstrated: caregiverSession.understandingDemonstrated,
          ...(caregiverSession.notes.trim() ? { notes: caregiverSession.notes.trim() } : {}),
        };
      case MEDICATION_EDUCATION_REVIEW_CARD_ID:
        return {
          reviewTime: toIsoFromLocalDatetime(medReview.reviewTime),
          medicationsReviewed: medReview.medicationsReviewed,
          highRiskMedicationIncluded: medReview.highRiskMedicationIncluded,
          sideEffectsReviewed: medReview.sideEffectsReviewed,
          adherenceDiscussed: medReview.adherenceDiscussed,
          teachBackCompleted: medReview.teachBackCompleted,
          understandingDemonstrated: medReview.understandingDemonstrated,
          providerNotified: medReview.providerNotified,
          ...(medReview.notes.trim() ? { notes: medReview.notes.trim() } : {}),
        };
      case DISCHARGE_INSTRUCTION_REVIEW_CARD_ID:
        return {
          reviewTime: toIsoFromLocalDatetime(dischargeReview.reviewTime),
          instructionsReviewed: dischargeReview.instructionsReviewed,
          warningSignsReviewed: dischargeReview.warningSignsReviewed,
          activityRestrictionsReviewed: dischargeReview.activityRestrictionsReviewed,
          dietInstructionsReviewed: dischargeReview.dietInstructionsReviewed,
          followUpReviewed: dischargeReview.followUpReviewed,
          teachBackCompleted: dischargeReview.teachBackCompleted,
          understandingDemonstrated: dischargeReview.understandingDemonstrated,
          providerNotified: dischargeReview.providerNotified,
          ...(dischargeReview.notes.trim() ? { notes: dischargeReview.notes.trim() } : {}),
        };
      case TEACH_BACK_VERIFICATION_CARD_ID:
        return {
          verificationTime: toIsoFromLocalDatetime(teachBack.verificationTime),
          topicReviewed: teachBack.topicReviewed,
          teachBackSuccessful: teachBack.teachBackSuccessful,
          additionalEducationRequired: teachBack.additionalEducationRequired,
          providerNotified: teachBack.providerNotified,
          ...(teachBack.notes.trim() ? { notes: teachBack.notes.trim() } : {}),
        };
      case FOLLOW_UP_REVIEW_CARD_ID:
        return {
          reviewTime: toIsoFromLocalDatetime(followUp.reviewTime),
          followUpDiscussed: followUp.followUpDiscussed,
          appointmentNeeded: followUp.appointmentNeeded,
          appointmentScheduled: followUp.appointmentScheduled,
          specialistFollowUpNeeded: followUp.specialistFollowUpNeeded,
          transportationConcern: followUp.transportationConcern,
          providerNotified: followUp.providerNotified,
          ...(followUp.notes.trim() ? { notes: followUp.notes.trim() } : {}),
        };
      case EQUIPMENT_EDUCATION_CARD_ID:
        return {
          educationTime: toIsoFromLocalDatetime(equipment.educationTime),
          equipmentType: equipment.equipmentType,
          demonstrationProvided: equipment.demonstrationProvided,
          returnDemonstrationCompleted: equipment.returnDemonstrationCompleted,
          understandingDemonstrated: equipment.understandingDemonstrated,
          ...(equipment.notes.trim() ? { notes: equipment.notes.trim() } : {}),
        };
      case DISEASE_SPECIFIC_EDUCATION_CARD_ID:
        return {
          educationTime: toIsoFromLocalDatetime(diseaseSpecific.educationTime),
          condition: diseaseSpecific.condition,
          educationProvided: diseaseSpecific.educationProvided,
          teachBackCompleted: diseaseSpecific.teachBackCompleted,
          understandingDemonstrated: diseaseSpecific.understandingDemonstrated,
          providerNotified: diseaseSpecific.providerNotified,
          ...(diseaseSpecific.notes.trim() ? { notes: diseaseSpecific.notes.trim() } : {}),
        };
      case LEARNING_BARRIER_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(learningBarrier.assessmentTime),
          barrierPresent: learningBarrier.barrierPresent,
          barrierType: learningBarrier.barrierType,
          interpreterNeeded: learningBarrier.interpreterNeeded,
          caregiverInvolved: learningBarrier.caregiverInvolved,
          providerNotified: learningBarrier.providerNotified,
          ...(learningBarrier.notes.trim() ? { notes: learningBarrier.notes.trim() } : {}),
        };
      case EDUCATION_REFUSAL_OR_INABILITY_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(refusal.documentationTime),
          reason: refusal.reason,
          additionalAttemptsPlanned: refusal.additionalAttemptsPlanned,
          providerNotified: refusal.providerNotified,
          ...(refusal.notes.trim() ? { notes: refusal.notes.trim() } : {}),
        };
      default:
        return {};
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const payload = buildPayload();
    const result = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(cardId, payload);
    if (!result.ok) {
      setValidationError(t("clinicalDocumentation.forms.education.validationError"));
      return;
    }
    await onSubmit(result.data);
  }

  function renderFields() {
    switch (cardId) {
      case PATIENT_EDUCATION_SESSION_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.educationTime")}
              value={patientSession.educationTime}
              onChange={(v) => setPatientSession((s) => ({ ...s, educationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.topic")}
              value={patientSession.topic}
              options={EDU_PATIENT_TOPIC_OPTIONS}
              locale={locale}
              onChange={(v) => setPatientSession((s) => ({ ...s, topic: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.audience")}
              value={patientSession.audience}
              options={EDU_AUDIENCE_OPTIONS}
              locale={locale}
              onChange={(v) => setPatientSession((s) => ({ ...s, audience: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.interpreterUsed")}
              value={patientSession.interpreterUsed}
              locale={locale}
              onChange={(v) => setPatientSession((s) => ({ ...s, interpreterUsed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.educationProvided")}
              value={patientSession.educationProvided}
              locale={locale}
              onChange={(v) => setPatientSession((s) => ({ ...s, educationProvided: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.understandingDemonstrated")}
              value={patientSession.understandingDemonstrated}
              options={EDU_UNDERSTANDING_OPTIONS}
              locale={locale}
              onChange={(v) => setPatientSession((s) => ({ ...s, understandingDemonstrated: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={patientSession.providerNotified}
              locale={locale}
              onChange={(v) => setPatientSession((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={patientSession.notes}
              onChange={(v) => setPatientSession((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case CAREGIVER_EDUCATION_SESSION_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.educationTime")}
              value={caregiverSession.educationTime}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, educationTime: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.caregiverPresent")}
              value={caregiverSession.caregiverPresent}
              locale={locale}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, caregiverPresent: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.caregiverRelationship")}
              value={caregiverSession.caregiverRelationship}
              options={EDU_CAREGIVER_RELATIONSHIP_OPTIONS}
              locale={locale}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, caregiverRelationship: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.educationTopic")}
              value={caregiverSession.educationTopic}
              options={EDU_CAREGIVER_TOPIC_OPTIONS}
              locale={locale}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, educationTopic: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.teachBackCompleted")}
              value={caregiverSession.teachBackCompleted}
              locale={locale}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, teachBackCompleted: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.understandingDemonstrated")}
              value={caregiverSession.understandingDemonstrated}
              options={EDU_UNDERSTANDING_OPTIONS}
              locale={locale}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, understandingDemonstrated: v }))}
            />
            <NotesField
              value={caregiverSession.notes}
              onChange={(v) => setCaregiverSession((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case MEDICATION_EDUCATION_REVIEW_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.reviewTime")}
              value={medReview.reviewTime}
              onChange={(v) => setMedReview((s) => ({ ...s, reviewTime: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.medicationsReviewed")}
              value={medReview.medicationsReviewed}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, medicationsReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.highRiskMedicationIncluded")}
              value={medReview.highRiskMedicationIncluded}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, highRiskMedicationIncluded: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.sideEffectsReviewed")}
              value={medReview.sideEffectsReviewed}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, sideEffectsReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.adherenceDiscussed")}
              value={medReview.adherenceDiscussed}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, adherenceDiscussed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.teachBackCompleted")}
              value={medReview.teachBackCompleted}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, teachBackCompleted: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.understandingDemonstrated")}
              value={medReview.understandingDemonstrated}
              options={EDU_UNDERSTANDING_OPTIONS}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, understandingDemonstrated: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={medReview.providerNotified}
              locale={locale}
              onChange={(v) => setMedReview((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={medReview.notes} onChange={(v) => setMedReview((s) => ({ ...s, notes: v }))} />
          </>
        );
      case DISCHARGE_INSTRUCTION_REVIEW_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.reviewTime")}
              value={dischargeReview.reviewTime}
              onChange={(v) => setDischargeReview((s) => ({ ...s, reviewTime: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.instructionsReviewed")}
              value={dischargeReview.instructionsReviewed}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, instructionsReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.warningSignsReviewed")}
              value={dischargeReview.warningSignsReviewed}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, warningSignsReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.activityRestrictionsReviewed")}
              value={dischargeReview.activityRestrictionsReviewed}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, activityRestrictionsReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.dietInstructionsReviewed")}
              value={dischargeReview.dietInstructionsReviewed}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, dietInstructionsReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.followUpReviewed")}
              value={dischargeReview.followUpReviewed}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, followUpReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.teachBackCompleted")}
              value={dischargeReview.teachBackCompleted}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, teachBackCompleted: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.understandingDemonstrated")}
              value={dischargeReview.understandingDemonstrated}
              options={EDU_UNDERSTANDING_OPTIONS}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, understandingDemonstrated: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={dischargeReview.providerNotified}
              locale={locale}
              onChange={(v) => setDischargeReview((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={dischargeReview.notes}
              onChange={(v) => setDischargeReview((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case TEACH_BACK_VERIFICATION_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.verificationTime")}
              value={teachBack.verificationTime}
              onChange={(v) => setTeachBack((s) => ({ ...s, verificationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.topicReviewed")}
              value={teachBack.topicReviewed}
              options={EDU_TEACH_BACK_TOPIC_OPTIONS}
              locale={locale}
              onChange={(v) => setTeachBack((s) => ({ ...s, topicReviewed: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.teachBackSuccessful")}
              value={teachBack.teachBackSuccessful}
              options={EDU_TEACH_BACK_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setTeachBack((s) => ({ ...s, teachBackSuccessful: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.additionalEducationRequired")}
              value={teachBack.additionalEducationRequired}
              locale={locale}
              onChange={(v) => setTeachBack((s) => ({ ...s, additionalEducationRequired: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={teachBack.providerNotified}
              locale={locale}
              onChange={(v) => setTeachBack((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={teachBack.notes} onChange={(v) => setTeachBack((s) => ({ ...s, notes: v }))} />
          </>
        );
      case FOLLOW_UP_REVIEW_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.reviewTime")}
              value={followUp.reviewTime}
              onChange={(v) => setFollowUp((s) => ({ ...s, reviewTime: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.followUpDiscussed")}
              value={followUp.followUpDiscussed}
              locale={locale}
              onChange={(v) => setFollowUp((s) => ({ ...s, followUpDiscussed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.appointmentNeeded")}
              value={followUp.appointmentNeeded}
              locale={locale}
              onChange={(v) => setFollowUp((s) => ({ ...s, appointmentNeeded: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.appointmentScheduled")}
              value={followUp.appointmentScheduled}
              options={EDU_YES_NO_UNKNOWN_OPTIONS}
              locale={locale}
              onChange={(v) => setFollowUp((s) => ({ ...s, appointmentScheduled: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.specialistFollowUpNeeded")}
              value={followUp.specialistFollowUpNeeded}
              locale={locale}
              onChange={(v) => setFollowUp((s) => ({ ...s, specialistFollowUpNeeded: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.transportationConcern")}
              value={followUp.transportationConcern}
              locale={locale}
              onChange={(v) => setFollowUp((s) => ({ ...s, transportationConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={followUp.providerNotified}
              locale={locale}
              onChange={(v) => setFollowUp((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={followUp.notes} onChange={(v) => setFollowUp((s) => ({ ...s, notes: v }))} />
          </>
        );
      case EQUIPMENT_EDUCATION_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.educationTime")}
              value={equipment.educationTime}
              onChange={(v) => setEquipment((s) => ({ ...s, educationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.equipmentType")}
              value={equipment.equipmentType}
              options={EDU_EQUIPMENT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setEquipment((s) => ({ ...s, equipmentType: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.demonstrationProvided")}
              value={equipment.demonstrationProvided}
              locale={locale}
              onChange={(v) => setEquipment((s) => ({ ...s, demonstrationProvided: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.returnDemonstrationCompleted")}
              value={equipment.returnDemonstrationCompleted}
              locale={locale}
              onChange={(v) => setEquipment((s) => ({ ...s, returnDemonstrationCompleted: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.understandingDemonstrated")}
              value={equipment.understandingDemonstrated}
              options={EDU_UNDERSTANDING_OPTIONS}
              locale={locale}
              onChange={(v) => setEquipment((s) => ({ ...s, understandingDemonstrated: v }))}
            />
            <NotesField value={equipment.notes} onChange={(v) => setEquipment((s) => ({ ...s, notes: v }))} />
          </>
        );
      case DISEASE_SPECIFIC_EDUCATION_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.educationTime")}
              value={diseaseSpecific.educationTime}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, educationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.condition")}
              value={diseaseSpecific.condition}
              options={EDU_DISEASE_CONDITION_OPTIONS}
              locale={locale}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, condition: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.educationProvided")}
              value={diseaseSpecific.educationProvided}
              locale={locale}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, educationProvided: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.teachBackCompleted")}
              value={diseaseSpecific.teachBackCompleted}
              locale={locale}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, teachBackCompleted: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.understandingDemonstrated")}
              value={diseaseSpecific.understandingDemonstrated}
              options={EDU_UNDERSTANDING_OPTIONS}
              locale={locale}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, understandingDemonstrated: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={diseaseSpecific.providerNotified}
              locale={locale}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={diseaseSpecific.notes}
              onChange={(v) => setDiseaseSpecific((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case LEARNING_BARRIER_ASSESSMENT_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.assessmentTime")}
              value={learningBarrier.assessmentTime}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, assessmentTime: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.barrierPresent")}
              value={learningBarrier.barrierPresent}
              locale={locale}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, barrierPresent: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.barrierType")}
              value={learningBarrier.barrierType}
              options={EDU_BARRIER_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, barrierType: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.interpreterNeeded")}
              value={learningBarrier.interpreterNeeded}
              locale={locale}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, interpreterNeeded: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.caregiverInvolved")}
              value={learningBarrier.caregiverInvolved}
              locale={locale}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, caregiverInvolved: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={learningBarrier.providerNotified}
              locale={locale}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={learningBarrier.notes}
              onChange={(v) => setLearningBarrier((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case EDUCATION_REFUSAL_OR_INABILITY_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.education.documentationTime")}
              value={refusal.documentationTime}
              onChange={(v) => setRefusal((s) => ({ ...s, documentationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.education.reason")}
              value={refusal.reason}
              options={EDU_REFUSAL_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setRefusal((s) => ({ ...s, reason: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.additionalAttemptsPlanned")}
              value={refusal.additionalAttemptsPlanned}
              locale={locale}
              onChange={(v) => setRefusal((s) => ({ ...s, additionalAttemptsPlanned: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.education.providerNotified")}
              value={refusal.providerNotified}
              locale={locale}
              onChange={(v) => setRefusal((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={refusal.notes} onChange={(v) => setRefusal((s) => ({ ...s, notes: v }))} />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={formStyle}
      data-testid="clinical-documentation-education-form"
      data-compact-layout="true"
    >
      <div style={rowStyle}>{renderFields()}</div>
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #0f766e",
          background: saving ? "#94a3b8" : "#0f766e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </form>
  );
}

export function isEdoc22PatientEducationDischargeTeachingDocumentationFormCard(
  cardId: string
): boolean {
  return (EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}
