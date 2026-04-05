/**
 * Narrow row shape for GET /trackboard?status=OPEN&type=INPATIENT as used by
 * apps/web/app/app/hospitalisation/page.tsx. Matches trackboard.service include;
 * extra encounter scalars may exist at runtime.
 */

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
  chiefComplaint?: string | null;
  roomLabel?: string | null;
  status: string;
  createdAt: string | null | undefined;
  patient?: HospitalisationBoardPatient | null;
  triage?: HospitalisationBoardTriage | null;
  physicianAssigned?: HospitalisationBoardPhysician | null;
};
