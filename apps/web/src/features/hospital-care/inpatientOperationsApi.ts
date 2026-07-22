/**
 * D3E.7 — Direct inpatient admission API client.
 */

import { apiFetch } from "@/lib/apiClient";

export type DirectAdmissionPayload = {
  patientId: string;
  admissionSource?:
    | "EMERGENCY_DEPARTMENT"
    | "DIRECT"
    | "CLINIC"
    | "SCHEDULED"
    | "EXTERNAL_TRANSFER"
    | "OBSERVATION_CONVERSION"
    | "OTHER";
  admittingService?: string | null;
  attendingProviderUserId?: string | null;
  admissionDiagnosis?: string | null;
  reasonForAdmission?: string | null;
  requestedLevelOfCare?: string | null;
  requestedUnit?: string | null;
  plannedAt?: string | null;
  isolationRequired?: boolean;
  isolationType?: string | null;
  codeStatus?: string | null;
  notes?: string | null;
  referringProviderOrFacility?: string | null;
  assignedBedKey?: string | null;
  sourceEdEncounterId?: string | null;
  idempotencyKey?: string | null;
  admittedAt?: string | null;
};

export type DirectAdmissionResponse = {
  encounter?: { id?: string } | null;
  hospitalEpisodeId?: string | null;
  createdEdEncounter?: boolean;
  createdObservationEncounter?: boolean;
  clinicalContext?: string;
  idempotentReuse?: boolean;
  edEncounterMutated?: boolean;
  edEncounterClosed?: boolean;
  receivingNurseUserId?: string;
};

export async function createDirectInpatientAdmission(
  payload: DirectAdmissionPayload
): Promise<DirectAdmissionResponse> {
  return (await apiFetch("/inpatient-operations/direct-admission", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as DirectAdmissionResponse;
}

export async function fetchInpatientClinicalOps(encounterId: string): Promise<{
  encounterId: string;
  ops: Record<string, unknown>;
}> {
  return (await apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/clinical-ops`
  )) as { encounterId: string; ops: Record<string, unknown> };
}

export async function patchInpatientClinicalOps(
  encounterId: string,
  patch: Record<string, unknown>
): Promise<{ encounterId: string; ops: Record<string, unknown> }> {
  return (await apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/clinical-ops`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  )) as { encounterId: string; ops: Record<string, unknown> };
}
