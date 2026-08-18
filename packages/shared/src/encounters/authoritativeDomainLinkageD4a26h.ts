/**
 * D4A.2.6H — Authoritative domain linkage hardening.
 *
 * Synthetic nursing-domain references must not satisfy completion, print,
 * or provider clinical projections.
 */

import type { InpatientAdmissionClinicalSection } from "./connectedInpatientAdmissionIntakeD4a0.js";
import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import {
  nursingDocDomainReferences,
  nursingSectionIntegration,
  projectNursingSectionCompletion,
  type NursingAdmissionDomainKey,
  type NursingAdmissionDomainReferenceV1,
} from "./nursingAdmissionDomainIntegrationD4a25a.js";
import type { InpatientClinicalOpsV1 } from "./inpatientClinicalOpsV1.js";

export const AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID =
  "MEDUI.AUTHORITATIVE_DOMAIN_LINKAGE.D4A2_6H" as const;

export const DOMAIN_REFERENCE_RESOLUTION_STATES = [
  "AUTHORITATIVE_RESOLVED",
  "LEGACY_SYNTHETIC",
  "MISSING_RECORD",
  "RECORD_TYPE_MISMATCH",
  "ENCOUNTER_MISMATCH",
  "PATIENT_MISMATCH",
  "FACILITY_MISMATCH",
  "VOIDED_OR_ENTERED_IN_ERROR",
  "REVISION_UNAVAILABLE",
] as const;

export type DomainReferenceResolutionState =
  (typeof DOMAIN_REFERENCE_RESOLUTION_STATES)[number];

export const AUTHORITATIVE_DOMAIN_ERROR_CODES = [
  "AUTHORITATIVE_DOMAIN_RECORD_REQUIRED",
  "DOMAIN_REFERENCE_SYNTHETIC",
  "DOMAIN_REFERENCE_UNRESOLVED",
  "DOMAIN_REFERENCE_TYPE_MISMATCH",
  "DOMAIN_REFERENCE_ENCOUNTER_MISMATCH",
  "DOMAIN_REFERENCE_PATIENT_MISMATCH",
  "DOMAIN_REFERENCE_FACILITY_MISMATCH",
  "DOMAIN_REFERENCE_VOIDED",
  "DOMAIN_REFERENCE_REVISION_NOT_FOUND",
  "NURSING_SECTION_AUTHORITATIVE_RECORD_REQUIRED",
  "PRINT_DOMAIN_RECORD_UNAVAILABLE",
  "AMENDMENT_NOT_ALLOWED_FOR_ENCOUNTER_STATE",
  "PROVIDER_PROJECTION_SOURCE_UNRESOLVED",
] as const;

export type AuthoritativeDomainErrorCode =
  (typeof AUTHORITATIVE_DOMAIN_ERROR_CODES)[number];

/** Hardened reference — production shape. */
export type AuthoritativeDomainReferenceV1 = NursingAdmissionDomainReferenceV1 & {
  encounterId: string;
  patientId?: string | null;
  facilityId?: string | null;
  recordRevision?: number | null;
  recordVersion?: number | null;
  recordStatus?: string | null;
  source: "ENTERPRISE_DOMAIN" | "LEGACY_SYNTHETIC" | "UNRESOLVED";
  linkedAt?: string | null;
  linkedByUserId?: string | null;
  clinicalTimestamp?: string | null;
  cardId?: string | null;
};

export type ResolvedDomainRecordLite = {
  id: string;
  facilityId: string;
  encounterId: string;
  patientId: string;
  category: string;
  cardId: string;
  createdAt: string;
  voidedAt?: string | null;
  authorUserId?: string | null;
  authorDisplayName?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Persisted EDOC entry IDs are Prisma UUIDs. */
export function isPersistedEdocRecordId(recordId: unknown): boolean {
  return typeof recordId === "string" && UUID_RE.test(recordId.trim());
}

/**
 * Detect unsafe synthetic / temporary client IDs used as domain references.
 * Legitimate preload keys (e.g. allergy-note) are not synthetic.
 */
export function isSyntheticDomainRecordId(recordId: unknown): boolean {
  if (typeof recordId !== "string") return true;
  const id = recordId.trim();
  if (!id) return true;
  if (id.startsWith("edoc-")) return true;
  if (id.startsWith("ref-")) return true;
  if (id.startsWith("tmp-") || id.startsWith("temp-")) return true;
  if (id.startsWith("synthetic-")) return true;
  // timestamp-suffixed client IDs (edoc-card-1719… / ref-domain-1719…)
  if (/-\d{13,}$/.test(id) && !UUID_RE.test(id)) return true;
  return false;
}

export function domainRequiresPersistedEdocId(domain: NursingAdmissionDomainKey): boolean {
  return (
    domain === "PAIN_EDOC13" ||
    domain === "FALL_SAFETY_EDOC14" ||
    domain === "SKIN_WOUND_EDOC20" ||
    domain === "DEVICE_LINE_EDOC17" ||
    domain === "BELONGINGS_EDOC9" ||
    domain === "EDUCATION_EDOC22"
  );
}

export function mapEdocCardIdToNursingDomain(
  cardId: string
): NursingAdmissionDomainKey | null {
  const c = cardId.trim().toLowerCase();
  if (c.includes("pain")) return "PAIN_EDOC13";
  if (c.includes("fall") || c.includes("morse") || c.includes("safety_precaution")) {
    return "FALL_SAFETY_EDOC14";
  }
  if (c.includes("skin") || c.includes("wound") || c.includes("pressure")) {
    return "SKIN_WOUND_EDOC20";
  }
  if (c.includes("belong") || c.includes("valuable") || c.includes("cash")) {
    return "BELONGINGS_EDOC9";
  }
  if (
    c.includes("device") ||
    c.includes("line") ||
    c.includes("drain") ||
    c.includes("catheter") ||
    c.includes("urinary")
  ) {
    return "DEVICE_LINE_EDOC17";
  }
  if (c.includes("educat") || c.includes("teach")) return "EDUCATION_EDOC22";
  return null;
}

export function classifyDomainReference(input: {
  reference: NursingAdmissionDomainReferenceV1 | AuthoritativeDomainReferenceV1;
  expectedEncounterId: string;
  expectedPatientId: string;
  expectedFacilityId: string;
  resolved?: ResolvedDomainRecordLite | null;
  expectedDomain?: NursingAdmissionDomainKey | null;
}): {
  state: DomainReferenceResolutionState;
  authoritative: boolean;
  reasons: AuthoritativeDomainErrorCode[];
} {
  const reasons: AuthoritativeDomainErrorCode[] = [];
  const ref = input.reference;
  if (isSyntheticDomainRecordId(ref.recordId) || ref.source === "LEGACY_SYNTHETIC") {
    return {
      state: "LEGACY_SYNTHETIC",
      authoritative: false,
      reasons: ["DOMAIN_REFERENCE_SYNTHETIC"],
    };
  }
  if (
    input.expectedDomain &&
    domainRequiresPersistedEdocId(input.expectedDomain) &&
    !isPersistedEdocRecordId(ref.recordId)
  ) {
    return {
      state: "LEGACY_SYNTHETIC",
      authoritative: false,
      reasons: ["DOMAIN_REFERENCE_SYNTHETIC"],
    };
  }
  if (!input.resolved) {
    // Preload/history domains may not resolve via EDOC table.
    if (
      input.expectedDomain &&
      !domainRequiresPersistedEdocId(input.expectedDomain) &&
      !isSyntheticDomainRecordId(ref.recordId)
    ) {
      return { state: "AUTHORITATIVE_RESOLVED", authoritative: true, reasons: [] };
    }
    return {
      state: "MISSING_RECORD",
      authoritative: false,
      reasons: ["DOMAIN_REFERENCE_UNRESOLVED"],
    };
  }
  const row = input.resolved;
  if (row.facilityId !== input.expectedFacilityId) {
    reasons.push("DOMAIN_REFERENCE_FACILITY_MISMATCH");
    return { state: "FACILITY_MISMATCH", authoritative: false, reasons };
  }
  if (row.encounterId !== input.expectedEncounterId) {
    reasons.push("DOMAIN_REFERENCE_ENCOUNTER_MISMATCH");
    return { state: "ENCOUNTER_MISMATCH", authoritative: false, reasons };
  }
  if (row.patientId !== input.expectedPatientId) {
    reasons.push("DOMAIN_REFERENCE_PATIENT_MISMATCH");
    return { state: "PATIENT_MISMATCH", authoritative: false, reasons };
  }
  if (row.voidedAt) {
    reasons.push("DOMAIN_REFERENCE_VOIDED");
    return { state: "VOIDED_OR_ENTERED_IN_ERROR", authoritative: false, reasons };
  }
  if (input.expectedDomain) {
    const mapped = mapEdocCardIdToNursingDomain(row.cardId);
    if (mapped && mapped !== input.expectedDomain) {
      reasons.push("DOMAIN_REFERENCE_TYPE_MISMATCH");
      return { state: "RECORD_TYPE_MISMATCH", authoritative: false, reasons };
    }
  }
  // EDOC entries have no numeric revision column — clinical timestamp is the durable marker.
  return {
    state: "AUTHORITATIVE_RESOLVED",
    authoritative: true,
    reasons: [],
  };
}

export function buildAuthoritativeReferenceFromEdoc(input: {
  domain: NursingAdmissionDomainKey;
  sectionId: InpatientAdmissionClinicalSection;
  row: ResolvedDomainRecordLite;
  actorUserId: string;
  status?: NursingAdmissionDomainReferenceV1["status"];
  atIso?: string;
}): AuthoritativeDomainReferenceV1 {
  const at = input.atIso ?? new Date().toISOString();
  return {
    domain: input.domain,
    recordId: input.row.id,
    encounterId: input.row.encounterId,
    patientId: input.row.patientId,
    facilityId: input.row.facilityId,
    sectionId: input.sectionId,
    status: input.status ?? "LINKED",
    source: "ENTERPRISE_DOMAIN",
    linkedAt: at,
    linkedByUserId: input.actorUserId,
    verifiedAt: at,
    verifiedByUserId: input.actorUserId,
    clinicalTimestamp: input.row.createdAt,
    cardId: input.row.cardId,
    recordRevision: null,
    recordVersion: null,
    recordStatus: input.row.voidedAt ? "VOIDED" : "ACTIVE",
  };
}

export function assertReferenceIsLinkable(reference: {
  recordId: string;
  source?: string | null;
}):
  | { ok: true }
  | { ok: false; code: "DOMAIN_REFERENCE_SYNTHETIC" } {
  if (
    isSyntheticDomainRecordId(reference.recordId) ||
    reference.source === "LEGACY_SYNTHETIC"
  ) {
    return { ok: false, code: "DOMAIN_REFERENCE_SYNTHETIC" };
  }
  return { ok: true };
}

/**
 * Hardened completion: EDOC sections require AUTHORITATIVE_RESOLVED references.
 * Legacy synthetic links force IN_PROGRESS + review.
 */
export function projectAuthoritativeSectionCompletion(input: {
  doc: MedSurgNursingAdmissionDocV1;
  sectionId: InpatientAdmissionClinicalSection;
  expectedEncounterId: string;
  expectedPatientId: string;
  expectedFacilityId: string;
  resolvedByRecordId?: Record<string, ResolvedDomainRecordLite | null>;
}): {
  projectedState: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "UNABLE_TO_COMPLETE" | "NOT_APPLICABLE";
  authoritativeDomain: string;
  linkedRecordCount: number;
  authoritativeLinkedCount: number;
  legacySyntheticCount: number;
  reasons: string[];
  warnings: string[];
  requiresDomainRecord: boolean;
} {
  const base = projectNursingSectionCompletion({
    doc: input.doc,
    sectionId: input.sectionId,
  });
  const integration = nursingSectionIntegration(input.sectionId);
  const refs = nursingDocDomainReferences(input.doc).filter(
    (r) =>
      r.sectionId === input.sectionId ||
      (integration.authoritativeDomain !== "ADMISSION_OWNED" &&
        r.domain === integration.authoritativeDomain)
  );
  const reasons: string[] = [...base.warnings];
  let authoritativeLinkedCount = 0;
  let legacySyntheticCount = 0;

  for (const ref of refs) {
    const resolved = input.resolvedByRecordId?.[ref.recordId] ?? null;
    const classification = classifyDomainReference({
      reference: ref,
      expectedEncounterId: input.expectedEncounterId,
      expectedPatientId: input.expectedPatientId,
      expectedFacilityId: input.expectedFacilityId,
      resolved,
      expectedDomain:
        integration.authoritativeDomain === "ADMISSION_OWNED"
          ? null
          : (integration.authoritativeDomain as NursingAdmissionDomainKey),
    });
    if (classification.state === "LEGACY_SYNTHETIC") {
      legacySyntheticCount += 1;
      reasons.push("LEGACY_SYNTHETIC");
    } else if (classification.authoritative) {
      authoritativeLinkedCount += 1;
    } else {
      reasons.push(...classification.reasons);
    }
  }

  if (base.requiresDomainRecord) {
    if (authoritativeLinkedCount === 0) {
      reasons.push("AUTHORITATIVE_DOMAIN_RECORD_REQUIRED");
      return {
        projectedState:
          base.projectedState === "UNABLE_TO_COMPLETE"
            ? "UNABLE_TO_COMPLETE"
            : "IN_PROGRESS",
        authoritativeDomain: base.authoritativeDomain,
        linkedRecordCount: refs.length,
        authoritativeLinkedCount,
        legacySyntheticCount,
        reasons: Array.from(new Set(reasons)),
        warnings: Array.from(new Set(reasons)),
        requiresDomainRecord: true,
      };
    }
  }

  return {
    projectedState: base.projectedState,
    authoritativeDomain: base.authoritativeDomain,
    linkedRecordCount: refs.length,
    authoritativeLinkedCount,
    legacySyntheticCount,
    reasons: Array.from(new Set(reasons)),
    warnings: Array.from(new Set(reasons)),
    requiresDomainRecord: base.requiresDomainRecord,
  };
}

/** Canonical code status from clinical ops — never invent Full Code. */
export function resolveAuthoritativeCodeStatus(ops: InpatientClinicalOpsV1 | null | undefined): {
  value: string | null;
  source: "inpatientClinicalOpsV1" | "NOT_DOCUMENTED";
  documented: boolean;
} {
  const status = ops?.codeStatus?.status ?? null;
  if (!status) {
    return { value: null, source: "NOT_DOCUMENTED", documented: false };
  }
  return { value: String(status), source: "inpatientClinicalOpsV1", documented: true };
}

export function resolveAuthoritativeIsolation(ops: InpatientClinicalOpsV1 | null | undefined): {
  value: string | null;
  source: "inpatientClinicalOpsV1" | "NOT_DOCUMENTED";
  documented: boolean;
} {
  const iso = ops?.isolation;
  if (!iso) {
    return { value: null, source: "NOT_DOCUMENTED", documented: false };
  }
  const precautions = Array.isArray(iso.precautions) ? iso.precautions : [];
  const value = precautions.length
    ? precautions.map(String).join(", ")
    : String(iso.reason ?? "").trim() || null;
  if (!value) {
    return { value: null, source: "NOT_DOCUMENTED", documented: false };
  }
  return { value, source: "inpatientClinicalOpsV1", documented: true };
}

export type ProviderDomainProjectionState =
  | "RESOLVED"
  | "MISSING"
  | "UNRESOLVED_SYNTHETIC"
  | "VOIDED";

export type ProviderDomainProjectionItem = {
  state: ProviderDomainProjectionState;
  domain: string;
  recordId?: string | null;
  clinicalTimestamp?: string | null;
  authorDisplayName?: string | null;
  summary?: string | null;
  provenance: "ENTERPRISE_DOMAIN" | "NONE";
  admissionTimeRecordId?: string | null;
  currentRecordId?: string | null;
};

export function buildProviderDomainProjection(input: {
  domain: NursingAdmissionDomainKey;
  admissionRefs: NursingAdmissionDomainReferenceV1[];
  resolvedByRecordId: Record<string, ResolvedDomainRecordLite | null>;
  expectedEncounterId: string;
  expectedPatientId: string;
  expectedFacilityId: string;
  /** Newest non-voided enterprise row for current-state (may differ from admission link). */
  currentRecord?: ResolvedDomainRecordLite | null;
}): ProviderDomainProjectionItem {
  const refs = input.admissionRefs.filter((r) => r.domain === input.domain);
  let admissionResolved: ResolvedDomainRecordLite | null = null;
  let sawSynthetic = false;
  for (const ref of refs) {
    if (isSyntheticDomainRecordId(ref.recordId)) {
      sawSynthetic = true;
      continue;
    }
    const row = input.resolvedByRecordId[ref.recordId] ?? null;
    const c = classifyDomainReference({
      reference: ref,
      expectedEncounterId: input.expectedEncounterId,
      expectedPatientId: input.expectedPatientId,
      expectedFacilityId: input.expectedFacilityId,
      resolved: row,
      expectedDomain: input.domain,
    });
    if (c.authoritative && row) {
      admissionResolved = row;
      break;
    }
  }

  const current = input.currentRecord && !input.currentRecord.voidedAt ? input.currentRecord : null;

  if (current) {
    return {
      state: "RESOLVED",
      domain: input.domain,
      recordId: current.id,
      clinicalTimestamp: current.createdAt,
      authorDisplayName: current.authorDisplayName ?? null,
      summary: current.cardId,
      provenance: "ENTERPRISE_DOMAIN",
      admissionTimeRecordId: admissionResolved?.id ?? null,
      currentRecordId: current.id,
    };
  }
  if (admissionResolved) {
    return {
      state: "RESOLVED",
      domain: input.domain,
      recordId: admissionResolved.id,
      clinicalTimestamp: admissionResolved.createdAt,
      authorDisplayName: admissionResolved.authorDisplayName ?? null,
      summary: admissionResolved.cardId,
      provenance: "ENTERPRISE_DOMAIN",
      admissionTimeRecordId: admissionResolved.id,
      currentRecordId: null,
    };
  }
  if (sawSynthetic) {
    return {
      state: "UNRESOLVED_SYNTHETIC",
      domain: input.domain,
      provenance: "NONE",
    };
  }
  return { state: "MISSING", domain: input.domain, provenance: "NONE" };
}

export type NursingAmendmentEncounterPolicy =
  | "ALLOW_CLINICAL_AMENDMENT"
  | "READ_ONLY"
  | "ADMINISTRATIVE_ONLY"
  | "DENY";

export function nursingAmendmentPolicyForEncounterState(input: {
  encounterStatus: string;
  voided?: boolean;
  cancelled?: boolean;
  nursingSigned: boolean;
}): NursingAmendmentEncounterPolicy {
  if (input.voided) return "ADMINISTRATIVE_ONLY";
  const cancelled =
    input.cancelled === true || input.encounterStatus === "CANCELLED";
  if (cancelled && !input.nursingSigned) return "READ_ONLY";
  if (cancelled && input.nursingSigned) return "ALLOW_CLINICAL_AMENDMENT";
  if (input.encounterStatus === "CLOSED") {
    return input.nursingSigned ? "ALLOW_CLINICAL_AMENDMENT" : "READ_ONLY";
  }
  if (input.encounterStatus === "OPEN") {
    return input.nursingSigned ? "ALLOW_CLINICAL_AMENDMENT" : "DENY";
  }
  return "DENY";
}

export function providerMustRejectSyntheticDomainSources(): true {
  return true;
}
export function completionMustRejectSyntheticDomainReferences(): true {
  return true;
}
export function printMustNotSubstituteLatestForReferencedRecord(): true {
  return true;
}
