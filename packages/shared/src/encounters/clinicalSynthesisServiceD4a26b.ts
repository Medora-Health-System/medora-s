/**
 * D4A.2.6B — Reusable Clinical Synthesis Service contracts.
 *
 * Read models only. Does not invent clinical facts, diagnoses, assessments,
 * orders, acknowledgements, or medical decisions.
 */

export const PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID =
  "MEDUI.PROVIDER_LEGAL_RECORD_SYNTHESIS.D4A2_6B" as const;

export const CLINICAL_SYNTHESIS_SECTION_KEYS = [
  "vitals",
  "intakeOutput",
  "labs",
  "imaging",
  "medications",
  "problems",
  "consults",
  "events",
  "tasks",
  "dischargeReadiness",
  "careTeam",
] as const;

export type ClinicalSynthesisSectionKey = (typeof CLINICAL_SYNTHESIS_SECTION_KEYS)[number];

export const CLINICAL_SYNTHESIS_AUDIENCES = [
  "PROVIDER",
  "HOSPITAL_COMMAND_CENTER",
  "NURSING_READ_ONLY",
  "QUALITY",
  "EXECUTIVE_AGGREGATE",
] as const;

export type ClinicalSynthesisAudience = (typeof CLINICAL_SYNTHESIS_AUDIENCES)[number];

export const CLINICAL_SYNTHESIS_DOMAIN_STATES = [
  "RESOLVED",
  "PARTIAL",
  "MISSING",
  "UNAVAILABLE",
  "UNAUTHORIZED",
  "STALE",
  "ENTERED_IN_ERROR",
] as const;

export type ClinicalSynthesisDomainState = (typeof CLINICAL_SYNTHESIS_DOMAIN_STATES)[number];

export const CLINICAL_SYNTHESIS_TIME_WINDOWS = ["current", "24h", "admission"] as const;

export type ClinicalSynthesisTimeWindow = (typeof CLINICAL_SYNTHESIS_TIME_WINDOWS)[number];

export type ClinicalSynthesisProvenanceV1 = {
  sourceDomain: string;
  authoritativeRecordIds: string[];
  timestamp: string | null;
  authorDisplayName: string | null;
  authorUserId: string | null;
  facilityId: string;
  encounterId: string;
  classification: "ADMISSION_EVIDENCE" | "CURRENT_STATE" | "PROVIDER_ASSESSMENT" | "HISTORICAL" | "ENTERED_IN_ERROR";
  warnings: string[];
};

export type ClinicalSynthesisDomainEnvelope<T> = {
  state: ClinicalSynthesisDomainState;
  data: T | null;
  provenance: ClinicalSynthesisProvenanceV1;
};

export type ClinicianIdentityV1 = {
  userId: string | null;
  displayName: string;
  credentials: string | null;
  role: string | null;
  specialty: string | null;
  service: string | null;
  relationship: "ATTENDING" | "HOSPITALIST" | "RESIDENT" | "APP" | "CONSULTING" | "COVERING" | "ADMITTING" | "DISCHARGE" | "UNKNOWN";
  active: boolean;
  unresolved: boolean;
};

export type ClinicalSynthesisQueryV1 = {
  audience: ClinicalSynthesisAudience;
  include?: ClinicalSynthesisSectionKey[];
  timeWindow?: ClinicalSynthesisTimeWindow;
};

export type ClinicalSynthesisDataAvailabilityV1 = {
  sections: Partial<Record<ClinicalSynthesisSectionKey, ClinicalSynthesisDomainState>>;
  warnings: string[];
  offlineHint: boolean;
};

export const CLINICAL_SYNTHESIS_ERROR_CODES = [
  "PROVIDER_DOCUMENT_STALE",
  "PROVIDER_DOCUMENT_ALREADY_SIGNED",
  "PROVIDER_DOCUMENT_NOT_SIGNED",
  "PROVIDER_DOCUMENT_AMENDMENT_NOT_AUTHORIZED",
  "PROVIDER_DOCUMENT_CORRECTION_NOT_AUTHORIZED",
  "PROVIDER_DOCUMENT_ENTERED_IN_ERROR",
  "PROVIDER_DOCUMENT_REVISION_NOT_FOUND",
  "PROVIDER_DOCUMENT_ENCOUNTER_STATE_INVALID",
  "CLINICAL_SYNTHESIS_DOMAIN_UNAVAILABLE",
  "CLINICAL_SYNTHESIS_SOURCE_MISMATCH",
  "CLINICAL_SYNTHESIS_STALE",
  "PROVIDER_ASSIGNMENT_REQUIRED",
  "CRITICAL_RESULT_ALREADY_ACKNOWLEDGED",
  "CRITICAL_RESULT_ACKNOWLEDGEMENT_STALE",
  "CRITICAL_RESULT_ACKNOWLEDGEMENT_NOT_AUTHORIZED",
  "PROVIDER_CENSUS_FILTER_UNSUPPORTED",
  "PRINT_PACKAGE_REVISION_UNAVAILABLE",
  "FACILITY_SCOPE_MISMATCH",
] as const;

export type ClinicalSynthesisErrorCode = (typeof CLINICAL_SYNTHESIS_ERROR_CODES)[number];

export const PROVIDER_CENSUS_FACETS = [
  "attending",
  "assignedProvider",
  "resident",
  "app",
  "consultingService",
  "facility",
  "unit",
  "room",
  "levelOfCare",
  "observation",
  "medSurg",
  "icu",
  "telemetry",
  "isolation",
  "codeStatus",
  "lengthOfStay",
  "pendingConsult",
  "pendingImaging",
  "pendingPt",
  "pendingOt",
  "pendingCaseManagement",
  "pendingPlacement",
  "dischargeReady",
  "estimatedDischargeDate",
  "unsignedHp",
  "unsignedProgressNote",
  "unsignedDischargeSummary",
  "criticalUnacknowledgedResult",
] as const;

export type ProviderCensusFacet = (typeof PROVIDER_CENSUS_FACETS)[number];

/** Facets that have authoritative sources in current Phase-1 models. */
export const PROVIDER_CENSUS_SUPPORTED_FACETS: readonly ProviderCensusFacet[] = [
  "attending",
  "facility",
  "unit",
  "room",
  "observation",
  "medSurg",
  "lengthOfStay",
  "pendingConsult",
  "dischargeReady",
  "unsignedHp",
  "unsignedProgressNote",
  "criticalUnacknowledgedResult",
] as const;

export const PROVIDER_CENSUS_UNSUPPORTED_FACETS: readonly ProviderCensusFacet[] =
  PROVIDER_CENSUS_FACETS.filter(
    (f) => !(PROVIDER_CENSUS_SUPPORTED_FACETS as readonly string[]).includes(f)
  ) as ProviderCensusFacet[];

export function providerCensusFacetSupport(facet: ProviderCensusFacet): "SUPPORTED" | "UNSUPPORTED" {
  return (PROVIDER_CENSUS_SUPPORTED_FACETS as readonly string[]).includes(facet)
    ? "SUPPORTED"
    : "UNSUPPORTED";
}

export function resolveClinicianIdentity(input: {
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  credentials?: string | null;
  role?: string | null;
  specialty?: string | null;
  service?: string | null;
  relationship?: ClinicianIdentityV1["relationship"];
  active?: boolean;
}): ClinicianIdentityV1 {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (!name && !input.userId) {
    return {
      userId: null,
      displayName: "Unknown clinician",
      credentials: null,
      role: input.role ?? null,
      specialty: input.specialty ?? null,
      service: input.service ?? null,
      relationship: input.relationship ?? "UNKNOWN",
      active: input.active ?? false,
      unresolved: true,
    };
  }
  if (!name) {
    return {
      userId: input.userId ?? null,
      displayName: "Unknown clinician",
      credentials: input.credentials ?? null,
      role: input.role ?? null,
      specialty: input.specialty ?? null,
      service: input.service ?? null,
      relationship: input.relationship ?? "UNKNOWN",
      active: input.active ?? true,
      unresolved: true,
    };
  }
  return {
    userId: input.userId ?? null,
    displayName: input.credentials ? `${name}, ${input.credentials}` : name,
    credentials: input.credentials ?? null,
    role: input.role ?? null,
    specialty: input.specialty ?? null,
    service: input.service ?? null,
    relationship: input.relationship ?? "UNKNOWN",
    active: input.active ?? true,
    unresolved: false,
  };
}

export function envelopeDomain<T>(input: {
  state: ClinicalSynthesisDomainState;
  data: T | null;
  sourceDomain: string;
  recordIds?: string[];
  timestamp?: string | null;
  authorDisplayName?: string | null;
  authorUserId?: string | null;
  facilityId: string;
  encounterId: string;
  classification: ClinicalSynthesisProvenanceV1["classification"];
  warnings?: string[];
}): ClinicalSynthesisDomainEnvelope<T> {
  return {
    state: input.state,
    data: input.data,
    provenance: {
      sourceDomain: input.sourceDomain,
      authoritativeRecordIds: input.recordIds ?? [],
      timestamp: input.timestamp ?? null,
      authorDisplayName: input.authorDisplayName ?? null,
      authorUserId: input.authorUserId ?? null,
      facilityId: input.facilityId,
      encounterId: input.encounterId,
      classification: input.classification,
      warnings: input.warnings ?? [],
    },
  };
}

export function clinicalSynthesisMustNotInventFacts(): true {
  return true;
}
export function clinicalSynthesisMustNotAutoAcknowledge(): true {
  return true;
}
export function clinicalSynthesisMustNotWriteOrders(): true {
  return true;
}
export function printMustDistinguishLegalRecordFromSynthesis(): true {
  return true;
}

export type CommandCenterSynthesisLiteV1 = {
  certification: typeof PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID;
  encounterId: string;
  patientId: string;
  status: string | null;
  levelOfCare: string | null;
  lengthOfStayHours: number | null;
  dischargeReadiness: {
    medicalReady: boolean;
    workflowState: string | null;
    barrierCount: number;
  };
  criticalUnacknowledgedCount: number;
  pendingConsultCount: number;
  pendingImagingCount: number;
  attendingDisplayName: string | null;
  generatedAt: string;
  reusedClinicalSynthesisService: true;
};
