/**
 * MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING
 *
 * Explicit Encounter Prisma select contracts.
 * MUST NOT include D3B/D3C fields (`hospitalEpisodeId`, HospitalEpisode relations,
 * InternalPlacementRequest relations) so generated clients remain compatible with
 * pre-D3B production databases while those migrations are unapplied.
 *
 * Rule: never use findFirst/findMany/create/update with bare model load or
 * `include` without a parent `select` — Prisma emits ALL scalars including
 * unapplied columns. Feature flags cannot suppress SQL generation.
 */

import type { Prisma } from "@prisma/client";

/** Forbidden on any core Encounter select while D3 expand-and-contract is active. */
export const ENCOUNTER_FORBIDDEN_SELECT_KEYS = [
  "hospitalEpisodeId",
  "hospitalEpisode",
  "hospitalEpisodesOriginated",
  "internalPlacementRequestsOriginated",
  "internalPlacementRequestsAsReceiving",
] as const;

export type EncounterForbiddenSelectKey = (typeof ENCOUNTER_FORBIDDEN_SELECT_KEYS)[number];

/**
 * All Encounter scalars required by clinic workflows EXCEPT D3B/D3C columns.
 * Keep in sync with schema.prisma Encounter model (minus hospitalEpisode*).
 */
export const ENCOUNTER_CORE_SELECT = {
  id: true,
  patientId: true,
  facilityId: true,
  type: true,
  status: true,
  providerId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  chiefComplaint: true,
  triageAcuity: true,
  vitals: true,
  dischargeStatus: true,
  dischargedAt: true,
  disposition: true,
  nursingAssessment: true,
  providerNote: true,
  treatmentPlan: true,
  followUpDate: true,
  roomLabel: true,
  physicianAssignedUserId: true,
  dischargeSummaryJson: true,
  admissionSummaryJson: true,
  admittedAt: true,
  providerDocumentationStatus: true,
  providerDocumentationSignedAt: true,
  providerDocumentationSignedByUserId: true,
  billingCaptureJson: true,
  version: true,
  workflowState: true,
  billingFinalizationStatus: true,
  billingFinalizedAt: true,
  billingFinalizedByUserId: true,
  billingReopenedAt: true,
  billingReopenedByUserId: true,
  billingReadinessSnapshotJson: true,
  nurseAssignedUserId: true,
  nurseAssignedAt: true,
  physicianAssignedAt: true,
  billingClassification: true,
  billingClassificationChangedAt: true,
  billingClassificationChangedByUserId: true,
  billingClassificationChangeReason: true,
  billingClassificationAcknowledgedAt: true,
  billingClassificationAcknowledgedByUserId: true,
  billingClassificationAcknowledgmentMethod: true,
  billingClassificationTransitionJson: true,
} satisfies Prisma.EncounterSelect;

/**
 * Safe write return projection for pre-D3B databases.
 * Prisma `update`/`create` without `select` emits RETURNING of ALL schema scalars,
 * including `hospitalEpisodeId` — which causes P2022 when D3B is unapplied.
 */
export const ENCOUNTER_ID_ONLY_SELECT = { id: true } as const;

/** D3B-aware link select — only when HOSPITAL_EPISODE_FOUNDATION_ENABLED and D3B present. */
export const ENCOUNTER_D3B_ID_SELECT = {
  id: true,
  hospitalEpisodeId: true,
} as const;

/** Minimal gate / existence / concurrency checks. */
export const ENCOUNTER_ACCESS_SELECT = {
  id: true,
  patientId: true,
  facilityId: true,
  type: true,
  status: true,
  version: true,
  providerDocumentationStatus: true,
  providerDocumentationSignedAt: true,
  nursingAssessment: true,
  admissionSummaryJson: true,
  dischargeSummaryJson: true,
  workflowState: true,
  admittedAt: true,
  dischargedAt: true,
  physicianAssignedUserId: true,
  nurseAssignedUserId: true,
  roomLabel: true,
  chiefComplaint: true,
  providerNote: true,
  treatmentPlan: true,
  billingClassification: true,
  billingFinalizationStatus: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EncounterSelect;

const patientDetailSelect = {
  id: true,
  firstName: true,
  lastName: true,
  mrn: true,
  dob: true,
  sexAtBirth: true,
} as const;

const userNameSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

/** GET /encounters/:id and PATCH return shape. */
export const ENCOUNTER_DETAIL_SELECT = {
  ...ENCOUNTER_CORE_SELECT,
  patient: { select: patientDetailSelect },
  physicianAssigned: { select: userNameSelect },
  nurseAssigned: { select: userNameSelect },
  providerDocumentationSignedBy: { select: userNameSelect },
  triage: { select: { vitalsJson: true } },
  providerAddenda: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      text: true,
      createdAt: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  },
  encounterNotes: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      noteType: true,
      body: true,
      authorUserId: true,
      authorDisplayNameSnapshot: true,
      authorRoleSnapshot: true,
      createdAt: true,
      voidedAt: true,
      voidedByUserId: true,
      voidReasonCode: true,
      isAmendment: true,
      amendedFromNoteId: true,
      amendmentReason: true,
      requiresCosign: true,
      cosignedAt: true,
      cosignedByUserId: true,
      cosignRoleSnapshot: true,
    },
  },
  clinicalDocumentationEntries: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      encounterId: true,
      patientId: true,
      category: true,
      cardId: true,
      authorUserId: true,
      authorDisplayNameSnapshot: true,
      authorRoleSnapshot: true,
      createdAt: true,
      payloadJson: true,
      voidedAt: true,
      requiresWitnessSignature: true,
      witnessedAt: true,
      witnessedByUserId: true,
      witnessDisplayNameSnapshot: true,
      witnessRoleSnapshot: true,
    },
  },
} satisfies Prisma.EncounterSelect;

/** Disposition readiness / close-check. */
export const ENCOUNTER_DISPOSITION_SELECT = {
  ...ENCOUNTER_CORE_SELECT,
  patient: { select: { latestVitalsAt: true } },
} satisfies Prisma.EncounterSelect;

/** Triage GET/PUT encounter gate. */
export const ENCOUNTER_TRIAGE_SELECT = {
  ...ENCOUNTER_ACCESS_SELECT,
} satisfies Prisma.EncounterSelect;

/** Medication administration list / create encounter gate. */
export const ENCOUNTER_MEDICATION_SELECT = {
  ...ENCOUNTER_ACCESS_SELECT,
  vitals: true,
  triage: { select: { vitalsJson: true } },
} satisfies Prisma.EncounterSelect;

/** Nested `include: { encounter: true }` replacement on child models. */
export const ENCOUNTER_NESTED_CORE_SELECT = {
  ...ENCOUNTER_CORE_SELECT,
} satisfies Prisma.EncounterSelect;

/** Open-encounter existence check (create). */
export const ENCOUNTER_OPEN_EXISTENCE_SELECT = {
  id: true,
  status: true,
  type: true,
  patientId: true,
  facilityId: true,
} satisfies Prisma.EncounterSelect;

/** List-by-patient / lightweight clinic list. */
export const ENCOUNTER_LIST_SELECT = {
  ...ENCOUNTER_CORE_SELECT,
  patient: { select: patientDetailSelect },
  physicianAssigned: { select: userNameSelect },
  nurseAssigned: { select: userNameSelect },
  triage: {
    select: {
      esi: true,
      chiefComplaint: true,
      triageCompleteAt: true,
    },
  },
} satisfies Prisma.EncounterSelect;

/** Clinical documentation / chart note surfaces — same projection as detail. */
export const ENCOUNTER_DOCUMENTATION_SELECT = ENCOUNTER_DETAIL_SELECT;

/**
 * Scalar Encounter columns required by ENCOUNTER_CORE_SELECT.
 * Used by the schema compatibility guard (must exist even when D3B is absent).
 */
export const ENCOUNTER_CORE_REQUIRED_COLUMNS = Object.keys(ENCOUNTER_CORE_SELECT).filter(
  (key) => (ENCOUNTER_CORE_SELECT as Record<string, unknown>)[key] === true
);

/** All named contracts for static CI enumeration. */
export const ENCOUNTER_QUERY_CONTRACTS = {
  ENCOUNTER_CORE_SELECT,
  ENCOUNTER_ACCESS_SELECT,
  ENCOUNTER_DETAIL_SELECT,
  ENCOUNTER_DISPOSITION_SELECT,
  ENCOUNTER_TRIAGE_SELECT,
  ENCOUNTER_MEDICATION_SELECT,
  ENCOUNTER_NESTED_CORE_SELECT,
  ENCOUNTER_OPEN_EXISTENCE_SELECT,
  ENCOUNTER_LIST_SELECT,
  ENCOUNTER_DOCUMENTATION_SELECT,
} as const;

export function assertEncounterSelectExcludesD3Fields(
  select: Record<string, unknown>,
  label = "Encounter select"
): void {
  for (const key of ENCOUNTER_FORBIDDEN_SELECT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(select, key)) {
      throw new Error(
        `${label} must not include D3 key "${key}" (expand-and-contract / unapplied migration safety).`
      );
    }
  }
}

export function assertAllEncounterQueryContractsExcludeD3(): void {
  for (const [name, select] of Object.entries(ENCOUNTER_QUERY_CONTRACTS)) {
    assertEncounterSelectExcludesD3Fields(select as Record<string, unknown>, name);
  }
}
