/**
 * Phase 6 — governed RxNorm review operations (queue, defer, assign, bulk, dashboard).
 * Wraps Phase 4 verification mutations; never mutates clinical ordering/MAR/formulary/search.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  assertLegalMappingTransition,
  assertRxNormPilotRemainsNonClinical,
  isSyntheticRxCui,
  RXNORM_EM_PILOT_DEFAULT_CONFIG,
  RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES,
  type RxNormCandidateStatus,
  type RxNormEmPilotConfig,
  type RxNormRejectionReasonCategory,
  type RxNormReviewAuditAction,
} from "@medora/shared";
import {
  rejectMappingCandidate,
  retireVerifiedMapping,
  supersedeVerifiedMapping,
  verifyMappingCandidate,
  type RejectMappingCandidateInput,
  type RetireVerifiedMappingInput,
  type SupersedeVerifiedMappingInput,
  type VerificationMutationResult,
  type VerifyMappingCandidateInput,
} from "../rxnorm/rxnorm-verification-service";

const PILOT_CONFIG_PATH = join(
  process.cwd(),
  "prisma/medications/rxnorm/pilot/em-real-mapping-pilot.config.json"
);
const BULK_MAX = 50;

export type ReviewQueueFilters = {
  releaseId?: string;
  status?: string;
  termType?: string;
  assignedToUserId?: string;
  reviewerUserId?: string;
  ambiguityOnly?: boolean;
  conflictOnly?: boolean;
  /** Phase 6.5 — filter candidates whose evidence mentions pilot id. */
  pilotId?: string;
  /** Phase 7 — filter candidates whose evidence mentions batch id. */
  batchId?: string;
  duplicateClassification?: string;
  medicationCategory?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type ReviewQueueRow = {
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

export type ReviewCandidateDetail = ReviewQueueRow & {
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

export type ReviewDashboardMetrics = {
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
  mappingsPerRelease: Array<{ releaseId: string; releaseIdentifier: string; activeMappings: number }>;
  reviewerWorkload: Array<{
    reviewerUserId: string;
    assignedOpen: number;
    reviewedCount: number;
  }>;
  automaticVerificationEnabled: false;
  clinicalActivationEnabled: false;
  pilot: RxNormEmPilotConfig;
  /** Phase 6.5 controlled EM pilot metrics (governance only). */
  emPilotMetrics: {
    pilotId: string | null;
    pilotStatus: string | null;
    approvalStatus: string | null;
    pilotSourceRows: number;
    stagedItems: number;
    exactDuplicates: number;
    normalizedDuplicates: number;
    probableDuplicates: number;
    possibleDuplicates: number;
    openDuplicateAssessments: number;
    duplicateResolutionRate: number | null;
    clinicalActivations: 0;
    clinicalActivationAllowed: false;
    automaticVerificationEnabled: false;
  };
  /** Phase 7 controlled EM batch metrics (governance only). */
  emBatchMetrics: {
    batchId: string | null;
    batchStatus: string | null;
    approvalStatus: string | null;
    medicationFamiliesInScope: number;
    stagedItems: number;
    openDuplicateAssessments: number;
    reuseLinks: number;
    highAlertReviewCount: number;
    controlledSubstanceReviewCount: number;
    clinicalActivations: 0;
    clinicalActivationAllowed: false;
    automaticVerificationEnabled: false;
    rollbackReadiness: boolean;
  };
};

async function writeReviewAudit(
  prisma: PrismaClient,
  input: {
    candidateId?: string | null;
    verifiedMappingId?: string | null;
    action: RxNormReviewAuditAction;
    actorUserId?: string | null;
    actorRoleLabel?: string | null;
    rationaleNotes?: string | null;
    evidenceJson?: unknown;
  }
): Promise<void> {
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      candidateId: input.candidateId ?? null,
      verifiedMappingId: input.verifiedMappingId ?? null,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorRoleLabel: input.actorRoleLabel ?? null,
      rationaleNotes: input.rationaleNotes ?? null,
      evidenceJson: (input.evidenceJson as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

export function loadEmRealMappingPilotConfig(): RxNormEmPilotConfig {
  if (!existsSync(PILOT_CONFIG_PATH)) {
    return { ...RXNORM_EM_PILOT_DEFAULT_CONFIG };
  }
  const raw = JSON.parse(readFileSync(PILOT_CONFIG_PATH, "utf8")) as RxNormEmPilotConfig;
  assertRxNormPilotRemainsNonClinical(raw);
  return raw;
}

export async function listReviewQueue(
  prisma: PrismaClient,
  filters: ReviewQueueFilters = {}
): Promise<{ total: number; rows: ReviewQueueRow[]; limit: number; offset: number }> {
  const where: Prisma.RxNormMappingCandidateWhereInput = {};
  if (filters.releaseId) where.releaseId = filters.releaseId;
  if (filters.status) where.status = filters.status;
  if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
  if (filters.reviewerUserId) where.reviewedByUserId = filters.reviewerUserId;
  if (filters.conflictOnly) where.status = "CONFLICT";
  if (filters.ambiguityOnly) where.status = "AMBIGUOUS";
  if (filters.termType) {
    where.stagingConcept = { termType: filters.termType };
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { targetCode: { contains: q, mode: "insensitive" } },
      { stagingConcept: { rxcui: { contains: q, mode: "insensitive" } } },
      { stagingConcept: { displayTerm: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (filters.pilotId?.trim()) {
    // Pilot provenance is stored in evidence JSON when candidates are linked to a pilot.
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        evidenceJson: {
          path: ["pilotId"],
          equals: filters.pilotId.trim(),
        },
      },
    ];
  }
  if (filters.batchId?.trim()) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        evidenceJson: {
          path: ["batchId"],
          equals: filters.batchId.trim(),
        },
      },
    ];
  }
  if (filters.duplicateClassification?.trim()) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        evidenceJson: {
          path: ["duplicateClassification"],
          equals: filters.duplicateClassification.trim(),
        },
      },
    ];
  }
  if (filters.medicationCategory?.trim()) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        evidenceJson: {
          path: ["medicationCategory"],
          equals: filters.medicationCategory.trim(),
        },
      },
    ];
  }

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  const [total, rows] = await Promise.all([
    prisma.rxNormMappingCandidate.count({ where }),
    prisma.rxNormMappingCandidate.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        reviewVersion: true,
        status: true,
        releaseId: true,
        targetKind: true,
        targetId: true,
        targetCode: true,
        confidence: true,
        autoVerified: true,
        assignedToUserId: true,
        assignedAt: true,
        release: { select: { releaseIdentifier: true } },
        stagingConcept: {
          select: {
            rxcui: true,
            termType: true,
            displayTerm: true,
            conflictStatus: true,
            dataClassification: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    limit,
    offset,
    rows: rows.map((row) => ({
      candidateId: row.id,
      reviewVersion: row.reviewVersion,
      status: row.status,
      releaseId: row.releaseId,
      releaseIdentifier: row.release.releaseIdentifier,
      rxcui: row.stagingConcept.rxcui,
      termType: row.stagingConcept.termType,
      displayTerm: row.stagingConcept.displayTerm,
      targetKind: row.targetKind,
      targetId: row.targetId,
      targetCode: row.targetCode,
      confidence: row.confidence,
      autoVerified: row.autoVerified,
      assignedToUserId: row.assignedToUserId,
      assignedAt: row.assignedAt?.toISOString() ?? null,
      conflictStatus: row.stagingConcept.conflictStatus,
      isSynthetic: isSyntheticRxCui(row.stagingConcept.rxcui),
      dataClassification: row.stagingConcept.dataClassification,
    })),
  };
}

export async function getReviewCandidateDetail(
  prisma: PrismaClient,
  candidateId: string,
  actor?: { userId?: string; roleLabel?: string }
): Promise<ReviewCandidateDetail> {
  const row = await prisma.rxNormMappingCandidate.findUnique({
    where: { id: candidateId },
    include: {
      release: true,
      stagingConcept: true,
      reviewAuditEvents: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!row) throw new Error(`Mapping candidate not found: ${candidateId}`);

  let target: ReviewCandidateDetail["target"] = {
    kind: row.targetKind,
    id: row.targetId,
    code: row.targetCode,
    displayName: null,
    dataClassification: null,
    rxNormConceptId: null,
    rxNormMappingStatus: null,
  };

  if (row.targetKind === "MEDICATION_CONCEPT") {
    const concept = await prisma.medicationConcept.findUnique({
      where: { id: row.targetId },
      select: {
        code: true,
        displayName: true,
        dataClassification: true,
        rxNormConceptId: true,
        rxNormMappingStatus: true,
      },
    });
    if (concept) {
      target = {
        kind: row.targetKind,
        id: row.targetId,
        code: concept.code,
        displayName: concept.displayName,
        dataClassification: concept.dataClassification,
        rxNormConceptId: concept.rxNormConceptId,
        rxNormMappingStatus: concept.rxNormMappingStatus,
      };
    }
  } else if (row.targetKind === "MEDICATION_PRODUCT") {
    const product = await prisma.medicationProduct.findUnique({
      where: { id: row.targetId },
      select: {
        code: true,
        strengthDisplay: true,
        concept: {
          select: {
            displayName: true,
            dataClassification: true,
            rxNormConceptId: true,
            rxNormMappingStatus: true,
          },
        },
      },
    });
    if (product) {
      target = {
        kind: row.targetKind,
        id: row.targetId,
        code: product.code,
        displayName: `${product.concept.displayName} ${product.strengthDisplay}`.trim(),
        dataClassification: product.concept.dataClassification,
        rxNormConceptId: product.concept.rxNormConceptId,
        rxNormMappingStatus: product.concept.rxNormMappingStatus,
      };
    }
  }

  const [activeVerifiedMappings, mappingTimeline] = await Promise.all([
    prisma.rxNormVerifiedMapping.findMany({
      where: {
        targetKind: row.targetKind,
        targetId: row.targetId,
        isActive: true,
      },
      orderBy: { verifiedAt: "desc" },
      select: {
        id: true,
        rxcui: true,
        lifecycleStatus: true,
        isSynthetic: true,
        verifiedAt: true,
        reviewerNotes: true,
      },
    }),
    prisma.rxNormVerifiedMapping.findMany({
      where: {
        OR: [
          { targetKind: row.targetKind, targetId: row.targetId },
          { candidateId: row.id },
        ],
      },
      orderBy: { verifiedAt: "desc" },
      take: 50,
      select: {
        id: true,
        rxcui: true,
        lifecycleStatus: true,
        isActive: true,
        verifiedAt: true,
        retiredAt: true,
        supersedesMappingId: true,
        supersededByMappingId: true,
      },
    }),
  ]);

  if (!row.reviewStartedAt) {
    await prisma.rxNormMappingCandidate.update({
      where: { id: row.id },
      data: { reviewStartedAt: new Date() },
    });
  }

  if (actor?.userId) {
    await writeReviewAudit(prisma, {
      candidateId: row.id,
      action: "VIEW",
      actorUserId: actor.userId,
      actorRoleLabel: actor.roleLabel ?? null,
    });
  }

  return {
    candidateId: row.id,
    reviewVersion: row.reviewVersion,
    status: row.status,
    releaseId: row.releaseId,
    releaseIdentifier: row.release.releaseIdentifier,
    rxcui: row.stagingConcept.rxcui,
    termType: row.stagingConcept.termType,
    displayTerm: row.stagingConcept.displayTerm,
    targetKind: row.targetKind,
    targetId: row.targetId,
    targetCode: row.targetCode,
    confidence: row.confidence,
    autoVerified: row.autoVerified,
    assignedToUserId: row.assignedToUserId,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    conflictStatus: row.stagingConcept.conflictStatus,
    isSynthetic: isSyntheticRxCui(row.stagingConcept.rxcui),
    dataClassification: row.stagingConcept.dataClassification,
    evidenceJson: row.evidenceJson,
    decisionEvidenceJson: row.decisionEvidenceJson,
    reviewNotes: row.reviewNotes,
    rejectionReasonCategory: row.rejectionReasonCategory,
    conflictOverrideAcknowledged: row.conflictOverrideAcknowledged,
    conflictOverrideReasons: row.conflictOverrideReasons,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: row.reviewedByUserId,
    deferredAt: row.deferredAt?.toISOString() ?? null,
    deferredReason: row.deferredReason,
    reviewStartedAt: row.reviewStartedAt?.toISOString() ?? null,
    staging: {
      id: row.stagingConcept.id,
      rxcui: row.stagingConcept.rxcui,
      termType: row.stagingConcept.termType,
      displayTerm: row.stagingConcept.displayTerm,
      normalizedTerm: row.stagingConcept.normalizedTerm,
      sourceVocabulary: row.stagingConcept.sourceVocabulary,
      validationStatus: row.stagingConcept.validationStatus,
      conflictStatus: row.stagingConcept.conflictStatus,
      dataClassification: row.stagingConcept.dataClassification,
      isSynthetic: isSyntheticRxCui(row.stagingConcept.rxcui),
    },
    release: {
      id: row.release.id,
      releaseIdentifier: row.release.releaseIdentifier,
      isSynthetic: row.release.isSynthetic,
      sourceClassification: row.release.sourceClassification,
      importStatus: row.release.importStatus,
      isActiveReference: row.release.isActiveReference,
    },
    target,
    activeVerifiedMappings: activeVerifiedMappings.map((m) => ({
      id: m.id,
      rxcui: m.rxcui,
      lifecycleStatus: m.lifecycleStatus,
      isSynthetic: m.isSynthetic,
      verifiedAt: m.verifiedAt.toISOString(),
      reviewerNotes: m.reviewerNotes,
    })),
    mappingTimeline: mappingTimeline.map((m) => ({
      id: m.id,
      rxcui: m.rxcui,
      lifecycleStatus: m.lifecycleStatus,
      isActive: m.isActive,
      verifiedAt: m.verifiedAt.toISOString(),
      retiredAt: m.retiredAt?.toISOString() ?? null,
      supersedesMappingId: m.supersedesMappingId,
      supersededByMappingId: m.supersededByMappingId,
    })),
    auditHistory: row.reviewAuditEvents.map((e) => ({
      id: e.id,
      action: e.action,
      actorUserId: e.actorUserId,
      actorRoleLabel: e.actorRoleLabel,
      rationaleNotes: e.rationaleNotes,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function assignReviewCandidate(
  prisma: PrismaClient,
  input: {
    candidateId: string;
    assignedToUserId: string;
    actorUserId: string;
    actorRoleLabel?: string;
    expectedReviewVersion: number;
  }
): Promise<VerificationMutationResult> {
  const candidate = await prisma.rxNormMappingCandidate.findUnique({
    where: { id: input.candidateId },
  });
  if (!candidate) throw new Error(`Mapping candidate not found: ${input.candidateId}`);
  if (candidate.reviewVersion !== input.expectedReviewVersion) {
    throw new Error(
      `Concurrency conflict: candidate ${input.candidateId} reviewVersion ${input.expectedReviewVersion} is stale.`
    );
  }
  assertCandidateNotAutoVerified(candidate.autoVerified);

  const updated = await prisma.rxNormMappingCandidate.updateMany({
    where: { id: candidate.id, reviewVersion: input.expectedReviewVersion },
    data: {
      assignedToUserId: input.assignedToUserId,
      assignedAt: new Date(),
      reviewVersion: { increment: 1 },
      status:
        candidate.status === "CANDIDATE" || candidate.status === "DEFERRED"
          ? "NEEDS_REVIEW"
          : candidate.status,
    },
  });
  if (updated.count === 0) {
    throw new Error(
      `Concurrency conflict: candidate ${input.candidateId} reviewVersion ${input.expectedReviewVersion} is stale.`
    );
  }

  const refreshed = await prisma.rxNormMappingCandidate.findUniqueOrThrow({
    where: { id: candidate.id },
    select: { reviewVersion: true },
  });

  await writeReviewAudit(prisma, {
    candidateId: candidate.id,
    action: "ASSIGN",
    actorUserId: input.actorUserId,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: `Assigned to ${input.assignedToUserId}`,
    evidenceJson: { assignedToUserId: input.assignedToUserId },
  });

  return {
    ok: true,
    candidateId: candidate.id,
    reviewVersion: refreshed.reviewVersion,
    message: "Candidate assigned.",
  };
}

export async function deferReviewCandidate(
  prisma: PrismaClient,
  input: {
    candidateId: string;
    expectedReviewVersion: number;
    confirmDefer: boolean;
    deferredReason: string;
    reviewerUserId: string;
    actorRoleLabel?: string;
  }
): Promise<VerificationMutationResult> {
  if (!input.confirmDefer) throw new Error("deferReviewCandidate requires confirmDefer=true.");
  const reason = input.deferredReason.trim();
  if (!reason) throw new Error("deferredReason is required.");

  const candidate = await prisma.rxNormMappingCandidate.findUnique({
    where: { id: input.candidateId },
  });
  if (!candidate) throw new Error(`Mapping candidate not found: ${input.candidateId}`);
  assertCandidateNotAutoVerified(candidate.autoVerified);
  assertLegalMappingTransition(candidate.status as RxNormCandidateStatus, "DEFERRED");

  const deferredAt = new Date();
  const updated = await prisma.rxNormMappingCandidate.updateMany({
    where: {
      id: candidate.id,
      reviewVersion: input.expectedReviewVersion,
      status: { in: [...RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES] },
    },
    data: {
      status: "DEFERRED",
      deferredAt,
      deferredReason: reason,
      reviewNotes: reason,
      reviewedAt: deferredAt,
      reviewedByUserId: input.reviewerUserId,
      reviewVersion: { increment: 1 },
      autoVerified: false,
    },
  });
  if (updated.count === 0) {
    throw new Error(
      `Concurrency conflict: candidate ${input.candidateId} reviewVersion ${input.expectedReviewVersion} is stale.`
    );
  }

  const refreshed = await prisma.rxNormMappingCandidate.findUniqueOrThrow({
    where: { id: candidate.id },
    select: { reviewVersion: true },
  });

  await writeReviewAudit(prisma, {
    candidateId: candidate.id,
    action: "DEFER",
    actorUserId: input.reviewerUserId,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: reason,
  });

  return {
    ok: true,
    candidateId: candidate.id,
    reviewVersion: refreshed.reviewVersion,
    message: "Candidate deferred.",
  };
}

export async function approveReviewCandidate(
  prisma: PrismaClient,
  input: VerifyMappingCandidateInput & { actorRoleLabel?: string }
): Promise<VerificationMutationResult> {
  const result = await verifyMappingCandidate(prisma, input);
  await writeReviewAudit(prisma, {
    candidateId: input.candidateId,
    verifiedMappingId: result.verifiedMappingId ?? null,
    action: input.conflictOverrideAcknowledged ? "CONFLICT_RESOLVE" : "APPROVE",
    actorUserId: input.reviewerUserId ?? null,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: input.rationaleNotes,
  });
  return result;
}

export async function rejectReviewCandidate(
  prisma: PrismaClient,
  input: RejectMappingCandidateInput & { actorRoleLabel?: string }
): Promise<VerificationMutationResult> {
  const result = await rejectMappingCandidate(prisma, input);
  await writeReviewAudit(prisma, {
    candidateId: input.candidateId,
    action: "REJECT",
    actorUserId: input.reviewerUserId ?? null,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: input.rationaleNotes,
    evidenceJson: { rejectionReasonCategory: input.rejectionReasonCategory },
  });
  return result;
}

export async function retireReviewMapping(
  prisma: PrismaClient,
  input: RetireVerifiedMappingInput & { actorRoleLabel?: string; candidateId?: string }
): Promise<VerificationMutationResult> {
  const result = await retireVerifiedMapping(prisma, input);
  await writeReviewAudit(prisma, {
    candidateId: input.candidateId ?? result.candidateId ?? null,
    verifiedMappingId: input.verifiedMappingId,
    action: "RETIRE",
    actorUserId: input.retiredByUserId ?? null,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: input.retireReason,
  });
  return result;
}

export async function supersedeReviewMapping(
  prisma: PrismaClient,
  input: SupersedeVerifiedMappingInput & { actorRoleLabel?: string }
): Promise<VerificationMutationResult> {
  const result = await supersedeVerifiedMapping(prisma, input);
  await writeReviewAudit(prisma, {
    candidateId: input.candidateId,
    verifiedMappingId: result.verifiedMappingId ?? null,
    action: "SUPERSEDE",
    actorUserId: input.reviewerUserId ?? null,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: input.rationaleNotes,
    evidenceJson: { previousVerifiedMappingId: input.previousVerifiedMappingId },
  });
  return result;
}

export type BulkReviewItem = {
  candidateId: string;
  expectedReviewVersion: number;
};

export async function bulkReviewCandidates(
  prisma: PrismaClient,
  input: {
    action: "APPROVE" | "REJECT" | "DEFER";
    items: BulkReviewItem[];
    reviewerUserId: string;
    actorRoleLabel?: string;
    rationaleNotes: string;
    confirmBulk: boolean;
    rejectionReasonCategory?: RxNormRejectionReasonCategory;
    conflictOverrideAcknowledged?: boolean;
    conflictOverrideReasons?: string[];
  }
): Promise<{ ok: boolean; processed: number; failed: Array<{ candidateId: string; error: string }> }> {
  if (!input.confirmBulk) throw new Error("bulkReviewCandidates requires confirmBulk=true.");
  if (!input.items.length) throw new Error("bulkReviewCandidates requires at least one item.");
  if (input.items.length > BULK_MAX) {
    throw new Error(`bulkReviewCandidates supports at most ${BULK_MAX} items.`);
  }

  const failed: Array<{ candidateId: string; error: string }> = [];
  let processed = 0;

  for (const item of input.items) {
    try {
      if (input.action === "APPROVE") {
        await approveReviewCandidate(prisma, {
          candidateId: item.candidateId,
          expectedReviewVersion: item.expectedReviewVersion,
          confirmVerify: true,
          rationaleNotes: input.rationaleNotes,
          reviewerUserId: input.reviewerUserId,
          actorRoleLabel: input.actorRoleLabel,
          conflictOverrideAcknowledged: input.conflictOverrideAcknowledged,
          conflictOverrideReasons: input.conflictOverrideReasons,
        });
      } else if (input.action === "REJECT") {
        if (!input.rejectionReasonCategory) {
          throw new Error("rejectionReasonCategory is required for bulk reject.");
        }
        await rejectReviewCandidate(prisma, {
          candidateId: item.candidateId,
          expectedReviewVersion: item.expectedReviewVersion,
          confirmReject: true,
          rejectionReasonCategory: input.rejectionReasonCategory,
          rationaleNotes: input.rationaleNotes,
          reviewerUserId: input.reviewerUserId,
          actorRoleLabel: input.actorRoleLabel,
        });
      } else {
        await deferReviewCandidate(prisma, {
          candidateId: item.candidateId,
          expectedReviewVersion: item.expectedReviewVersion,
          confirmDefer: true,
          deferredReason: input.rationaleNotes,
          reviewerUserId: input.reviewerUserId,
          actorRoleLabel: input.actorRoleLabel,
        });
      }
      processed += 1;
    } catch (error) {
      failed.push({
        candidateId: item.candidateId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const auditAction =
    input.action === "APPROVE"
      ? "BULK_APPROVE"
      : input.action === "REJECT"
        ? "BULK_REJECT"
        : "BULK_DEFER";

  await writeReviewAudit(prisma, {
    action: auditAction,
    actorUserId: input.reviewerUserId,
    actorRoleLabel: input.actorRoleLabel ?? null,
    rationaleNotes: input.rationaleNotes,
    evidenceJson: {
      processed,
      failedCount: failed.length,
      candidateIds: input.items.map((i) => i.candidateId),
    },
  });

  return { ok: failed.length === 0, processed, failed };
}

export async function getReviewDashboardMetrics(
  prisma: PrismaClient
): Promise<ReviewDashboardMetrics> {
  const [
    candidatesTotal,
    candidatesOpen,
    approvalCount,
    rejectionCount,
    deferredCount,
    conflictCount,
    unresolvedAmbiguity,
    supersededMappings,
    retiredMappings,
    reviewedRows,
    mappingsByRelease,
    assignedOpen,
  ] = await Promise.all([
    prisma.rxNormMappingCandidate.count(),
    prisma.rxNormMappingCandidate.count({
      where: {
        status: { in: ["CANDIDATE", "NEEDS_REVIEW", "AMBIGUOUS", "CONFLICT", "DEFERRED"] },
      },
    }),
    prisma.rxNormMappingCandidate.count({ where: { status: "VERIFIED" } }),
    prisma.rxNormMappingCandidate.count({ where: { status: "REJECTED" } }),
    prisma.rxNormMappingCandidate.count({ where: { status: "DEFERRED" } }),
    prisma.rxNormMappingCandidate.count({ where: { status: "CONFLICT" } }),
    prisma.rxNormMappingCandidate.count({ where: { status: "AMBIGUOUS" } }),
    prisma.rxNormVerifiedMapping.count({ where: { lifecycleStatus: "SUPERSEDED" } }),
    prisma.rxNormVerifiedMapping.count({ where: { lifecycleStatus: "RETIRED" } }),
    prisma.rxNormMappingCandidate.findMany({
      where: {
        reviewedAt: { not: null },
        reviewStartedAt: { not: null },
        status: { in: ["VERIFIED", "REJECTED"] },
      },
      select: { reviewedAt: true, reviewStartedAt: true, reviewedByUserId: true },
      take: 5000,
    }),
    prisma.rxNormVerifiedMapping.groupBy({
      by: ["releaseId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.rxNormMappingCandidate.groupBy({
      by: ["assignedToUserId"],
      where: {
        assignedToUserId: { not: null },
        status: { in: ["CANDIDATE", "NEEDS_REVIEW", "AMBIGUOUS", "CONFLICT", "DEFERRED"] },
      },
      _count: { _all: true },
    }),
  ]);

  const candidatesReviewed = approvalCount + rejectionCount;
  const decided = approvalCount + rejectionCount;
  const approvalRate = decided > 0 ? approvalCount / decided : null;
  const rejectionRate = decided > 0 ? rejectionCount / decided : null;
  const conflictRate = candidatesTotal > 0 ? conflictCount / candidatesTotal : null;

  const reviewDurations = reviewedRows
    .filter((r) => r.reviewedAt && r.reviewStartedAt)
    .map((r) => (r.reviewedAt!.getTime() - r.reviewStartedAt!.getTime()) / 1000)
    .filter((s) => s >= 0 && s < 60 * 60 * 24 * 30);
  const averageReviewTimeSeconds =
    reviewDurations.length > 0
      ? reviewDurations.reduce((a, b) => a + b, 0) / reviewDurations.length
      : null;

  const releaseIds = mappingsByRelease.map((r) => r.releaseId);
  const releases =
    releaseIds.length === 0
      ? []
      : await prisma.rxNormReferenceRelease.findMany({
          where: { id: { in: releaseIds } },
          select: { id: true, releaseIdentifier: true },
        });
  const releaseName = new Map(releases.map((r) => [r.id, r.releaseIdentifier]));

  const reviewedByUser = new Map<string, number>();
  for (const row of reviewedRows) {
    if (!row.reviewedByUserId) continue;
    reviewedByUser.set(row.reviewedByUserId, (reviewedByUser.get(row.reviewedByUserId) ?? 0) + 1);
  }

  const reviewerWorkloadMap = new Map<
    string,
    { reviewerUserId: string; assignedOpen: number; reviewedCount: number }
  >();
  for (const row of assignedOpen) {
    if (!row.assignedToUserId) continue;
    reviewerWorkloadMap.set(row.assignedToUserId, {
      reviewerUserId: row.assignedToUserId,
      assignedOpen: row._count._all,
      reviewedCount: reviewedByUser.get(row.assignedToUserId) ?? 0,
    });
  }
  for (const [userId, count] of reviewedByUser) {
    if (!reviewerWorkloadMap.has(userId)) {
      reviewerWorkloadMap.set(userId, {
        reviewerUserId: userId,
        assignedOpen: 0,
        reviewedCount: count,
      });
    }
  }

  const pilot = loadEmRealMappingPilotConfig();

  let emPilotMetrics: ReviewDashboardMetrics["emPilotMetrics"] = {
    pilotId: null,
    pilotStatus: null,
    approvalStatus: null,
    pilotSourceRows: 0,
    stagedItems: 0,
    exactDuplicates: 0,
    normalizedDuplicates: 0,
    probableDuplicates: 0,
    possibleDuplicates: 0,
    openDuplicateAssessments: 0,
    duplicateResolutionRate: null,
    clinicalActivations: 0,
    clinicalActivationAllowed: false,
    automaticVerificationEnabled: false,
  };
  try {
    const { getPilotDuplicateMetrics } = await import(
      "../pilot/medication-em-pilot.service"
    );
    emPilotMetrics = await getPilotDuplicateMetrics(prisma);
  } catch {
    // Migration not applied yet — keep zeroed pilot metrics.
  }

  let emBatchMetrics: ReviewDashboardMetrics["emBatchMetrics"] = {
    batchId: null,
    batchStatus: null,
    approvalStatus: null,
    medicationFamiliesInScope: 0,
    stagedItems: 0,
    openDuplicateAssessments: 0,
    reuseLinks: 0,
    highAlertReviewCount: 0,
    controlledSubstanceReviewCount: 0,
    clinicalActivations: 0,
    clinicalActivationAllowed: false,
    automaticVerificationEnabled: false,
    rollbackReadiness: true,
  };
  try {
    const { getBatchDashboardMetrics } = await import(
      "../batch/medication-em-batch.service"
    );
    emBatchMetrics = await getBatchDashboardMetrics(prisma);
  } catch {
    // Migration not applied yet — keep zeroed batch metrics.
  }

  return {
    candidatesTotal,
    candidatesOpen,
    candidatesReviewed,
    approvalCount,
    rejectionCount,
    deferredCount,
    approvalRate,
    rejectionRate,
    averageReviewTimeSeconds,
    conflictCount,
    conflictRate,
    unresolvedAmbiguity,
    supersededMappings,
    retiredMappings,
    mappingsPerRelease: mappingsByRelease.map((r) => ({
      releaseId: r.releaseId,
      releaseIdentifier: releaseName.get(r.releaseId) ?? r.releaseId,
      activeMappings: r._count._all,
    })),
    reviewerWorkload: [...reviewerWorkloadMap.values()],
    automaticVerificationEnabled: false,
    clinicalActivationEnabled: false,
    pilot,
    emPilotMetrics,
    emBatchMetrics,
  };
}
