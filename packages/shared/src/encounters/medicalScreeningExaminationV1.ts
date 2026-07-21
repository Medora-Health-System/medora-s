/**
 * D2.5 — Medical Screening Examination legal-status record (encounter-level).
 * Stored under nursingAssessment.medicalScreeningExaminationV1 (JSON, no Prisma migration).
 *
 * Documentation support only — never claims EMTALA/legal compliance.
 * Status must come from explicit qualified-clinician documentation, not triage/vitals/registration.
 */

export const MEDICAL_SCREENING_EXAMINATION_V1_KEY = "medicalScreeningExaminationV1" as const;
export const ER_PROVIDER_MSE_LEGACY_KEY = "erProviderMseV1" as const;

export const MseDocumentationStatus = {
  NONE: "NONE",
  DRAFT: "DRAFT",
  SIGNED: "SIGNED",
} as const;
export type MseDocumentationStatus =
  (typeof MseDocumentationStatus)[keyof typeof MseDocumentationStatus];

export const MseClinicalStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  UNABLE_TO_COMPLETE_PATIENT_LEFT: "UNABLE_TO_COMPLETE_PATIENT_LEFT",
  UNABLE_TO_COMPLETE_REFUSAL: "UNABLE_TO_COMPLETE_REFUSAL",
  UNABLE_TO_COMPLETE_OTHER: "UNABLE_TO_COMPLETE_OTHER",
  CORRECTED: "CORRECTED",
} as const;
export type MseClinicalStatus = (typeof MseClinicalStatus)[keyof typeof MseClinicalStatus];

export const MseEmcDetermination = {
  PRESENT: "PRESENT",
  NOT_PRESENT: "NOT_PRESENT",
  UNDETERMINED: "UNDETERMINED",
} as const;
export type MseEmcDetermination = (typeof MseEmcDetermination)[keyof typeof MseEmcDetermination];

export const MseStabilityStatus = {
  STABLE: "STABLE",
  UNSTABLE: "UNSTABLE",
  UNDETERMINED: "UNDETERMINED",
} as const;
export type MseStabilityStatus = (typeof MseStabilityStatus)[keyof typeof MseStabilityStatus];

export type MedicalScreeningExaminationV1 = {
  status: MseClinicalStatus;
  documentationStatus: MseDocumentationStatus;
  startedAt: string | null;
  completedAt: string | null;
  clinicianNameSnapshot: string | null;
  clinicianRole: string | null;
  emergencyMedicalConditionDetermination: MseEmcDetermination | null;
  emergencyMedicalConditionSummary: string | null;
  stabilityStatus: MseStabilityStatus | null;
  limitations: string | null;
  patientRefusal: string | null;
  revision: number;
  signedAt: string | null;
  signedByDisplayName: string | null;
  /** CURRENT structured record vs LEGACY projection from erProviderMseV1. */
  source: "CURRENT" | "LEGACY";
  /** Explicit: never use as EMTALA compliance attestation. */
  emtalaComplianceClaim: false;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStr(o: Record<string, unknown> | null, key: string): string | null {
  if (!o) return null;
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function emptyMse(): MedicalScreeningExaminationV1 {
  return {
    status: MseClinicalStatus.NOT_STARTED,
    documentationStatus: MseDocumentationStatus.NONE,
    startedAt: null,
    completedAt: null,
    clinicianNameSnapshot: null,
    clinicianRole: null,
    emergencyMedicalConditionDetermination: null,
    emergencyMedicalConditionSummary: null,
    stabilityStatus: null,
    limitations: null,
    patientRefusal: null,
    revision: 0,
    signedAt: null,
    signedByDisplayName: null,
    source: "CURRENT",
    emtalaComplianceClaim: false,
  };
}

function parseStatus(raw: string | null): MseClinicalStatus | null {
  if (!raw) return null;
  return (Object.values(MseClinicalStatus) as string[]).includes(raw)
    ? (raw as MseClinicalStatus)
    : null;
}

function parseDocStatus(raw: string | null): MseDocumentationStatus | null {
  if (!raw) return null;
  return (Object.values(MseDocumentationStatus) as string[]).includes(raw)
    ? (raw as MseDocumentationStatus)
    : null;
}

function hasLegacyProviderMseContent(nursingAssessment: unknown): boolean {
  const nursing = asObject(nursingAssessment);
  const mse = asObject(nursing?.[ER_PROVIDER_MSE_LEGACY_KEY]);
  if (!mse) return false;
  const narrativeKeys = [
    "chiefConcern",
    "hpiNarrative",
    "focusedImpression",
    "mdmWorkingAssessment",
    "mdmPlanSummary",
  ];
  return narrativeKeys.some((k) => {
    const v = mse[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/**
 * Read MSE legal-status record. Never infers COMPLETED from triage/vitals/registration.
 * Soft erProviderMseV1 content without SIGNED MSE V1 → LEGACY IN_PROGRESS (not COMPLETED).
 */
export function readMedicalScreeningExaminationV1(
  nursingAssessment: unknown
): MedicalScreeningExaminationV1 {
  const nursing = asObject(nursingAssessment);
  const raw = asObject(nursing?.[MEDICAL_SCREENING_EXAMINATION_V1_KEY]);
  if (raw) {
    const status = parseStatus(readStr(raw, "status")) ?? MseClinicalStatus.NOT_STARTED;
    const documentationStatus =
      parseDocStatus(readStr(raw, "documentationStatus")) ?? MseDocumentationStatus.NONE;
    const emcRaw = readStr(raw, "emergencyMedicalConditionDetermination");
    const stabRaw = readStr(raw, "stabilityStatus");
    const revisionRaw = raw.revision;
    return {
      status,
      documentationStatus,
      startedAt: readStr(raw, "startedAt"),
      completedAt: readStr(raw, "completedAt"),
      clinicianNameSnapshot: readStr(raw, "clinicianNameSnapshot"),
      clinicianRole: readStr(raw, "clinicianRole"),
      emergencyMedicalConditionDetermination:
        emcRaw && (Object.values(MseEmcDetermination) as string[]).includes(emcRaw)
          ? (emcRaw as MseEmcDetermination)
          : null,
      emergencyMedicalConditionSummary: readStr(raw, "emergencyMedicalConditionSummary"),
      stabilityStatus:
        stabRaw && (Object.values(MseStabilityStatus) as string[]).includes(stabRaw)
          ? (stabRaw as MseStabilityStatus)
          : null,
      limitations: readStr(raw, "limitations"),
      patientRefusal: readStr(raw, "patientRefusal"),
      revision:
        typeof revisionRaw === "number" && Number.isFinite(revisionRaw)
          ? Math.max(0, Math.floor(revisionRaw))
          : 0,
      signedAt: readStr(raw, "signedAt"),
      signedByDisplayName: readStr(raw, "signedByDisplayName"),
      source: readStr(raw, "source") === "LEGACY" ? "LEGACY" : "CURRENT",
      emtalaComplianceClaim: false,
    };
  }

  if (hasLegacyProviderMseContent(nursingAssessment)) {
    return {
      ...emptyMse(),
      status: MseClinicalStatus.IN_PROGRESS,
      documentationStatus: MseDocumentationStatus.DRAFT,
      source: "LEGACY",
    };
  }

  return emptyMse();
}

export function isMseCompleted(nursingAssessment: unknown): boolean {
  const mse = readMedicalScreeningExaminationV1(nursingAssessment);
  return (
    mse.status === MseClinicalStatus.COMPLETED &&
    mse.documentationStatus === MseDocumentationStatus.SIGNED
  );
}

export function isMseNotStarted(nursingAssessment: unknown): boolean {
  return readMedicalScreeningExaminationV1(nursingAssessment).status === MseClinicalStatus.NOT_STARTED;
}

/** Safe projection for disposition boards — never claims legal compliance. */
export function projectMseStatusForDisposition(nursingAssessment: unknown): {
  status: MseClinicalStatus;
  documentationStatus: MseDocumentationStatus;
  signed: boolean;
  source: "CURRENT" | "LEGACY";
  emtalaComplianceClaim: false;
  clinicianNameSnapshot: string | null;
  emergencyMedicalConditionDetermination: MseEmcDetermination | null;
} {
  const mse = readMedicalScreeningExaminationV1(nursingAssessment);
  return {
    status: mse.status,
    documentationStatus: mse.documentationStatus,
    signed: mse.documentationStatus === MseDocumentationStatus.SIGNED,
    source: mse.source,
    emtalaComplianceClaim: false,
    clinicianNameSnapshot: mse.clinicianNameSnapshot,
    emergencyMedicalConditionDetermination: mse.emergencyMedicalConditionDetermination,
  };
}

export function mergeMedicalScreeningExaminationV1IntoNursingAssessment(
  nursingAssessment: unknown,
  patch: Partial<MedicalScreeningExaminationV1>
): Record<string, unknown> {
  const base =
    nursingAssessment && typeof nursingAssessment === "object" && !Array.isArray(nursingAssessment)
      ? { ...(nursingAssessment as Record<string, unknown>) }
      : {};
  const current = readMedicalScreeningExaminationV1(nursingAssessment);
  const next: MedicalScreeningExaminationV1 = {
    ...current,
    ...patch,
    emtalaComplianceClaim: false,
    source: patch.source ?? "CURRENT",
  };
  base[MEDICAL_SCREENING_EXAMINATION_V1_KEY] = next;
  return base;
}
