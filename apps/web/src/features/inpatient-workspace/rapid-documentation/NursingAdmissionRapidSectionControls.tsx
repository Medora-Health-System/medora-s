/**
 * D4A.2.7C — Rapid controls for highest-burden nursing admission sections.
 * Persists stable codes into section answers (not localized labels).
 */

"use client";

import {
  FALL_PRECAUTION_OPTIONS,
  GENERAL_APPEARANCE_OPTIONS,
  IMMEDIATE_CONCERN_OPTIONS,
  LOC_OPTIONS,
  MOBILITY_CURRENT_OPTIONS,
  ORIENTATION_PRESETS,
  PAIN_PRESENCE_OPTIONS,
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

  if (
    sectionId === "OVERVIEW" ||
    sectionId === "PROVIDER_ADMISSION" ||
    sectionId === "SKIN_WOUND" ||
    sectionId === "EDUCATION_COMMUNICATION"
  ) {
    return (
      <div style={{ marginBottom: 10 }} data-testid="admission-additional-docs-slot">
        <AdditionalClinicalDocumentationLauncher role="NURSING" encounterType="INPATIENT" compact />
      </div>
    );
  }

  return null;
}
