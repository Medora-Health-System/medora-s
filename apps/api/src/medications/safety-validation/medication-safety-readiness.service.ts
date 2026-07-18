import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  PHASE11_DEFAULT_READINESS_THRESHOLDS,
  PHASE11_SAFETY_VALIDATION_DEFAULTS,
  assertForbiddenActivationStatus,
  assertPhase11NoOrderBlocking,
  assertPhase11NoProviderFacingAlerts,
  assessReadinessResult,
} from "@medora/shared";
import { isSafetyValidationAdmin } from "./medication-safety-validation.roles";
import type { ValidationActor } from "./medication-safety-validation-case.service";
import {
  getAccuracyAnalytics,
  getFalseNegativeAnalytics,
  getReliabilityAnalytics,
} from "./medication-safety-validation-analytics.service";

async function audit(
  prisma: PrismaClient,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    after?: unknown;
  }
) {
  await prisma.medicationSafetyValidationAuditEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      afterState: input.after as any,
      performedByUserId: input.userId,
    },
  });
}

export async function createReadinessPolicy(
  prisma: PrismaClient,
  input: {
    name: string;
    version: string;
    scope: string;
    findingTypes?: string[];
    medicationFamilies?: string[];
    thresholds?: Partial<import("@medora/shared").Phase11ReadinessThresholds>;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  assertPhase11NoProviderFacingAlerts(false);
  assertPhase11NoOrderBlocking(false);
  const t = {
    ...PHASE11_DEFAULT_READINESS_THRESHOLDS,
    ...input.thresholds,
  };
  const policy = await prisma.medicationSafetyActivationReadinessPolicy.create({
    data: {
      name: input.name,
      version: input.version,
      scope: input.scope,
      findingTypesJson: input.findingTypes ?? [],
      medicationFamiliesJson: input.medicationFamilies ?? [],
      minimumReviewedCases: t.minimumReviewedCases,
      minimumDualReviewedCases: t.minimumDualReviewedCriticalCases,
      minimumTruePositiveRate: t.minimumTruePositiveRate,
      maximumFalsePositiveRate: t.maximumFalsePositiveRate,
      minimumEstimatedRecall: t.minimumEstimatedRecall,
      maximumCriticalMisses: t.maximumCriticalMisses,
      maximumIdentityGapRate: t.maximumUnresolvedIdentityRate,
      maximumEvaluationFailureRate: t.maximumEvaluationFailureRate,
      minimumSeverityAgreement: t.minimumCriticalSeverityAgreement,
      minimumKnowledgeCoverage: t.minimumKnowledgeCoverage,
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
      createdByUserId: actor.userId,
      status: "DRAFT",
    },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyActivationReadinessPolicy",
    entityId: policy.id,
    action: "POLICY_CREATE",
    userId: actor.userId,
    after: policy,
  });
  return policy;
}

export async function transitionReadinessPolicy(
  prisma: PrismaClient,
  policyId: string,
  status: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const policy = await prisma.medicationSafetyActivationReadinessPolicy.findUnique({
    where: { id: policyId },
  });
  if (!policy) throw new NotFoundException("Politique introuvable.");
  if (policy.status === "APPROVED") {
    throw new BadRequestException(
      "Politique approuvée immuable — créez une nouvelle version."
    );
  }
  if (status === "APPROVED") {
    return approveReadinessPolicy(prisma, policyId, actor);
  }
  return prisma.medicationSafetyActivationReadinessPolicy.update({
    where: { id: policyId },
    data: { status },
  });
}

export async function approveReadinessPolicy(
  prisma: PrismaClient,
  policyId: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const policy = await prisma.medicationSafetyActivationReadinessPolicy.findUnique({
    where: { id: policyId },
  });
  if (!policy) throw new NotFoundException("Politique introuvable.");
  if (policy.status === "APPROVED") {
    throw new BadRequestException("Politique déjà approuvée et immuable.");
  }
  if (policy.providerFacingAlertsAllowed || policy.orderBlockingAllowed) {
    throw new BadRequestException("Phase 11 forbids alert/block-enabled policies.");
  }
  const updated = await prisma.medicationSafetyActivationReadinessPolicy.update({
    where: { id: policyId },
    data: { status: "APPROVED", effectiveDate: new Date() },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyActivationReadinessPolicy",
    entityId: policyId,
    action: "POLICY_APPROVE",
    userId: actor.userId,
    after: updated,
  });
  return updated;
}

export async function assessReadiness(
  prisma: PrismaClient,
  input: {
    readinessPolicyId: string;
    scopeType: string;
    scopeIdentifier: string;
    engineVersion?: string;
    sampleSource?: string;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const policy = await prisma.medicationSafetyActivationReadinessPolicy.findUnique({
    where: { id: input.readinessPolicyId },
  });
  if (!policy) throw new NotFoundException("Politique introuvable.");

  const [accuracy, fn, reliability, identityGaps, contextGaps, families, profiles] =
    await Promise.all([
      getAccuracyAnalytics(prisma),
      getFalseNegativeAnalytics(prisma),
      getReliabilityAnalytics(prisma),
      prisma.medicationIdentityGap.count({ where: { status: "OPEN" } }),
      prisma.medicationPatientContextGap.count({ where: { status: "OPEN" } }),
      prisma.medicationFamilyCoverageProfile.count(),
      prisma.medicationClinicalProfile.count({ where: { lifecycleStatus: "APPROVED" } }),
    ]);

  const reviewed = await prisma.medicationSafetyValidationReview.count();
  const dual = await prisma.medicationSafetyValidationCase.count({
    where: {
      requiresDualReview: true,
      validationStatus: "VALIDATED",
    },
  });
  const criticalMisses = fn.FalseNegativeCount;
  const identityGapRate =
    families === 0 ? 0 : Number((identityGaps / Math.max(1, families)).toFixed(4));
  const contextGapRate =
    reviewed === 0 ? 0 : Number((contextGaps / Math.max(1, reviewed)).toFixed(4));
  const knowledgeCoverage =
    families === 0 ? 0 : Number((profiles / Math.max(1, families)).toFixed(4));
  const tpRate =
    accuracy.TruePositiveRate.percentage == null
      ? null
      : accuracy.TruePositiveRate.percentage / 100;
  const fpRate =
    accuracy.FalsePositiveRate.percentage == null
      ? null
      : accuracy.FalsePositiveRate.percentage / 100;
  const recall =
    fn.EstimatedRecall.percentage == null
      ? null
      : fn.EstimatedRecall.percentage / 100;
  const failureRate =
    reliability.EvaluationRunFailureRate.percentage == null
      ? 0
      : reliability.EvaluationRunFailureRate.percentage / 100;

  const assessed = assessReadinessResult({
    reviewedCases: reviewed,
    dualReviewedCriticalCases: dual,
    truePositiveRate: tpRate,
    falsePositiveRate: fpRate,
    estimatedRecall: recall,
    criticalMisses,
    unresolvedIdentityRate: identityGapRate,
    evaluationFailureRate: failureRate,
    knowledgeCoverage,
    thresholds: {
      minimumReviewedCases: Number(policy.minimumReviewedCases),
      minimumDualReviewedCriticalCases: Number(policy.minimumDualReviewedCases),
      minimumTruePositiveRate: Number(policy.minimumTruePositiveRate),
      maximumFalsePositiveRate: Number(policy.maximumFalsePositiveRate),
      minimumEstimatedRecall: Number(policy.minimumEstimatedRecall),
      maximumCriticalMisses: Number(policy.maximumCriticalMisses),
      maximumUnresolvedIdentityRate: Number(policy.maximumIdentityGapRate),
      maximumEvaluationFailureRate: Number(policy.maximumEvaluationFailureRate),
      minimumCriticalSeverityAgreement: Number(policy.minimumSeverityAgreement),
      minimumKnowledgeCoverage: Number(policy.minimumKnowledgeCoverage),
      providerFacingAlertsAllowed: false,
      orderBlockingAllowed: false,
    },
  });

  assertForbiddenActivationStatus(assessed.result);

  const row = await prisma.medicationSafetyActivationReadinessAssessment.create({
    data: {
      readinessPolicyId: policy.id,
      scopeType: input.scopeType,
      scopeIdentifier: input.scopeIdentifier,
      engineVersion: input.engineVersion ?? "phase10-shadow-1.0.0",
      casesReviewed: reviewed,
      casesDualReviewed: dual,
      truePositiveRate: tpRate,
      falsePositiveRate: fpRate,
      estimatedRecall: recall,
      criticalMisses,
      identityGapRate,
      contextGapRate,
      knowledgeCoverage,
      evaluationFailureRate: failureRate,
      p95LatencyMs: reliability.P95EvaluationLatency,
      blockingCriteriaPassedJson: assessed.blockingCriteriaPassed,
      blockingCriteriaFailedJson: assessed.blockingCriteriaFailed,
      readinessResult: assessed.result,
      sampleSource: input.sampleSource ?? "production-shadow-derived",
      metricsJson: {
        accuracy,
        falseNegative: fn,
        reliability,
        phase11Defaults: PHASE11_SAFETY_VALIDATION_DEFAULTS,
      },
      createdByUserId: actor.userId,
    },
  });

  await audit(prisma, {
    entityType: "MedicationSafetyActivationReadinessAssessment",
    entityId: row.id,
    action: "READINESS_ASSESS",
    userId: actor.userId,
    after: { result: assessed.result },
  });
  return row;
}

export async function createActivationCandidate(
  prisma: PrismaClient,
  input: {
    scopeType: string;
    scopeIdentifier: string;
    assessmentId?: string;
    readinessPolicyId?: string;
    findingTypes?: string[];
    medicationFamilyIds?: string[];
    candidateStatus?: string;
    limitations?: string;
    knownRisks?: string;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const status = input.candidateStatus ?? "NOT_READY";
  assertForbiddenActivationStatus(status);
  const row = await prisma.medicationSafetyActivationCandidate.create({
    data: {
      scopeType: input.scopeType,
      scopeIdentifier: input.scopeIdentifier,
      findingTypesJson: input.findingTypes ?? [],
      medicationFamilyIdsJson: input.medicationFamilyIds ?? [],
      engineVersion: "phase10-shadow-1.0.0",
      assessmentId: input.assessmentId,
      readinessPolicyId: input.readinessPolicyId,
      candidateStatus: status,
      limitations: input.limitations,
      knownRisks: input.knownRisks,
      createdByUserId: actor.userId,
    },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyActivationCandidate",
    entityId: row.id,
    action: "CANDIDATE_CREATE",
    userId: actor.userId,
    after: row,
  });
  return row;
}

export async function createReadinessAttestation(
  prisma: PrismaClient,
  input: {
    assessmentId: string;
    limitations?: string;
    unresolvedRisks?: string;
    reviewedByPharmacistUserId?: string;
    reviewedByMedicalDirectorUserId?: string;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const assessment =
    await prisma.medicationSafetyActivationReadinessAssessment.findUnique({
      where: { id: input.assessmentId },
    });
  if (!assessment) throw new NotFoundException("Évaluation introuvable.");

  const payload = {
    assessmentId: assessment.id,
    policyId: assessment.readinessPolicyId,
    scope: `${assessment.scopeType}:${assessment.scopeIdentifier}`,
    result: assessment.readinessResult,
    engineVersion: assessment.engineVersion,
    knowledgeVersionIdsJson: assessment.knowledgeVersionIdsJson,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
    ClinicalActivationPerformed: false,
    attestedAt: new Date().toISOString(),
  };
  const checksum = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  const attestation =
    await prisma.medicationSafetyActivationReadinessAttestation.create({
      data: {
        assessmentId: assessment.id,
        policyId: assessment.readinessPolicyId,
        scope: payload.scope,
        result: assessment.readinessResult,
        engineVersion: assessment.engineVersion,
        knowledgeVersionIdsJson: assessment.knowledgeVersionIdsJson ?? undefined,
        reviewedByPharmacistUserId: input.reviewedByPharmacistUserId,
        reviewedByMedicalDirectorUserId: input.reviewedByMedicalDirectorUserId,
        approvedByMedicationAdminUserId: actor.userId,
        limitations: input.limitations,
        unresolvedRisks: input.unresolvedRisks,
        checksum,
        providerFacingAlertsEnabled: false,
        orderBlockingEnabled: false,
        clinicalActivationPerformed: false,
        immutable: true,
      },
    });

  await audit(prisma, {
    entityType: "MedicationSafetyActivationReadinessAttestation",
    entityId: attestation.id,
    action: "READINESS_ATTEST",
    userId: actor.userId,
    after: { checksum, ClinicalActivationPerformed: false },
  });
  return attestation;
}

export async function assertAttestationImmutable(
  prisma: PrismaClient,
  attestationId: string
) {
  const row =
    await prisma.medicationSafetyActivationReadinessAttestation.findUnique({
      where: { id: attestationId },
    });
  if (!row) throw new NotFoundException("Attestation introuvable.");
  throw new BadRequestException(
    "Attestations de readiness sont immuables — aucune modification autorisée."
  );
}
