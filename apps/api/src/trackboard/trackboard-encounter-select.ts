import type { Prisma } from "@prisma/client";

/**
 * MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20
 *
 * Explicit Encounter select for Trackboard / archive list queries.
 * MUST NOT include D3B fields (`hospitalEpisodeId`) or HospitalEpisode relations.
 *
 * Why: `findMany({ include })` without parent `select` emits SQL for every scalar
 * column on the generated Prisma client — including unapplied migrations.
 * Feature flags cannot suppress Prisma query generation.
 */

/** Columns that must never appear in Trackboard SQL while D3B is optional/unapplied. */
export const TRACKBOARD_ENCOUNTER_FORBIDDEN_SELECT_KEYS = [
  "hospitalEpisodeId",
  "hospitalEpisode",
  "hospitalEpisodesOriginated",
  /** D3C — placement must be a separate optional query, never Encounter select. */
  "internalPlacementRequestsOriginated",
  "internalPlacementRequestsAsReceiving",
] as const;

const patientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  dob: true,
  sexAtBirth: true,
  mrn: true,
} as const;

const userNameSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

/**
 * Pre-/post-D3B compatible Trackboard encounter projection.
 * Omits hospitalEpisodeId so generated clients remain DB-compatible before migration.
 */
export const TRACKBOARD_ACTIVE_ENCOUNTER_SELECT = {
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
  patient: { select: patientSelect },
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

export type TrackboardActiveEncounterSelect = typeof TRACKBOARD_ACTIVE_ENCOUNTER_SELECT;

/** Archive list — same D3B exclusion rule; slightly different relation shape. */
export const TRACKBOARD_ARCHIVE_ENCOUNTER_SELECT = {
  id: true,
  status: true,
  type: true,
  createdAt: true,
  dischargedAt: true,
  chiefComplaint: true,
  providerDocumentationStatus: true,
  billingFinalizationStatus: true,
  billingReadinessSnapshotJson: true,
  dischargeSummaryJson: true,
  admissionSummaryJson: true,
  nursingAssessment: true,
  workflowState: true,
  providerNote: true,
  treatmentPlan: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dob: true,
      sexAtBirth: true,
      mrn: true,
      phone: true,
    },
  },
  triage: {
    select: { chiefComplaint: true },
  },
  facility: {
    select: { name: true },
  },
  _count: { select: { diagnoses: true } },
} satisfies Prisma.EncounterSelect;

/** Runtime contract: fail tests / CI if D3B keys leak into Trackboard selects. */
export function assertTrackboardSelectExcludesD3bFields(
  select: Record<string, unknown>
): void {
  for (const key of TRACKBOARD_ENCOUNTER_FORBIDDEN_SELECT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(select, key)) {
      throw new Error(
        `Trackboard select must not include D3B key "${key}" (schema-expand rollout / unapplied migration safety).`
      );
    }
  }
}
