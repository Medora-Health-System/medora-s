/**
 * Stage B1 — Enterprise chart certification contracts (advisory foundation).
 * Certification ID: MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B1
 */

export const CHART_CERTIFICATION_B1_ID =
  "MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B1" as const;

export const CHART_CERTIFICATION_B1_VERSION = "ed-chart-certification-b1-1.0.0" as const;

export const CHART_CERTIFICATION_B1_STAGE = "B1" as const;

export const ChartCertificationB1Authority = {
  ADVISORY: "ADVISORY",
  SELECTED_MODULES_AUTHORITATIVE: "SELECTED_MODULES_AUTHORITATIVE",
} as const;

export type ChartCertificationB1Authority =
  (typeof ChartCertificationB1Authority)[keyof typeof ChartCertificationB1Authority];

export const ChartCertificationCoverageStatus = {
  PARTIAL: "PARTIAL",
  COMPLETE: "COMPLETE",
  ERROR: "ERROR",
} as const;

export type ChartCertificationCoverageStatus =
  (typeof ChartCertificationCoverageStatus)[keyof typeof ChartCertificationCoverageStatus];

export const CertificationModule = {
  REGISTRATION: "REGISTRATION",
  TRIAGE: "TRIAGE",
  NURSING: "NURSING",
  PROVIDER: "PROVIDER",
  DISPOSITION_DOCUMENTATION: "DISPOSITION_DOCUMENTATION",
  ORDERS: "ORDERS",
  LAB_RESULTS: "LAB_RESULTS",
  IMAGING: "IMAGING",
  ECG: "ECG",
  RESULT_ACKNOWLEDGMENT: "RESULT_ACKNOWLEDGMENT",
  MEDICATION_ORDERS: "MEDICATION_ORDERS",
  MAR: "MAR",
  INFUSIONS: "INFUSIONS",
  PROCEDURES: "PROCEDURES",
  CLINICAL_PATHWAYS: "CLINICAL_PATHWAYS",
  FULL_REASSESSMENT: "FULL_REASSESSMENT",
} as const;

export type CertificationModule =
  (typeof CertificationModule)[keyof typeof CertificationModule];

export const STAGE_B1_EVALUATED_MODULES: readonly CertificationModule[] = [
  CertificationModule.REGISTRATION,
  CertificationModule.TRIAGE,
  CertificationModule.NURSING,
  CertificationModule.PROVIDER,
  CertificationModule.DISPOSITION_DOCUMENTATION,
] as const;

export const STAGE_B1_UNEVALUATED_MODULES: readonly CertificationModule[] = [
  CertificationModule.ORDERS,
  CertificationModule.LAB_RESULTS,
  CertificationModule.IMAGING,
  CertificationModule.ECG,
  CertificationModule.RESULT_ACKNOWLEDGMENT,
  CertificationModule.MEDICATION_ORDERS,
  CertificationModule.MAR,
  CertificationModule.INFUSIONS,
  CertificationModule.PROCEDURES,
  CertificationModule.CLINICAL_PATHWAYS,
  CertificationModule.FULL_REASSESSMENT,
] as const;

export const ChartCertificationSourceAuthority = {
  ESTABLISHED_WORKFLOW: "ESTABLISHED_WORKFLOW",
  STAGE_B2_EVALUATED: "STAGE_B2_EVALUATED",
  STAGE_B1_EVALUATED: "STAGE_B1_EVALUATED",
  STAGE_A_ADVISORY: "STAGE_A_ADVISORY",
  HEURISTIC_FALLBACK: "HEURISTIC_FALLBACK",
} as const;

export type ChartCertificationSourceAuthority =
  (typeof ChartCertificationSourceAuthority)[keyof typeof ChartCertificationSourceAuthority];

export const ChartCertificationModuleAuthority = {
  ESTABLISHED_AUTHORITATIVE: "ESTABLISHED_AUTHORITATIVE",
  STAGE_B2_AUTHORITATIVE: "STAGE_B2_AUTHORITATIVE",
  STAGE_B1_AUTHORITATIVE: "STAGE_B1_AUTHORITATIVE",
  STAGE_B2_ADVISORY: "STAGE_B2_ADVISORY",
  STAGE_B1_ADVISORY: "STAGE_B1_ADVISORY",
  PARTIALLY_EVALUATED: "PARTIALLY_EVALUATED",
  UNEVALUATED: "UNEVALUATED",
} as const;

export type ChartCertificationModuleAuthority =
  (typeof ChartCertificationModuleAuthority)[keyof typeof ChartCertificationModuleAuthority];

export const ChartCertificationOwner = {
  REGISTRATION: "REGISTRATION",
  NURSING: "NURSING",
  PROVIDER: "PROVIDER",
  DISPOSITION: "DISPOSITION",
  BILLING: "BILLING",
  LABORATORY: "LABORATORY",
  IMAGING: "IMAGING",
  SYSTEM: "SYSTEM",
} as const;

export type ChartCertificationOwner =
  (typeof ChartCertificationOwner)[keyof typeof ChartCertificationOwner];

export const ChartCertificationSeverity = {
  INFORMATION: "INFORMATION",
  WARNING: "WARNING",
  BLOCKING: "BLOCKING",
} as const;

export type ChartCertificationSeverity =
  (typeof ChartCertificationSeverity)[keyof typeof ChartCertificationSeverity];

export type ChartCertificationDeficiencyEffects = {
  blocksClinicalClosure: boolean;
  blocksDisposition: boolean;
  blocksBilling: boolean;
  suggestsProviderReview: boolean;
  suggestsNursingReview: boolean;
  suggestsDocumentationReview: boolean;
};

export type ChartCertificationRemediation = {
  route?: string;
  tab?: string;
  section?: string;
  requiredRole?: string;
};

export type ChartCertificationEvidence = {
  status?: string;
  timestamp?: string;
  structuredField?: string;
};

export type ChartCertificationDeficiency = {
  stableCode: string;
  ruleVersion: string;
  module: CertificationModule;
  titleKey: string;
  descriptionKey: string;
  owner: ChartCertificationOwner;
  severity: ChartCertificationSeverity;
  sourceAuthority: ChartCertificationSourceAuthority;
  sourceEntityType?: string;
  sourceEntityId?: string;
  deduplicationKey: string;
  effects: ChartCertificationDeficiencyEffects;
  remediation: ChartCertificationRemediation;
  evidence?: ChartCertificationEvidence;
};

export type ChartCertificationWarning = {
  stableCode: string;
  module: CertificationModule;
  titleKey: string;
  descriptionKey: string;
  sourceAuthority: ChartCertificationSourceAuthority;
};

export type ChartCertificationInformation = {
  stableCode: string;
  module: CertificationModule;
  titleKey: string;
  descriptionKey: string;
};

export type SourceFreshness = {
  module: CertificationModule;
  sourceUpdatedAt?: string | null;
  encounterVersionAtLoad: number;
  status: "CURRENT" | "STALE" | "UNKNOWN" | "ERROR";
};

export type CertificationEvaluationError = {
  code: string;
  module?: CertificationModule;
  messageKey: string;
  details?: string;
};

export type ModuleCertificationSummary = {
  module: CertificationModule;
  evaluated: boolean;
  ready: boolean | null;
  authority: ChartCertificationModuleAuthority;
  deficiencyCount: number;
  warningCount: number;
  evaluationErrorCount: number;
  executionTimeMs: number;
  /** Stage B2 diagnostic entity tallies (optional). */
  totalEntitiesEvaluated?: number;
  completeCount?: number;
  acceptablePendingCount?: number;
  unresolvedCount?: number;
  excludedCount?: number;
  errorCount?: number;
  oldestUnresolvedTimestamp?: string | null;
  evaluatorVersion?: string;
};

export type ModuleCertificationResult = {
  module: CertificationModule;
  evaluated: boolean;
  ready: boolean | null;
  authority: ChartCertificationModuleAuthority;
  deficiencies: ChartCertificationDeficiency[];
  warnings: ChartCertificationWarning[];
  informationalItems: ChartCertificationInformation[];
  sourceFreshness: SourceFreshness;
  evaluationErrors: CertificationEvaluationError[];
  executionTimeMs: number;
};

export type ChartCertificationAuthoritativeReadiness = {
  clinicalClosureReady: boolean | null;
  dispositionReady: boolean | null;
  billingReady: boolean | null;
  sourceStatus: "COMPLETE" | "PARTIAL" | "ERROR";
};

export type ChartCertificationEvaluatedReadiness = {
  registrationReady: boolean | null;
  triageReady: boolean | null;
  nursingReady: boolean | null;
  providerReady: boolean | null;
  dispositionDocumentationReady: boolean | null;
  /** Stage B2 diagnostic domains — null when B2 not evaluated. */
  ordersReady?: boolean | null;
  laboratoryReady?: boolean | null;
  imagingReady?: boolean | null;
  ecgReady?: boolean | null;
  resultReviewReady?: boolean | null;
};

export type ChartCertificationAdvisoryReadiness = {
  documentationReviewSuggested: boolean;
  providerReviewSuggested: boolean;
  nursingReviewSuggested: boolean;
  registrationReviewSuggested: boolean;
  triageReviewSuggested: boolean;
};

export type ChartCertificationB1Result = {
  encounterId: string;
  facilityId: string;
  /** B1 or B2 certification id depending on enabled stage. */
  certificationId: string;
  certificationVersion: string;
  certificationStage: "B1" | "B2";
  certificationAuthority: ChartCertificationB1Authority;
  coverageStatus: ChartCertificationCoverageStatus;
  evaluatedAt: string;
  encounterVersion: number;
  /** Deterministic diagnostic revision when B2 loads orders/results (not Encounter.version). */
  diagnosticRevision?: string | null;
  authoritativeReadiness: ChartCertificationAuthoritativeReadiness;
  evaluatedReadiness: ChartCertificationEvaluatedReadiness;
  advisoryReadiness: ChartCertificationAdvisoryReadiness;
  moduleSummaries: ModuleCertificationSummary[];
  deficiencies: ChartCertificationDeficiency[];
  warnings: ChartCertificationWarning[];
  informationalItems: ChartCertificationInformation[];
  evaluatedModules: CertificationModule[];
  unevaluatedModules: CertificationModule[];
  sourceFreshness: SourceFreshness[];
  evaluationErrors: CertificationEvaluationError[];
};

/** PHI-safe structured snapshot for pure evaluators (no full note bodies). */
export type ChartCertificationB1Context = {
  encounterId: string;
  facilityId: string;
  encounterVersion: number;
  evaluatedAt: string;
  encounter: {
    status: string | null;
    workflowState: string | null;
    type: string | null;
    createdAt: string | null;
    dischargedAt: string | null;
    dischargeStatus: string | null;
    disposition: string | null;
    chiefComplaint: string | null;
    providerDocumentationStatus: string | null;
    providerDocumentationSignedAt: string | null;
    providerDocumentationSignedByUserId: string | null;
    providerNotePresent: boolean;
    treatmentPlanPresent: boolean;
    physicianAssignedUserId: string | null;
    nurseAssignedUserId: string | null;
    roomLabel: string | null;
    billingFinalizationStatus: string | null;
    billingReadinessSnapshot: {
      isReady?: boolean;
      requiresManualReview?: boolean;
    } | null;
    dischargeSummaryJson: unknown;
    admissionSummaryJson: unknown;
    nursingAssessment: unknown;
  };
  patient: {
    dob: string | null;
    sexAtBirth: string | null;
    mrn: string | null;
    phone: string | null;
    firstNamePresent: boolean;
    lastNamePresent: boolean;
    ageYears: number | null;
    /** Valid registration exception — unknown / unable to provide DOB. */
    demographicException?: "UNKNOWN" | "UNABLE_TO_PROVIDE" | null;
  };
  triage: {
    present: boolean;
    triageCompleteAt: string | null;
    esi: number | null;
    chiefComplaint: string | null;
    vitalsPresent: boolean;
    activeVitalsReadingCount: number;
    strokeScreenPresent: boolean;
    sepsisScreenPresent: boolean;
    updatedAt: string | null;
  } | null;
  nursing: {
    assessmentPresent: boolean;
    reassessmentPresent: boolean;
    clinicalDocActiveCount: number;
    noteActiveCount: number;
  };
  provider: {
    signed: boolean;
    contentPresent: boolean;
    hasMdm: boolean;
    hasPhysicalExamSignal: boolean;
    hasHistorySignal: boolean;
    diagnosisCount: number;
    supervisingAttestationRequired: boolean;
    supervisingAttestationPresent: boolean;
  };
  established: {
    dispositionCanClose: boolean | null;
    dispositionBlockers: Array<{ code: string; message: string }>;
    dispositionLoadError: boolean;
    physicalDepartureComplete: boolean;
    closeCheckLoadError: boolean;
  };
};
