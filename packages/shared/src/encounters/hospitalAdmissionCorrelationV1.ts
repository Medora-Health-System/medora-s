/**
 * D3E.8 — Canonical Admission Correlation contract (OPTION A: versioned JSON).
 *
 * Storage: Encounter.admissionSummaryJson.admissionCorrelation (+ mirror fields).
 * Zero-schema. No dedicated Prisma model in this certification.
 *
 * AdmissionCorrelation is admission identity.
 * HospitalEpisode is continuity only — never sole reuse evidence.
 */

export const INPATIENT_ADMISSION_CORRELATION_CERTIFICATION_ID =
  "MEDUI.INPATIENT_ADMISSION_CORRELATION.D3E8" as const;

/** @deprecated use INPATIENT_ADMISSION_CORRELATION_CERTIFICATION_ID */
export const HOSPITAL_ADMISSION_CORRELATION_CERTIFICATION_ID =
  INPATIENT_ADMISSION_CORRELATION_CERTIFICATION_ID;

export const HOSPITAL_ADMISSION_CORRELATION_VERSION = 1 as const;

export type HospitalAdmissionIntent =
  | "NURSE_ADMISSION_INTAKE"
  | "DIRECT_ADMISSION"
  | "PLACEMENT_RECEIVING"
  | "SCHEDULED_ADMISSION"
  | "TRANSFER_IN"
  | "OBSERVATION_CONVERSION"
  | "ED_ADMIT_TO_INPATIENT";

export type AdmissionCorrelationStatus =
  | "INTENT_CREATED"
  | "PLACEMENT_REQUESTED"
  | "ACCEPTED"
  | "RECEIVING_STARTED"
  | "ENCOUNTER_CREATED"
  | "ARRIVED"
  | "ACTIVE"
  | "CANCELLED"
  | "COMPLETED";

export type HospitalAdmissionCorrelationV1 = {
  version: typeof HOSPITAL_ADMISSION_CORRELATION_VERSION;
  admissionCorrelationId: string;
  admissionIntent: HospitalAdmissionIntent;
  status: AdmissionCorrelationStatus;
  patientId: string;
  facilityId: string;
  admissionSource: string | null;
  destinationEncounterContext: "INPATIENT";
  destinationUnitId: string | null;
  hospitalEpisodeId: string | null;
  sourceEncounterId: string | null;
  internalPlacementRequestId: string | null;
  receivingEncounterId: string | null;
  idempotencyKey: string | null;
  initiatedByUserId: string | null;
  receivingUserId: string | null;
  admissionIntentCreatedAt: string;
  requestedAdmissionAt: string | null;
  receivingStartedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  correlationVersion: number;
  /** @deprecated alias of admissionIntentCreatedAt */
  createdAt: string;
};

export type AdmissionCorrelationCandidate = {
  id: string;
  hospitalEpisodeId?: string | null;
  admissionSummaryJson?: unknown;
};

export type AdmissionCorrelationReuseDecision =
  | {
      action: "REUSE";
      receivingEncounterId: string;
      reason:
        | "IDEMPOTENCY_KEY"
        | "ADMISSION_CORRELATION_ID"
        | "PLACEMENT_REQUEST"
        | "SOURCE_AND_PLACEMENT"
        | "LEGACY_EXPLICIT_RECEIVING";
      correlation: HospitalAdmissionCorrelationV1 | null;
    }
  | {
      action: "CREATE";
      reason: "NO_CORRELATED_RECEIVING";
    }
  | {
      action: "DENY";
      code:
        | "UNRELATED_OPEN_INPATIENT"
        | "CROSS_EPISODE_ATTACHMENT"
        | "CORRELATION_CONFLICT"
        | "ADMISSION_CORRELATION_REVIEW_REQUIRED"
        | "POSSIBLE_SEPARATE_ACTIVE_ADMISSION_REVIEW_REQUIRED"
        | "ADMISSION_CORRELATION_KEY_REQUIRED";
      detail: string;
      blockingEncounterId?: string;
    };

export type LegacyReconciliationDecision =
  | { action: "LINK"; reason: "EXPLICIT_PLACEMENT_RECEIVING" | "EXPLICIT_INTAKE_LINKAGE" }
  | { action: "REVIEW_REQUIRED"; code: "ADMISSION_CORRELATION_REVIEW_REQUIRED"; detail: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimOrNull(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return s ? s : null;
}

/** Unsafe historical fallback — never use for reuse matching. */
export function isUnsafePatientActiveCorrelationId(id: string | null | undefined): boolean {
  const s = String(id ?? "");
  return s.startsWith("admcorr:patient:") && s.endsWith(":active");
}

/**
 * Build a durable correlation id. Never returns patient:active for new admits.
 * Prefer server-generated UUID when no durable key exists.
 */
export function buildAdmissionCorrelationId(input: {
  admissionCorrelationId?: string | null;
  idempotencyKey?: string | null;
  internalPlacementRequestId?: string | null;
  sourceEncounterId?: string | null;
  /** Server-owned UUID — required when no other durable key exists. */
  serverGeneratedId?: string | null;
  patientId?: string;
  facilityId?: string;
}): { ok: true; id: string } | { ok: false; code: "ADMISSION_CORRELATION_KEY_REQUIRED" } {
  const explicit = trimOrNull(input.admissionCorrelationId);
  if (explicit && !isUnsafePatientActiveCorrelationId(explicit)) {
    return { ok: true, id: explicit };
  }
  const idem = trimOrNull(input.idempotencyKey);
  if (idem) return { ok: true, id: `admcorr:idem:${idem}` };
  const placement = trimOrNull(input.internalPlacementRequestId);
  if (placement) return { ok: true, id: `admcorr:placement:${placement}` };
  const source = trimOrNull(input.sourceEncounterId);
  const facilityId = trimOrNull(input.facilityId);
  const patientId = trimOrNull(input.patientId);
  if (source && facilityId && patientId) {
    return { ok: true, id: `admcorr:src:${facilityId}:${patientId}:${source}` };
  }
  const serverId = trimOrNull(input.serverGeneratedId);
  if (serverId) return { ok: true, id: `admcorr:uuid:${serverId}` };
  return { ok: false, code: "ADMISSION_CORRELATION_KEY_REQUIRED" };
}

export function buildHospitalAdmissionCorrelationV1(input: {
  admissionCorrelationId?: string | null;
  admissionIntent: HospitalAdmissionIntent;
  status?: AdmissionCorrelationStatus;
  patientId: string;
  facilityId: string;
  admissionSource?: string | null;
  destinationUnitId?: string | null;
  hospitalEpisodeId?: string | null;
  sourceEncounterId?: string | null;
  internalPlacementRequestId?: string | null;
  receivingEncounterId?: string | null;
  idempotencyKey?: string | null;
  initiatedByUserId?: string | null;
  receivingUserId?: string | null;
  requestedAdmissionAt?: string | null;
  receivingStartedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  correlationVersion?: number;
  createdAt?: string | null;
  serverGeneratedId?: string | null;
}): HospitalAdmissionCorrelationV1 {
  const patientId = String(input.patientId ?? "").trim();
  const facilityId = String(input.facilityId ?? "").trim();
  const idempotencyKey = trimOrNull(input.idempotencyKey);
  const internalPlacementRequestId = trimOrNull(input.internalPlacementRequestId);
  const hospitalEpisodeId = trimOrNull(input.hospitalEpisodeId);
  const sourceEncounterId = trimOrNull(input.sourceEncounterId);
  const idResult = buildAdmissionCorrelationId({
    admissionCorrelationId: input.admissionCorrelationId,
    idempotencyKey,
    internalPlacementRequestId,
    sourceEncounterId,
    serverGeneratedId: input.serverGeneratedId,
    patientId,
    facilityId,
  });
  const admissionCorrelationId =
    idResult.ok
      ? idResult.id
      : `admcorr:uuid:pending-${patientId || "unknown"}`;
  const createdAt = trimOrNull(input.createdAt) ?? new Date().toISOString();

  return {
    version: HOSPITAL_ADMISSION_CORRELATION_VERSION,
    admissionCorrelationId,
    admissionIntent: input.admissionIntent,
    status: input.status ?? "INTENT_CREATED",
    patientId,
    facilityId,
    admissionSource: trimOrNull(input.admissionSource),
    destinationEncounterContext: "INPATIENT",
    destinationUnitId: trimOrNull(input.destinationUnitId),
    hospitalEpisodeId,
    sourceEncounterId,
    internalPlacementRequestId,
    receivingEncounterId: trimOrNull(input.receivingEncounterId),
    idempotencyKey,
    initiatedByUserId: trimOrNull(input.initiatedByUserId),
    receivingUserId: trimOrNull(input.receivingUserId),
    admissionIntentCreatedAt: createdAt,
    requestedAdmissionAt: trimOrNull(input.requestedAdmissionAt),
    receivingStartedAt: trimOrNull(input.receivingStartedAt),
    arrivedAt: trimOrNull(input.arrivedAt),
    completedAt: trimOrNull(input.completedAt),
    correlationVersion: Number.isFinite(input.correlationVersion)
      ? Number(input.correlationVersion)
      : 1,
    createdAt,
  };
}

export function readHospitalAdmissionCorrelation(
  admissionSummaryJson: unknown
): HospitalAdmissionCorrelationV1 | null {
  const root = asRecord(admissionSummaryJson);
  if (!root) return null;
  const nested = asRecord(root.admissionCorrelation);
  const src = nested ?? root;
  const admissionCorrelationId = trimOrNull(
    src.admissionCorrelationId ?? root.admissionCorrelationId
  );
  if (!admissionCorrelationId) {
    const idem = trimOrNull(root.d3e6dIdempotencyKey);
    const placement = trimOrNull(root.fromInternalPlacementRequestId);
    const source = trimOrNull(root.originatingEdEncounterId ?? root.sourceEdEncounterId);
    if (!idem && !placement && !source && !trimOrNull(root.d3e6dHospitalAdmissionIntake)) {
      return null;
    }
    return buildHospitalAdmissionCorrelationV1({
      admissionCorrelationId: idem
        ? `admcorr:idem:${idem}`
        : placement
          ? `admcorr:placement:${placement}`
          : source
            ? `admcorr:legacy:${source}`
            : undefined,
      serverGeneratedId: !idem && !placement && !source ? "legacy-synth" : undefined,
      admissionIntent: placement
        ? "PLACEMENT_RECEIVING"
        : root.d3e7DirectAdmission || root.d3e6dHospitalAdmissionIntake
          ? "NURSE_ADMISSION_INTAKE"
          : "DIRECT_ADMISSION",
      status: "ENCOUNTER_CREATED",
      patientId: "",
      facilityId: "",
      sourceEncounterId: source,
      internalPlacementRequestId: placement,
      idempotencyKey: idem,
      createdAt: trimOrNull(root.admissionInitiatedAt) ?? new Date(0).toISOString(),
    });
  }

  return buildHospitalAdmissionCorrelationV1({
    admissionCorrelationId,
    admissionIntent:
      (trimOrNull(src.admissionIntent) as HospitalAdmissionIntent) ?? "DIRECT_ADMISSION",
    status: (trimOrNull(src.status) as AdmissionCorrelationStatus) ?? "ACTIVE",
    patientId: trimOrNull(src.patientId) ?? "",
    facilityId: trimOrNull(src.facilityId) ?? "",
    admissionSource: trimOrNull(src.admissionSource),
    destinationUnitId: trimOrNull(src.destinationUnitId),
    hospitalEpisodeId: trimOrNull(src.hospitalEpisodeId),
    sourceEncounterId: trimOrNull(src.sourceEncounterId),
    internalPlacementRequestId: trimOrNull(src.internalPlacementRequestId),
    receivingEncounterId: trimOrNull(src.receivingEncounterId),
    idempotencyKey: trimOrNull(src.idempotencyKey ?? root.d3e6dIdempotencyKey),
    initiatedByUserId: trimOrNull(src.initiatedByUserId),
    receivingUserId: trimOrNull(src.receivingUserId),
    requestedAdmissionAt: trimOrNull(src.requestedAdmissionAt),
    receivingStartedAt: trimOrNull(src.receivingStartedAt),
    arrivedAt: trimOrNull(src.arrivedAt),
    completedAt: trimOrNull(src.completedAt),
    correlationVersion: Number(src.correlationVersion ?? src.version ?? 1),
    createdAt:
      trimOrNull(src.admissionIntentCreatedAt ?? src.createdAt) ?? new Date(0).toISOString(),
  });
}

export function mergeHospitalAdmissionCorrelationIntoSummary(
  admissionSummaryJson: unknown,
  correlation: HospitalAdmissionCorrelationV1
): Record<string, unknown> {
  const root = asRecord(admissionSummaryJson) ?? {};
  return {
    ...root,
    admissionCorrelation: correlation,
    admissionCorrelationId: correlation.admissionCorrelationId,
    admissionCorrelationVersion: correlation.version,
    d3e6dIdempotencyKey: correlation.idempotencyKey ?? root.d3e6dIdempotencyKey ?? null,
    originatingEdEncounterId:
      correlation.sourceEncounterId ?? root.originatingEdEncounterId ?? null,
    fromInternalPlacementRequestId:
      correlation.internalPlacementRequestId ?? root.fromInternalPlacementRequestId ?? null,
  };
}

const ALLOWED_STATUS_TRANSITIONS: Record<AdmissionCorrelationStatus, AdmissionCorrelationStatus[]> =
  {
    INTENT_CREATED: ["PLACEMENT_REQUESTED", "RECEIVING_STARTED", "ENCOUNTER_CREATED", "CANCELLED"],
    PLACEMENT_REQUESTED: ["ACCEPTED", "RECEIVING_STARTED", "CANCELLED"],
    ACCEPTED: ["RECEIVING_STARTED", "ENCOUNTER_CREATED", "ARRIVED", "CANCELLED"],
    RECEIVING_STARTED: ["ENCOUNTER_CREATED", "ARRIVED", "CANCELLED"],
    ENCOUNTER_CREATED: ["ARRIVED", "ACTIVE", "CANCELLED"],
    ARRIVED: ["ACTIVE", "COMPLETED"],
    ACTIVE: ["COMPLETED", "CANCELLED"],
    CANCELLED: [],
    COMPLETED: [],
  };

export function canTransitionAdmissionCorrelationStatus(
  from: AdmissionCorrelationStatus,
  to: AdmissionCorrelationStatus
): boolean {
  if (from === to) return true;
  return (ALLOWED_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Legacy reconciliation — explicit linkage only. Ambiguous → review required.
 * Prohibited sole evidence: patientId, facilityId, open IP, admittedAt proximity,
 * HospitalEpisode alone, room/unit alone.
 */
export function evaluateLegacyAdmissionLinkage(input: {
  placementReceivingEncounterId?: string | null;
  candidateEncounterId?: string | null;
  explicitIntakeLinkage?: boolean;
  samePatientOnly?: boolean;
  sameEpisodeOnly?: boolean;
  admittedAtProximityOnly?: boolean;
  sameUnitOnly?: boolean;
}): LegacyReconciliationDecision {
  const placementRecv = trimOrNull(input.placementReceivingEncounterId);
  const candidate = trimOrNull(input.candidateEncounterId);
  if (placementRecv && candidate && placementRecv === candidate) {
    return { action: "LINK", reason: "EXPLICIT_PLACEMENT_RECEIVING" };
  }
  if (input.explicitIntakeLinkage === true && candidate) {
    return { action: "LINK", reason: "EXPLICIT_INTAKE_LINKAGE" };
  }
  if (
    input.samePatientOnly ||
    input.sameEpisodeOnly ||
    input.admittedAtProximityOnly ||
    input.sameUnitOnly
  ) {
    return {
      action: "REVIEW_REQUIRED",
      code: "ADMISSION_CORRELATION_REVIEW_REQUIRED",
      detail: "Ambiguous legacy linkage — insufficient explicit evidence",
    };
  }
  return {
    action: "REVIEW_REQUIRED",
    code: "ADMISSION_CORRELATION_REVIEW_REQUIRED",
    detail: "No explicit legacy receiving linkage",
  };
}

export type DuplicateAdmissionEvaluation =
  | { code: "EXISTING_CORRELATED_ADMISSION"; receivingEncounterId: string }
  | { code: "POSSIBLE_SEPARATE_ACTIVE_ADMISSION_REVIEW_REQUIRED"; blockingEncounterId: string }
  | { code: "OK_CREATE" };

export function evaluateDuplicateAdmission(input: {
  reuse: AdmissionCorrelationReuseDecision;
}): DuplicateAdmissionEvaluation {
  if (input.reuse.action === "REUSE") {
    return {
      code: "EXISTING_CORRELATED_ADMISSION",
      receivingEncounterId: input.reuse.receivingEncounterId,
    };
  }
  if (input.reuse.action === "DENY") {
    return {
      code: "POSSIBLE_SEPARATE_ACTIVE_ADMISSION_REVIEW_REQUIRED",
      blockingEncounterId: input.reuse.blockingEncounterId ?? "",
    };
  }
  return { code: "OK_CREATE" };
}

/**
 * Decide whether an open Inpatient may be reused for this admission attempt.
 * Never returns REUSE for an unrelated open Inpatient.
 * HospitalEpisode alone is never sufficient.
 */
export function resolveReceivingEncounterReuse(input: {
  patientId: string;
  facilityId: string;
  admissionIntent: HospitalAdmissionIntent;
  hospitalEpisodeId?: string | null;
  sourceEncounterId?: string | null;
  internalPlacementRequestId?: string | null;
  idempotencyKey?: string | null;
  admissionCorrelationId?: string | null;
  /** Explicit placement.receivingEncounterId — strongest reuse evidence. */
  placementReceivingEncounterId?: string | null;
  openInpatientCandidates: AdmissionCorrelationCandidate[];
}): AdmissionCorrelationReuseDecision {
  const patientId = String(input.patientId ?? "").trim();
  const facilityId = String(input.facilityId ?? "").trim();
  const idem = trimOrNull(input.idempotencyKey);
  const placementId = trimOrNull(input.internalPlacementRequestId);
  const episodeId = trimOrNull(input.hospitalEpisodeId);
  const sourceId = trimOrNull(input.sourceEncounterId);
  const placementRecv = trimOrNull(input.placementReceivingEncounterId);
  const idBuild = buildAdmissionCorrelationId({
    admissionCorrelationId: input.admissionCorrelationId,
    idempotencyKey: idem,
    internalPlacementRequestId: placementId,
    sourceEncounterId: sourceId,
    patientId,
    facilityId,
  });
  const corrId = idBuild.ok ? idBuild.id : trimOrNull(input.admissionCorrelationId);

  const candidates = input.openInpatientCandidates ?? [];

  if (placementRecv) {
    const hit = candidates.find((c) => c.id === placementRecv);
    if (hit) {
      return {
        action: "REUSE",
        receivingEncounterId: hit.id,
        reason: "LEGACY_EXPLICIT_RECEIVING",
        correlation: readHospitalAdmissionCorrelation(hit.admissionSummaryJson),
      };
    }
  }

  const scoreMatch = (
    candidate: AdmissionCorrelationCandidate
  ): AdmissionCorrelationReuseDecision | null => {
    const existing = readHospitalAdmissionCorrelation(candidate.admissionSummaryJson);

    if (idem && existing?.idempotencyKey && existing.idempotencyKey === idem) {
      return {
        action: "REUSE",
        receivingEncounterId: candidate.id,
        reason: "IDEMPOTENCY_KEY",
        correlation: existing,
      };
    }

    if (
      corrId &&
      !isUnsafePatientActiveCorrelationId(corrId) &&
      existing?.admissionCorrelationId &&
      !isUnsafePatientActiveCorrelationId(existing.admissionCorrelationId) &&
      existing.admissionCorrelationId === corrId
    ) {
      return {
        action: "REUSE",
        receivingEncounterId: candidate.id,
        reason: "ADMISSION_CORRELATION_ID",
        correlation: existing,
      };
    }

    if (
      placementId &&
      existing?.internalPlacementRequestId &&
      existing.internalPlacementRequestId === placementId
    ) {
      return {
        action: "REUSE",
        receivingEncounterId: candidate.id,
        reason: "PLACEMENT_REQUEST",
        correlation: existing,
      };
    }

    // Nurse ↔ placement: require source encounter + placement bridge (or existing placement id).
    // HospitalEpisode alone is NOT sufficient (continuity ≠ admission identity).
    const sourceMatches =
      Boolean(sourceId) && existing?.sourceEncounterId === sourceId;
    const placementBridge =
      Boolean(placementId) &&
      (!existing?.internalPlacementRequestId ||
        existing.internalPlacementRequestId === placementId);
    const bothEpisodesPresent = Boolean(episodeId) && Boolean(existing?.hospitalEpisodeId);
    const episodeConflict =
      bothEpisodesPresent && existing!.hospitalEpisodeId !== episodeId;

    if (sourceMatches && placementBridge) {
      if (episodeConflict) {
        return {
          action: "DENY",
          code: "CROSS_EPISODE_ATTACHMENT",
          detail: "Open Inpatient belongs to a different HospitalEpisode",
          blockingEncounterId: candidate.id,
        };
      }
      return {
        action: "REUSE",
        receivingEncounterId: candidate.id,
        reason: "SOURCE_AND_PLACEMENT",
        correlation: existing,
      };
    }

    // Placement receiving looking up nurse-created IP: same source ED + same/compatible episode
    // when placement id is present on the request side (will be stamped onto IP).
    if (
      sourceMatches &&
      Boolean(placementId) &&
      Boolean(sourceId) &&
      (!bothEpisodesPresent || !episodeConflict)
    ) {
      if (episodeConflict) {
        return {
          action: "DENY",
          code: "CROSS_EPISODE_ATTACHMENT",
          detail: "Open Inpatient belongs to a different HospitalEpisode",
          blockingEncounterId: candidate.id,
        };
      }
      return {
        action: "REUSE",
        receivingEncounterId: candidate.id,
        reason: "SOURCE_AND_PLACEMENT",
        correlation: existing,
      };
    }

    return null;
  };

  for (const candidate of candidates) {
    const matched = scoreMatch(candidate);
    if (matched) return matched;
  }

  if (candidates.length === 0) {
    return { action: "CREATE", reason: "NO_CORRELATED_RECEIVING" };
  }

  const blocker = candidates[0]!;
  const blockerCorr = readHospitalAdmissionCorrelation(blocker.admissionSummaryJson);
  if (
    episodeId &&
    blockerCorr?.hospitalEpisodeId &&
    blockerCorr.hospitalEpisodeId !== episodeId
  ) {
    return {
      action: "DENY",
      code: "CROSS_EPISODE_ATTACHMENT",
      detail: "Open Inpatient belongs to a different HospitalEpisode",
      blockingEncounterId: blocker.id,
    };
  }

  // Ambiguous legacy open IP without durable keys → review, not silent reuse.
  if (!idem && !placementId && !corrId) {
    return {
      action: "DENY",
      code: "ADMISSION_CORRELATION_REVIEW_REQUIRED",
      detail: "Ambiguous open Inpatient — correlation review required",
      blockingEncounterId: blocker.id,
    };
  }

  return {
    action: "DENY",
    code: "UNRELATED_OPEN_INPATIENT",
    detail:
      "Patient already has an open Inpatient encounter that is not correlated to this admission",
    blockingEncounterId: blocker.id,
  };
}

/**
 * Pure resolver algorithm (Phase 7) — callers load correlation server-side first.
 */
export function planResolveOrCreateReceivingEncounter(input: {
  correlation: HospitalAdmissionCorrelationV1;
  actorUserId: string;
  expectedPatientId: string;
  expectedFacilityId: string;
  placementReceivingEncounterId?: string | null;
  openInpatientCandidates: AdmissionCorrelationCandidate[];
}): AdmissionCorrelationReuseDecision & { correlationId: string } {
  const corr = input.correlation;
  if (corr.facilityId && corr.facilityId !== input.expectedFacilityId) {
    return {
      action: "DENY",
      code: "CORRELATION_CONFLICT",
      detail: "Correlation facility mismatch",
      correlationId: corr.admissionCorrelationId,
    };
  }
  if (corr.patientId && corr.patientId !== input.expectedPatientId) {
    return {
      action: "DENY",
      code: "CORRELATION_CONFLICT",
      detail: "Correlation patient mismatch",
      correlationId: corr.admissionCorrelationId,
    };
  }
  if (corr.destinationEncounterContext !== "INPATIENT") {
    return {
      action: "DENY",
      code: "CORRELATION_CONFLICT",
      detail: "Destination context must be INPATIENT",
      correlationId: corr.admissionCorrelationId,
    };
  }

  if (corr.receivingEncounterId) {
    return {
      action: "REUSE",
      receivingEncounterId: corr.receivingEncounterId,
      reason: "ADMISSION_CORRELATION_ID",
      correlation: corr,
      correlationId: corr.admissionCorrelationId,
    };
  }

  const reuse = resolveReceivingEncounterReuse({
    patientId: input.expectedPatientId,
    facilityId: input.expectedFacilityId,
    admissionIntent: corr.admissionIntent,
    hospitalEpisodeId: corr.hospitalEpisodeId,
    sourceEncounterId: corr.sourceEncounterId,
    internalPlacementRequestId: corr.internalPlacementRequestId,
    idempotencyKey: corr.idempotencyKey,
    admissionCorrelationId: corr.admissionCorrelationId,
    placementReceivingEncounterId: input.placementReceivingEncounterId,
    openInpatientCandidates: input.openInpatientCandidates,
  });

  return { ...reuse, correlationId: corr.admissionCorrelationId };
}

export function assertPlacementReceivingMatchesCorrelation(input: {
  placementReceivingEncounterId?: string | null;
  correlationReceivingEncounterId?: string | null;
}): { ok: true } | { ok: false; code: "HARD_ERROR"; detail: string } {
  const p = trimOrNull(input.placementReceivingEncounterId);
  const c = trimOrNull(input.correlationReceivingEncounterId);
  if (p && c && p !== c) {
    return {
      ok: false,
      code: "HARD_ERROR",
      detail: "placement.receivingEncounterId !== correlation.receivingEncounterId",
    };
  }
  return { ok: true };
}

export function clinicalGovernanceBelongsToReceivingEncounter(): true {
  return true;
}

export function admissionPathwaysMustAllowEdPlusInpatient(
  pathway: HospitalAdmissionIntent | "GENERAL_CREATE"
): boolean {
  return pathway !== "GENERAL_CREATE";
}

/** HospitalEpisode is continuity — never sole admission identity. */
export function hospitalEpisodeAloneCannotProveCorrelation(): true {
  return true;
}

/** admittedAt proximity alone cannot prove correlation. */
export function admittedAtProximityAloneCannotProveCorrelation(): true {
  return true;
}
