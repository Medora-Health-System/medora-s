/**
 * Phase 19Y / 19Y.1A / 19Y.2 / 19Y.2B — provider discharge documentation in `dischargeSummaryJson` (no migration).
 * Per-diagnosis billing-safe cards with template governance metadata.
 */

import { parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import type { DischargeFormState } from "@/lib/encounterDischarge";
import { hydrateSharedFieldsIntoForm } from "./providerDischargeSharedPlanningMerge";

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

export type ProviderDischargeMedicationLine = {
  id: string;
  catalogMedicationId?: string;
  displayName: string;
  dose: string;
  frequency: string;
  instructions: string;
};

export type ProviderDischargeTemplateMeta = {
  templateId: string;
  templateVersion: string;
  matchLevel: "icdExact" | "icdFamily" | "keyword" | "generic";
  sourceReferences: string[];
  templateAppliedHash?: string;
  appliedLocale?: "en" | "fr";
  specialtyCategory?: string;
  riskCategory?: string;
  appliedAt?: string;
  appliedByDisplayName?: string;
  providerConfirmed?: boolean;
};

export type ProviderDischargeDiagnosisCard = {
  id: string;

  /** Stable diagnosis source (EncounterDiagnosis.id). */
  sourceEncounterDiagnosisId: string;
  /** Backward-compatible alias. */
  encounterDiagnosisId?: string;

  code: string;
  displayName: string;

  isPrimaryDiagnosis: boolean;
  displayOrder: number;

  description: string;
  diagnosisInstructions: string;
  medicationTreatment: string;
  treatment?: string;
  returnPrecautions: string;
  returnWorkSchool?: string;

  followUps: ProviderDischargeFollowUpRow[];
  medicationLines: ProviderDischargeMedicationLine[];

  templateMeta?: ProviderDischargeTemplateMeta;

  /** Legacy compatibility fields. */
  sourceTemplateId?: string;
  sourceVersion?: string;
};

/** @deprecated Alias — use ProviderDischargeDiagnosisCard */
export type ProviderDischargeDiagnosisDoc = ProviderDischargeDiagnosisCard;

export type ProviderDischargeDocumentationForm = {
  patientLeftEdAt: string;
  diagnosisRefs: ProviderDischargeDiagnosisRef[];
  diagnosisDocs: ProviderDischargeDiagnosisCard[];
  /** Shared discharge planning — one section for all selected diagnoses (19Y.2B). */
  returnPrecautions: string;
  returnWorkSchool: string;
  followUps: ProviderDischargeFollowUpRow[];
};

export type ProviderDischargeCardFieldKey =
  | "description"
  | "diagnosisInstructions"
  | "medicationTreatment";

export type ProviderDischargeSharedFieldKey = "returnPrecautions" | "followUps";

/** @deprecated Use ProviderDischargeCardFieldKey */
export type ProviderDischargeDocFieldKey = ProviderDischargeCardFieldKey | ProviderDischargeSharedFieldKey;

export type ProviderDischargeValidationErrors = {
  byDocId: Record<string, Partial<Record<ProviderDischargeCardFieldKey, string>>>;
  shared?: Partial<Record<ProviderDischargeSharedFieldKey, string>>;
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
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [newDefaultFollowUpRow()],
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

function readTemplateMeta(raw: unknown): ProviderDischargeTemplateMeta | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const templateId = typeof o.templateId === "string" ? o.templateId.trim() : "";
  const templateVersion = typeof o.templateVersion === "string" ? o.templateVersion.trim() : "";
  if (!templateId || !templateVersion) return undefined;
  const matchLevel = o.matchLevel;
  const allowed = new Set(["icdExact", "icdFamily", "keyword", "generic"]);
  if (typeof matchLevel !== "string" || !allowed.has(matchLevel)) return undefined;
  const sourceReferences = readStringArray(o.sourceReferences)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return {
    templateId,
    templateVersion,
    matchLevel: matchLevel as ProviderDischargeTemplateMeta["matchLevel"],
    sourceReferences,
    templateAppliedHash:
      typeof o.templateAppliedHash === "string" && o.templateAppliedHash.trim() ?
        o.templateAppliedHash.trim()
      : undefined,
    appliedLocale:
      o.appliedLocale === "en" || o.appliedLocale === "fr" ? o.appliedLocale : undefined,
    specialtyCategory:
      typeof o.specialtyCategory === "string" && o.specialtyCategory.trim() ?
        o.specialtyCategory.trim()
      : undefined,
    riskCategory:
      typeof o.riskCategory === "string" && o.riskCategory.trim() ? o.riskCategory.trim() : undefined,
    appliedAt: typeof o.appliedAt === "string" ? o.appliedAt : undefined,
    appliedByDisplayName:
      typeof o.appliedByDisplayName === "string" ? o.appliedByDisplayName : undefined,
    providerConfirmed: o.providerConfirmed === true,
  };
}

function readDiagnosisDoc(raw: unknown, index: number): ProviderDischargeDiagnosisCard | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const code = typeof o.code === "string" ? o.code.trim() : "";
  const displayName =
    typeof o.displayName === "string" ? o.displayName.trim()
    : typeof o.label === "string" ? o.label.trim()
    : code;
  if (!code && !displayName) return null;

  const legacyEncounterId =
    typeof o.encounterDiagnosisId === "string" ? o.encounterDiagnosisId.trim() : "";
  const sourceEncounterDiagnosisId =
    typeof o.sourceEncounterDiagnosisId === "string" && o.sourceEncounterDiagnosisId.trim() ?
      o.sourceEncounterDiagnosisId.trim()
    : legacyEncounterId || `unknown-${index}`;

  const followUps = readStringArray(o.followUps)
    .map(readFollowUpRow)
    .filter((x): x is ProviderDischargeFollowUpRow => x != null);

  const medicationLines = readStringArray(o.medicationLines)
    .map(readMedicationLine)
    .filter((x): x is ProviderDischargeMedicationLine => x != null);

  const templateMeta = readTemplateMeta(o.templateMeta);

  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `dxdoc-${index}`,
    sourceEncounterDiagnosisId,
    encounterDiagnosisId: legacyEncounterId || sourceEncounterDiagnosisId,
    code,
    displayName: displayName || code,
    isPrimaryDiagnosis: o.isPrimaryDiagnosis === true,
    displayOrder: typeof o.displayOrder === "number" ? o.displayOrder : -1,
    description: typeof o.description === "string" ? o.description : "",
    diagnosisInstructions:
      typeof o.diagnosisInstructions === "string" ? o.diagnosisInstructions : "",
    medicationTreatment:
      typeof o.medicationTreatment === "string" ? o.medicationTreatment : "",
    treatment: typeof o.treatment === "string" ? o.treatment : undefined,
    returnPrecautions: typeof o.returnPrecautions === "string" ? o.returnPrecautions : "",
    returnWorkSchool:
      typeof o.returnWorkSchool === "string" ? o.returnWorkSchool
      : typeof o.workSchoolNote === "string" ? o.workSchoolNote
      : undefined,
    followUps,
    medicationLines,
    templateMeta,
    sourceTemplateId:
      typeof o.sourceTemplateId === "string" ? o.sourceTemplateId.trim()
      : templateMeta?.templateId,
    sourceVersion:
      typeof o.sourceVersion === "string" ? o.sourceVersion.trim()
      : templateMeta?.templateVersion,
  };
}

function readLegacyMedicationLines(raw: unknown): ProviderDischargeMedicationLine[] {
  return readStringArray(raw)
    .map(readMedicationLine)
    .filter((x): x is ProviderDischargeMedicationLine => x != null);
}

function buildLegacyDocFromFlatFields(
  parsed: ReturnType<typeof parseDischargeSummaryForChart>,
  refs: ProviderDischargeDiagnosisRef[],
  legacyMedicationLines: ProviderDischargeMedicationLine[],
  legacyFollowUps: ProviderDischargeFollowUpRow[]
): ProviderDischargeDiagnosisCard | null {
  const hasFlat =
    Boolean(parsed?.dischargeDiagnosisSummary?.trim()) ||
    Boolean(parsed?.dischargeInstructions?.trim()) ||
    Boolean(parsed?.medicationInstructions?.trim()) ||
    legacyMedicationLines.length > 0 ||
    Boolean(parsed?.returnPrecautions?.trim()) ||
    Boolean(parsed?.workSchoolNote?.trim()) ||
    legacyFollowUps.length > 0;

  if (!hasFlat && refs.length === 0) return null;

  const primaryRef = refs.find((r) => r.isPrimary) ?? refs[0];
  const sourceId = primaryRef?.encounterDiagnosisId ?? "legacy-primary";

  return {
    id: `legacy-${sourceId}`,
    sourceEncounterDiagnosisId: sourceId,
    encounterDiagnosisId: primaryRef?.encounterDiagnosisId,
    code: primaryRef?.code ?? "",
    displayName: primaryRef?.label ?? primaryRef?.code ?? "Discharge diagnosis",
    isPrimaryDiagnosis: true,
    displayOrder: 0,
    description: parsed?.dischargeDiagnosisSummary ?? "",
    diagnosisInstructions: parsed?.dischargeInstructions ?? "",
    medicationTreatment: parsed?.medicationInstructions ?? "",
    treatment: "",
    returnPrecautions: parsed?.returnPrecautions ?? "",
    returnWorkSchool: parsed?.workSchoolNote ?? "",
    followUps: legacyFollowUps.length ? legacyFollowUps : [newDefaultFollowUpRow()],
    medicationLines: legacyMedicationLines,
    sourceTemplateId: primaryRef?.educationTemplateId,
  };
}

/** Normalize ordering/primary flags after hydration from legacy or partial cards. */
export function normalizeProviderDischargeDiagnosisCards(
  form: ProviderDischargeDocumentationForm
): ProviderDischargeDocumentationForm {
  const withShared: ProviderDischargeDocumentationForm = {
    ...form,
    returnPrecautions: form.returnPrecautions ?? "",
    returnWorkSchool: form.returnWorkSchool ?? "",
    followUps: form.followUps?.length ? form.followUps : [newDefaultFollowUpRow()],
  };
  if (withShared.diagnosisDocs.length === 0) return withShared;

  const refOrder = new Map<string, number>();
  withShared.diagnosisRefs.forEach((ref, idx) => {
    if (ref.encounterDiagnosisId) refOrder.set(ref.encounterDiagnosisId, idx);
  });

  let primaryAssigned = withShared.diagnosisDocs.some((d) => d.isPrimaryDiagnosis);

  const diagnosisDocs = withShared.diagnosisDocs.map((doc, idx) => {
    const sourceId = doc.sourceEncounterDiagnosisId || doc.encounterDiagnosisId || doc.id;
    const refIdx = refOrder.get(sourceId);
    const displayOrder = doc.displayOrder >= 0 ? doc.displayOrder : refIdx ?? idx;

    let isPrimaryDiagnosis = doc.isPrimaryDiagnosis;
    if (!primaryAssigned && (refIdx === 0 || idx === 0)) {
      isPrimaryDiagnosis = true;
      primaryAssigned = true;
    } else if (
      !primaryAssigned &&
      withShared.diagnosisRefs.find((r) => r.isPrimary)?.encounterDiagnosisId === sourceId
    ) {
      isPrimaryDiagnosis = true;
      primaryAssigned = true;
    }

    return {
      ...doc,
      sourceEncounterDiagnosisId: sourceId,
      encounterDiagnosisId: doc.encounterDiagnosisId ?? sourceId,
      displayOrder,
      isPrimaryDiagnosis,
      followUps: doc.followUps ?? [],
      medicationLines: doc.medicationLines ?? [],
    };
  });

  let finalDocs = diagnosisDocs;
  if (!finalDocs.some((d) => d.isPrimaryDiagnosis) && finalDocs.length > 0) {
    const firstId = sortProviderDischargeDiagnosisCards(finalDocs)[0]!.id;
    finalDocs = finalDocs.map((d) => (d.id === firstId ? { ...d, isPrimaryDiagnosis: true } : d));
  }

  return { ...withShared, diagnosisDocs: finalDocs };
}

export function sortProviderDischargeDiagnosisCards(
  cards: ProviderDischargeDiagnosisCard[]
): ProviderDischargeDiagnosisCard[] {
  return [...cards].sort((a, b) => {
    if (a.isPrimaryDiagnosis !== b.isPrimaryDiagnosis) return a.isPrimaryDiagnosis ? -1 : 1;
    return a.displayOrder - b.displayOrder;
  });
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
    .filter((x): x is ProviderDischargeDiagnosisCard => x != null);

  if (structuredDocs.length > 0) {
    base.diagnosisDocs = structuredDocs;
    const topLevelFollowUps = readStringArray(o.providerDischargeFollowUps)
      .map(readFollowUpRow)
      .filter((x): x is ProviderDischargeFollowUpRow => x != null);
    return hydrateSharedFieldsIntoForm(normalizeProviderDischargeDiagnosisCards(base), {
      returnPrecautions:
        typeof o.providerDischargeReturnPrecautions === "string" ? o.providerDischargeReturnPrecautions
        : parsed?.returnPrecautions ?? "",
      returnWorkSchool:
        typeof o.providerDischargeReturnWorkSchool === "string" ? o.providerDischargeReturnWorkSchool
        : parsed?.workSchoolNote ?? "",
      followUps: topLevelFollowUps.length ? topLevelFollowUps : undefined,
    });
  }

  const legacyFollowUps = readStringArray(o.providerDischargeFollowUps)
    .map(readFollowUpRow)
    .filter((x): x is ProviderDischargeFollowUpRow => x != null);

  const legacyMedLines = readLegacyMedicationLines(o.providerDischargeMedicationLines);

  const legacyDoc = buildLegacyDocFromFlatFields(parsed, base.diagnosisRefs, legacyMedLines, legacyFollowUps);
  if (legacyDoc) {
    base.diagnosisDocs = [legacyDoc];
  }

  return hydrateSharedFieldsIntoForm(normalizeProviderDischargeDiagnosisCards(base), {
    returnPrecautions: parsed?.returnPrecautions ?? "",
    returnWorkSchool: parsed?.workSchoolNote ?? "",
    followUps: legacyFollowUps.length ? legacyFollowUps : undefined,
  });
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

function diagnosisIdOf(doc: ProviderDischargeDiagnosisCard): string {
  return doc.sourceEncounterDiagnosisId || doc.encounterDiagnosisId || doc.id;
}

export function findDiagnosisDocForRef(
  form: ProviderDischargeDocumentationForm,
  ref: ProviderDischargeDiagnosisRef
): ProviderDischargeDiagnosisCard | undefined {
  if (ref.encounterDiagnosisId) {
    const byId = form.diagnosisDocs.find(
      (d) =>
        d.sourceEncounterDiagnosisId === ref.encounterDiagnosisId ||
        d.encounterDiagnosisId === ref.encounterDiagnosisId
    );
    if (byId) return byId;
  }
  return form.diagnosisDocs.find((d) => d.code === ref.code && d.displayName === ref.label);
}

export function getSelectedDiagnosisDocs(form: ProviderDischargeDocumentationForm): ProviderDischargeDiagnosisCard[] {
  const docs = form.diagnosisRefs
    .map((ref) => findDiagnosisDocForRef(form, ref))
    .filter((d): d is ProviderDischargeDiagnosisCard => d != null);
  return sortProviderDischargeDiagnosisCards(docs);
}

export function getPrimaryRollupDoc(form: ProviderDischargeDocumentationForm): ProviderDischargeDiagnosisCard | null {
  const selected = getSelectedDiagnosisDocs(form);
  if (selected.length === 0) return form.diagnosisDocs[0] ?? null;
  const primary = selected.find((d) => d.isPrimaryDiagnosis);
  if (primary) return primary;
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
      };
      hasError = true;
      continue;
    }

    const errors: Partial<Record<ProviderDischargeCardFieldKey, string>> = {};
    if (!doc.description.trim()) errors.description = messages.requiredDescription;
    if (!doc.diagnosisInstructions.trim()) errors.diagnosisInstructions = messages.requiredInstructions;
    if (!doc.medicationTreatment.trim()) errors.medicationTreatment = messages.requiredMedication;

    if (Object.keys(errors).length > 0) {
      byDocId[doc.id] = errors;
      hasError = true;
    }
  }

  const shared: Partial<Record<ProviderDischargeSharedFieldKey, string>> = {};
  if (!form.returnPrecautions.trim()) shared.returnPrecautions = messages.requiredReturnPrecautions;
  if (!form.followUps.some(followUpRowIsComplete)) shared.followUps = messages.requiredFollowUp;
  if (Object.keys(shared).length > 0) hasError = true;

  if (!hasError) return null;
  return { byDocId, ...(Object.keys(shared).length ? { shared } : {}) };
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

function serializeMedicationLine(line: ProviderDischargeMedicationLine): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: line.id,
    displayName: line.displayName,
    dose: line.dose,
    frequency: line.frequency,
    instructions: line.instructions,
  };
  if (line.catalogMedicationId) out.catalogMedicationId = line.catalogMedicationId;
  return out;
}

function serializeDiagnosisDoc(doc: ProviderDischargeDiagnosisCard): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: doc.id,
    sourceEncounterDiagnosisId: doc.sourceEncounterDiagnosisId,
    code: doc.code,
    displayName: doc.displayName,
    isPrimaryDiagnosis: doc.isPrimaryDiagnosis,
    displayOrder: doc.displayOrder,
    description: doc.description,
    diagnosisInstructions: doc.diagnosisInstructions,
    medicationTreatment: doc.medicationTreatment,
    medicationLines: doc.medicationLines.map(serializeMedicationLine),
  };
  if (doc.encounterDiagnosisId) out.encounterDiagnosisId = doc.encounterDiagnosisId;
  if (doc.treatment?.trim()) out.treatment = doc.treatment.trim();
  if (doc.templateMeta) out.templateMeta = doc.templateMeta;
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
  const rollup = getPrimaryRollupDoc(form);

  const setOrDelete = (key: string, value: string) => {
    const v = value.trim();
    if (v) out[key] = v;
    else delete out[key];
  };

  if (rollup) {
    setOrDelete("dischargeDiagnosisSummary", rollup.description);
    setOrDelete("dischargeInstructions", rollup.diagnosisInstructions);
    setOrDelete("medicationInstructions", rollup.medicationTreatment);
  } else {
    setOrDelete("dischargeDiagnosisSummary", "");
    setOrDelete("dischargeInstructions", "");
    setOrDelete("medicationInstructions", "");
  }

  setOrDelete("returnPrecautions", form.returnPrecautions);
  setOrDelete("workSchoolNote", form.returnWorkSchool);

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

  if (form.followUps.length) {
    out.providerDischargeFollowUps = form.followUps.map(serializeFollowUpRow);
  } else {
    delete out.providerDischargeFollowUps;
  }

  setOrDelete("providerDischargeReturnPrecautions", form.returnPrecautions);
  setOrDelete("providerDischargeReturnWorkSchool", form.returnWorkSchool);

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
    returnPrecautions: providerForm.returnPrecautions,
    workSchoolNote: providerForm.returnWorkSchool,
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

/** @deprecated Prefer buildProviderDischargeCardFromDiagnosis from template registry. */
export function createDiagnosisDocFromRef(
  ref: ProviderDischargeDiagnosisRef,
  options?: { displayOrder?: number; isPrimaryDiagnosis?: boolean }
): ProviderDischargeDiagnosisCard {
  const sourceId = ref.encounterDiagnosisId ?? `ref-${ref.code}`;
  return {
    id: newDiagnosisDocId(),
    sourceEncounterDiagnosisId: sourceId,
    encounterDiagnosisId: ref.encounterDiagnosisId,
    code: ref.code,
    displayName: ref.label,
    isPrimaryDiagnosis: options?.isPrimaryDiagnosis ?? ref.isPrimary === true,
    displayOrder: options?.displayOrder ?? 0,
    description: "",
    diagnosisInstructions: "",
    medicationTreatment: "",
    treatment: "",
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [],
    medicationLines: [],
    sourceTemplateId: ref.educationTemplateId,
  };
}

export { diagnosisIdOf };
