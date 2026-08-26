/**
 * INP.DIS.1B — Provider-authorized inpatient discharge documentation namespace.
 * Persisted under Encounter.dischargeSummaryJson.inpatientProviderDischarge.
 * Planning (D4B.7 / D3E.7) ≠ provider final disposition.
 */

export const INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION = "INP.DIS.1B" as const;

export const INPATIENT_CONDITION_AT_DISCHARGE_STATUSES = [
  "STABLE",
  "IMPROVED",
  "UNCHANGED",
  "GUARDED",
  "OTHER",
] as const;

export type InpatientConditionAtDischargeStatus =
  (typeof INPATIENT_CONDITION_AT_DISCHARGE_STATUSES)[number];

export const INPATIENT_PENDING_STUDY_TYPES = [
  "LAB",
  "CULTURE",
  "PATHOLOGY",
  "IMAGING",
  "OTHER",
] as const;

export type InpatientPendingStudyType = (typeof INPATIENT_PENDING_STUDY_TYPES)[number];

export const INPATIENT_FINAL_DISPOSITION_CODES = [
  "HOME",
  "HOME_WITH_HOME_HEALTH",
  "SKILLED_NURSING_FACILITY",
  "ACUTE_REHAB",
  "LONG_TERM_ACUTE_CARE",
  "ASSISTED_LIVING",
  "HOSPICE",
  "TRANSFER_ACUTE_CARE",
  "BEHAVIORAL_HEALTH_FACILITY",
  "AGAINST_MEDICAL_ADVICE",
  "OTHER",
] as const;

export type InpatientFinalDispositionCode = (typeof INPATIENT_FINAL_DISPOSITION_CODES)[number];

export type InpatientProviderDischargeAdmissionDiagnosis = {
  code?: string | null;
  description?: string | null;
};

export type InpatientProviderDischargeDiagnosis = {
  id: string;
  code?: string | null;
  description: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type InpatientProviderDischargeConditionAtDischarge = {
  status: InpatientConditionAtDischargeStatus;
  narrative?: string | null;
};

export type InpatientProviderDischargeFinalDisposition = {
  code: InpatientFinalDispositionCode | string;
  labelSnapshot?: string | null;
  destinationDetails?: string | null;
};

export type InpatientProviderDischargePendingStudy = {
  id: string;
  type: InpatientPendingStudyType;
  description: string;
  responsibleParty?: string | null;
  followUpPlan?: string | null;
};

/** Provider-authorized inpatient discharge documentation (INP.DIS.1B). */
export type InpatientProviderDischargeV1B = {
  schemaVersion: typeof INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION;
  admissionDiagnosis?: InpatientProviderDischargeAdmissionDiagnosis | null;
  dischargeDiagnoses: InpatientProviderDischargeDiagnosis[];
  reasonForHospitalization?: string | null;
  hospitalCourse?: string | null;
  significantFindings?: string | null;
  proceduresAndTreatments?: string | null;
  consultations?: string | null;
  complications?: string | null;
  conditionAtDischarge?: InpatientProviderDischargeConditionAtDischarge | null;
  finalDisposition?: InpatientProviderDischargeFinalDisposition | null;
  pendingStudies: InpatientProviderDischargePendingStudy[];
  documentedAt?: string | null;
  documentedByUserId?: string | null;
  documentedByDisplayNameSnapshot?: string | null;
  documentedByProfessionalTitleSnapshot?: string | null;
  lastUpdatedAt?: string | null;
  revision?: number;
};

/** Backward-compatible alias used by INP.DIS.1A contract readers. */
export type InpatientProviderDischargeV1 = InpatientProviderDischargeV1B;

export type InpatientProviderDischargeSaveMode = "draft" | "complete";

export type InpatientProviderDischargeValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function readString(value: unknown): string | null {
  return trimOrNull(value);
}

export function emptyInpatientProviderDischarge(): InpatientProviderDischargeV1B {
  return {
    schemaVersion: INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION,
    dischargeDiagnoses: [],
    pendingStudies: [],
    revision: 0,
  };
}

function hydrateAdmissionDiagnosis(
  raw: unknown
): InpatientProviderDischargeAdmissionDiagnosis | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? { description: t } : null;
  }
  if (!isRecord(raw)) return null;
  const description = readString(raw.description);
  const code = readString(raw.code);
  if (!description && !code) return null;
  return { code, description };
}

function hydrateDischargeDiagnosis(raw: unknown, index: number): InpatientProviderDischargeDiagnosis | null {
  if (!isRecord(raw)) return null;
  const description =
    readString(raw.description) ??
    readString(raw.label) ??
    readString(raw.displayName);
  if (!description) return null;
  const id = readString(raw.id) ?? `dx-${index + 1}`;
  return {
    id,
    code: readString(raw.code),
    description,
    isPrimary: raw.isPrimary === true || raw.isPrimaryDiagnosis === true,
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : typeof raw.displayOrder === "number" && Number.isFinite(raw.displayOrder)
          ? raw.displayOrder
          : index,
  };
}

function hydrateConditionAtDischarge(
  raw: unknown
): InpatientProviderDischargeConditionAtDischarge | null {
  if (typeof raw === "string") {
    const status = raw.trim().toUpperCase();
    if ((INPATIENT_CONDITION_AT_DISCHARGE_STATUSES as readonly string[]).includes(status)) {
      return { status: status as InpatientConditionAtDischargeStatus };
    }
    return status ? { status: "OTHER", narrative: raw.trim() } : null;
  }
  if (!isRecord(raw)) return null;
  const statusRaw = readString(raw.status)?.toUpperCase();
  if (
    !statusRaw ||
    !(INPATIENT_CONDITION_AT_DISCHARGE_STATUSES as readonly string[]).includes(statusRaw)
  ) {
    return null;
  }
  return {
    status: statusRaw as InpatientConditionAtDischargeStatus,
    narrative: readString(raw.narrative),
  };
}

function hydrateFinalDisposition(
  raw: unknown
): InpatientProviderDischargeFinalDisposition | null {
  if (typeof raw === "string") {
    const code = raw.trim().toUpperCase();
    if (!code) return null;
    return { code, labelSnapshot: raw.trim() };
  }
  if (!isRecord(raw)) return null;
  const code = readString(raw.code)?.toUpperCase();
  if (!code) return null;
  return {
    code,
    labelSnapshot: readString(raw.labelSnapshot) ?? readString(raw.label),
    destinationDetails: readString(raw.destinationDetails),
  };
}

function hydratePendingStudy(raw: unknown, index: number): InpatientProviderDischargePendingStudy | null {
  if (!isRecord(raw)) return null;
  const description = readString(raw.description);
  if (!description) return null;
  const typeRaw = readString(raw.type)?.toUpperCase() ?? "OTHER";
  const type = (INPATIENT_PENDING_STUDY_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as InpatientPendingStudyType)
    : "OTHER";
  return {
    id: readString(raw.id) ?? `pending-${index + 1}`,
    type,
    description,
    responsibleParty: readString(raw.responsibleParty),
    followUpPlan: readString(raw.followUpPlan),
  };
}

/** Hydrate provider discharge namespace from stored JSON (1A shell + 1B + legacy flat). */
export function hydrateInpatientProviderDischarge(raw: unknown): InpatientProviderDischargeV1B | null {
  if (!isRecord(raw)) return null;

  const base = emptyInpatientProviderDischarge();
  const admissionDiagnosis =
    hydrateAdmissionDiagnosis(raw.admissionDiagnosis) ??
    (readString(raw.admissionDiagnosis)
      ? { description: readString(raw.admissionDiagnosis) }
      : null);

  const dischargeDiagnosesRaw = Array.isArray(raw.dischargeDiagnoses) ? raw.dischargeDiagnoses : [];
  const dischargeDiagnoses = dischargeDiagnosesRaw
    .map((row, i) => hydrateDischargeDiagnosis(row, i))
    .filter((row): row is InpatientProviderDischargeDiagnosis => row != null);

  const pendingStudiesRaw = Array.isArray(raw.pendingStudies) ? raw.pendingStudies : [];
  const pendingStudies = pendingStudiesRaw
    .map((row, i) => hydratePendingStudy(row, i))
    .filter((row): row is InpatientProviderDischargePendingStudy => row != null);

  const conditionAtDischarge = hydrateConditionAtDischarge(raw.conditionAtDischarge);
  const finalDisposition = hydrateFinalDisposition(raw.finalDisposition);

  const auth = isRecord(raw.authorization) ? raw.authorization : null;

  const hasContent =
    dischargeDiagnoses.length > 0 ||
    pendingStudies.length > 0 ||
    readString(raw.reasonForHospitalization) ||
    readString(raw.hospitalCourse) ||
    readString(raw.significantFindings) ||
    readString(raw.proceduresAndTreatments) ||
    readString(raw.consultations) ||
    readString(raw.complications) ||
    conditionAtDischarge ||
    finalDisposition ||
    admissionDiagnosis ||
    readString(raw.documentedByUserId) ||
    auth?.byUserId;

  if (!hasContent) return null;

  return {
    schemaVersion: INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION,
    admissionDiagnosis,
    dischargeDiagnoses,
    reasonForHospitalization: readString(raw.reasonForHospitalization),
    hospitalCourse: readString(raw.hospitalCourse),
    significantFindings: readString(raw.significantFindings),
    proceduresAndTreatments: readString(raw.proceduresAndTreatments),
    consultations: readString(raw.consultations),
    complications: readString(raw.complications),
    conditionAtDischarge,
    finalDisposition,
    pendingStudies,
    documentedAt:
      readString(raw.documentedAt) ??
      (typeof auth?.at === "string" ? auth.at : null),
    documentedByUserId:
      readString(raw.documentedByUserId) ??
      (typeof auth?.byUserId === "string" ? auth.byUserId : null),
    documentedByDisplayNameSnapshot:
      readString(raw.documentedByDisplayNameSnapshot) ??
      readString(auth?.displayNameSnapshot),
    documentedByProfessionalTitleSnapshot:
      readString(raw.documentedByProfessionalTitleSnapshot) ??
      readString(auth?.professionalTitleSnapshot),
    lastUpdatedAt: readString(raw.lastUpdatedAt),
    revision:
      typeof raw.revision === "number" && Number.isFinite(raw.revision)
        ? Math.max(0, Math.floor(raw.revision))
        : 0,
  };
}

export function readInpatientProviderDischargeFromSummary(
  dischargeSummaryJson: unknown
): InpatientProviderDischargeV1B | null {
  if (!isRecord(dischargeSummaryJson)) return null;
  return hydrateInpatientProviderDischarge(dischargeSummaryJson.inpatientProviderDischarge);
}

export function countPrimaryDischargeDiagnoses(
  diagnoses: readonly InpatientProviderDischargeDiagnosis[]
): number {
  return diagnoses.filter((d) => d.isPrimary).length;
}

export function normalizeDischargeDiagnoses(
  diagnoses: readonly InpatientProviderDischargeDiagnosis[]
): InpatientProviderDischargeDiagnosis[] {
  const sorted = [...diagnoses].sort((a, b) => a.sortOrder - b.sortOrder);
  let primarySeen = false;
  return sorted.map((row, index) => {
    let isPrimary = row.isPrimary;
    if (isPrimary) {
      if (primarySeen) isPrimary = false;
      else primarySeen = true;
    }
    return {
      ...row,
      id: row.id.trim() || `dx-${index + 1}`,
      description: row.description.trim(),
      code: trimOrNull(row.code),
      isPrimary,
      sortOrder: index,
    };
  });
}

/** Validate provider discharge for draft or complete save. */
export function validateInpatientProviderDischarge(
  doc: InpatientProviderDischargeV1B,
  mode: InpatientProviderDischargeSaveMode
): InpatientProviderDischargeValidationResult {
  if (mode === "draft") return { ok: true };

  const errors: string[] = [];
  const diagnoses = normalizeDischargeDiagnoses(doc.dischargeDiagnoses);
  if (diagnoses.length === 0) {
    errors.push("DISCHARGE_DIAGNOSIS_REQUIRED");
  }
  const primaryCount = countPrimaryDischargeDiagnoses(diagnoses);
  if (diagnoses.length > 0 && primaryCount !== 1) {
    errors.push("PRIMARY_DISCHARGE_DIAGNOSIS_REQUIRED");
  }
  if (!readString(doc.hospitalCourse)) {
    errors.push("HOSPITAL_COURSE_REQUIRED");
  }
  if (!doc.conditionAtDischarge?.status) {
    errors.push("CONDITION_AT_DISCHARGE_REQUIRED");
  } else if (
    doc.conditionAtDischarge.status === "OTHER" &&
    !readString(doc.conditionAtDischarge.narrative)
  ) {
    errors.push("CONDITION_AT_DISCHARGE_NARRATIVE_REQUIRED");
  }
  if (!doc.finalDisposition?.code?.trim()) {
    errors.push("FINAL_DISPOSITION_REQUIRED");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Strip client-submitted authorship — server resolves identity. */
export function sanitizeInpatientProviderDischargeClientPayload(
  input: unknown
): Partial<InpatientProviderDischargeV1B> {
  if (!isRecord(input)) return {};
  const {
    documentedAt: _a,
    documentedByUserId: _b,
    documentedByDisplayNameSnapshot: _c,
    documentedByProfessionalTitleSnapshot: _d,
    lastUpdatedAt: _e,
    revision: _r,
    schemaVersion: _s,
    authorization: _auth,
    ...rest
  } = input;
  return rest as Partial<InpatientProviderDischargeV1B>;
}

export function mergeInpatientProviderDischargePayload(
  existing: InpatientProviderDischargeV1B | null,
  patch: Partial<InpatientProviderDischargeV1B>
): InpatientProviderDischargeV1B {
  const base = existing ?? emptyInpatientProviderDischarge();
  const dischargeDiagnoses = Array.isArray(patch.dischargeDiagnoses)
    ? normalizeDischargeDiagnoses(patch.dischargeDiagnoses)
    : base.dischargeDiagnoses;
  const pendingStudies = Array.isArray(patch.pendingStudies)
    ? patch.pendingStudies
        .map((row, i) => hydratePendingStudy(row, i))
        .filter((row): row is InpatientProviderDischargePendingStudy => row != null)
    : base.pendingStudies;

  return {
    ...base,
    ...patch,
    schemaVersion: INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION,
    admissionDiagnosis:
      patch.admissionDiagnosis !== undefined
        ? patch.admissionDiagnosis
        : base.admissionDiagnosis,
    dischargeDiagnoses,
    pendingStudies,
    conditionAtDischarge:
      patch.conditionAtDischarge !== undefined
        ? patch.conditionAtDischarge
        : base.conditionAtDischarge,
    finalDisposition:
      patch.finalDisposition !== undefined ? patch.finalDisposition : base.finalDisposition,
  };
}

/** Project provider namespace into legacy flat dischargeSummaryJson fields for readers/print. */
export function projectInpatientProviderDischargeToFlatFields(
  doc: InpatientProviderDischargeV1B
): Record<string, unknown> {
  const primary = doc.dischargeDiagnoses.find((d) => d.isPrimary) ?? doc.dischargeDiagnoses[0];
  const secondary = doc.dischargeDiagnoses.filter((d) => d !== primary);
  const diagnosisSummary = [
    primary
      ? [primary.code, primary.description].filter(Boolean).join(" — ")
      : null,
    ...secondary.map((d) => [d.code, d.description].filter(Boolean).join(" — ")),
  ]
    .filter(Boolean)
    .join("; ");

  const finalCode = doc.finalDisposition?.code?.trim() ?? null;
  const finalLabel = doc.finalDisposition?.labelSnapshot?.trim() ?? finalCode;

  const pendingLines = doc.pendingStudies.map((s) => {
    const parts = [s.type, s.description];
    if (s.responsibleParty) parts.push(`(${s.responsibleParty})`);
    if (s.followUpPlan) parts.push(`— ${s.followUpPlan}`);
    return parts.join(" ");
  });

  const flat: Record<string, unknown> = {
    dischargeDiagnosisSummary: diagnosisSummary || null,
    hospitalCourse: doc.hospitalCourse ?? null,
    reasonForHospitalization: doc.reasonForHospitalization ?? null,
    significantFindings: doc.significantFindings ?? null,
    proceduresAndTreatments: doc.proceduresAndTreatments ?? null,
    consultations: doc.consultations ?? null,
    complications: doc.complications ?? null,
    finalDisposition: finalCode,
    dischargeMode: finalLabel,
    exitCondition: doc.conditionAtDischarge?.status ?? null,
    conditionAtDischargeNarrative: doc.conditionAtDischarge?.narrative ?? null,
    pendingStudiesSummary: pendingLines.length ? pendingLines.join("\n") : null,
    providerDischargeDocumentedAt: doc.documentedAt ?? null,
    providerDischargeDocumentedByDisplayName: doc.documentedByDisplayNameSnapshot ?? null,
    providerDischargeDocumentedByTitle: doc.documentedByProfessionalTitleSnapshot ?? null,
    plannedDestinationNotFinalDisposition: true,
  };

  if (doc.admissionDiagnosis?.description || doc.admissionDiagnosis?.code) {
    flat.admissionDiagnosisSummary = [doc.admissionDiagnosis.code, doc.admissionDiagnosis.description]
      .filter(Boolean)
      .join(" — ");
  }

  return flat;
}

/** Merge provider namespace into dischargeSummaryJson without deleting unrelated keys. */
export function mergeInpatientProviderDischargeIntoDischargeSummary(
  existingDischargeSummary: unknown,
  providerDoc: InpatientProviderDischargeV1B
): Record<string, unknown> {
  const base = isRecord(existingDischargeSummary) ? { ...existingDischargeSummary } : {};
  const flatProjection = projectInpatientProviderDischargeToFlatFields(providerDoc);

  return {
    ...base,
    ...flatProjection,
    inpatientProviderDischarge: providerDoc,
  };
}

/**
 * Suggest a final disposition code from planning destination — UI hint only.
 * Never auto-applies; caller must require explicit provider confirmation.
 */
export function suggestFinalDispositionFromPlannedDestination(
  plannedDestination: string | null | undefined
): InpatientFinalDispositionCode | null {
  const raw = trimOrNull(plannedDestination)?.toUpperCase() ?? "";
  if (!raw) return null;
  if (raw.includes("HOME") && raw.includes("HEALTH")) return "HOME_WITH_HOME_HEALTH";
  if (raw === "HOME" || raw.includes("DOMICILE") || raw.includes("DOMICILE")) return "HOME";
  if (raw.includes("SNF") || raw.includes("SKILLED") || raw.includes("EHPAD")) {
    return "SKILLED_NURSING_FACILITY";
  }
  if (raw.includes("REHAB")) return "ACUTE_REHAB";
  if (raw.includes("LTAC") || raw.includes("LONG_TERM")) return "LONG_TERM_ACUTE_CARE";
  if (raw.includes("ASSISTED")) return "ASSISTED_LIVING";
  if (raw.includes("HOSPICE")) return "HOSPICE";
  if (raw.includes("TRANSFER")) return "TRANSFER_ACUTE_CARE";
  if (raw.includes("BEHAVIOR") || raw.includes("PSYCH")) return "BEHAVIORAL_HEALTH_FACILITY";
  if (raw.includes("AMA") || raw.includes("AGAINST")) return "AGAINST_MEDICAL_ADVICE";
  return null;
}

/** True when planned destination was copied into final disposition without explicit provider action. */
export function plannedDestinationSilentlyBecameFinalDisposition(input: {
  plannedDestination?: string | null;
  finalDisposition?: InpatientProviderDischargeFinalDisposition | null;
  explicitlyConfirmed?: boolean;
}): boolean {
  if (input.explicitlyConfirmed === true) return false;
  const planned = trimOrNull(input.plannedDestination)?.toLowerCase();
  const finalCode = trimOrNull(input.finalDisposition?.code)?.toLowerCase();
  if (!planned || !finalCode) return false;
  if (planned === finalCode) return true;
  const suggested = suggestFinalDispositionFromPlannedDestination(planned);
  return suggested != null && suggested.toLowerCase() === finalCode;
}
