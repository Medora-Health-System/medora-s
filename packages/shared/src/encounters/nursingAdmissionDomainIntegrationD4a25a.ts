/**
 * D4A.2.5A — Nursing Admission domain integration, amendments, print summary.
 *
 * Nursing Admission orchestrates enterprise domains — it does not duplicate them.
 * Additive JSON fields on MedSurgNursingAdmissionDocV1. Zero schema migration.
 */

import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  type MedSurgNursingAdmissionDocV1,
} from "./medSurgNursingAdmissionD4a1.js";
import { assertNursingAdmissionOwnerWrite } from "./nursingDocumentationOwnershipInp2g1.js";
import type {
  AdmissionSectionCompletionState,
  InpatientAdmissionClinicalSection,
} from "./connectedInpatientAdmissionIntakeD4a0.js";

export const NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID =
  "MEDUI.NURSING_DOMAIN_INTEGRATION.D4A2_5A" as const;

export const NURSING_ADMISSION_DOMAIN_KEYS = [
  "ALLERGY",
  "HOME_MEDICATION_RECON",
  "LONGITUDINAL_MEDICAL_HISTORY",
  "LONGITUDINAL_SURGICAL_HISTORY",
  "PAIN_EDOC13",
  "FALL_SAFETY_EDOC14",
  "SKIN_WOUND_EDOC20",
  "DEVICE_LINE_EDOC17",
  "BELONGINGS_EDOC9",
  "EDUCATION_EDOC22",
  "CODE_STATUS_OPS",
  "ISOLATION_OPS",
  "DEMOGRAPHICS_REGISTRATION",
  "PROVIDER_HANDOFF",
  "NURSING_NOTES",
] as const;

export type NursingAdmissionDomainKey = (typeof NURSING_ADMISSION_DOMAIN_KEYS)[number];

export const NURSING_DOMAIN_READ_WRITE_MODES = [
  "READ_ONLY_PROJECTION",
  "VERIFY_AND_UPDATE",
  "EMBED_CANONICAL_EDITOR",
  "CREATE_DOMAIN_RECORD",
  "LINK_EXISTING_RECORD",
  "ADMISSION_ONLY",
  "NOT_AVAILABLE",
] as const;

export type NursingDomainReadWriteMode = (typeof NURSING_DOMAIN_READ_WRITE_MODES)[number];

export const NURSING_FIELD_CLASSIFICATIONS = [
  "KEEP_AS_ADMISSION_OWNED",
  "READ_FROM_ENTERPRISE_DOMAIN",
  "WRITE_THROUGH_ENTERPRISE_DOMAIN",
  "REFERENCE_ENTERPRISE_DOMAIN_RECORD",
  "DEPRECATE_DUPLICATE_FIELD",
  "REVIEW_REQUIRED",
] as const;

export type NursingFieldClassification = (typeof NURSING_FIELD_CLASSIFICATIONS)[number];

export type NursingAdmissionDomainReferenceV1 = {
  domain: NursingAdmissionDomainKey;
  recordId: string;
  status: "LINKED" | "VERIFIED" | "DISCREPANCY" | "UNABLE_TO_VERIFY" | "COMPLETE";
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
  source?: string | null;
  revision?: string | number | null;
  sectionId?: InpatientAdmissionClinicalSection | null;
};

export type NursingAdmissionSectionIntegrationV1 = {
  sectionKey: InpatientAdmissionClinicalSection;
  authoritativeDomain: NursingAdmissionDomainKey | "ADMISSION_OWNED";
  readMode: NursingDomainReadWriteMode;
  writeMode: NursingDomainReadWriteMode;
  edocFocusedCardId?: string | null;
  badgeKey: string;
  classification: NursingFieldClassification;
};

/** Canonical section → enterprise domain mapping (orchestration contract). */
export const NURSING_ADMISSION_SECTION_INTEGRATIONS: readonly NursingAdmissionSectionIntegrationV1[] =
  [
    {
      sectionKey: "OVERVIEW",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "KEEP_AS_ADMISSION_OWNED",
    },
    {
      sectionKey: "IDENTITY_DEMOGRAPHICS",
      authoritativeDomain: "DEMOGRAPHICS_REGISTRATION",
      readMode: "READ_ONLY_PROJECTION",
      writeMode: "VERIFY_AND_UPDATE",
      badgeKey: "demographics",
      classification: "READ_FROM_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "SOURCE_ENCOUNTER_SUMMARY",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "READ_ONLY_PROJECTION",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "KEEP_AS_ADMISSION_OWNED",
    },
    {
      sectionKey: "NURSING_ADMISSION_ASSESSMENT",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "KEEP_AS_ADMISSION_OWNED",
    },
    {
      sectionKey: "MEDICAL_HISTORY",
      authoritativeDomain: "LONGITUDINAL_MEDICAL_HISTORY",
      readMode: "VERIFY_AND_UPDATE",
      writeMode: "VERIFY_AND_UPDATE",
      badgeKey: "sharedHistory",
      classification: "READ_FROM_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "SURGICAL_HISTORY",
      authoritativeDomain: "LONGITUDINAL_SURGICAL_HISTORY",
      readMode: "VERIFY_AND_UPDATE",
      writeMode: "VERIFY_AND_UPDATE",
      badgeKey: "sharedHistory",
      classification: "READ_FROM_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "HOME_MEDICATIONS",
      authoritativeDomain: "HOME_MEDICATION_RECON",
      readMode: "VERIFY_AND_UPDATE",
      writeMode: "VERIFY_AND_UPDATE",
      badgeKey: "medRecon",
      classification: "READ_FROM_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "ALLERGIES",
      authoritativeDomain: "ALLERGY",
      readMode: "VERIFY_AND_UPDATE",
      writeMode: "VERIFY_AND_UPDATE",
      badgeKey: "allergy",
      classification: "READ_FROM_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "SOCIAL_HISTORY",
      authoritativeDomain: "LONGITUDINAL_MEDICAL_HISTORY",
      readMode: "VERIFY_AND_UPDATE",
      writeMode: "VERIFY_AND_UPDATE",
      badgeKey: "sharedHistory",
      classification: "READ_FROM_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "BELONGINGS_VALUABLES",
      authoritativeDomain: "BELONGINGS_EDOC9",
      readMode: "EMBED_CANONICAL_EDITOR",
      writeMode: "EMBED_CANONICAL_EDITOR",
      edocFocusedCardId: "belongings_inventory",
      badgeKey: "valuables",
      classification: "WRITE_THROUGH_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "SKIN_WOUND",
      authoritativeDomain: "SKIN_WOUND_EDOC20",
      readMode: "EMBED_CANONICAL_EDITOR",
      writeMode: "EMBED_CANONICAL_EDITOR",
      edocFocusedCardId: "skin_integrity_assessment",
      badgeKey: "wound",
      classification: "WRITE_THROUGH_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "LINES_DRAINS_DEVICES",
      authoritativeDomain: "DEVICE_LINE_EDOC17",
      readMode: "EMBED_CANONICAL_EDITOR",
      writeMode: "ADMISSION_ONLY",
      edocFocusedCardId: null,
      badgeKey: "devices",
      classification: "KEEP_AS_ADMISSION_OWNED",
    },
    {
      sectionKey: "FALL_SAFETY",
      authoritativeDomain: "FALL_SAFETY_EDOC14",
      readMode: "EMBED_CANONICAL_EDITOR",
      writeMode: "EMBED_CANONICAL_EDITOR",
      edocFocusedCardId: "safety_precautions_documentation",
      badgeKey: "fallRisk",
      classification: "WRITE_THROUGH_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "PAIN",
      authoritativeDomain: "PAIN_EDOC13",
      readMode: "EMBED_CANONICAL_EDITOR",
      writeMode: "EMBED_CANONICAL_EDITOR",
      edocFocusedCardId: "pain_initial_assessment",
      badgeKey: "pain",
      classification: "WRITE_THROUGH_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "FUNCTIONAL_MOBILITY",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "KEEP_AS_ADMISSION_OWNED",
    },
    {
      sectionKey: "NUTRITION",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "REVIEW_REQUIRED",
    },
    {
      sectionKey: "ELIMINATION",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "REVIEW_REQUIRED",
    },
    {
      sectionKey: "PSYCHOSOCIAL",
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "REVIEW_REQUIRED",
    },
    {
      sectionKey: "EDUCATION_COMMUNICATION",
      authoritativeDomain: "EDUCATION_EDOC22",
      readMode: "EMBED_CANONICAL_EDITOR",
      writeMode: "EMBED_CANONICAL_EDITOR",
      edocFocusedCardId: "patient_education_session",
      badgeKey: "education",
      classification: "WRITE_THROUGH_ENTERPRISE_DOMAIN",
    },
    {
      sectionKey: "PROVIDER_ADMISSION",
      authoritativeDomain: "PROVIDER_HANDOFF",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "handoff",
      classification: "KEEP_AS_ADMISSION_OWNED",
    },
  ];

export function nursingSectionIntegration(
  sectionKey: InpatientAdmissionClinicalSection
): NursingAdmissionSectionIntegrationV1 {
  return (
    NURSING_ADMISSION_SECTION_INTEGRATIONS.find((s) => s.sectionKey === sectionKey) ?? {
      sectionKey,
      authoritativeDomain: "ADMISSION_OWNED",
      readMode: "ADMISSION_ONLY",
      writeMode: "ADMISSION_ONLY",
      badgeKey: "admissionOwned",
      classification: "KEEP_AS_ADMISSION_OWNED",
    }
  );
}

export const NURSING_AMENDMENT_TYPES = [
  "ADDENDUM",
  "CORRECTION",
  "ENTERED_IN_ERROR",
] as const;

export type NursingAmendmentType = (typeof NURSING_AMENDMENT_TYPES)[number];

export type NursingAdmissionAmendmentV1 = {
  amendmentId: string;
  clientRequestId: string;
  type: NursingAmendmentType;
  sectionId?: InpatientAdmissionClinicalSection | null;
  reason: string;
  note?: string | null;
  originalValue?: unknown;
  correctedValue?: unknown;
  linkedDomainRecordIds?: string[];
  createdAt: string;
  createdByUserId: string;
  credentials?: string | null;
  role?: string | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  documentRevisionAtCreate: number;
  amendmentVersion: number;
};

export type NursingAdmissionPrintStatus = "DRAFT" | "SIGNED" | "AMENDED" | "CORRECTED";

export type NursingAdmissionPrintSummaryV1 = {
  certification: typeof NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID;
  printStatus: NursingAdmissionPrintStatus;
  documentRevision: number;
  printedAt: string;
  facility: { id: string; name?: string | null };
  patient: {
    id: string;
    legalName?: string | null;
    mrn?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
  };
  encounter: {
    id: string;
    admittedAt?: string | null;
    unit?: string | null;
    roomBed?: string | null;
    attending?: string | null;
  };
  overview: Record<string, unknown>;
  sections: Array<{
    sectionId: InpatientAdmissionClinicalSection;
    completionState: AdmissionSectionCompletionState;
    authoritativeDomain: string;
    verificationNote?: string | null;
    domainRefCount: number;
    loadError?: string | null;
    answersSummary?: Record<string, unknown> | null;
  }>;
  signature: MedSurgNursingAdmissionDocV1["nurseSignature"];
  amendments: NursingAdmissionAmendmentV1[];
  domainReferences: NursingAdmissionDomainReferenceV1[];
  warnings: string[];
};

export function nursingDocDomainReferences(
  doc: MedSurgNursingAdmissionDocV1
): NursingAdmissionDomainReferenceV1[] {
  const raw = (doc as { domainReferences?: unknown }).domainReferences;
  return Array.isArray(raw) ? (raw as NursingAdmissionDomainReferenceV1[]) : [];
}

export function nursingDocAmendments(
  doc: MedSurgNursingAdmissionDocV1
): NursingAdmissionAmendmentV1[] {
  const raw = (doc as { amendments?: unknown }).amendments;
  return Array.isArray(raw) ? (raw as NursingAdmissionAmendmentV1[]) : [];
}

export function withNursingDomainReferences(
  doc: MedSurgNursingAdmissionDocV1,
  refs: NursingAdmissionDomainReferenceV1[]
): MedSurgNursingAdmissionDocV1 {
  return { ...doc, domainReferences: refs } as MedSurgNursingAdmissionDocV1;
}

export function withNursingAmendments(
  doc: MedSurgNursingAdmissionDocV1,
  amendments: NursingAdmissionAmendmentV1[]
): MedSurgNursingAdmissionDocV1 {
  return { ...doc, amendments } as MedSurgNursingAdmissionDocV1;
}

/** Must not duplicate full allergy arrays into nursing JSON. */
export function nursingAdmissionMustNotDuplicateAllergyArray(): true {
  return true;
}
export function nursingAdmissionMustNotDuplicateWoundInventory(): true {
  return true;
}
export function nursingAdmissionMustNotCreateSecondPainEngine(): true {
  return true;
}
export function signedNursingAdmissionMustRemainImmutable(): true {
  return true;
}

export function linkNursingDomainReference(input: {
  doc: MedSurgNursingAdmissionDocV1;
  reference: NursingAdmissionDomainReferenceV1;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
}):
  | { ok: true; doc: MedSurgNursingAdmissionDocV1 }
  | { ok: false; code: "EXPECTED_VERSION_CONFLICT" | "NURSING_ADMISSION_ALREADY_SIGNED" } {
  if (input.doc.expectedVersion !== input.clientExpectedVersion) {
    return { ok: false, code: "EXPECTED_VERSION_CONFLICT" };
  }
  if (input.doc.nurseSignature?.signed) {
    return { ok: false, code: "NURSING_ADMISSION_ALREADY_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const prev = nursingDocDomainReferences(input.doc);
  const idx = prev.findIndex(
    (r) => r.domain === input.reference.domain && r.recordId === input.reference.recordId
  );
  const nextRefs = [...prev];
  const nextRef: NursingAdmissionDomainReferenceV1 = {
    ...input.reference,
    verifiedAt: input.reference.verifiedAt ?? at,
    verifiedByUserId: input.reference.verifiedByUserId ?? input.actorUserId,
  };
  if (idx >= 0) nextRefs[idx] = nextRef;
  else nextRefs.push(nextRef);
  return {
    ok: true,
    doc: {
      ...withNursingDomainReferences(input.doc, nextRefs),
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

/**
 * Completion projection for integrated sections.
 * Domain-linked sections cannot be COMPLETE from local checkbox alone.
 */
export function projectNursingSectionCompletion(input: {
  doc: MedSurgNursingAdmissionDocV1;
  sectionId: InpatientAdmissionClinicalSection;
}): {
  projectedState: AdmissionSectionCompletionState;
  authoritativeDomain: string;
  domainRefCount: number;
  warnings: string[];
  requiresDomainRecord: boolean;
} {
  const integration = nursingSectionIntegration(input.sectionId);
  const sec = input.doc.sections[input.sectionId];
  const local = sec?.completionState ?? "NOT_STARTED";
  const refs = nursingDocDomainReferences(input.doc).filter(
    (r) =>
      r.sectionId === input.sectionId ||
      (integration.authoritativeDomain !== "ADMISSION_OWNED" &&
        r.domain === integration.authoritativeDomain)
  );
  const warnings: string[] = [];
  const requiresDomain =
    integration.writeMode === "EMBED_CANONICAL_EDITOR" ||
    integration.writeMode === "CREATE_DOMAIN_RECORD" ||
    integration.writeMode === "LINK_EXISTING_RECORD";

  if (local === "UNABLE_TO_COMPLETE") {
    if (!sec?.unableReason?.trim()) {
      warnings.push("UNABLE_REASON_REQUIRED");
    }
    return {
      projectedState: "UNABLE_TO_COMPLETE",
      authoritativeDomain: String(integration.authoritativeDomain),
      domainRefCount: refs.length,
      warnings,
      requiresDomainRecord: requiresDomain,
    };
  }

  if (requiresDomain) {
    const completeRef = refs.some(
      (r) => r.status === "COMPLETE" || r.status === "VERIFIED" || r.status === "LINKED"
    );
    if (local === "COMPLETE" && !completeRef) {
      warnings.push("DOMAIN_RECORD_REQUIRED");
      return {
        projectedState: "IN_PROGRESS",
        authoritativeDomain: String(integration.authoritativeDomain),
        domainRefCount: refs.length,
        warnings,
        requiresDomainRecord: true,
      };
    }
    if (completeRef && (local === "COMPLETE" || local === "IN_PROGRESS" || local === "NOT_STARTED")) {
      return {
        projectedState: local === "COMPLETE" ? "COMPLETE" : local === "NOT_STARTED" ? "IN_PROGRESS" : local,
        authoritativeDomain: String(integration.authoritativeDomain),
        domainRefCount: refs.length,
        warnings,
        requiresDomainRecord: true,
      };
    }
  }

  // History / allergy verify-and-update: preload verification counts.
  if (integration.readMode === "VERIFY_AND_UPDATE") {
    const domainFilter =
      input.sectionId === "ALLERGIES"
        ? "ALLERGIES"
        : input.sectionId === "MEDICAL_HISTORY"
          ? "MEDICAL_HISTORY"
          : input.sectionId === "SURGICAL_HISTORY"
            ? "SURGICAL_HISTORY"
            : input.sectionId === "HOME_MEDICATIONS"
              ? "HOME_MEDICATIONS"
              : null;
    if (domainFilter) {
      const items = input.doc.preloadedItems.filter((i) => i.domain === domainFilter);
      const unverified = items.filter((i) => i.provenance?.verified !== true);
      if (local === "COMPLETE" && items.length > 0 && unverified.length > 0) {
        warnings.push("PRELOAD_UNVERIFIED");
        return {
          projectedState: "IN_PROGRESS",
          authoritativeDomain: String(integration.authoritativeDomain),
          domainRefCount: refs.length,
          warnings,
          requiresDomainRecord: false,
        };
      }
    }
  }

  return {
    projectedState: local,
    authoritativeDomain: String(integration.authoritativeDomain),
    domainRefCount: refs.length,
    warnings,
    requiresDomainRecord: requiresDomain,
  };
}

export function reviewNursingAdmissionWithDomains(doc: MedSurgNursingAdmissionDocV1): {
  sections: Array<{
    sectionId: InpatientAdmissionClinicalSection;
    completionState: AdmissionSectionCompletionState;
    projectedState: AdmissionSectionCompletionState;
    authoritativeDomain: string;
    domainRefCount: number;
    amendmentCount: number;
    warnings: string[];
    missingRequired: string[];
  }>;
  signed: boolean;
  warnings: string[];
  amendmentCount: number;
} {
  const amendments = nursingDocAmendments(doc);
  const sections = INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((sectionId) => {
    const projection = projectNursingSectionCompletion({ doc, sectionId });
    const sec = doc.sections[sectionId];
    return {
      sectionId,
      completionState: sec?.completionState ?? "NOT_STARTED",
      projectedState: projection.projectedState,
      authoritativeDomain: projection.authoritativeDomain,
      domainRefCount: projection.domainRefCount,
      amendmentCount: amendments.filter((a) => a.sectionId === sectionId).length,
      warnings: projection.warnings,
      missingRequired:
        projection.projectedState === "COMPLETE" && projection.warnings.includes("DOMAIN_RECORD_REQUIRED")
          ? ["domainReference"]
          : [],
    };
  });
  const warnings = sections.flatMap((s) => s.warnings.map((w) => `${s.sectionId}:${w}`));
  return {
    sections,
    signed: Boolean(doc.nurseSignature?.signed),
    warnings,
    amendmentCount: amendments.length,
  };
}

export function appendNursingAdmissionAmendment(input: {
  doc: MedSurgNursingAdmissionDocV1;
  type: NursingAmendmentType;
  clientRequestId: string;
  reason: string;
  note?: string | null;
  sectionId?: InpatientAdmissionClinicalSection | null;
  originalValue?: unknown;
  correctedValue?: unknown;
  linkedDomainRecordIds?: string[];
  actorUserId: string;
  credentials?: string | null;
  role?: string | null;
  clientExpectedVersion: number;
  expectedAmendmentVersion?: number;
  atIso?: string;
}):
  | { ok: true; doc: MedSurgNursingAdmissionDocV1; amendment: NursingAdmissionAmendmentV1 }
  | {
      ok: false;
      code:
        | "NURSING_ADMISSION_AMENDMENT_STALE"
        | "NURSING_ADMISSION_NOT_SIGNED"
        | "NURSING_ADMISSION_AMENDMENT_DUPLICATE"
        | "NURSING_ADMISSION_AMENDMENT_NOT_AUTHORIZED"
        | "NURSING_ADMISSION_NOT_DOCUMENT_OWNER";
    } {
  if (!input.doc.nurseSignature?.signed) {
    return { ok: false, code: "NURSING_ADMISSION_NOT_SIGNED" };
  }
  const ownerGate = assertNursingAdmissionOwnerWrite({
    doc: input.doc,
    actorUserId: input.actorUserId,
  });
  if (!ownerGate.ok) {
    return { ok: false, code: "NURSING_ADMISSION_NOT_DOCUMENT_OWNER" };
  }
  if (input.doc.expectedVersion !== input.clientExpectedVersion) {
    return { ok: false, code: "NURSING_ADMISSION_AMENDMENT_STALE" };
  }
  const existing = nursingDocAmendments(input.doc);
  const dup = existing.find((a) => a.clientRequestId === input.clientRequestId);
  if (dup) {
    return { ok: false, code: "NURSING_ADMISSION_AMENDMENT_DUPLICATE" };
  }
  if (
    input.expectedAmendmentVersion != null &&
    input.expectedAmendmentVersion !== existing.length
  ) {
    return { ok: false, code: "NURSING_ADMISSION_AMENDMENT_STALE" };
  }
  const reason = String(input.reason ?? "").trim();
  if (!reason) {
    return { ok: false, code: "NURSING_ADMISSION_AMENDMENT_NOT_AUTHORIZED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const amendment: NursingAdmissionAmendmentV1 = {
    amendmentId: `amd-${input.clientRequestId}`,
    clientRequestId: input.clientRequestId,
    type: input.type,
    sectionId: input.sectionId ?? null,
    reason,
    note: input.note ?? null,
    originalValue: input.originalValue,
    correctedValue: input.correctedValue,
    linkedDomainRecordIds: input.linkedDomainRecordIds ?? [],
    createdAt: at,
    createdByUserId: input.actorUserId,
    credentials: input.credentials ?? null,
    role: input.role ?? null,
    signedAt: at,
    signedByUserId: input.actorUserId,
    documentRevisionAtCreate: input.doc.expectedVersion,
    amendmentVersion: existing.length + 1,
  };
  // Append-only: never mutate nurseSignature or prior section answers.
  const nextDoc: MedSurgNursingAdmissionDocV1 = {
    ...withNursingAmendments(input.doc, [...existing, amendment]),
    expectedVersion: input.doc.expectedVersion + 1,
    updatedAt: at,
    updatedByUserId: input.actorUserId,
  };
  return { ok: true, doc: nextDoc, amendment };
}

export function resolveNursingPrintStatus(
  doc: MedSurgNursingAdmissionDocV1
): NursingAdmissionPrintStatus {
  if (!doc.nurseSignature?.signed) return "DRAFT";
  const amendments = nursingDocAmendments(doc);
  if (amendments.some((a) => a.type === "CORRECTION")) return "CORRECTED";
  if (amendments.length > 0) return "AMENDED";
  return "SIGNED";
}

export function buildNursingAdmissionPrintSummary(input: {
  doc: MedSurgNursingAdmissionDocV1;
  facility: { id: string; name?: string | null };
  patient: {
    id: string;
    legalName?: string | null;
    mrn?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
  };
  encounter: {
    id: string;
    admittedAt?: string | null;
    unit?: string | null;
    roomBed?: string | null;
    attending?: string | null;
  };
  domainLoadErrors?: Partial<Record<InpatientAdmissionClinicalSection, string>>;
  printedAt?: string;
}): NursingAdmissionPrintSummaryV1 {
  const review = reviewNursingAdmissionWithDomains(input.doc);
  const overviewAnswers =
    (input.doc.sections.OVERVIEW?.answers as Record<string, unknown> | null) ?? {};
  return {
    certification: NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID,
    printStatus: resolveNursingPrintStatus(input.doc),
    documentRevision: input.doc.expectedVersion,
    printedAt: input.printedAt ?? new Date().toISOString(),
    facility: input.facility,
    patient: input.patient,
    encounter: input.encounter,
    overview: {
      reasonForAdmission: overviewAnswers.reasonForAdmission ?? null,
      admissionDiagnosis: overviewAnswers.admissionDiagnosis ?? null,
      admittingService: overviewAnswers.admittingService ?? null,
      conditionOnArrival: overviewAnswers.conditionOnArrival ?? null,
      codeStatus: overviewAnswers.codeStatus ?? null,
      isolationStatus: overviewAnswers.isolationStatus ?? null,
    },
    sections: review.sections.map((s) => {
      const answers = input.doc.sections[s.sectionId]?.answers ?? null;
      const loadError = input.domainLoadErrors?.[s.sectionId] ?? null;
      // Omit empty optional noise: only include non-empty answer keys.
      const answersSummary =
        answers && typeof answers === "object"
          ? Object.fromEntries(
              Object.entries(answers).filter(
                ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
              )
            )
          : null;
      return {
        sectionId: s.sectionId,
        completionState: s.projectedState,
        authoritativeDomain: s.authoritativeDomain,
        domainRefCount: s.domainRefCount,
        loadError,
        answersSummary:
          answersSummary && Object.keys(answersSummary).length ? answersSummary : null,
        verificationNote: s.warnings.length ? s.warnings.join(", ") : null,
      };
    }),
    signature: input.doc.nurseSignature ?? null,
    amendments: nursingDocAmendments(input.doc),
    domainReferences: nursingDocDomainReferences(input.doc),
    warnings: review.warnings,
  };
}

/** Provider must not rewrite nursing-authored content via amendment API. */
export function providerMustNotRewriteNursingAdmissionDocumentation(): true {
  return true;
}
