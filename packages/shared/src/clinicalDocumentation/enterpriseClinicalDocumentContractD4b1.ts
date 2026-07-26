/**
 * MEDUI.D4B.1 — Enterprise clinical document canonical contract.
 *
 * One shared contract for clinical documents across disciplines.
 * Persistence adapters map existing stores into this shape.
 * Operational assignment (D4A.4) must never rewrite historical authorship.
 */

export const ENTERPRISE_CLINICAL_DOCUMENT_FOUNDATION_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_CLINICAL_DOCUMENTATION_FOUNDATION.D4B1" as const;

export const ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION = "D4B.1" as const;

/** Care settings recognized by the foundation (existing platform only). */
export const ENTERPRISE_CLINICAL_DOCUMENT_CARE_SETTINGS = [
  "EMERGENCY",
  "OBSERVATION",
  "INPATIENT",
  "OUTPATIENT",
  "URGENT_CARE",
] as const;

export type EnterpriseClinicalDocumentCareSetting =
  (typeof ENTERPRISE_CLINICAL_DOCUMENT_CARE_SETTINGS)[number];

/** Disciplines that later workspaces will specialize — designation ≠ authorization. */
export const ENTERPRISE_CLINICAL_DOCUMENT_DISCIPLINES = [
  "NURSING",
  "TECHNICIAN",
  "RESPIRATORY_THERAPY",
  "PHYSICAL_THERAPY",
  "OCCUPATIONAL_THERAPY",
  "SPEECH_LANGUAGE_PATHOLOGY",
  "CASE_MANAGEMENT",
  "SOCIAL_WORK",
  "UTILIZATION_REVIEW",
  "PROVIDER",
  "PHARMACY",
  "OTHER",
] as const;

export type EnterpriseClinicalDocumentDiscipline =
  (typeof ENTERPRISE_CLINICAL_DOCUMENT_DISCIPLINES)[number];

export const ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_STATES = [
  "DRAFT",
  "IN_PROGRESS",
  "READY_FOR_SIGNATURE",
  "SIGNED",
  "COSIGN_REQUIRED",
  "COSIGNED",
  "AMENDED",
  "CORRECTED",
  "ENTERED_IN_ERROR",
  "VOIDED",
] as const;

export type EnterpriseClinicalDocumentLifecycleState =
  (typeof ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_STATES)[number];

export type EnterpriseClinicalDocumentActorSnapshot = {
  userId: string | null;
  displayName: string | null;
  roleTitle: string | null;
};

export type EnterpriseClinicalDocumentStructuredContent = {
  schemaId: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
};

export type EnterpriseClinicalDocumentNarrativeContent = {
  sections: ReadonlyArray<{
    key: string;
    title?: string;
    text: string;
    lateEntry?: boolean;
  }>;
};

export type EnterpriseClinicalDocumentValidationIssue = {
  code: string;
  severity: "HARD_STOP" | "WARNING" | "INFO";
  fieldPath?: string;
  messageKey: string;
};

export type EnterpriseClinicalDocumentValidationState = {
  fieldValid: boolean;
  issues: ReadonlyArray<EnterpriseClinicalDocumentValidationIssue>;
};

export type EnterpriseClinicalDocumentCompletenessState = {
  clinicallyComplete: boolean;
  signatureReady: boolean;
  missingIndicators: ReadonlyArray<string>;
  acknowledgedExceptions: ReadonlyArray<string>;
};

export type EnterpriseClinicalDocumentLineage = {
  priorVersionId: string | null;
  currentVersionId: string;
  supersedesId: string | null;
  amendedFromId: string | null;
  amendmentReason: string | null;
  correctionReason: string | null;
  lateEntryLabeled: boolean;
};

/**
 * Canonical enterprise clinical document identity + metadata.
 * Adapters populate from existing persistence; do not invent a parallel DB table in D4B.1.
 */
export type EnterpriseClinicalDocument = {
  contractVersion: typeof ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION;
  /** 1. Document identity */
  documentId: string;
  /** Persistence adapter source */
  sourceArchitecture:
    | "ENCOUNTER_NOTE"
    | "EDOC_ENTRY"
    | "PROVIDER_DOCUMENTATION_SHELL"
    | "NURSING_ADMISSION"
    | "REFERENCE_VIRTUAL";
  /** 2–5 Identity linkage */
  patientId: string;
  encounterId: string;
  hospitalEpisodeId: string | null;
  facilityId: string;
  /** 6–9 Classification */
  careSetting: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  discipline: EnterpriseClinicalDocumentDiscipline;
  documentTypeId: string;
  templateVersion: string;
  /** 10–12 Actors (historical — immutable after signature events) */
  creator: EnterpriseClinicalDocumentActorSnapshot;
  author: EnterpriseClinicalDocumentActorSnapshot;
  responsibleSigner: EnterpriseClinicalDocumentActorSnapshot | null;
  cosigner: EnterpriseClinicalDocumentActorSnapshot | null;
  /** Explicitly separated from D4A.4 operational assignment */
  currentAssignedClinicianUserId: string | null;
  /** 13–17 Times (ISO-8601; server-authoritative when from API) */
  createdAt: string;
  serviceAt: string | null;
  lastEditedAt: string | null;
  signedAt: string | null;
  amendedAt: string | null;
  /** 18 Lifecycle */
  lifecycleState: EnterpriseClinicalDocumentLifecycleState;
  /** 19–20 Content */
  structured: EnterpriseClinicalDocumentStructuredContent | null;
  narrative: EnterpriseClinicalDocumentNarrativeContent | null;
  /** 21–22 Validation / completeness */
  validation: EnterpriseClinicalDocumentValidationState;
  completeness: EnterpriseClinicalDocumentCompletenessState;
  /** 23 Lineage */
  lineage: EnterpriseClinicalDocumentLineage;
  /** 24–25 Legal / export */
  legalRecordVisible: boolean;
  printExportEligible: boolean;
  enteredInError: boolean;
  voided: boolean;
};

/** Legal-record render projection (print/export readiness — not a PDF engine). */
export type EnterpriseClinicalDocumentLegalProjection = {
  contractVersion: typeof ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION;
  documentId: string;
  patientId: string;
  encounterId: string;
  facilityId: string;
  careSetting: string;
  documentTitle: string;
  discipline: string;
  authorDisplay: string | null;
  signerDisplay: string | null;
  cosignerDisplay: string | null;
  serviceAt: string | null;
  signedAt: string | null;
  lifecycleState: EnterpriseClinicalDocumentLifecycleState;
  amendmentLabel: string | null;
  addendumLabel: string | null;
  templateVersion: string;
  unsignedDraftMarked: boolean;
  enteredInErrorMarked: boolean;
  structuredSections: ReadonlyArray<{ key: string; title?: string; summary: string }>;
  narrativeSections: ReadonlyArray<{ key: string; title?: string; text: string }>;
  legalFooterKey: string;
};
