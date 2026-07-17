import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  assertConflictAdjudication,
  assertLegalMappingTransition,
  assertSyntheticToRealMappingBlocked,
  assertTargetKindCompatibleWithTermType,
  isSyntheticRxCui,
  requiresConflictAdjudication,
  RXNORM_REJECTION_REASON_VALUES,
  RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES,
  type RxNormCandidateStatus,
  type RxNormRejectionReasonCategory,
  type RxNormVerifyTargetKind,
} from "@medora/shared";

const FIXTURE_PATH = join(__dirname, "fixtures", "synthetic-canonical-targets-p4.json");

const FORBIDDEN_MUTATION_MODELS = [
  "catalogMedication",
  "medicationProductRoutePermission",
  "facilityFormularyItem",
  "medicationAdministration",
  "medicationBillingProfile",
  "inventoryItem",
] as const;

type SyntheticCanonicalFixture = {
  fixtureKind: string;
  notRealClinicalMedications: boolean;
  concepts: Array<{ code: string; genericName: string; displayName: string }>;
  products: Array<{
    code: string;
    conceptCode: string;
    strengthDisplay: string;
    dosageForm: string;
  }>;
};

export type EnsureSyntheticTargetsResult = {
  conceptsUpserted: number;
  productsUpserted: number;
  conceptCodes: string[];
  productCodes: string[];
};

export type MappingReviewReportFilters = {
  releaseId?: string;
  status?: string;
  targetKind?: string;
  limit?: number;
};

export type MappingReviewReportRow = {
  candidateId: string;
  reviewVersion: number;
  status: string;
  releaseIdentifier: string;
  rxcui: string;
  termType: string;
  targetKind: string;
  targetId: string;
  targetCode: string | null;
  confidence: string | null;
  autoVerified: boolean;
};

export type VerifyMappingCandidateInput = {
  candidateId: string;
  expectedReviewVersion: number;
  confirmVerify: boolean;
  reviewerUserId?: string;
  reviewerActorLabel?: string;
  rationaleNotes: string;
  conflictOverrideAcknowledged?: boolean;
  conflictOverrideReasons?: string[];
};

export type RejectMappingCandidateInput = {
  candidateId: string;
  expectedReviewVersion: number;
  confirmReject: boolean;
  rejectionReasonCategory: RxNormRejectionReasonCategory;
  reviewerUserId?: string;
  reviewerActorLabel?: string;
  rationaleNotes: string;
};

export type RetireVerifiedMappingInput = {
  verifiedMappingId: string;
  confirmRetire: boolean;
  retireReason: string;
  retiredByUserId?: string;
  reviewerActorLabel?: string;
};

export type SupersedeVerifiedMappingInput = VerifyMappingCandidateInput & {
  previousVerifiedMappingId: string;
};

export type VerificationMutationResult = {
  ok: boolean;
  candidateId?: string;
  verifiedMappingId?: string;
  reviewVersion?: number;
  message?: string;
};

function loadSyntheticCanonicalFixture(): SyntheticCanonicalFixture {
  const raw = readFileSync(FIXTURE_PATH, "utf8");
  return JSON.parse(raw) as SyntheticCanonicalFixture;
}

function assertPhase4MutationScope(context: string): void {
  for (const model of FORBIDDEN_MUTATION_MODELS) {
    if (context.includes(`${model}.`)) {
      throw new Error(`Forbidden Phase 4 mutation target: ${model}`);
    }
  }
}

function resolveReviewerNotes(input: {
  rationaleNotes: string;
  reviewerActorLabel?: string;
  reviewerUserId?: string;
}): string {
  const rationale = input.rationaleNotes.trim();
  if (!rationale) {
    throw new Error("Reviewer rationale notes are required.");
  }
  if (!input.reviewerUserId && !(input.reviewerActorLabel ?? "").trim()) {
    throw new Error("Either reviewerUserId or reviewerActorLabel is required.");
  }
  if (input.reviewerActorLabel?.trim()) {
    return `[${input.reviewerActorLabel.trim()}] ${rationale}`;
  }
  return rationale;
}

function assertRejectionReasonCategory(value: string): RxNormRejectionReasonCategory {
  const normalized = value.trim().toUpperCase();
  if (!(RXNORM_REJECTION_REASON_VALUES as readonly string[]).includes(normalized)) {
    throw new Error(`Unknown rejection reason category: ${value}`);
  }
  return normalized as RxNormRejectionReasonCategory;
}

async function loadTargetClassification(
  prisma: PrismaClient,
  targetKind: string,
  targetId: string
): Promise<{ targetCode: string | null; dataClassification: string | null }> {
  if (targetKind === "MEDICATION_CONCEPT") {
    const concept = await prisma.medicationConcept.findUnique({
      where: { id: targetId },
      select: { code: true, dataClassification: true },
    });
    if (!concept) throw new Error(`MedicationConcept target not found: ${targetId}`);
    return { targetCode: concept.code, dataClassification: concept.dataClassification };
  }

  if (targetKind === "MEDICATION_PRODUCT") {
    const product = await prisma.medicationProduct.findUnique({
      where: { id: targetId },
      select: {
        code: true,
        concept: { select: { dataClassification: true } },
      },
    });
    if (!product) throw new Error(`MedicationProduct target not found: ${targetId}`);
    return {
      targetCode: product.code,
      dataClassification: product.concept.dataClassification,
    };
  }

  throw new Error(`Unsupported verification targetKind in Phase 4: ${targetKind}`);
}

/** Upsert FIXTURE synthetic canonical targets only — never mutates real catalog rows. */
export async function ensureSyntheticCanonicalTargets(
  prisma: PrismaClient
): Promise<EnsureSyntheticTargetsResult> {
  assertPhase4MutationScope("rxnorm-verification-service.ensureSyntheticCanonicalTargets");

  const fixture = loadSyntheticCanonicalFixture();
  if (!fixture.notRealClinicalMedications) {
    throw new Error("Synthetic canonical fixture must declare notRealClinicalMedications=true.");
  }

  const conceptCodes: string[] = [];
  const productCodes: string[] = [];

  for (const concept of fixture.concepts) {
    if (!concept.code.startsWith("SYNTH_MC_")) {
      throw new Error(`Refusing to upsert non-synthetic concept code: ${concept.code}`);
    }

    await prisma.medicationConcept.upsert({
      where: { code: concept.code },
      create: {
        id: randomUUID(),
        code: concept.code,
        genericName: concept.genericName,
        displayName: concept.displayName,
        dataClassification: "FIXTURE",
        isActive: false,
        rxNormMappingStatus: "UNMAPPED",
      },
      update: {
        genericName: concept.genericName,
        displayName: concept.displayName,
        dataClassification: "FIXTURE",
      },
    });
    conceptCodes.push(concept.code);
  }

  for (const product of fixture.products) {
    if (!product.code.startsWith("SYNTH_MP_")) {
      throw new Error(`Refusing to upsert non-synthetic product code: ${product.code}`);
    }

    const concept = await prisma.medicationConcept.findUnique({
      where: { code: product.conceptCode },
      select: { id: true, dataClassification: true },
    });
    if (!concept || concept.dataClassification !== "FIXTURE") {
      throw new Error(`Missing FIXTURE concept for synthetic product: ${product.conceptCode}`);
    }

    await prisma.medicationProduct.upsert({
      where: { code: product.code },
      create: {
        id: randomUUID(),
        code: product.code,
        conceptId: concept.id,
        strengthDisplay: product.strengthDisplay,
        dosageForm: product.dosageForm,
        administrationType: "ORAL",
        billingClass: "UNKNOWN",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        baselineAvailable: false,
      },
      update: {
        strengthDisplay: product.strengthDisplay,
        dosageForm: product.dosageForm,
        conceptId: concept.id,
      },
    });
    productCodes.push(product.code);
  }

  return {
    conceptsUpserted: conceptCodes.length,
    productsUpserted: productCodes.length,
    conceptCodes,
    productCodes,
  };
}

export async function listMappingReviewReport(
  prisma: PrismaClient,
  filters: MappingReviewReportFilters = {}
): Promise<{ total: number; rows: MappingReviewReportRow[] }> {
  const where: Prisma.RxNormMappingCandidateWhereInput = {};
  if (filters.releaseId) where.releaseId = filters.releaseId;
  if (filters.status) where.status = filters.status;
  if (filters.targetKind) where.targetKind = filters.targetKind;

  const rows = await prisma.rxNormMappingCandidate.findMany({
    where,
    take: filters.limit ?? 200,
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      reviewVersion: true,
      status: true,
      targetKind: true,
      targetId: true,
      targetCode: true,
      confidence: true,
      autoVerified: true,
      release: { select: { releaseIdentifier: true } },
      stagingConcept: { select: { rxcui: true, termType: true } },
    },
  });

  return {
    total: rows.length,
    rows: rows.map((row) => ({
      candidateId: row.id,
      reviewVersion: row.reviewVersion,
      status: row.status,
      releaseIdentifier: row.release.releaseIdentifier,
      rxcui: row.stagingConcept.rxcui,
      termType: row.stagingConcept.termType,
      targetKind: row.targetKind,
      targetId: row.targetId,
      targetCode: row.targetCode,
      confidence: row.confidence,
      autoVerified: row.autoVerified,
    })),
  };
}

export async function verifyMappingCandidate(
  prisma: PrismaClient,
  input: VerifyMappingCandidateInput
): Promise<VerificationMutationResult> {
  assertPhase4MutationScope("rxnorm-verification-service.verifyMappingCandidate");

  if (!input.confirmVerify) {
    throw new Error("verifyMappingCandidate requires confirmVerify=true.");
  }

  const reviewNotes = resolveReviewerNotes(input);

  const candidate = await prisma.rxNormMappingCandidate.findUnique({
    where: { id: input.candidateId },
    include: {
      release: true,
      stagingConcept: true,
    },
  });
  if (!candidate) throw new Error(`Mapping candidate not found: ${input.candidateId}`);

  if (candidate.release.rollbackStatus === "ROLLED_BACK" || candidate.release.importStatus === "ROLLED_BACK") {
    throw new Error("Cannot verify candidates for a ROLLED_BACK release.");
  }
  if (candidate.stagingConcept.validationStatus === "REJECTED") {
    throw new Error("Cannot verify candidate linked to REJECTED staging row.");
  }
  if (candidate.autoVerified) {
    assertCandidateNotAutoVerified(true);
  }
  if (candidate.targetKind === "CATALOG_MEDICATION") {
    throw new Error("CATALOG_MEDICATION targets cannot be verified in Phase 4.");
  }

  assertLegalMappingTransition(candidate.status as RxNormCandidateStatus, "VERIFIED");

  if (
    !(RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES as readonly string[]).includes(candidate.status)
  ) {
    throw new Error(`Candidate status ${candidate.status} is not verifiable.`);
  }

  assertTargetKindCompatibleWithTermType(
    candidate.stagingConcept.termType,
    candidate.targetKind as RxNormVerifyTargetKind
  );

  const targetMeta = await loadTargetClassification(prisma, candidate.targetKind, candidate.targetId);
  assertSyntheticToRealMappingBlocked({
    rxcui: candidate.stagingConcept.rxcui,
    targetDataClassification: targetMeta.dataClassification,
    targetCode: targetMeta.targetCode ?? candidate.targetCode,
  });

  assertConflictAdjudication({
    status: candidate.status,
    acknowledged: input.conflictOverrideAcknowledged === true,
    overrideReasons: input.conflictOverrideReasons,
    notes: reviewNotes,
  });

  const verifiedAt = new Date();
  const mappingId = randomUUID();
  const decisionEvidence = {
    candidateEvidence: candidate.evidenceJson,
    overrideReasons: input.conflictOverrideReasons ?? [],
    reviewerActorLabel: input.reviewerActorLabel ?? null,
  };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.rxNormMappingCandidate.updateMany({
      where: {
        id: candidate.id,
        reviewVersion: input.expectedReviewVersion,
        status: { in: [...RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES] },
      },
      data: {
        status: "VERIFIED",
        reviewVersion: { increment: 1 },
        reviewedAt: verifiedAt,
        reviewedByUserId: input.reviewerUserId ?? null,
        reviewNotes,
        conflictOverrideAcknowledged: input.conflictOverrideAcknowledged === true,
        conflictOverrideReasons: input.conflictOverrideReasons ?? undefined,
        decisionEvidenceJson: decisionEvidence,
        autoVerified: false,
      },
    });

    if (updated.count === 0) {
      throw new Error(
        `Concurrency conflict: candidate ${candidate.id} reviewVersion ${input.expectedReviewVersion} is stale.`
      );
    }

    const superseded = await tx.rxNormVerifiedMapping.findMany({
      where: {
        targetKind: candidate.targetKind,
        targetId: candidate.targetId,
        isActive: true,
      },
      select: { id: true },
    });

    if (superseded.length > 0) {
      await tx.rxNormVerifiedMapping.updateMany({
        where: {
          targetKind: candidate.targetKind,
          targetId: candidate.targetId,
          isActive: true,
        },
        data: {
          isActive: false,
          lifecycleStatus: "SUPERSEDED",
          effectiveTo: verifiedAt,
        },
      });
    }

    await tx.rxNormVerifiedMapping.create({
      data: {
        id: mappingId,
        candidateId: candidate.id,
        releaseId: candidate.releaseId,
        stagingConceptId: candidate.stagingConceptId,
        targetKind: candidate.targetKind,
        targetId: candidate.targetId,
        targetCode: targetMeta.targetCode ?? candidate.targetCode,
        rxcui: candidate.stagingConcept.rxcui,
        termType: candidate.stagingConcept.termType,
        sourceVocabulary: candidate.stagingConcept.sourceVocabulary,
        lifecycleStatus: "ACTIVE",
        isActive: true,
        isSynthetic: isSyntheticRxCui(candidate.stagingConcept.rxcui),
        dataClassification: targetMeta.dataClassification ?? "UNKNOWN",
        evidenceJson: decisionEvidence,
        reviewerNotes: reviewNotes,
        verifiedByUserId: input.reviewerUserId ?? null,
        verifiedAt,
        supersedesMappingId: superseded[0]?.id ?? null,
      },
    });

    if (superseded.length > 0) {
      await tx.rxNormVerifiedMapping.updateMany({
        where: { id: { in: superseded.map((row) => row.id) } },
        data: { supersededByMappingId: mappingId },
      });
    }

    await tx.rxNormMappingCandidate.update({
      where: { id: candidate.id },
      data: { verifiedMappingId: mappingId },
    });

    if (candidate.targetKind === "MEDICATION_CONCEPT" && targetMeta.dataClassification === "FIXTURE") {
      await tx.medicationConcept.update({
        where: { id: candidate.targetId },
        data: {
          rxNormConceptId: candidate.stagingConcept.rxcui,
          rxNormTermType: candidate.stagingConcept.termType,
          rxNormSourceVocabulary: candidate.stagingConcept.sourceVocabulary,
          rxNormMappingStatus: "VERIFIED",
          rxNormMappedAt: verifiedAt,
          rxNormMappedByUserId: input.reviewerUserId ?? null,
          rxNormReviewedAt: verifiedAt,
          rxNormReviewNotes: reviewNotes,
        },
      });
    }

    const refreshed = await tx.rxNormMappingCandidate.findUniqueOrThrow({
      where: { id: candidate.id },
      select: { reviewVersion: true },
    });

    return {
      ok: true,
      candidateId: candidate.id,
      verifiedMappingId: mappingId,
      reviewVersion: refreshed.reviewVersion,
      message: "Candidate verified.",
    };
  });
}

export async function rejectMappingCandidate(
  prisma: PrismaClient,
  input: RejectMappingCandidateInput
): Promise<VerificationMutationResult> {
  assertPhase4MutationScope("rxnorm-verification-service.rejectMappingCandidate");

  if (!input.confirmReject) {
    throw new Error("rejectMappingCandidate requires confirmReject=true.");
  }

  const reviewNotes = resolveReviewerNotes(input);
  const rejectionReasonCategory = assertRejectionReasonCategory(input.rejectionReasonCategory);

  const candidate = await prisma.rxNormMappingCandidate.findUnique({
    where: { id: input.candidateId },
    include: { release: true, stagingConcept: true },
  });
  if (!candidate) throw new Error(`Mapping candidate not found: ${input.candidateId}`);

  assertLegalMappingTransition(candidate.status as RxNormCandidateStatus, "REJECTED");
  if (
    !(RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES as readonly string[]).includes(candidate.status)
  ) {
    throw new Error(`Candidate status ${candidate.status} is not rejectable.`);
  }

  const rejectedAt = new Date();
  const updated = await prisma.rxNormMappingCandidate.updateMany({
    where: {
      id: candidate.id,
      reviewVersion: input.expectedReviewVersion,
      status: { in: [...RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES] },
    },
    data: {
      status: "REJECTED",
      reviewVersion: { increment: 1 },
      reviewedAt: rejectedAt,
      reviewedByUserId: input.reviewerUserId ?? null,
      reviewNotes,
      rejectionReasonCategory,
      decisionEvidenceJson: {
        rejectionReasonCategory,
        reviewerActorLabel: input.reviewerActorLabel ?? null,
      },
      autoVerified: false,
    },
  });

  if (updated.count === 0) {
    throw new Error(
      `Concurrency conflict: candidate ${candidate.id} reviewVersion ${input.expectedReviewVersion} is stale.`
    );
  }

  const refreshed = await prisma.rxNormMappingCandidate.findUniqueOrThrow({
    where: { id: candidate.id },
    select: { reviewVersion: true },
  });

  return {
    ok: true,
    candidateId: candidate.id,
    reviewVersion: refreshed.reviewVersion,
    message: "Candidate rejected.",
  };
}

export async function retireVerifiedMapping(
  prisma: PrismaClient,
  input: RetireVerifiedMappingInput
): Promise<VerificationMutationResult> {
  assertPhase4MutationScope("rxnorm-verification-service.retireVerifiedMapping");

  if (!input.confirmRetire) {
    throw new Error("retireVerifiedMapping requires confirmRetire=true.");
  }
  if (!input.retireReason.trim()) {
    throw new Error("retireReason is required.");
  }
  if (!input.retiredByUserId && !(input.reviewerActorLabel ?? "").trim()) {
    throw new Error("Either retiredByUserId or reviewerActorLabel is required.");
  }

  const mapping = await prisma.rxNormVerifiedMapping.findUnique({
    where: { id: input.verifiedMappingId },
  });
  if (!mapping) throw new Error(`Verified mapping not found: ${input.verifiedMappingId}`);
  if (!mapping.isActive) {
    throw new Error(`Verified mapping is not active: ${input.verifiedMappingId}`);
  }

  const retiredAt = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.rxNormVerifiedMapping.update({
      where: { id: mapping.id },
      data: {
        isActive: false,
        lifecycleStatus: "RETIRED",
        effectiveTo: retiredAt,
        retiredAt,
        retiredByUserId: input.retiredByUserId ?? null,
        retireReason: input.reviewerActorLabel
          ? `[${input.reviewerActorLabel.trim()}] ${input.retireReason.trim()}`
          : input.retireReason.trim(),
      },
    });

    if (mapping.targetKind === "MEDICATION_CONCEPT") {
      const concept = await tx.medicationConcept.findUnique({
        where: { id: mapping.targetId },
        select: { dataClassification: true, rxNormConceptId: true },
      });
      if (
        concept?.dataClassification === "FIXTURE" &&
        concept.rxNormConceptId === mapping.rxcui
      ) {
        await tx.medicationConcept.update({
          where: { id: mapping.targetId },
          data: {
            rxNormMappingStatus: "RETIRED",
            rxNormConceptId: null,
            rxNormTermType: null,
            rxNormSourceVocabulary: null,
            rxNormReviewNotes: input.retireReason.trim(),
            rxNormReviewedAt: retiredAt,
          },
        });
      }
    }

    if (mapping.candidateId) {
      await tx.rxNormMappingCandidate.updateMany({
        where: { id: mapping.candidateId, status: "VERIFIED" },
        data: { status: "RETIRED" },
      });
    }

    return {
      ok: true,
      verifiedMappingId: mapping.id,
      message: "Verified mapping retired.",
    };
  });
}

export async function supersedeVerifiedMapping(
  prisma: PrismaClient,
  input: SupersedeVerifiedMappingInput
): Promise<VerificationMutationResult> {
  await retireVerifiedMapping(prisma, {
    verifiedMappingId: input.previousVerifiedMappingId,
    confirmRetire: true,
    retireReason: "Superseded by newer verified mapping.",
    retiredByUserId: input.reviewerUserId,
    reviewerActorLabel: input.reviewerActorLabel,
  });

  return verifyMappingCandidate(prisma, input);
}

export { requiresConflictAdjudication };
