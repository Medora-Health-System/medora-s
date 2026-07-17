import { apiFetch } from "./apiClient";

const API_BASE = "/medications/review";

export type RxNormReviewQueueRow = {
  candidateId: string;
  reviewVersion: number;
  status: string;
  releaseId: string;
  releaseIdentifier: string;
  rxcui: string;
  termType: string;
  displayTerm: string | null;
  targetKind: string;
  targetId: string;
  targetCode: string | null;
  confidence: string | null;
  autoVerified: boolean;
  assignedToUserId: string | null;
  assignedAt: string | null;
  conflictStatus: string | null;
  isSynthetic: boolean;
  dataClassification: string | null;
};

export type RxNormReviewQueueResult = {
  total: number;
  limit: number;
  offset: number;
  rows: RxNormReviewQueueRow[];
};

export type RxNormReviewCandidateDetail = RxNormReviewQueueRow & {
  evidenceJson: unknown;
  decisionEvidenceJson: unknown;
  reviewNotes: string | null;
  rejectionReasonCategory: string | null;
  conflictOverrideAcknowledged: boolean;
  conflictOverrideReasons: unknown;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  deferredAt: string | null;
  deferredReason: string | null;
  reviewStartedAt: string | null;
  staging: {
    id: string;
    rxcui: string;
    termType: string;
    displayTerm: string | null;
    normalizedTerm: string | null;
    sourceVocabulary: string;
    validationStatus: string;
    conflictStatus: string | null;
    dataClassification: string | null;
    isSynthetic: boolean;
  };
  release: {
    id: string;
    releaseIdentifier: string;
    isSynthetic: boolean;
    sourceClassification: string | null;
    importStatus: string;
    isActiveReference: boolean;
  };
  target: {
    kind: string;
    id: string;
    code: string | null;
    displayName: string | null;
    dataClassification: string | null;
    rxNormConceptId: string | null;
    rxNormMappingStatus: string | null;
  };
  activeVerifiedMappings: Array<{
    id: string;
    rxcui: string;
    lifecycleStatus: string;
    isSynthetic: boolean;
    verifiedAt: string;
    reviewerNotes: string | null;
  }>;
  mappingTimeline: Array<{
    id: string;
    rxcui: string;
    lifecycleStatus: string;
    isActive: boolean;
    verifiedAt: string;
    retiredAt: string | null;
    supersedesMappingId: string | null;
    supersededByMappingId: string | null;
  }>;
  auditHistory: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    actorRoleLabel: string | null;
    rationaleNotes: string | null;
    createdAt: string;
  }>;
};

export type RxNormReviewDashboard = {
  candidatesTotal: number;
  candidatesOpen: number;
  candidatesReviewed: number;
  approvalCount: number;
  rejectionCount: number;
  deferredCount: number;
  approvalRate: number | null;
  rejectionRate: number | null;
  averageReviewTimeSeconds: number | null;
  conflictCount: number;
  conflictRate: number | null;
  unresolvedAmbiguity: number;
  supersededMappings: number;
  retiredMappings: number;
  mappingsPerRelease: Array<{
    releaseId: string;
    releaseIdentifier: string;
    activeMappings: number;
  }>;
  reviewerWorkload: Array<{
    reviewerUserId: string;
    assignedOpen: number;
    reviewedCount: number;
  }>;
  automaticVerificationEnabled: false;
  clinicalActivationEnabled: false;
  pilot: {
    pilotId: string;
    enabled: boolean;
    targetCount: number;
    therapeuticArea: string;
    clinicalActivationEnabled: boolean;
    automaticVerificationEnabled: boolean;
    importExecuted: boolean;
    notes: string;
  };
};

export type RxNormReviewMutationResult = {
  ok: boolean;
  candidateId?: string;
  verifiedMappingId?: string;
  reviewVersion?: number;
  message?: string;
};

export async function fetchRxNormReviewCandidates(
  facilityId: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<RxNormReviewQueueResult> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return (await apiFetch(`${API_BASE}/candidates${suffix}`, { facilityId })) as RxNormReviewQueueResult;
}

export async function fetchRxNormReviewCandidate(
  facilityId: string,
  candidateId: string
): Promise<RxNormReviewCandidateDetail> {
  return (await apiFetch(`${API_BASE}/candidate/${encodeURIComponent(candidateId)}`, {
    facilityId,
  })) as RxNormReviewCandidateDetail;
}

export async function fetchRxNormReviewDashboard(facilityId: string): Promise<RxNormReviewDashboard> {
  return (await apiFetch(`${API_BASE}/dashboard`, { facilityId })) as RxNormReviewDashboard;
}

export async function approveRxNormReviewCandidate(
  facilityId: string,
  body: {
    candidateId: string;
    expectedReviewVersion: number;
    confirmApprove: true;
    rationaleNotes: string;
    conflictOverrideAcknowledged?: boolean;
    conflictOverrideReasons?: string[];
  }
): Promise<RxNormReviewMutationResult> {
  return (await apiFetch(`${API_BASE}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as RxNormReviewMutationResult;
}

export async function rejectRxNormReviewCandidate(
  facilityId: string,
  body: {
    candidateId: string;
    expectedReviewVersion: number;
    confirmReject: true;
    rationaleNotes: string;
    rejectionReasonCategory: string;
  }
): Promise<RxNormReviewMutationResult> {
  return (await apiFetch(`${API_BASE}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as RxNormReviewMutationResult;
}

export async function deferRxNormReviewCandidate(
  facilityId: string,
  body: {
    candidateId: string;
    expectedReviewVersion: number;
    confirmDefer: true;
    deferredReason: string;
  }
): Promise<RxNormReviewMutationResult> {
  return (await apiFetch(`${API_BASE}/defer`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as RxNormReviewMutationResult;
}

export async function assignRxNormReviewCandidate(
  facilityId: string,
  body: {
    candidateId: string;
    expectedReviewVersion: number;
    assignedToUserId: string;
  }
): Promise<RxNormReviewMutationResult> {
  return (await apiFetch(`${API_BASE}/assign`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as RxNormReviewMutationResult;
}

export async function retireRxNormReviewMapping(
  facilityId: string,
  body: {
    verifiedMappingId: string;
    confirmRetire: true;
    retireReason: string;
    candidateId?: string;
  }
): Promise<RxNormReviewMutationResult> {
  return (await apiFetch(`${API_BASE}/retire`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as RxNormReviewMutationResult;
}

export async function supersedeRxNormReviewMapping(
  facilityId: string,
  body: {
    candidateId: string;
    expectedReviewVersion: number;
    previousVerifiedMappingId: string;
    confirmApprove: true;
    rationaleNotes: string;
  }
): Promise<RxNormReviewMutationResult> {
  return (await apiFetch(`${API_BASE}/supersede`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as RxNormReviewMutationResult;
}

export async function bulkRxNormReviewCandidates(
  facilityId: string,
  body: {
    action: "APPROVE" | "REJECT" | "DEFER";
    confirmBulk: true;
    rationaleNotes: string;
    rejectionReasonCategory?: string;
    items: Array<{ candidateId: string; expectedReviewVersion: number }>;
  }
): Promise<{ ok: boolean; processed: number; failed: Array<{ candidateId: string; error: string }> }> {
  return (await apiFetch(`${API_BASE}/bulk`, {
    method: "POST",
    body: JSON.stringify(body),
    facilityId,
  })) as {
    ok: boolean;
    processed: number;
    failed: Array<{ candidateId: string; error: string }>;
  };
}
