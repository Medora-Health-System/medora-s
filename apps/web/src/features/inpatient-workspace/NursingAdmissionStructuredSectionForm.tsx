"use client";

/**
 * MEDUI.INP.2B — Structured admission section form.
 * Help tips only for clinically/legally necessary fields (not routine labels).
 */

import { useState, type CSSProperties } from "react";
import {
  NURSING_ADMISSION_OPTION_CATALOGS,
  fieldIsVisible,
  nursingSectionSchema,
  type InpatientAdmissionClinicalSection,
  type NursingSectionFieldDef,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { NursingAdmissionRapidSectionControls } from "./rapid-documentation/NursingAdmissionRapidSectionControls";
import {
  resolveNursingAdmissionFieldLabel,
  resolveNursingAdmissionOptionLabel,
} from "./nursingAdmissionOptionI18n";

/** Free-text forks superseded by enterprise clinical-ops projections. */
const SUPPRESSED_ENTERPRISE_FORK_FIELDS = new Set(["codeStatus", "isolationStatus"]);

/** Clinically/legally necessary help only — not routine field labels. */
const CLINICAL_HELP_FIELD_KEYS = new Set([
  "advanceDirectiveKnown",
  "suicidalIdeationScreen",
  "abuseNeglectConcern",
  "aspirationRisk",
  "elopementRisk",
]);

const CHIP_EDITOR_FIELDS = new Set([
  "generalAppearance",
  "levelOfConsciousness",
  "orientation",
  "immediateConcerns",
]);

const RAPID_SUPPRESSED_GENERIC_FIELDS = new Set([
  "admissionSource",
  "modeOfArrival",
  "conditionOnArrival",
  "interpreterNeeded",
  "arrivalAt",
  "immediateConcerns",
  "sourceReportReceived",
  "handoffReceivedFrom",
  "handoffMethod",
  "handoffAt",
  "discrepanciesNoted",
  "followUpRequired",
  "twoIdentifiersVerified",
  "wristbandPresent",
  "wristbandCorrect",
  "allergyBandPresent",
  "fallRiskBandPresent",
  "patientConfirmsIdentity",
  "discrepancyFound",
  "registrationCorrectionRequested",
  "rapidHistoryReviewed",
  "rapidAllergyReviewed",
  "rapidHomeMedReviewed",
  "rapidSkinStatus",
  "rapidSocialWorkNeed",
  "rapidCaseManagementNeed",
  "rapidPreAdmissionResidence",
  "rapidPainPresence",
  "painPresent",
  "score",
  "location",
  "rapidFallPrecautions",
  "precautionsInitiated",
  "fallPriorMonths",
  "gaitImpairment",
  "dizziness",
  "confusion",
  "sedatingMedication",
  "elopementRisk",
  "suicideSelfHarmConcern",
  "aspirationRisk",
  "rapidMobility",
  "currentMobility",
  "baselineMobility",
  "transferAbility",
  "rapidNutritionOk",
  "swallowingDifficulty",
  "npoStatus",
  "rapidEliminationOk",
  "ioMonitoringRequired",
  "rapidBelongingsPresent",
  "inventoryReviewed",
  "valuablesPresent",
  "rapidDevicesConfirmed",
  "devicesPresent",
  "pressureInjury",
  "openWound",
  "patientDeniesPriorSurgery",
  "assignedUnit",
  "assignedBed",
  "attendingProvider",
  "receivingNurse",
  "comments",
]);

export function isAdmissionChipEditorField(sectionId: InpatientAdmissionClinicalSection, key: string): boolean {
  return sectionId === "NURSING_ADMISSION_ASSESSMENT" && CHIP_EDITOR_FIELDS.has(key);
}

type Props = {
  sectionId: InpatientAdmissionClinicalSection;
  answers: Record<string, unknown>;
  unableReason: string;
  readOnly?: boolean;
  onChange: (answers: Record<string, unknown>) => void;
  onUnableReasonChange: (reason: string) => void;
  assignmentProjection?: {
    unit?: string | null;
    bed?: string | null;
    attending?: string | null;
    receivingNurse?: string | null;
  };
};

function HelpTip({ helpKey }: { helpKey: string }) {
  const { t } = useI18n();
  const text = t(helpKey);
  if (!text || text === helpKey) return null;
  return (
    <button
      type="button"
      title={text}
      aria-label={text}
      style={helpBtn}
      data-testid={`help-${helpKey}`}
    >
      ?
    </button>
  );
}

function FieldControl(props: {
  field: NursingSectionFieldDef;
  value: unknown;
  readOnly?: boolean;
  onChange: (value: unknown) => void;
}) {
  const { t } = useI18n();
  const { field, value, readOnly, onChange } = props;
  const options = field.optionsKey
    ? NURSING_ADMISSION_OPTION_CATALOGS[field.optionsKey] ?? []
    : [];
  const label = resolveNursingAdmissionFieldLabel(t, field.key);
  const showHelp = CLINICAL_HELP_FIELD_KEYS.has(field.key);
  const commonLabel: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 };
  const labelRow = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {label}
      {showHelp ? <HelpTip helpKey={field.helpKey} /> : null}
    </span>
  );

  if (field.control === "textarea") {
    return (
      <label style={commonLabel}>
        {labelRow}
        <textarea
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        />
      </label>
    );
  }

  if (field.control === "number") {
    return (
      <label style={commonLabel}>
        {labelRow}
        <input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        />
      </label>
    );
  }

  if (field.control === "datetime" || field.control === "date") {
    return (
      <label style={commonLabel}>
        {labelRow}
        <input
          type={field.control === "date" ? "date" : "datetime-local"}
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        />
      </label>
    );
  }

  if (
    field.control === "select" ||
    field.control === "radio" ||
    field.control === "yes_no_unknown" ||
    field.control === "presentAbsentUnable"
  ) {
    const opts =
      options.length > 0
        ? options
        : field.control === "yes_no_unknown"
          ? NURSING_ADMISSION_OPTION_CATALOGS.yesNoUnknown
          : field.control === "presentAbsentUnable"
            ? NURSING_ADMISSION_OPTION_CATALOGS.presentAbsentUnable
            : [];
    return (
      <label style={commonLabel}>
        {labelRow}
        <select
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value || null)}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        >
          <option value="">{t("hospitalAdmissionD4a25.selectPlaceholder")}</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {resolveNursingAdmissionOptionLabel(t, opt)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.control === "multiselect" || field.control === "checkbox") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 8, margin: 0 }}>
        <legend style={{ fontSize: 12, fontWeight: 600, display: "contents" }}>{labelRow}</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} style={{ fontSize: 12, display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={checked}
                  onChange={() => {
                    if (checked) onChange(selected.filter((x) => x !== opt));
                    else onChange([...selected, opt]);
                  }}
                  data-testid={`field-${field.key}-${opt}`}
                />
                {resolveNursingAdmissionOptionLabel(t, opt)}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label style={commonLabel}>
      {labelRow}
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        data-testid={`field-${field.key}`}
      />
    </label>
  );
}

export function NursingAdmissionStructuredSectionForm({
  sectionId,
  answers,
  unableReason,
  readOnly,
  onChange,
  onUnableReasonChange,
  assignmentProjection,
}: Props) {
  const { t } = useI18n();
  const schema = nursingSectionSchema(sectionId);
  const [showUnable, setShowUnable] = useState(Boolean(unableReason.trim()));
  const [showNote, setShowNote] = useState(Boolean(typeof answers.comments === "string" && answers.comments.trim()));

  return (
    <div data-testid={`structured-section-${sectionId}`} style={{ display: "grid", gap: 10 }}>
      {sectionId === "OVERVIEW" && assignmentProjection ? (
        <div
          data-testid="admission-assignment-projection"
          style={{
            padding: 8,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontSize: 12,
          }}
        >
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{t("inpatientAdmissionInp2b2a.assignmentTitle")}</p>
          <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 11 }}>{t("inpatientAdmissionInp2b2a.assignmentHint")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <span>
              {t("inpatientAdmissionInp2b2a.assignedUnit")}: {assignmentProjection.unit || t("inpatientAdmissionInp2b2a.notAssigned")}
            </span>
            <span>
              {t("inpatientAdmissionInp2b2a.assignedBed")}: {assignmentProjection.bed || t("inpatientAdmissionInp2b2a.notAssigned")}
            </span>
            <span>
              {t("inpatientAdmissionInp2b2a.attendingProvider")}: {assignmentProjection.attending || t("inpatientAdmissionInp2b2a.notAssigned")}
            </span>
            <span>
              {t("inpatientAdmissionInp2b2a.receivingNurse")}: {assignmentProjection.receivingNurse || t("inpatientAdmissionInp2b2a.notAssigned")}
            </span>
          </div>
        </div>
      ) : null}
      <NursingAdmissionRapidSectionControls
        sectionId={sectionId}
        answers={answers}
        readOnly={readOnly}
        onChange={onChange}
      />
      {schema.fields.map((field) => {
        if (isAdmissionChipEditorField(sectionId, field.key)) return null;
        if (SUPPRESSED_ENTERPRISE_FORK_FIELDS.has(field.key)) return null;
        if (RAPID_SUPPRESSED_GENERIC_FIELDS.has(field.key)) return null;
        if (field.key === "comments") return null;
        if (
          (sectionId === "OVERVIEW" &&
            ["admissionSource", "modeOfArrival", "conditionOnArrival", "interpreterNeeded", "arrivalAt", "immediateConcerns"].includes(
              field.key,
            )) ||
          (sectionId === "SOURCE_ENCOUNTER_SUMMARY" &&
            ["sourceReportReceived", "handoffReceivedFrom", "handoffMethod", "handoffAt", "discrepanciesNoted", "followUpRequired"].includes(
              field.key,
            )) ||
          (sectionId === "IDENTITY_DEMOGRAPHICS" &&
            [
              "twoIdentifiersVerified",
              "wristbandPresent",
              "wristbandCorrect",
              "allergyBandPresent",
              "fallRiskBandPresent",
              "patientConfirmsIdentity",
              "discrepancyFound",
              "registrationCorrectionRequested",
            ].includes(field.key)) ||
          (sectionId === "MEDICAL_HISTORY" && field.key === "rapidHistoryReviewed") ||
          (sectionId === "ALLERGIES" && field.key === "rapidAllergyReviewed") ||
          (sectionId === "HOME_MEDICATIONS" && field.key === "rapidHomeMedReviewed") ||
          (sectionId === "SKIN_WOUND" && field.key === "rapidSkinStatus") ||
          (sectionId === "PSYCHOSOCIAL" &&
            ["rapidSocialWorkNeed", "rapidCaseManagementNeed", "rapidPreAdmissionResidence", "rapidLivingSituation"].includes(
              field.key,
            )) ||
          (sectionId === "PAIN" && ["painPresent", "score", "location", "rapidPainPresence"].includes(field.key)) ||
          (sectionId === "FALL_SAFETY" &&
            ["fallPriorMonths", "gaitImpairment", "dizziness", "confusion", "sedatingMedication", "elopementRisk", "suicideSelfHarmConcern", "aspirationRisk", "precautionsInitiated"].includes(
              field.key,
            )) ||
          (sectionId === "NURSING_ADMISSION_ASSESSMENT" &&
            ["generalAppearance", "levelOfConsciousness", "orientation", "immediateConcerns", "respiratoryEffort", "immediateSafetyConcern", "painPresent", "nauseaVomiting", "dizziness", "weakness", "shortnessOfBreath", "chestDiscomfort", "acuteNeuroConcern", "urgentProviderNotification", "providerNotified", "notificationTime", "providerResponse"].includes(
              field.key,
            ))
        ) {
          return null;
        }
        if (!fieldIsVisible(field, answers)) return null;
        return (
          <FieldControl
            key={field.key}
            field={field}
            value={answers[field.key]}
            readOnly={readOnly}
            onChange={(value) => onChange({ ...answers, [field.key]: value })}
          />
        );
      })}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          style={disclosureBtn}
          data-testid="admission-add-note"
          onClick={() => setShowNote((v) => !v)}
        >
          {t("inpatientAdmissionInp2b2a.addNote")}
        </button>
        <button
          type="button"
          style={disclosureBtn}
          data-testid="admission-unable-toggle"
          onClick={() => setShowUnable((v) => !v)}
        >
          {t("inpatientAdmissionInp2b2a.unableToComplete")}
        </button>
      </div>
      {showNote ? (
        <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
          {t("hospitalAdmissionD4a25.fields.comments")}
          <textarea
            value={typeof answers.comments === "string" ? answers.comments : ""}
            disabled={readOnly}
            rows={2}
            onChange={(e) => onChange({ ...answers, comments: e.target.value })}
            style={inputStyle}
            data-testid="field-comments-disclosure"
          />
        </label>
      ) : null}
      {showUnable ? (
      <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
        {t("hospitalAdmissionD4a25.unableReason")}
        <textarea
          value={unableReason}
          disabled={readOnly}
          rows={2}
          onChange={(e) => onUnableReasonChange(e.target.value)}
          style={inputStyle}
          data-testid="field-unableReason"
        />
      </label>
      ) : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box",
};

const disclosureBtn: CSSProperties = {
  minHeight: 32,
  padding: "4px 10px",
  borderRadius: 9999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const helpBtn: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  border: "1px solid #94a3b8",
  background: "#f8fafc",
  color: "#475569",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "help",
  padding: 0,
};
