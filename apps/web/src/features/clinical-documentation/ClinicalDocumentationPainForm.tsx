"use client";

import React, { useMemo, useState } from "react";
import {
  ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID,
  calculateAdultNonVerbalPainScore,
  calculateFlaccScore,
  CHRONIC_PAIN_ASSESSMENT_CARD_ID,
  derivePainSeverityBand,
  EDOC13_PAIN_DOCUMENTATION_CARD_IDS,
  FLACC_ACTIVITY_OPTIONS,
  FLACC_CONSOLABILITY_OPTIONS,
  FLACC_CRY_OPTIONS,
  FLACC_FACE_OPTIONS,
  FLACC_LEGS_OPTIONS,
  FUNCTIONAL_IMPACT_OPTIONS,
  NONVERBAL_ACTIVITY_OPTIONS,
  NONVERBAL_FACE_OPTIONS,
  NONVERBAL_GUARDING_OPTIONS,
  NONVERBAL_PHYSIOLOGY_OPTIONS,
  NONVERBAL_RESPIRATORY_OPTIONS,
  PAIN_DURATION_OPTIONS,
  PAIN_ESCALATION_EVENT_CARD_ID,
  PAIN_ESCALATION_REASON_OPTIONS,
  PAIN_INITIAL_ASSESSMENT_CARD_ID,
  PAIN_INTERVENTION_TYPE_OPTIONS,
  PAIN_LOCATION_OPTIONS,
  PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID,
  PAIN_QUALITY_OPTIONS,
  PAIN_REASSESSMENT_CARD_ID,
  PAIN_SCALE_OPTIONS,
  PAIN_SCORE_0_10_OPTIONS,
  PEDIATRIC_PAIN_ASSESSMENT_CARD_ID,
  POST_INTERVENTION_RESPONSE_OPTIONS,
  validatePainDocumentationPayloadForCard,
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
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
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

export function ClinicalDocumentationPainForm({
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
    painScale: "NUMERIC" as (typeof PAIN_SCALE_OPTIONS)[number]["value"],
    painScore: 5,
    painLocation: "GENERALIZED" as (typeof PAIN_LOCATION_OPTIONS)[number]["value"],
    painQuality: "ACHING" as (typeof PAIN_QUALITY_OPTIONS)[number]["value"],
    painDuration: "NEW" as (typeof PAIN_DURATION_OPTIONS)[number]["value"],
    painRadiation: "NONE" as "NONE" | "PRESENT",
    painRadiationDescription: "",
    aggravatingFactors: "",
    relievingFactors: "",
    functionalImpact: "MILD" as (typeof FUNCTIONAL_IMPACT_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [reassessment, setReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    painScale: "NUMERIC" as (typeof PAIN_SCALE_OPTIONS)[number]["value"],
    painScore: 4,
    previousPainScore: "" as number | "",
    painImproved: true,
    functionalImpact: "MILD" as (typeof FUNCTIONAL_IMPACT_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [postIntervention, setPostIntervention] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    interventionType: "MEDICATION" as (typeof PAIN_INTERVENTION_TYPE_OPTIONS)[number]["value"],
    painScoreBefore: 7,
    painScoreAfter: 4,
    response: "IMPROVED" as (typeof POST_INTERVENTION_RESPONSE_OPTIONS)[number]["value"],
    providerNotified: false,
    notes: "",
  });

  const [chronic, setChronic] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    baselinePainScore: 5,
    currentPainScore: 6,
    painManagementPlanPresent: true,
    opioidTherapyReported: false,
    painInterferesWithSleep: true,
    painInterferesWithMobility: false,
    painInterferesWithADLs: false,
    providerManagingPainKnown: true,
    notes: "",
  });

  const [nonVerbal, setNonVerbal] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    facialExpression: 1 as 0 | 1 | 2,
    activity: 1 as 0 | 1 | 2,
    guarding: 0 as 0 | 1 | 2,
    physiology: 0 as 0 | 1 | 2,
    respiratory: 0 as 0 | 1 | 2,
    providerNotified: false,
    notes: "",
  });

  const [flacc, setFlacc] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    face: 1 as 0 | 1 | 2,
    legs: 1 as 0 | 1 | 2,
    activity: 1 as 0 | 1 | 2,
    cry: 0 as 0 | 1 | 2,
    consolability: 1 as 0 | 1 | 2,
    providerNotified: false,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    reason: "SEVERE_PAIN" as (typeof PAIN_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: true,
    providerNotificationTime: nowLocalDatetimeValue(),
    responseReceived: false,
    responseTime: "",
    additionalInterventionOrdered: false,
    notes: "",
  });

  const nonVerbalTotal = useMemo(() => calculateAdultNonVerbalPainScore(nonVerbal), [nonVerbal]);
  const flaccTotal = useMemo(() => calculateFlaccScore(flacc), [flacc]);
  const postResponse = useMemo(() => {
    if (postIntervention.painScoreAfter < postIntervention.painScoreBefore) return "IMPROVED";
    if (postIntervention.painScoreAfter > postIntervention.painScoreBefore) return "WORSE";
    return "UNCHANGED";
  }, [postIntervention.painScoreBefore, postIntervention.painScoreAfter]);

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case PAIN_INITIAL_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(initial.assessmentTime),
          painScale: initial.painScale,
          painScore: initial.painScore,
          painLocation: initial.painLocation,
          painQuality: initial.painQuality,
          painDuration: initial.painDuration,
          painRadiation: initial.painRadiation,
          painRadiationDescription:
            initial.painRadiation === "PRESENT"
              ? initial.painRadiationDescription.trim() || undefined
              : undefined,
          aggravatingFactors: initial.aggravatingFactors.trim() || undefined,
          relievingFactors: initial.relievingFactors.trim() || undefined,
          functionalImpact: initial.functionalImpact,
          providerNotified: initial.providerNotified,
          notes: initial.notes.trim() || undefined,
        };
      case PAIN_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(reassessment.assessmentTime),
          painScale: reassessment.painScale,
          painScore: reassessment.painScore,
          ...(reassessment.previousPainScore === ""
            ? {}
            : { previousPainScore: reassessment.previousPainScore }),
          painImproved: reassessment.painImproved,
          functionalImpact: reassessment.functionalImpact,
          providerNotified: reassessment.providerNotified,
          notes: reassessment.notes.trim() || undefined,
        };
      case PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(postIntervention.assessmentTime),
          interventionType: postIntervention.interventionType,
          painScoreBefore: postIntervention.painScoreBefore,
          painScoreAfter: postIntervention.painScoreAfter,
          response: postResponse,
          providerNotified: postIntervention.providerNotified,
          notes: postIntervention.notes.trim() || undefined,
        };
      case CHRONIC_PAIN_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(chronic.assessmentTime),
          baselinePainScore: chronic.baselinePainScore,
          currentPainScore: chronic.currentPainScore,
          painManagementPlanPresent: chronic.painManagementPlanPresent,
          opioidTherapyReported: chronic.opioidTherapyReported,
          painInterferesWithSleep: chronic.painInterferesWithSleep,
          painInterferesWithMobility: chronic.painInterferesWithMobility,
          painInterferesWithADLs: chronic.painInterferesWithADLs,
          providerManagingPainKnown: chronic.providerManagingPainKnown,
          notes: chronic.notes.trim() || undefined,
        };
      case ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(nonVerbal.assessmentTime),
          facialExpression: nonVerbal.facialExpression,
          activity: nonVerbal.activity,
          guarding: nonVerbal.guarding,
          physiology: nonVerbal.physiology,
          respiratory: nonVerbal.respiratory,
          totalScore: nonVerbalTotal,
          providerNotified: nonVerbal.providerNotified,
          notes: nonVerbal.notes.trim() || undefined,
        };
      case PEDIATRIC_PAIN_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(flacc.assessmentTime),
          face: flacc.face,
          legs: flacc.legs,
          activity: flacc.activity,
          cry: flacc.cry,
          consolability: flacc.consolability,
          totalScore: flaccTotal,
          providerNotified: flacc.providerNotified,
          notes: flacc.notes.trim() || undefined,
        };
      case PAIN_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          reason: escalation.reason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          responseReceived: escalation.responseReceived,
          responseTime: optionalIso(escalation.responseTime),
          additionalInterventionOrdered: escalation.additionalInterventionOrdered,
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
    const result = validatePainDocumentationPayloadForCard(cardId, payload);
    if (!result.ok) {
      setValidationError(t("clinicalDocumentation.forms.pain.validationError"));
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <form
      data-testid="clinical-documentation-pain-form"
      onSubmit={handleSubmit}
      style={formStyle}
    >
      {cardId === PAIN_INITIAL_ASSESSMENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.assessmentTime")}
            <input
              type="datetime-local"
              data-testid="pain-initial-time"
              value={initial.assessmentTime}
              onChange={(e) => setInitial((s) => ({ ...s, assessmentTime: e.target.value }))}
              style={fieldStyle}
            />
          </label>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.pain.painScale")}
              value={initial.painScale}
              options={PAIN_SCALE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial((s) => ({ ...s, painScale: v }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.painScore")}
              value={initial.painScore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial((s) => ({ ...s, painScore: v }))}
              testId="pain-initial-score"
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.pain.painLocation")}
              value={initial.painLocation}
              options={PAIN_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial((s) => ({ ...s, painLocation: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.pain.painQuality")}
              value={initial.painQuality}
              options={PAIN_QUALITY_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial((s) => ({ ...s, painQuality: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.pain.painDuration")}
              value={initial.painDuration}
              options={PAIN_DURATION_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial((s) => ({ ...s, painDuration: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.pain.functionalImpact")}
              value={initial.functionalImpact}
              options={FUNCTIONAL_IMPACT_OPTIONS}
              locale={locale}
              onChange={(v) => setInitial((s) => ({ ...s, functionalImpact: v }))}
            />
          </div>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.painRadiationPresent")}
            value={initial.painRadiation === "PRESENT"}
            locale={locale}
            onChange={(v) =>
              setInitial((s) => ({ ...s, painRadiation: v ? "PRESENT" : "NONE" }))
            }
          />
          {initial.painRadiation === "PRESENT" ? (
            <label style={labelStyle}>
              {t("clinicalDocumentation.forms.pain.painRadiationDescription")}
              <input
                type="text"
                value={initial.painRadiationDescription}
                onChange={(e) =>
                  setInitial((s) => ({ ...s, painRadiationDescription: e.target.value }))
                }
                style={fieldStyle}
              />
            </label>
          ) : null}
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.providerNotified")}
            value={initial.providerNotified}
            locale={locale}
            onChange={(v) => setInitial((s) => ({ ...s, providerNotified: v }))}
          />
        </>
      ) : null}

      {cardId === PAIN_REASSESSMENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.assessmentTime")}
            <input
              type="datetime-local"
              data-testid="pain-reassessment-time"
              value={reassessment.assessmentTime}
              onChange={(e) => setReassessment((s) => ({ ...s, assessmentTime: e.target.value }))}
              style={fieldStyle}
            />
          </label>
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.painScore")}
              value={reassessment.painScore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment((s) => ({ ...s, painScore: v }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.previousPainScore")}
              value={reassessment.previousPainScore === "" ? 0 : reassessment.previousPainScore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setReassessment((s) => ({ ...s, previousPainScore: v }))}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.pain.painImproved")}
              value={reassessment.painImproved}
              locale={locale}
              onChange={(v) => setReassessment((s) => ({ ...s, painImproved: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.pain.providerNotified")}
              value={reassessment.providerNotified}
              locale={locale}
              onChange={(v) => setReassessment((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.assessmentTime")}
            <input
              type="datetime-local"
              data-testid="pain-post-intervention-time"
              value={postIntervention.assessmentTime}
              onChange={(e) =>
                setPostIntervention((s) => ({ ...s, assessmentTime: e.target.value }))
              }
              style={fieldStyle}
            />
          </label>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.pain.interventionType")}
            value={postIntervention.interventionType}
            options={PAIN_INTERVENTION_TYPE_OPTIONS}
            locale={locale}
            onChange={(v) => setPostIntervention((s) => ({ ...s, interventionType: v }))}
          />
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.painScoreBefore")}
              value={postIntervention.painScoreBefore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setPostIntervention((s) => ({ ...s, painScoreBefore: v }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.painScoreAfter")}
              value={postIntervention.painScoreAfter}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setPostIntervention((s) => ({ ...s, painScoreAfter: v }))}
            />
          </div>
          <p style={scoreBannerStyle} data-testid="pain-post-intervention-response">
            {t("clinicalDocumentation.forms.pain.response")}: {postResponse}
          </p>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.providerNotified")}
            value={postIntervention.providerNotified}
            locale={locale}
            onChange={(v) => setPostIntervention((s) => ({ ...s, providerNotified: v }))}
          />
        </>
      ) : null}

      {cardId === CHRONIC_PAIN_ASSESSMENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.assessmentTime")}
            <input
              type="datetime-local"
              data-testid="pain-chronic-time"
              value={chronic.assessmentTime}
              onChange={(e) => setChronic((s) => ({ ...s, assessmentTime: e.target.value }))}
              style={fieldStyle}
            />
          </label>
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.baselinePainScore")}
              value={chronic.baselinePainScore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setChronic((s) => ({ ...s, baselinePainScore: v }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.currentPainScore")}
              value={chronic.currentPainScore}
              options={PAIN_SCORE_0_10_OPTIONS}
              locale={locale}
              onChange={(v) => setChronic((s) => ({ ...s, currentPainScore: v }))}
            />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.pain.painInterferesWithSleep")}
              value={chronic.painInterferesWithSleep}
              locale={locale}
              onChange={(v) => setChronic((s) => ({ ...s, painInterferesWithSleep: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.pain.painInterferesWithMobility")}
              value={chronic.painInterferesWithMobility}
              locale={locale}
              onChange={(v) => setChronic((s) => ({ ...s, painInterferesWithMobility: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.pain.painInterferesWithADLs")}
              value={chronic.painInterferesWithADLs}
              locale={locale}
              onChange={(v) => setChronic((s) => ({ ...s, painInterferesWithADLs: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.assessmentTime")}
            <input
              type="datetime-local"
              data-testid="pain-nonverbal-time"
              value={nonVerbal.assessmentTime}
              onChange={(e) => setNonVerbal((s) => ({ ...s, assessmentTime: e.target.value }))}
              style={fieldStyle}
            />
          </label>
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.facialExpression")}
              value={nonVerbal.facialExpression}
              options={NONVERBAL_FACE_OPTIONS}
              locale={locale}
              onChange={(v) => setNonVerbal((s) => ({ ...s, facialExpression: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.activity")}
              value={nonVerbal.activity}
              options={NONVERBAL_ACTIVITY_OPTIONS}
              locale={locale}
              onChange={(v) => setNonVerbal((s) => ({ ...s, activity: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.guarding")}
              value={nonVerbal.guarding}
              options={NONVERBAL_GUARDING_OPTIONS}
              locale={locale}
              onChange={(v) => setNonVerbal((s) => ({ ...s, guarding: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.physiology")}
              value={nonVerbal.physiology}
              options={NONVERBAL_PHYSIOLOGY_OPTIONS}
              locale={locale}
              onChange={(v) => setNonVerbal((s) => ({ ...s, physiology: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.respiratory")}
              value={nonVerbal.respiratory}
              options={NONVERBAL_RESPIRATORY_OPTIONS}
              locale={locale}
              onChange={(v) => setNonVerbal((s) => ({ ...s, respiratory: v as 0 | 1 | 2 }))}
            />
          </div>
          <p style={scoreBannerStyle} data-testid="pain-nonverbal-total">
            {t("clinicalDocumentation.forms.pain.totalScore")}: {nonVerbalTotal} —{" "}
            {derivePainSeverityBand(nonVerbalTotal)}
          </p>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.providerNotified")}
            value={nonVerbal.providerNotified}
            locale={locale}
            onChange={(v) => setNonVerbal((s) => ({ ...s, providerNotified: v }))}
          />
        </>
      ) : null}

      {cardId === PEDIATRIC_PAIN_ASSESSMENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.assessmentTime")}
            <input
              type="datetime-local"
              data-testid="pain-flacc-time"
              value={flacc.assessmentTime}
              onChange={(e) => setFlacc((s) => ({ ...s, assessmentTime: e.target.value }))}
              style={fieldStyle}
            />
          </label>
          <div style={rowStyle}>
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.flaccFace")}
              value={flacc.face}
              options={FLACC_FACE_OPTIONS}
              locale={locale}
              onChange={(v) => setFlacc((s) => ({ ...s, face: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.flaccLegs")}
              value={flacc.legs}
              options={FLACC_LEGS_OPTIONS}
              locale={locale}
              onChange={(v) => setFlacc((s) => ({ ...s, legs: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.flaccActivity")}
              value={flacc.activity}
              options={FLACC_ACTIVITY_OPTIONS}
              locale={locale}
              onChange={(v) => setFlacc((s) => ({ ...s, activity: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.flaccCry")}
              value={flacc.cry}
              options={FLACC_CRY_OPTIONS}
              locale={locale}
              onChange={(v) => setFlacc((s) => ({ ...s, cry: v as 0 | 1 | 2 }))}
            />
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.pain.flaccConsolability")}
              value={flacc.consolability}
              options={FLACC_CONSOLABILITY_OPTIONS}
              locale={locale}
              onChange={(v) => setFlacc((s) => ({ ...s, consolability: v as 0 | 1 | 2 }))}
            />
          </div>
          <p style={scoreBannerStyle} data-testid="pain-flacc-total">
            {t("clinicalDocumentation.forms.pain.flaccTotal")}: {flaccTotal} —{" "}
            {derivePainSeverityBand(flaccTotal)}
          </p>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.providerNotified")}
            value={flacc.providerNotified}
            locale={locale}
            onChange={(v) => setFlacc((s) => ({ ...s, providerNotified: v }))}
          />
        </>
      ) : null}

      {cardId === PAIN_ESCALATION_EVENT_CARD_ID ? (
        <>
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.eventTime")}
            <input
              type="datetime-local"
              data-testid="pain-escalation-time"
              value={escalation.eventTime}
              onChange={(e) => setEscalation((s) => ({ ...s, eventTime: e.target.value }))}
              style={fieldStyle}
            />
          </label>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.pain.escalationReason")}
            value={escalation.reason}
            options={PAIN_ESCALATION_REASON_OPTIONS}
            locale={locale}
            onChange={(v) => setEscalation((s) => ({ ...s, reason: v }))}
          />
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.providerNotified")}
            value={escalation.providerNotified}
            locale={locale}
            onChange={(v) => setEscalation((s) => ({ ...s, providerNotified: v }))}
          />
          <label style={labelStyle}>
            {t("clinicalDocumentation.forms.pain.providerNotificationTime")}
            <input
              type="datetime-local"
              value={escalation.providerNotificationTime}
              onChange={(e) =>
                setEscalation((s) => ({ ...s, providerNotificationTime: e.target.value }))
              }
              style={fieldStyle}
            />
          </label>
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.pain.responseReceived")}
            value={escalation.responseReceived}
            locale={locale}
            onChange={(v) => setEscalation((s) => ({ ...s, responseReceived: v }))}
          />
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

export function isEdoc13PainDocumentationFormCard(cardId: string): boolean {
  return (EDOC13_PAIN_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
