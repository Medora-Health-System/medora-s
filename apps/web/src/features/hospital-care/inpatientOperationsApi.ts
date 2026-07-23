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
  sourceObservationEncounterId?: string | null;
  admissionCorrelationId?: string | null;
  internalPlacementRequestId?: string | null;
  medicationTransitionAction?: string | null;
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
  payload: DirectAdmissionPayload,
  options?: { facilityId?: string | null }
): Promise<DirectAdmissionResponse> {
  const facilityId = options?.facilityId?.trim() || undefined;
  return (await apiFetch("/inpatient-operations/direct-admission", {
    method: "POST",
    // Align x-facility-id with the same facility used for patient search (never trust body facility).
    facilityId,
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

/** D4A.1 nursing admission documentation client. */
export async function fetchNursingAdmissionDocumentation(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission`
  ) as Promise<{
    certification: string;
    documentation: Record<string, unknown>;
    completion: Record<string, unknown>;
  }>;
}

export async function patchNursingAdmissionSection(
  encounterId: string,
  body: {
    sectionId: string;
    draftText?: string | null;
    completionState?: string | null;
    expectedVersion: number;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/sections`,
    { method: "PATCH", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; completion: Record<string, unknown> }>;
}

export async function verifyNursingAdmissionPreloadItem(
  encounterId: string,
  body: {
    itemId: string;
    status: string;
    encounterNote?: string | null;
    expectedVersion: number;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/verify-preload`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function signNursingAdmission(
  encounterId: string,
  body: {
    expectedVersion: number;
    credentials?: string | null;
    displayName?: string | null;
    createProviderHandoff?: boolean;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/sign`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; completion: Record<string, unknown> }>;
}
