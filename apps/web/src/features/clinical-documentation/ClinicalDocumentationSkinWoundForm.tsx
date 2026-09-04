"use client";

import React, { useMemo, useState } from "react";
import {
  BRADEN_RISK_ASSESSMENT_CARD_ID,
  calculateBradenScore,
  deriveBradenRiskLevel,
  EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS,
  MASD_ASSESSMENT_CARD_ID,
  OSTOMY_ASSESSMENT_CARD_ID,
  PRESSURE_INJURY_ASSESSMENT_CARD_ID,
  PRESSURE_INJURY_REASSESSMENT_CARD_ID,
  SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
  SKIN_TEAR_ASSESSMENT_CARD_ID,
  SKIN_WOUND_APPROXIMATION_OPTIONS,
  SKIN_WOUND_BRADEN_1_4_OPTIONS,
  SKIN_WOUND_BRADEN_FRICTION_SHEAR_OPTIONS,
  SKIN_WOUND_BRADEN_RISK_LEVEL_OPTIONS,
  SKIN_WOUND_CHANGE_STATUS_OPTIONS,
  SKIN_WOUND_DRAINAGE_OPTIONS,
  SKIN_WOUND_INCISION_TYPE_OPTIONS,
  SKIN_WOUND_MASD_SEVERITY_OPTIONS,
  SKIN_WOUND_MASD_SOURCE_OPTIONS,
  SKIN_WOUND_OSTOMY_TYPE_OPTIONS,
  SKIN_WOUND_PRESSURE_INJURY_LOCATION_OPTIONS,
  SKIN_WOUND_PRESSURE_INJURY_STAGE_OPTIONS,
  SKIN_WOUND_SKIN_STATUS_OPTIONS,
  SKIN_WOUND_STOMA_APPEARANCE_OPTIONS,
  SKIN_WOUND_TEAR_CATEGORY_OPTIONS,
  SKIN_WOUND_TREATMENT_TYPE_OPTIONS,
  SKIN_WOUND_TRAUMATIC_TYPE_OPTIONS,
  SKIN_WOUND_YES_NO_OPTIONS,
  SURGICAL_WOUND_ASSESSMENT_CARD_ID,
  TRAUMATIC_WOUND_ASSESSMENT_CARD_ID,
  WOUND_PHOTO_REFERENCE_CARD_ID,
  WOUND_REASSESSMENT_CARD_ID,
  WOUND_TREATMENT_DOCUMENTATION_CARD_ID,
  formatClinicalDocumentationOptionLabel,
  validateSkinWoundPressureInjuryDocumentationPayloadForCard,
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

const scoreBannerStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 8,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
};

type YesNo = (typeof SKIN_WOUND_YES_NO_OPTIONS)[number]["value"];

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
  locale: string;
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={SKIN_WOUND_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationSkinWoundForm({
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

  const [skinIntegrity, setSkinIntegrity] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    skinStatus: "INTACT" as (typeof SKIN_WOUND_SKIN_STATUS_OPTIONS)[number]["value"],
    pressureInjuryPresent: "NO" as YesNo,
    woundPresent: "NO" as YesNo,
    skinTearPresent: "NO" as YesNo,
    masdPresent: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [braden, setBraden] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    sensoryPerception: 4,
    moisture: 4,
    activity: 4,
    mobility: 4,
    nutrition: 4,
    frictionShear: 3,
    preventionPlanReviewed: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const bradenScore = useMemo(() => calculateBradenScore(braden), [braden]);
  const bradenRiskLevel = useMemo(() => deriveBradenRiskLevel(bradenScore), [bradenScore]);
  const bradenRiskLabel = useMemo(() => {
    const opt = SKIN_WOUND_BRADEN_RISK_LEVEL_OPTIONS.find((o) => o.value === bradenRiskLevel);
    return opt ? formatClinicalDocumentationOptionLabel(opt, locale) : bradenRiskLevel;
  }, [bradenRiskLevel, locale]);

  const [pressureInjury, setPressureInjury] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    location: "SACRUM" as (typeof SKIN_WOUND_PRESSURE_INJURY_LOCATION_OPTIONS)[number]["value"],
    stage: "STAGE_1" as (typeof SKIN_WOUND_PRESSURE_INJURY_STAGE_OPTIONS)[number]["value"],
    lengthCm: "",
    widthCm: "",
    depthCm: "",
    drainagePresent: "NO" as YesNo,
    infectionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [pressureInjuryReassessment, setPressureInjuryReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    existingPressureInjuryLocation: "",
    status: "UNCHANGED" as (typeof SKIN_WOUND_CHANGE_STATUS_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [surgicalWound, setSurgicalWound] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    incisionType: "CLOSED" as (typeof SKIN_WOUND_INCISION_TYPE_OPTIONS)[number]["value"],
    approximation: "WELL_APPROXIMATED" as (typeof SKIN_WOUND_APPROXIMATION_OPTIONS)[number]["value"],
    drainage: "NONE" as (typeof SKIN_WOUND_DRAINAGE_OPTIONS)[number]["value"],
    infectionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [traumaticWound, setTraumaticWound] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    woundType: "LACERATION" as (typeof SKIN_WOUND_TRAUMATIC_TYPE_OPTIONS)[number]["value"],
    drainage: "NONE" as (typeof SKIN_WOUND_DRAINAGE_OPTIONS)[number]["value"],
    infectionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [skinTear, setSkinTear] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    tearCategory: "CATEGORY_1" as (typeof SKIN_WOUND_TEAR_CATEGORY_OPTIONS)[number]["value"],
    bleedingPresent: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [masd, setMasd] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    source: "INCONTINENCE" as (typeof SKIN_WOUND_MASD_SOURCE_OPTIONS)[number]["value"],
    severity: "MILD" as (typeof SKIN_WOUND_MASD_SEVERITY_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [ostomy, setOstomy] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    ostomyType: "COLOSTOMY" as (typeof SKIN_WOUND_OSTOMY_TYPE_OPTIONS)[number]["value"],
    stomaAppearance: "PINK" as (typeof SKIN_WOUND_STOMA_APPEARANCE_OPTIONS)[number]["value"],
    outputPresent: "YES" as YesNo,
    skinIntact: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [treatment, setTreatment] = useState({
    treatmentTime: nowLocalDatetimeValue(),
    treatmentType: "DRESSING_CHANGE" as (typeof SKIN_WOUND_TREATMENT_TYPE_OPTIONS)[number]["value"],
    tolerated: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [photoRef, setPhotoRef] = useState({
    documentedAt: nowLocalDatetimeValue(),
    photoObtained: "NO" as YesNo,
    photoReferenceId: "",
    patientConsentVerified: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [woundReassessment, setWoundReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    status: "UNCHANGED" as (typeof SKIN_WOUND_CHANGE_STATUS_OPTIONS)[number]["value"],
    drainageChanged: "NO" as YesNo,
    infectionConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  function optionalNum(s: string): number | undefined {
    const trimmed = s.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case SKIN_INTEGRITY_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(skinIntegrity.assessmentTime),
          skinStatus: skinIntegrity.skinStatus,
          pressureInjuryPresent: skinIntegrity.pressureInjuryPresent,
          woundPresent: skinIntegrity.woundPresent,
          skinTearPresent: skinIntegrity.skinTearPresent,
          masdPresent: skinIntegrity.masdPresent,
          providerNotified: skinIntegrity.providerNotified,
          notes: skinIntegrity.notes.trim() || undefined,
        };
      case BRADEN_RISK_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(braden.assessmentTime),
          sensoryPerception: braden.sensoryPerception,
          moisture: braden.moisture,
          activity: braden.activity,
          mobility: braden.mobility,
          nutrition: braden.nutrition,
          frictionShear: braden.frictionShear,
          totalScore: bradenScore,
          riskLevel: bradenRiskLevel,
          preventionPlanReviewed: braden.preventionPlanReviewed,
          providerNotified: braden.providerNotified,
          notes: braden.notes.trim() || undefined,
        };
      case PRESSURE_INJURY_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(pressureInjury.assessmentTime),
          location: pressureInjury.location,
          stage: pressureInjury.stage,
          ...(optionalNum(pressureInjury.lengthCm) !== undefined
            ? { lengthCm: optionalNum(pressureInjury.lengthCm) }
            : {}),
          ...(optionalNum(pressureInjury.widthCm) !== undefined
            ? { widthCm: optionalNum(pressureInjury.widthCm) }
            : {}),
          ...(optionalNum(pressureInjury.depthCm) !== undefined
            ? { depthCm: optionalNum(pressureInjury.depthCm) }
            : {}),
          drainagePresent: pressureInjury.drainagePresent,
          infectionConcern: pressureInjury.infectionConcern,
          providerNotified: pressureInjury.providerNotified,
          notes: pressureInjury.notes.trim() || undefined,
        };
      case PRESSURE_INJURY_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(pressureInjuryReassessment.assessmentTime),
          existingPressureInjuryLocation: pressureInjuryReassessment.existingPressureInjuryLocation.trim(),
          status: pressureInjuryReassessment.status,
          providerNotified: pressureInjuryReassessment.providerNotified,
          notes: pressureInjuryReassessment.notes.trim() || undefined,
        };
      case SURGICAL_WOUND_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(surgicalWound.assessmentTime),
          incisionType: surgicalWound.incisionType,
          approximation: surgicalWound.approximation,
          drainage: surgicalWound.drainage,
          infectionConcern: surgicalWound.infectionConcern,
          providerNotified: surgicalWound.providerNotified,
          notes: surgicalWound.notes.trim() || undefined,
        };
      case TRAUMATIC_WOUND_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(traumaticWound.assessmentTime),
          woundType: traumaticWound.woundType,
          drainage: traumaticWound.drainage,
          infectionConcern: traumaticWound.infectionConcern,
          providerNotified: traumaticWound.providerNotified,
          notes: traumaticWound.notes.trim() || undefined,
        };
      case SKIN_TEAR_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(skinTear.assessmentTime),
          tearCategory: skinTear.tearCategory,
          bleedingPresent: skinTear.bleedingPresent,
          providerNotified: skinTear.providerNotified,
          notes: skinTear.notes.trim() || undefined,
        };
      case MASD_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(masd.assessmentTime),
          source: masd.source,
          severity: masd.severity,
          providerNotified: masd.providerNotified,
          notes: masd.notes.trim() || undefined,
        };
      case OSTOMY_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(ostomy.assessmentTime),
          ostomyType: ostomy.ostomyType,
          stomaAppearance: ostomy.stomaAppearance,
          outputPresent: ostomy.outputPresent,
          skinIntact: ostomy.skinIntact,
          providerNotified: ostomy.providerNotified,
          notes: ostomy.notes.trim() || undefined,
        };
      case WOUND_TREATMENT_DOCUMENTATION_CARD_ID:
        return {
          treatmentTime: toIsoFromLocalDatetime(treatment.treatmentTime),
          treatmentType: treatment.treatmentType,
          tolerated: treatment.tolerated,
          providerNotified: treatment.providerNotified,
          notes: treatment.notes.trim() || undefined,
        };
      case WOUND_PHOTO_REFERENCE_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(photoRef.documentedAt),
          photoObtained: photoRef.photoObtained,
          ...(photoRef.photoObtained === "YES"
            ? {
                photoReferenceId: photoRef.photoReferenceId.trim(),
                patientConsentVerified: photoRef.patientConsentVerified,
              }
            : {}),
          providerNotified: photoRef.providerNotified,
          notes: photoRef.notes.trim() || undefined,
        };
      case WOUND_REASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(woundReassessment.assessmentTime),
          status: woundReassessment.status,
          drainageChanged: woundReassessment.drainageChanged,
          infectionConcern: woundReassessment.infectionConcern,
          providerNotified: woundReassessment.providerNotified,
          notes: woundReassessment.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateSkinWoundPressureInjuryDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.skinWound.validationError"));
      return;
    }
    await onSubmit(validated.data);
  }

  function NotesField({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <label style={{ gridColumn: "1 / -1" }}>
        <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.notes")}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }}
        />
      </label>
    );
  }

  function renderFields() {
    switch (cardId) {
      case SKIN_INTEGRITY_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={skinIntegrity.assessmentTime}
                onChange={(e) => setSkinIntegrity((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
                data-testid="skin-integrity-assessment-time"
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.skinStatus")}
              value={skinIntegrity.skinStatus}
              options={SKIN_WOUND_SKIN_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, skinStatus: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.pressureInjuryPresent")}
              value={skinIntegrity.pressureInjuryPresent}
              locale={locale}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, pressureInjuryPresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.woundPresent")}
              value={skinIntegrity.woundPresent}
              locale={locale}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, woundPresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.skinTearPresent")}
              value={skinIntegrity.skinTearPresent}
              locale={locale}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, skinTearPresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.masdPresent")}
              value={skinIntegrity.masdPresent}
              locale={locale}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, masdPresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={skinIntegrity.providerNotified}
              locale={locale}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={skinIntegrity.notes}
              onChange={(v) => setSkinIntegrity((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case BRADEN_RISK_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={braden.assessmentTime}
                onChange={(e) => setBraden((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
                data-testid="braden-assessment-time"
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.sensoryPerception")}
              value={braden.sensoryPerception}
              options={SKIN_WOUND_BRADEN_1_4_OPTIONS}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, sensoryPerception: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.moisture")}
              value={braden.moisture}
              options={SKIN_WOUND_BRADEN_1_4_OPTIONS}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, moisture: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.activity")}
              value={braden.activity}
              options={SKIN_WOUND_BRADEN_1_4_OPTIONS}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, activity: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.mobility")}
              value={braden.mobility}
              options={SKIN_WOUND_BRADEN_1_4_OPTIONS}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, mobility: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.nutrition")}
              value={braden.nutrition}
              options={SKIN_WOUND_BRADEN_1_4_OPTIONS}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, nutrition: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.frictionShear")}
              value={braden.frictionShear}
              options={SKIN_WOUND_BRADEN_FRICTION_SHEAR_OPTIONS}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, frictionShear: v }))}
            />
            <p style={scoreBannerStyle} data-testid="braden-calculated">
              {t("clinicalDocumentation.forms.skinWound.bradenTotalScore")}: {bradenScore} —{" "}
              {t("clinicalDocumentation.forms.skinWound.bradenRiskLevel")}: {bradenRiskLabel}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.preventionPlanReviewed")}
              value={braden.preventionPlanReviewed}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, preventionPlanReviewed: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={braden.providerNotified}
              locale={locale}
              onChange={(v) => setBraden((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={braden.notes} onChange={(v) => setBraden((s) => ({ ...s, notes: v }))} />
          </>
        );
      case PRESSURE_INJURY_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={pressureInjury.assessmentTime}
                onChange={(e) => setPressureInjury((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.location")}
              value={pressureInjury.location}
              options={SKIN_WOUND_PRESSURE_INJURY_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setPressureInjury((s) => ({ ...s, location: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.stage")}
              value={pressureInjury.stage}
              options={SKIN_WOUND_PRESSURE_INJURY_STAGE_OPTIONS}
              locale={locale}
              onChange={(v) => setPressureInjury((s) => ({ ...s, stage: v }))}
            />
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.lengthCm")}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={pressureInjury.lengthCm}
                onChange={(e) => setPressureInjury((s) => ({ ...s, lengthCm: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.widthCm")}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={pressureInjury.widthCm}
                onChange={(e) => setPressureInjury((s) => ({ ...s, widthCm: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.depthCm")}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={pressureInjury.depthCm}
                onChange={(e) => setPressureInjury((s) => ({ ...s, depthCm: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.drainagePresent")}
              value={pressureInjury.drainagePresent}
              locale={locale}
              onChange={(v) => setPressureInjury((s) => ({ ...s, drainagePresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.infectionConcern")}
              value={pressureInjury.infectionConcern}
              locale={locale}
              onChange={(v) => setPressureInjury((s) => ({ ...s, infectionConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={pressureInjury.providerNotified}
              locale={locale}
              onChange={(v) => setPressureInjury((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={pressureInjury.notes}
              onChange={(v) => setPressureInjury((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case PRESSURE_INJURY_REASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={pressureInjuryReassessment.assessmentTime}
                onChange={(e) =>
                  setPressureInjuryReassessment((s) => ({ ...s, assessmentTime: e.target.value }))
                }
                style={fieldStyle}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>
                {t("clinicalDocumentation.forms.skinWound.existingPressureInjuryLocation")}
              </span>
              <input
                type="text"
                value={pressureInjuryReassessment.existingPressureInjuryLocation}
                onChange={(e) =>
                  setPressureInjuryReassessment((s) => ({
                    ...s,
                    existingPressureInjuryLocation: e.target.value,
                  }))
                }
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.status")}
              value={pressureInjuryReassessment.status}
              options={SKIN_WOUND_CHANGE_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPressureInjuryReassessment((s) => ({ ...s, status: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={pressureInjuryReassessment.providerNotified}
              locale={locale}
              onChange={(v) => setPressureInjuryReassessment((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={pressureInjuryReassessment.notes}
              onChange={(v) => setPressureInjuryReassessment((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case SURGICAL_WOUND_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={surgicalWound.assessmentTime}
                onChange={(e) => setSurgicalWound((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.incisionType")}
              value={surgicalWound.incisionType}
              options={SKIN_WOUND_INCISION_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setSurgicalWound((s) => ({ ...s, incisionType: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.approximation")}
              value={surgicalWound.approximation}
              options={SKIN_WOUND_APPROXIMATION_OPTIONS}
              locale={locale}
              onChange={(v) => setSurgicalWound((s) => ({ ...s, approximation: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.drainage")}
              value={surgicalWound.drainage}
              options={SKIN_WOUND_DRAINAGE_OPTIONS}
              locale={locale}
              onChange={(v) => setSurgicalWound((s) => ({ ...s, drainage: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.infectionConcern")}
              value={surgicalWound.infectionConcern}
              locale={locale}
              onChange={(v) => setSurgicalWound((s) => ({ ...s, infectionConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={surgicalWound.providerNotified}
              locale={locale}
              onChange={(v) => setSurgicalWound((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={surgicalWound.notes}
              onChange={(v) => setSurgicalWound((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case TRAUMATIC_WOUND_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={traumaticWound.assessmentTime}
                onChange={(e) => setTraumaticWound((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.woundType")}
              value={traumaticWound.woundType}
              options={SKIN_WOUND_TRAUMATIC_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setTraumaticWound((s) => ({ ...s, woundType: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.drainage")}
              value={traumaticWound.drainage}
              options={SKIN_WOUND_DRAINAGE_OPTIONS}
              locale={locale}
              onChange={(v) => setTraumaticWound((s) => ({ ...s, drainage: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.infectionConcern")}
              value={traumaticWound.infectionConcern}
              locale={locale}
              onChange={(v) => setTraumaticWound((s) => ({ ...s, infectionConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={traumaticWound.providerNotified}
              locale={locale}
              onChange={(v) => setTraumaticWound((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={traumaticWound.notes}
              onChange={(v) => setTraumaticWound((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case SKIN_TEAR_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={skinTear.assessmentTime}
                onChange={(e) => setSkinTear((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.tearCategory")}
              value={skinTear.tearCategory}
              options={SKIN_WOUND_TEAR_CATEGORY_OPTIONS}
              locale={locale}
              onChange={(v) => setSkinTear((s) => ({ ...s, tearCategory: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.bleedingPresent")}
              value={skinTear.bleedingPresent}
              locale={locale}
              onChange={(v) => setSkinTear((s) => ({ ...s, bleedingPresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={skinTear.providerNotified}
              locale={locale}
              onChange={(v) => setSkinTear((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={skinTear.notes} onChange={(v) => setSkinTear((s) => ({ ...s, notes: v }))} />
          </>
        );
      case MASD_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={masd.assessmentTime}
                onChange={(e) => setMasd((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.masdSource")}
              value={masd.source}
              options={SKIN_WOUND_MASD_SOURCE_OPTIONS}
              locale={locale}
              onChange={(v) => setMasd((s) => ({ ...s, source: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.masdSeverity")}
              value={masd.severity}
              options={SKIN_WOUND_MASD_SEVERITY_OPTIONS}
              locale={locale}
              onChange={(v) => setMasd((s) => ({ ...s, severity: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={masd.providerNotified}
              locale={locale}
              onChange={(v) => setMasd((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={masd.notes} onChange={(v) => setMasd((s) => ({ ...s, notes: v }))} />
          </>
        );
      case OSTOMY_ASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={ostomy.assessmentTime}
                onChange={(e) => setOstomy((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.ostomyType")}
              value={ostomy.ostomyType}
              options={SKIN_WOUND_OSTOMY_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setOstomy((s) => ({ ...s, ostomyType: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.stomaAppearance")}
              value={ostomy.stomaAppearance}
              options={SKIN_WOUND_STOMA_APPEARANCE_OPTIONS}
              locale={locale}
              onChange={(v) => setOstomy((s) => ({ ...s, stomaAppearance: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.outputPresent")}
              value={ostomy.outputPresent}
              locale={locale}
              onChange={(v) => setOstomy((s) => ({ ...s, outputPresent: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.skinIntact")}
              value={ostomy.skinIntact}
              locale={locale}
              onChange={(v) => setOstomy((s) => ({ ...s, skinIntact: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={ostomy.providerNotified}
              locale={locale}
              onChange={(v) => setOstomy((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={ostomy.notes} onChange={(v) => setOstomy((s) => ({ ...s, notes: v }))} />
          </>
        );
      case WOUND_TREATMENT_DOCUMENTATION_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.treatmentTime")}</span>
              <input
                type="datetime-local"
                value={treatment.treatmentTime}
                onChange={(e) => setTreatment((s) => ({ ...s, treatmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.treatmentType")}
              value={treatment.treatmentType}
              options={SKIN_WOUND_TREATMENT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setTreatment((s) => ({ ...s, treatmentType: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.tolerated")}
              value={treatment.tolerated}
              locale={locale}
              onChange={(v) => setTreatment((s) => ({ ...s, tolerated: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={treatment.providerNotified}
              locale={locale}
              onChange={(v) => setTreatment((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={treatment.notes} onChange={(v) => setTreatment((s) => ({ ...s, notes: v }))} />
          </>
        );
      case WOUND_PHOTO_REFERENCE_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.documentedAt")}</span>
              <input
                type="datetime-local"
                value={photoRef.documentedAt}
                onChange={(e) => setPhotoRef((s) => ({ ...s, documentedAt: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.photoObtained")}
              value={photoRef.photoObtained}
              locale={locale}
              onChange={(v) => setPhotoRef((s) => ({ ...s, photoObtained: v }))}
            />
            {photoRef.photoObtained === "YES" ? (
              <>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>
                    {t("clinicalDocumentation.forms.skinWound.photoReferenceId")}
                  </span>
                  <input
                    type="text"
                    value={photoRef.photoReferenceId}
                    onChange={(e) => setPhotoRef((s) => ({ ...s, photoReferenceId: e.target.value }))}
                    style={fieldStyle}
                    data-testid="wound-photo-reference-id"
                  />
                </label>
                <YesNoField
                  label={t("clinicalDocumentation.forms.skinWound.patientConsentVerified")}
                  value={photoRef.patientConsentVerified}
                  locale={locale}
                  onChange={(v) => setPhotoRef((s) => ({ ...s, patientConsentVerified: v }))}
                />
              </>
            ) : null}
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={photoRef.providerNotified}
              locale={locale}
              onChange={(v) => setPhotoRef((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={photoRef.notes} onChange={(v) => setPhotoRef((s) => ({ ...s, notes: v }))} />
          </>
        );
      case WOUND_REASSESSMENT_CARD_ID:
        return (
          <>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.skinWound.assessmentTime")}</span>
              <input
                type="datetime-local"
                value={woundReassessment.assessmentTime}
                onChange={(e) => setWoundReassessment((s) => ({ ...s, assessmentTime: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.skinWound.status")}
              value={woundReassessment.status}
              options={SKIN_WOUND_CHANGE_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setWoundReassessment((s) => ({ ...s, status: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.drainageChanged")}
              value={woundReassessment.drainageChanged}
              locale={locale}
              onChange={(v) => setWoundReassessment((s) => ({ ...s, drainageChanged: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.infectionConcern")}
              value={woundReassessment.infectionConcern}
              locale={locale}
              onChange={(v) => setWoundReassessment((s) => ({ ...s, infectionConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.skinWound.providerNotified")}
              value={woundReassessment.providerNotified}
              locale={locale}
              onChange={(v) => setWoundReassessment((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={woundReassessment.notes}
              onChange={(v) => setWoundReassessment((s) => ({ ...s, notes: v }))}
            />
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
      data-testid="clinical-documentation-skin-wound-form"
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
          background: saving ? "#99f6e4" : "#0f766e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </form>
  );
}

export function isEdoc20SkinWoundPressureInjuryDocumentationFormCard(cardId: string): boolean {
  return (EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}
