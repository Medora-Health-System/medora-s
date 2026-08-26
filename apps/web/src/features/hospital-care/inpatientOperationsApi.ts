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
    answers?: Record<string, unknown> | null;
    unableReason?: string | null;
    completionState?: string | null;
    expectedVersion: number;
    clinicalDocumentedAt?: string | null;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/sections`,
    { method: "PATCH", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; completion: Record<string, unknown> }>;
}

export async function fetchNursingAdmissionReview(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/review`
  ) as Promise<{
    certification: string;
    review: Record<string, unknown>;
    completion: Record<string, unknown>;
    documentation: Record<string, unknown>;
  }>;
}

export async function editInpatientAdmissionDetails(
  encounterId: string,
  body: Record<string, unknown>
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/lifecycle/edit-admission`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function transferInpatientBed(
  encounterId: string,
  body: { toBedKey: string; reason: string; effectiveAt?: string | null }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/lifecycle/transfer-bed`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function dischargeInpatientEncounter(
  encounterId: string,
  body: Record<string, unknown>
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/lifecycle/discharge`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function cancelInpatientAdmission(
  encounterId: string,
  body: { reasonCode: string; explanation: string }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/lifecycle/cancel-admission`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function voidInpatientEncounter(
  encounterId: string,
  body: { reason: string; confirm: boolean; adminOverride?: boolean }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/lifecycle/void-encounter`,
    { method: "POST", body: JSON.stringify(body) }
  );
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

/** D4A.2.5A — Domain reference / amendments / print summary. */
export async function linkNursingAdmissionDomainReference(
  encounterId: string,
  body: { reference: Record<string, unknown>; expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/domain-references`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; projection?: Record<string, unknown> }>;
}

export async function createNursingAdmissionAmendment(
  encounterId: string,
  body: {
    type: string;
    clientRequestId: string;
    reason: string;
    note?: string | null;
    sectionId?: string | null;
    originalValue?: unknown;
    correctedValue?: unknown;
    expectedVersion: number;
    expectedAmendmentVersion?: number;
    credentials?: string | null;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/amendments`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; amendment: Record<string, unknown> }>;
}

export async function fetchNursingAdmissionPrintSummary(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/nursing-admission/print-summary`
  ) as Promise<Record<string, unknown>>;
}

export async function fetchAuthoritativeClinicalProjection(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/authoritative-clinical-projection`
  ) as Promise<Record<string, unknown>>;
}

/** D4A.2.7B — Type-gated hospital workspace bootstrap. */
export async function fetchInpatientWorkspaceBootstrap(
  encounterId: string,
  role?: string,
  options?: { facilityId?: string | null }
) {
  const qs = role ? `?role=${encodeURIComponent(role)}` : "";
  const facilityId = options?.facilityId?.trim() || undefined;
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/workspace-bootstrap${qs}`,
    { facilityId }
  ) as Promise<import("@medora/shared").HospitalWorkspaceBootstrapV1>;
}

/** D4A.2.6 — Provider clinical workspace client. */
export async function fetchProviderWorkspace(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace`
  ) as Promise<{
    certification: string;
    documentation: Record<string, unknown>;
    clinicalOps: Record<string, unknown>;
    boundary: Record<string, unknown>;
  }>;
}

export async function acknowledgeProviderWorkspaceEvent(
  encounterId: string,
  body: {
    eventId: string;
    status: string;
    actionTaken?: string | null;
    expectedVersion: number;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/events/acknowledge`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function upsertProviderProblemPlan(
  encounterId: string,
  body: { item: Record<string, unknown>; expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/problem-plans`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function saveProviderHpDraft(
  encounterId: string,
  body: {
    sectionKey: string;
    text?: string | null;
    structured?: Record<string, unknown> | null;
    expectedVersion: number;
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/hp`,
    { method: "PATCH", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function signProviderHp(
  encounterId: string,
  body: { expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/hp/sign`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

/** D4A.2.6A — Live enterprise provider clinical synthesis. */
export async function fetchProviderClinicalSynthesis(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-clinical-synthesis`
  ) as Promise<{
    certification: string;
    synthesis: Record<string, unknown>;
    boundary: Record<string, unknown>;
  }>;
}

export async function saveProviderProgressNote(
  encounterId: string,
  body: { note: Record<string, unknown>; expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/progress-notes`,
    { method: "PATCH", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function signProviderProgressNote(
  encounterId: string,
  body: { noteId: string; expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/progress-notes/sign`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function carryForwardProviderProgressNote(
  encounterId: string,
  body: { fromNoteId: string; serviceDate: string; expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/progress-notes/carry-forward`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; note: Record<string, unknown> }>;
}

export async function fetchProviderPrintPackage(encounterId: string, kind: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-print-package/${encodeURIComponent(kind)}`
  ) as Promise<{
    certification: string;
    printClass?: string;
    package: Record<string, unknown>;
    documentMatrix?: unknown;
  }>;
}

export async function fetchCommandCenterClinicalSynthesis(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/command-center-clinical-synthesis`
  ) as Promise<Record<string, unknown>>;
}

export async function fetchProviderCensusFacets() {
  return apiFetch(`/inpatient-operations/provider-census/facets`) as Promise<{
    certification: string;
    supported: string[];
    unsupported: string[];
  }>;
}

export async function appendProviderAmendment(
  encounterId: string,
  body: Record<string, unknown>
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/amendments`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; amendment: Record<string, unknown> }>;
}

export async function saveProviderHandoff(
  encounterId: string,
  body: { handoff: Record<string, unknown>; expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/handoff`,
    { method: "PATCH", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function signProviderHandoffApi(
  encounterId: string,
  body: { expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/handoff/sign`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function acknowledgeProviderHandoffApi(
  encounterId: string,
  body: { expectedVersion: number }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/provider-workspace/handoff/acknowledge`,
    { method: "POST", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown> }>;
}

export async function fetchInpatientProviderDischarge(encounterId: string) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/inpatient-provider-discharge`
  ) as Promise<{
    encounterId: string;
    documentation: Record<string, unknown>;
    revision: number;
    planningContext?: {
      plannedDestination?: string | null;
      plannedDischargeWorkflowState?: string | null;
      anticipatedDischargeDate?: string | null;
    };
    canAuthor?: boolean;
  }>;
}

export async function saveInpatientProviderDischarge(
  encounterId: string,
  body: {
    documentation: Record<string, unknown>;
    expectedRevision: number;
    saveMode: "draft" | "complete";
  }
) {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/inpatient-provider-discharge`,
    { method: "PATCH", body: JSON.stringify(body) }
  ) as Promise<{ documentation: Record<string, unknown>; revision: number }>;
}
