/**
 * MEDUI.INP.2B — Rapid controls for nursing admission sections.
 * Persists stable codes into section answers (not localized labels).
 * No silent clinical defaults.
 */

"use client";

import {
  ADMISSION_SOURCE_RAPID_OPTIONS,
  CONDITION_ON_ARRIVAL_RAPID_OPTIONS,
  FALL_PRECAUTION_OPTIONS,
  GENERAL_APPEARANCE_OPTIONS,
  IMMEDIATE_CONCERN_OPTIONS,
  LIVING_SITUATION_RAPID_OPTIONS,
  LOC_OPTIONS,
  MODE_OF_ARRIVAL_RAPID_OPTIONS,
  MOBILITY_CURRENT_OPTIONS,
  ORIENTATION_PRESETS,
  PAIN_PRESENCE_OPTIONS,
  PRE_ADMISSION_RESIDENCE_RAPID_OPTIONS,
  REVIEW_STATUS_RAPID_OPTIONS,
  SKIN_BASELINE_RAPID_OPTIONS,
  type ClinicalRapidOptionV1,
  type InpatientAdmissionClinicalSection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalConditionalText,
  ClinicalMultiSelectChips,
  ClinicalSingleSelect,
  ClinicalYesNoUnknown,
} from "./ClinicalRapidControls";
import { AdditionalClinicalDocumentationLauncher } from "./AdditionalClinicalDocumentationLauncher";

function asCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asCode(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function NursingAdmissionRapidSectionControls({
  sectionId,
  answers,
  readOnly,
  onChange,
  onOpenBelongingsDetail,
}: {
  sectionId: InpatientAdmissionClinicalSection;
  answers: Record<string, unknown>;
  readOnly?: boolean;
  onChange: (answers: Record<string, unknown>) => void;
  onOpenBelongingsDetail?: () => void;
}) {
  const { t } = useI18n();
  const set = (key: string, value: unknown) => onChange({ ...answers, [key]: value });

  if (sectionId === "OVERVIEW") {
    return (
      <div data-testid="rapid-overview-arrival" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.admissionSource")}
          options={ADMISSION_SOURCE_RAPID_OPTIONS}
          value={asCode(answers.admissionSource)}
          onChange={(next) => set("admissionSource", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b.rapid.otherDetail")}
          value={typeof answers.admissionSourceOther === "string" ? answers.admissionSourceOther : ""}
          onChange={(v) => set("admissionSourceOther", v)}
          visible={asCode(answers.admissionSource) === "OTHER"}
          disabled={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.modeOfArrival")}
          options={MODE_OF_ARRIVAL_RAPID_OPTIONS}
          value={asCode(answers.modeOfArrival)}
          onChange={(next) => set("modeOfArrival", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b.rapid.otherDetail")}
          value={typeof answers.modeOfArrivalOther === "string" ? answers.modeOfArrivalOther : ""}
          onChange={(v) => set("modeOfArrivalOther", v)}
          visible={asCode(answers.modeOfArrival) === "OTHER"}
          disabled={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.conditionOnArrival")}
          options={CONDITION_ON_ARRIVAL_RAPID_OPTIONS}
          value={asCode(answers.conditionOnArrival)}
          onChange={(next) => set("conditionOnArrival", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b.rapid.interpreterNeeded")}
          value={(asCode(answers.interpreterNeeded) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("interpreterNeeded", next)}
          readOnly={readOnly}
        />
        <AdditionalClinicalDocumentationLauncher role="NURSING" encounterType="INPATIENT" compact />
      </div>
    );
  }

  if (sectionId === "NURSING_ADMISSION_ASSESSMENT") {
    return (
      <div data-testid="rapid-nursing-assessment" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalMultiSelectChips
          label={t("inpatientRapidConvergenceD4a27c.rapid.appearance")}
          options={GENERAL_APPEARANCE_OPTIONS}
          value={asCodes(answers.generalAppearance)}
          onChange={(next) => set("generalAppearance", next)}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.loc")}
          options={LOC_OPTIONS}
          value={asCode(answers.levelOfConsciousness)}
          onChange={(next) => set("levelOfConsciousness", next)}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.orientation")}
          options={ORIENTATION_PRESETS}
          value={asCode(answers.orientation)}
          onChange={(next) => set("orientation", next)}
          readOnly={readOnly}
        />
        <ClinicalMultiSelectChips
          label={t("inpatientRapidConvergenceD4a27c.rapid.concerns")}
          options={IMMEDIATE_CONCERN_OPTIONS}
          value={asCodes(answers.immediateConcerns)}
          onChange={(next) => set("immediateConcerns", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientRapidConvergenceD4a27c.exceptionDetail")}
          value={typeof answers.rapidConcernsComment === "string" ? answers.rapidConcernsComment : ""}
          onChange={(v) => set("rapidConcernsComment", v)}
          visible={asCodes(answers.immediateConcerns).includes("OTHER")}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "PAIN") {
    const pain = asCode(answers.rapidPainPresence);
    return (
      <div data-testid="rapid-pain" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.painPresence")}
          options={PAIN_PRESENCE_OPTIONS}
          value={pain}
          onChange={(next) => set("rapidPainPresence", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientRapidConvergenceD4a27c.terminology.painPresent")}
          value={typeof answers.rapidPainDetail === "string" ? answers.rapidPainDetail : ""}
          onChange={(v) => set("rapidPainDetail", v)}
          visible={pain === "PAIN_PRESENT"}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "MEDICAL_HISTORY") {
    return (
      <div data-testid="rapid-history-review" style={{ marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.historyReviewed")}
          options={REVIEW_STATUS_RAPID_OPTIONS}
          value={asCode(answers.rapidHistoryReviewed)}
          onChange={(next) => set("rapidHistoryReviewed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "ALLERGIES") {
    return (
      <div data-testid="rapid-allergy-review" style={{ marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.allergyReviewed")}
          options={REVIEW_STATUS_RAPID_OPTIONS}
          value={asCode(answers.rapidAllergyReviewed)}
          onChange={(next) => set("rapidAllergyReviewed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "HOME_MEDICATIONS") {
    return (
      <div data-testid="rapid-homemed-review" style={{ marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.homeMedReviewed")}
          options={REVIEW_STATUS_RAPID_OPTIONS}
          value={asCode(answers.rapidHomeMedReviewed)}
          onChange={(next) => set("rapidHomeMedReviewed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "FALL_SAFETY") {
    return (
      <div data-testid="rapid-fall" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalMultiSelectChips
          label={t("inpatientRapidConvergenceD4a27c.rapid.fallPrecautions")}
          options={FALL_PRECAUTION_OPTIONS}
          value={asCodes(answers.rapidFallPrecautions)}
          onChange={(next) => set("rapidFallPrecautions", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "FUNCTIONAL_MOBILITY") {
    return (
      <div data-testid="rapid-mobility" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.mobility")}
          options={MOBILITY_CURRENT_OPTIONS}
          value={asCode(answers.rapidMobility)}
          onChange={(next) => set("rapidMobility", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "SKIN_WOUND") {
    return (
      <div data-testid="rapid-skin" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.skinBaseline")}
          options={SKIN_BASELINE_RAPID_OPTIONS}
          value={asCode(answers.rapidSkinStatus)}
          onChange={(next) => set("rapidSkinStatus", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b.rapid.otherDetail")}
          value={typeof answers.rapidSkinOther === "string" ? answers.rapidSkinOther : ""}
          onChange={(v) => set("rapidSkinOther", v)}
          visible={asCode(answers.rapidSkinStatus) === "OTHER"}
          disabled={readOnly}
        />
        <AdditionalClinicalDocumentationLauncher role="NURSING" encounterType="INPATIENT" compact />
      </div>
    );
  }

  if (sectionId === "NUTRITION") {
    return (
      <div data-testid="rapid-nutrition" style={{ marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.nutrition")}
          value={(asCode(answers.rapidNutritionOk) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidNutritionOk", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "ELIMINATION") {
    return (
      <div data-testid="rapid-elimination" style={{ marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.elimination")}
          value={(asCode(answers.rapidEliminationOk) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidEliminationOk", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "PSYCHOSOCIAL") {
    return (
      <div data-testid="rapid-psychosocial" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.livingSituation")}
          options={LIVING_SITUATION_RAPID_OPTIONS}
          value={asCode(answers.rapidLivingSituation)}
          onChange={(next) => set("rapidLivingSituation", next)}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.preAdmissionResidence")}
          options={PRE_ADMISSION_RESIDENCE_RAPID_OPTIONS}
          value={asCode(answers.rapidPreAdmissionResidence)}
          onChange={(next) => set("rapidPreAdmissionResidence", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b.rapid.socialWorkNeed")}
          value={(asCode(answers.rapidSocialWorkNeed) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidSocialWorkNeed", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b.rapid.caseManagementNeed")}
          value={(asCode(answers.rapidCaseManagementNeed) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidCaseManagementNeed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "BELONGINGS_VALUABLES") {
    return (
      <div data-testid="rapid-belongings" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.belongingsSummary")}
          value={(asCode(answers.rapidBelongingsPresent) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidBelongingsPresent", next)}
          readOnly={readOnly}
        />
        <button
          type="button"
          onClick={onOpenBelongingsDetail}
          style={{
            justifySelf: "start",
            fontSize: 12,
            fontWeight: 600,
            padding: "7px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            cursor: "pointer",
          }}
          data-testid="open-detailed-belongings"
        >
          {t("inpatientRapidConvergenceD4a27c.rapid.openBelongings")}
        </button>
      </div>
    );
  }

  if (sectionId === "LINES_DRAINS_DEVICES") {
    return (
      <div data-testid="rapid-devices" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.devicesConfirm")}
          value={(asCode(answers.rapidDevicesConfirmed) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidDevicesConfirmed", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientRapidConvergenceD4a27c.rapid.devicesAdd")}
          value={typeof answers.rapidDevicesAddNote === "string" ? answers.rapidDevicesAddNote : ""}
          onChange={(v) => set("rapidDevicesAddNote", v)}
          visible={asCode(answers.rapidDevicesConfirmed) === "NO"}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "PROVIDER_ADMISSION" || sectionId === "EDUCATION_COMMUNICATION") {
    return (
      <div style={{ marginBottom: 10 }} data-testid="admission-additional-docs-slot">
        <AdditionalClinicalDocumentationLauncher role="NURSING" encounterType="INPATIENT" compact />
      </div>
    );
  }

  return null;
}
