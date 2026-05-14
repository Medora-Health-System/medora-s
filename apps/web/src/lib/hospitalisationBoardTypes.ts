/**
 * Narrow row shape for GET /trackboard?status=OPEN&type=INPATIENT as used by
 * apps/web/app/app/hospitalisation/page.tsx. Matches trackboard.service include;
 * extra encounter scalars may exist at runtime.
 */

import type { ObservationOperationalSnapshot } from "@medora/shared";

export type HospitalisationBoardTrackboardOps = {
  resultsPendingCount: number;
  criticalResultUnacknowledged: boolean;
  lastNursingReassessmentAt: string | null;
  /** Phase 13G-B — optional on encounter detail when operational aggregates are merged. */
  lastProviderObservationReassessmentAt?: string | null;
  /** Phase 13G-C — RN observation reassessment only (excludes ER nursing reassessment). */
  lastRnObservationReassessmentAt?: string | null;
  firstDispositionDocAt: string | null;
  lastTriageVitalsRecordedAt?: string | null;
};

export type HospitalisationBoardPatient = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  /** Not selected by trackboard API; optional for forward compatibility. */
  sex?: string | null;
};

export type HospitalisationBoardTriage = {
  chiefComplaint?: string | null;
  esi?: number | null;
};

export type HospitalisationBoardPhysician = {
  firstName?: string | null;
  lastName?: string | null;
};

export type HospitalisationBoardEncounterRow = {
  id: string;
  /** Prisma `EncounterType`; board query is `type=INPATIENT` but field is included on full row at runtime. */
  type?: string | null;
  chiefComplaint?: string | null;
  roomLabel?: string | null;
  status: string;
  createdAt: string | null | undefined;
  workflowState?: string | null;
  admittedAt?: string | null;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  patient?: HospitalisationBoardPatient | null;
  triage?: HospitalisationBoardTriage | null;
  physicianAssigned?: HospitalisationBoardPhysician | null;
  nurseAssigned?: HospitalisationBoardPhysician | null;
  trackboardOps?: HospitalisationBoardTrackboardOps;
  /** Phase 13B — server-computed observation / short-stay operational snapshot (INPATIENT only). */
  observationOps?: ObservationOperationalSnapshot | null;
};
