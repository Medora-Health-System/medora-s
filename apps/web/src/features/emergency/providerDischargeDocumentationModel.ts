/**
 * Phase 19Y / 19Y.1A — provider discharge documentation stored in `dischargeSummaryJson` (no migration).
 * Per-diagnosis documentation cards with backward-compatible hydration from legacy flat fields.
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
  /** Legacy key; `name` is accepted on read. */
  providerOrFacility: string;
  timing: string;
  phone: string;
  address: string;
  comments: string;
};

export type ProviderDischargeDiagnosisDoc = {
  id: string;
  encounterDiagnosisId?: string;
  code: string;
  displayName: string;
  description: string;
  diagnosisInstructions: string;
  medicationTreatment: string;
  returnPrecautions: string;
  returnWorkSchool?: string;
  followUps: ProviderDischargeFollowUpRow[];
  sourceTemplateId?: string;
  sourceVersion?: string;
};

export type ProviderDischargeDocumentationForm = {
  patientLeftEdAt: string;
  /** Selected discharge diagnoses (checkbox list). */
  diagnosisRefs: ProviderDischargeDiagnosisRef[];
  /** All diagnosis documentation cards (includes deselected session cache). */
  diagnosisDocs: ProviderDischargeDiagnosisDoc[];
};

export type ProviderDischargeDocFieldKey =
  | "description"
  | "diagnosisInstructions"
  | "medicationTreatment"
  | "returnPrecautions"
  | "followUps";

export type ProviderDischargeValidationErrors = {
  byDocId: Record<string, Partial<Record<ProviderDischargeDocFieldKey, string>>>;
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
  diagnosisDocs: "providerDischargeDiagnosisDocs",
  documentedAt: "providerDischargeDocumentedAt",
  documentedBy: "providerDischargeDocumentedByDisplayName",
  documentedByTitle: "providerDischargeDocumentedByTitle",
} as const;

export function emptyProviderDischargeDocumentationForm(): ProviderDischargeDocumentationForm {
  return {
    patientLeftEdAt: "",
    diagnosisRefs: [],
    diagnosisDocs: [],
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
  const name =
    typeof o.name === "string" ? o.name.trim()
    : typeof o.providerOrFacility === "string" ? o.providerOrFacility.trim()
    : "";
  if (!specialty && !name) return null;
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `fu-${index}`,
    specialty: specialty || "PRIMARY_CARE",
    providerOrFacility: name,
    timing: typeof o.timing === "string" ? o.timing.trim() : "",
    phone: typeof o.phone === "string" ? o.phone.trim() : "",
    address: typeof o.address === "string" ? o.address.trim() : "",
    comments: typeof o.comments === "string" ? o.comments.trim() : "",
  };
}

function readDiagnosisDoc(raw: unknown, index: number): ProviderDischargeDiagnosisDoc | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const code = typeof o.code === "string" ? o.code.trim() : "";
  const displayName =
    typeof o.displayName === "string" ? o.displayName.trim()
    : typeof o.label === "string" ? o.label.trim()
    : code;
  if (!code && !displayName) return null;

  const followUps = readStringArray(o.followUps)
    .map(readFollowUpRow)
    .filter((x): x is ProviderDischargeFollowUpRow => x != null);

  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `dxdoc-${index}`,
    encounterDiagnosisId:
      typeof o.encounterDiagnosisId === "string" ? o.encounterDiagnosisId.trim() : undefined,
    code,
    displayName: displayName || code,
    description: typeof o.description === "string" ? o.description : "",
    diagnosisInstructions:
      typeof o.diagnosisInstructions === "string" ? o.diagnosisInstructions : "",
    medicationTreatment:
      typeof o.medicationTreatment === "string" ? o.medicationTreatment : "",
    returnPrecautions: typeof o.returnPrecautions === "string" ? o.returnPrecautions : "",
    returnWorkSchool:
      typeof o.returnWorkSchool === "string" ? o.returnWorkSchool
      : typeof o.workSchoolNote === "string" ? o.workSchoolNote
      : undefined,
    followUps,
    sourceTemplateId:
      typeof o.sourceTemplateId === "string" ? o.sourceTemplateId.trim() : undefined,
    sourceVersion: typeof o.sourceVersion === "string" ? o.sourceVersion.trim() : undefined,
  };
}

function readLegacyMedicationLines(raw: unknown): string {
  const lines = readStringArray(raw)
    .map((item, i) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const displayName = typeof o.displayName === "string" ? o.displayName.trim() : "";
      if (!displayName) return null;
      const parts = [displayName];
      if (typeof o.dose === "string" && o.dose.trim()) parts.push(o.dose.trim());
      if (typeof o.frequency === "string" && o.frequency.trim()) parts.push(o.frequency.trim());
      if (typeof o.instructions === "string" && o.instructions.trim()) parts.push(o.instructions.trim());
      return parts.join(" — ");
    })
    .filter((x): x is string => Boolean(x));
  return lines.join("\n");
}

function buildLegacyDocFromFlatFields(
  parsed: ReturnType<typeof parseDischargeSummaryForChart>,
  refs: ProviderDischargeDiagnosisRef[],
  legacyMedicationText: string,
  legacyFollowUps: ProviderDischargeFollowUpRow[]
): ProviderDischargeDiagnosisDoc | null {
  const hasFlat =
    Boolean(parsed?.dischargeDiagnosisSummary?.trim()) ||
    Boolean(parsed?.dischargeInstructions?.trim()) ||
    Boolean(parsed?.medicationInstructions?.trim()) ||
    Boolean(legacyMedicationText.trim()) ||
    Boolean(parsed?.returnPrecautions?.trim()) ||
    Boolean(parsed?.workSchoolNote?.trim()) ||
    legacyFollowUps.length > 0;

  if (!hasFlat && refs.length === 0) return null;

  const primaryRef = refs.find((r) => r.isPrimary) ?? refs[0];
  const medText = parsed?.medicationInstructions?.trim() || legacyMedicationText;

  return {
    id: primaryRef?.encounterDiagnosisId ? `legacy-${primaryRef.encounterDiagnosisId}` : "legacy-primary",
    encounterDiagnosisId: primaryRef?.encounterDiagnosisId,
    code: primaryRef?.code ?? "",
    displayName: primaryRef?.label ?? primaryRef?.code ?? "Discharge diagnosis",
    description: parsed?.dischargeDiagnosisSummary ?? "",
    diagnosisInstructions: parsed?.dischargeInstructions ?? "",
    medicationTreatment: medText,
    returnPrecautions: parsed?.returnPrecautions ?? "",
    returnWorkSchool: parsed?.workSchoolNote ?? "",
    followUps: legacyFollowUps,
    sourceTemplateId: primaryRef?.educationTemplateId,
  };
}

export function hydrateProviderDischargeDocumentationForm(raw: unknown): ProviderDischargeDocumentationForm {
  const base = emptyProviderDischargeDocumentationForm();
  const parsed = parseDischargeSummaryForChart(raw);
  if (!parsed && (!raw || typeof raw !== "object")) return base;

  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const leftAt = o[JSON_KEYS.patientLeftEdAt];
  if (typeof leftAt === "string") base.patientLeftEdAt = leftAt;

  base.diagnosisRefs = readStringArray(o[JSON_KEYS.diagnosisRefs])
    .map(readDiagnosisRef)
    .filter((x): x is ProviderDischargeDiagnosisRef => x != null);

  const structuredDocs = readStringArray(o[JSON_KEYS.diagnosisDocs])
    .map(readDiagnosisDoc)
    .filter((x): x is ProviderDischargeDiagnosisDoc => x != null);

  if (structuredDocs.length > 0) {
    base.diagnosisDocs = structuredDocs;
    return base;
  }

  const legacyFollowUps = readStringArray(o.providerDischargeFollowUps)
    .map(readFollowUpRow)
    .filter((x): x is ProviderDischargeFollowUpRow => x != null);

  const legacyMedText = readLegacyMedicationLines(o.providerDischargeMedicationLines);

  const legacyDoc = buildLegacyDocFromFlatFields(parsed, base.diagnosisRefs, legacyMedText, legacyFollowUps);
  if (legacyDoc) {
    base.diagnosisDocs = [legacyDoc];
  }

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

export function findDiagnosisDocForRef(
  form: ProviderDischargeDocumentationForm,
  ref: ProviderDischargeDiagnosisRef
): ProviderDischargeDiagnosisDoc | undefined {
  if (ref.encounterDiagnosisId) {
    const byId = form.diagnosisDocs.find((d) => d.encounterDiagnosisId === ref.encounterDiagnosisId);
    if (byId) return byId;
  }
  return form.diagnosisDocs.find((d) => d.code === ref.code && d.displayName === ref.label);
}

export function getSelectedDiagnosisDocs(form: ProviderDischargeDocumentationForm): ProviderDischargeDiagnosisDoc[] {
  return form.diagnosisRefs
    .map((ref) => findDiagnosisDocForRef(form, ref))
    .filter((d): d is ProviderDischargeDiagnosisDoc => d != null);
}

export function getPrimaryRollupDoc(form: ProviderDischargeDocumentationForm): ProviderDischargeDiagnosisDoc | null {
  const selected = getSelectedDiagnosisDocs(form);
  if (selected.length === 0) return form.diagnosisDocs[0] ?? null;
  const primaryRef = form.diagnosisRefs.find((r) => r.isPrimary);
  if (primaryRef) {
    const doc = findDiagnosisDocForRef(form, primaryRef);
    if (doc) return doc;
  }
  return selected[0] ?? null;
}

function followUpRowIsComplete(row: ProviderDischargeFollowUpRow): boolean {
  return Boolean(row.providerOrFacility.trim()) || Boolean(row.timing.trim());
}

export function validateProviderDischargeDocumentation(
  form: ProviderDischargeDocumentationForm,
  messages: {
    requiredDescription: string;
    requiredInstructions: string;
    requiredMedication: string;
    requiredReturnPrecautions: string;
    requiredFollowUp: string;
  }
): ProviderDischargeValidationErrors | null {
  if (form.diagnosisRefs.length === 0) return null;

  const byDocId: ProviderDischargeValidationErrors["byDocId"] = {};
  let hasError = false;

  for (const ref of form.diagnosisRefs) {
    const doc = findDiagnosisDocForRef(form, ref);
    if (!doc) {
      byDocId[ref.encounterDiagnosisId ?? ref.code] = {
        description: messages.requiredDescription,
        diagnosisInstructions: messages.requiredInstructions,
        medicationTreatment: messages.requiredMedication,
        returnPrecautions: messages.requiredReturnPrecautions,
        followUps: messages.requiredFollowUp,
      };
      hasError = true;
      continue;
    }

    const errors: Partial<Record<ProviderDischargeDocFieldKey, string>> = {};
    if (!doc.description.trim()) errors.description = messages.requiredDescription;
    if (!doc.diagnosisInstructions.trim()) errors.diagnosisInstructions = messages.requiredInstructions;
    if (!doc.medicationTreatment.trim()) errors.medicationTreatment = messages.requiredMedication;
    if (!doc.returnPrecautions.trim()) errors.returnPrecautions = messages.requiredReturnPrecautions;
    if (!doc.followUps.some(followUpRowIsComplete)) errors.followUps = messages.requiredFollowUp;

    if (Object.keys(errors).length > 0) {
      byDocId[doc.id] = errors;
      hasError = true;
    }
  }

  return hasError ? { byDocId } : null;
}

function serializeFollowUpRow(row: ProviderDischargeFollowUpRow): Record<string, unknown> {
  return {
    id: row.id,
    specialty: row.specialty,
    name: row.providerOrFacility,
    providerOrFacility: row.providerOrFacility,
    timing: row.timing,
    phone: row.phone,
    address: row.address,
    comments: row.comments,
  };
}

function serializeDiagnosisDoc(doc: ProviderDischargeDiagnosisDoc): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: doc.id,
    code: doc.code,
    displayName: doc.displayName,
    description: doc.description,
    diagnosisInstructions: doc.diagnosisInstructions,
    medicationTreatment: doc.medicationTreatment,
    returnPrecautions: doc.returnPrecautions,
    followUps: doc.followUps.map(serializeFollowUpRow),
  };
  if (doc.encounterDiagnosisId) out.encounterDiagnosisId = doc.encounterDiagnosisId;
  if (doc.returnWorkSchool?.trim()) out.returnWorkSchool = doc.returnWorkSchool.trim();
  if (doc.sourceTemplateId) out.sourceTemplateId = doc.sourceTemplateId;
  if (doc.sourceVersion) out.sourceVersion = doc.sourceVersion;
  return out;
}

/** Merge provider discharge documentation into discharge JSON for PATCH. */
export function mergeProviderDischargeDocumentationIntoDischargeJson(
  encounterJson: unknown,
  form: ProviderDischargeDocumentationForm,
  meta?: { documentedAt: string; documentedByDisplayName: string; documentedByTitle?: string }
): Record<string, unknown> {
  const parsed = parseDischargeSummaryForChart(encounterJson);
  const out: Record<string, unknown> = parsed ? { ...(parsed as Record<string, unknown>) } : {};

  const selectedDocs = getSelectedDiagnosisDocs(form);
  const rollup = getPrimaryRollupDoc({ ...form, diagnosisRefs: form.diagnosisRefs });

  const setOrDelete = (key: string, value: string) => {
    const v = value.trim();
    if (v) out[key] = v;
    else delete out[key];
  };

  if (rollup) {
    setOrDelete("dischargeDiagnosisSummary", rollup.description);
    setOrDelete("dischargeInstructions", rollup.diagnosisInstructions);
    setOrDelete("medicationInstructions", rollup.medicationTreatment);
    setOrDelete("returnPrecautions", rollup.returnPrecautions);
    setOrDelete("workSchoolNote", rollup.returnWorkSchool ?? "");
  } else {
    setOrDelete("dischargeDiagnosisSummary", "");
    setOrDelete("dischargeInstructions", "");
    setOrDelete("medicationInstructions", "");
    setOrDelete("returnPrecautions", "");
    setOrDelete("workSchoolNote", "");
  }

  const leftAt = form.patientLeftEdAt.trim();
  if (leftAt) out[JSON_KEYS.patientLeftEdAt] = leftAt;
  else delete out[JSON_KEYS.patientLeftEdAt];

  if (form.diagnosisRefs.length) out[JSON_KEYS.diagnosisRefs] = form.diagnosisRefs;
  else delete out[JSON_KEYS.diagnosisRefs];

  if (selectedDocs.length) {
    out[JSON_KEYS.diagnosisDocs] = selectedDocs.map(serializeDiagnosisDoc);
  } else {
    delete out[JSON_KEYS.diagnosisDocs];
  }

  delete out.providerDischargeFollowUps;
  delete out.providerDischargeMedicationLines;

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
  const rollup = getPrimaryRollupDoc(providerForm);
  if (!rollup) return dischargeForm;
  return {
    ...dischargeForm,
    dischargeDiagnosisSummary: rollup.description,
    dischargeInstructions: rollup.diagnosisInstructions,
    medicationInstructions: rollup.medicationTreatment,
    returnPrecautions: rollup.returnPrecautions,
    workSchoolNote: rollup.returnWorkSchool ?? "",
  };
}

export function newDiagnosisDocId(): string {
  return `dxdoc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newFollowUpRowId(): string {
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newDefaultFollowUpRow(): ProviderDischargeFollowUpRow {
  return {
    id: newFollowUpRowId(),
    specialty: "PRIMARY_CARE",
    providerOrFacility: "",
    timing: "",
    phone: "",
    address: "",
    comments: "",
  };
}

export function createDiagnosisDocFromRef(ref: ProviderDischargeDiagnosisRef): ProviderDischargeDiagnosisDoc {
  return {
    id: newDiagnosisDocId(),
    encounterDiagnosisId: ref.encounterDiagnosisId,
    code: ref.code,
    displayName: ref.label,
    description: "",
    diagnosisInstructions: "",
    medicationTreatment: "",
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [newDefaultFollowUpRow()],
    sourceTemplateId: ref.educationTemplateId,
  };
}
