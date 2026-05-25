/**
 * Phase 19Y — provider discharge documentation stored in `dischargeSummaryJson` (no migration).
 */

import { parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import type { DischargeFormState } from "@/lib/encounterDischarge";

export type ProviderDischargeDiagnosisRef = {
  encounterDiagnosisId?: string;
  code: string;
  label: string;
  isPrimary?: boolean;
  educationTemplateId?: string;
};

export type ProviderDischargeFollowUpRow = {
  id: string;
  specialty: string;
  providerOrFacility: string;
  timing: string;
  phone: string;
  address: string;
  comments: string;
};

export type ProviderDischargeMedicationLine = {
  id: string;
  catalogMedicationId?: string;
  displayName: string;
  dose: string;
  frequency: string;
  instructions: string;
};

export type ProviderDischargeDocumentationForm = {
  patientLeftEdAt: string;
  diagnosisRefs: ProviderDischargeDiagnosisRef[];
  description: string;
  diagnosisInstructions: string;
  medicationTreatmentText: string;
  medicationLines: ProviderDischargeMedicationLine[];
  returnPrecautions: string;
  workSchoolNote: string;
  followUpRows: ProviderDischargeFollowUpRow[];
};

export const PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES = [
  "PRIMARY_CARE",
  "CARDIOLOGY",
  "NEPHROLOGY",
  "UROLOGY",
  "ORTHOPEDICS",
  "GENERAL_SURGERY",
  "OBGYN",
  "NEUROLOGY",
  "GASTROENTEROLOGY",
  "PULMONOLOGY",
  "PSYCHIATRY",
  "PEDIATRICS",
  "ENT",
  "OPHTHALMOLOGY",
  "DERMATOLOGY",
  "WOUND_CARE",
  "ED_RECHECK",
] as const;

export type ProviderDischargeFollowUpSpecialty = (typeof PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES)[number];

export const WORK_SCHOOL_QUICK_OPTIONS = [
  "RETURN_TODAY",
  "RETURN_TOMORROW",
  "RETURN_TWO_DAYS",
  "NO_WORK_SCHOOL_UNTIL_CLEARED",
  "ACTIVITY_RESTRICTION",
] as const;

const JSON_KEYS = {
  patientLeftEdAt: "patientLeftEdAt",
  diagnosisRefs: "providerDischargeDiagnosisRefs",
  followUpRows: "providerDischargeFollowUps",
  medicationLines: "providerDischargeMedicationLines",
  documentedAt: "providerDischargeDocumentedAt",
  documentedBy: "providerDischargeDocumentedByDisplayName",
  documentedByTitle: "providerDischargeDocumentedByTitle",
} as const;

export function emptyProviderDischargeDocumentationForm(): ProviderDischargeDocumentationForm {
  return {
    patientLeftEdAt: "",
    diagnosisRefs: [],
    description: "",
    diagnosisInstructions: "",
    medicationTreatmentText: "",
    medicationLines: [],
    returnPrecautions: "",
    workSchoolNote: "",
    followUpRows: [],
  };
}

function readStringArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function readDiagnosisRef(raw: unknown): ProviderDischargeDiagnosisRef | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const code = typeof o.code === "string" ? o.code.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  if (!code && !label) return null;
  return {
    encounterDiagnosisId:
      typeof o.encounterDiagnosisId === "string" ? o.encounterDiagnosisId.trim() : undefined,
    code,
    label: label || code,
    isPrimary: o.isPrimary === true,
    educationTemplateId:
      typeof o.educationTemplateId === "string" ? o.educationTemplateId.trim() : undefined,
  };
}

function readFollowUpRow(raw: unknown, index: number): ProviderDischargeFollowUpRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const specialty = typeof o.specialty === "string" ? o.specialty.trim() : "";
  if (!specialty) return null;
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `fu-${index}`,
    specialty,
    providerOrFacility: typeof o.providerOrFacility === "string" ? o.providerOrFacility.trim() : "",
    timing: typeof o.timing === "string" ? o.timing.trim() : "",
    phone: typeof o.phone === "string" ? o.phone.trim() : "",
    address: typeof o.address === "string" ? o.address.trim() : "",
    comments: typeof o.comments === "string" ? o.comments.trim() : "",
  };
}

function readMedicationLine(raw: unknown, index: number): ProviderDischargeMedicationLine | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const displayName = typeof o.displayName === "string" ? o.displayName.trim() : "";
  if (!displayName) return null;
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `med-${index}`,
    catalogMedicationId:
      typeof o.catalogMedicationId === "string" ? o.catalogMedicationId.trim() : undefined,
    displayName,
    dose: typeof o.dose === "string" ? o.dose.trim() : "",
    frequency: typeof o.frequency === "string" ? o.frequency.trim() : "",
    instructions: typeof o.instructions === "string" ? o.instructions.trim() : "",
  };
}

export function hydrateProviderDischargeDocumentationForm(raw: unknown): ProviderDischargeDocumentationForm {
  const base = emptyProviderDischargeDocumentationForm();
  const parsed = parseDischargeSummaryForChart(raw);
  if (!parsed && (!raw || typeof raw !== "object")) return base;

  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  base.description = parsed?.dischargeDiagnosisSummary ?? "";
  base.diagnosisInstructions = parsed?.dischargeInstructions ?? "";
  base.medicationTreatmentText = parsed?.medicationInstructions ?? "";
  base.returnPrecautions = parsed?.returnPrecautions ?? "";
  base.workSchoolNote = parsed?.workSchoolNote ?? "";

  const leftAt = o[JSON_KEYS.patientLeftEdAt];
  if (typeof leftAt === "string") base.patientLeftEdAt = leftAt;

  base.diagnosisRefs = readStringArray(o[JSON_KEYS.diagnosisRefs])
    .map(readDiagnosisRef)
    .filter((x): x is ProviderDischargeDiagnosisRef => x != null);

  base.followUpRows = readStringArray(o[JSON_KEYS.followUpRows])
    .map(readFollowUpRow)
    .filter((x): x is ProviderDischargeFollowUpRow => x != null);

  base.medicationLines = readStringArray(o[JSON_KEYS.medicationLines])
    .map(readMedicationLine)
    .filter((x): x is ProviderDischargeMedicationLine => x != null);

  return base;
}

export type ProviderDischargeDocumentationMeta = {
  documentedAt: string | null;
  documentedByDisplayName: string | null;
  documentedByTitle: string | null;
};

export function readProviderDischargeDocumentationMeta(raw: unknown): ProviderDischargeDocumentationMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { documentedAt: null, documentedByDisplayName: null, documentedByTitle: null };
  }
  const o = raw as Record<string, unknown>;
  return {
    documentedAt:
      typeof o[JSON_KEYS.documentedAt] === "string" ? (o[JSON_KEYS.documentedAt] as string) : null,
    documentedByDisplayName:
      typeof o[JSON_KEYS.documentedBy] === "string" ? (o[JSON_KEYS.documentedBy] as string) : null,
    documentedByTitle:
      typeof o[JSON_KEYS.documentedByTitle] === "string" ? (o[JSON_KEYS.documentedByTitle] as string) : null,
  };
}

/** Merge provider discharge documentation into discharge JSON for PATCH. */
export function mergeProviderDischargeDocumentationIntoDischargeJson(
  encounterJson: unknown,
  form: ProviderDischargeDocumentationForm,
  meta?: { documentedAt: string; documentedByDisplayName: string; documentedByTitle?: string }
): Record<string, unknown> {
  const parsed = parseDischargeSummaryForChart(encounterJson);
  const out: Record<string, unknown> = parsed ? { ...(parsed as Record<string, unknown>) } : {};

  const setOrDelete = (key: string, value: string) => {
    const v = value.trim();
    if (v) out[key] = v;
    else delete out[key];
  };

  setOrDelete("dischargeDiagnosisSummary", form.description);
  setOrDelete("dischargeInstructions", form.diagnosisInstructions);
  setOrDelete("medicationInstructions", form.medicationTreatmentText);
  setOrDelete("returnPrecautions", form.returnPrecautions);
  setOrDelete("workSchoolNote", form.workSchoolNote);

  const leftAt = form.patientLeftEdAt.trim();
  if (leftAt) out[JSON_KEYS.patientLeftEdAt] = leftAt;
  else delete out[JSON_KEYS.patientLeftEdAt];

  if (form.diagnosisRefs.length) out[JSON_KEYS.diagnosisRefs] = form.diagnosisRefs;
  else delete out[JSON_KEYS.diagnosisRefs];

  if (form.followUpRows.length) out[JSON_KEYS.followUpRows] = form.followUpRows;
  else delete out[JSON_KEYS.followUpRows];

  if (form.medicationLines.length) out[JSON_KEYS.medicationLines] = form.medicationLines;
  else delete out[JSON_KEYS.medicationLines];

  if (meta) {
    out[JSON_KEYS.documentedAt] = meta.documentedAt;
    out[JSON_KEYS.documentedBy] = meta.documentedByDisplayName;
    if (meta.documentedByTitle?.trim()) out[JSON_KEYS.documentedByTitle] = meta.documentedByTitle.trim();
    else delete out[JSON_KEYS.documentedByTitle];
  }

  return out;
}

/** Apply provider discharge fields onto legacy DischargeFormState for unified save. */
export function applyProviderDischargeDocumentationToDischargeForm(
  dischargeForm: DischargeFormState,
  providerForm: ProviderDischargeDocumentationForm
): DischargeFormState {
  return {
    ...dischargeForm,
    dischargeDiagnosisSummary: providerForm.description,
    dischargeInstructions: providerForm.diagnosisInstructions,
    medicationInstructions: providerForm.medicationTreatmentText,
    returnPrecautions: providerForm.returnPrecautions,
    workSchoolNote: providerForm.workSchoolNote,
  };
}

export function formatMedicationLinesAsText(lines: ProviderDischargeMedicationLine[]): string {
  return lines
    .map((line) => {
      const parts = [line.displayName];
      if (line.dose.trim()) parts.push(line.dose.trim());
      if (line.frequency.trim()) parts.push(line.frequency.trim());
      if (line.instructions.trim()) parts.push(line.instructions.trim());
      return parts.join(" — ");
    })
    .filter(Boolean)
    .join("\n");
}

export function newFollowUpRowId(): string {
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newMedicationLineId(): string {
  return `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
