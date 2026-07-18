import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  collectMedicationInventory,
  getCoverageDashboard,
  recalculateFamilyCoverage,
} from "./medication-family-coverage.service";
import {
  assignReviewers,
  completeValidationBatch,
  createValidationBatch,
  deferOrExcludeCase,
  getValidationCase,
  listValidationCases,
  lockValidationBatch,
  resolveAdjudication,
  startValidationBatch,
  submitReview,
  type ValidationActor,
} from "./medication-safety-validation-case.service";
import {
  getAccuracyAnalytics,
  getAlertBurdenSimulation,
  getEmergencyContextAnalytics,
  getFalseNegativeAnalytics,
  getFalsePositiveAnalytics,
  getReliabilityAnalytics,
  getSeverityCalibration,
  getSuppressionEffectiveness,
} from "./medication-safety-validation-analytics.service";
import {
  approveReadinessPolicy,
  assessReadiness,
  createActivationCandidate,
  createReadinessAttestation,
  createReadinessPolicy,
  transitionReadinessPolicy,
} from "./medication-safety-readiness.service";
import {
  listContextGaps,
  listIdentityGaps,
  listKnowledgeGaps,
  transitionContextGap,
  transitionIdentityGap,
  transitionKnowledgeGap,
} from "./medication-safety-gaps.service";
import {
  approveReferenceSet,
  createReferenceSet,
  getReferenceSet,
  listReferenceSets,
  runReferenceSet,
} from "./medication-safety-reference-set.service";

function assertNoSpoof(body: unknown, userId: string) {
  if (!body || typeof body !== "object") return;
  const o = body as Record<string, unknown>;
  if (o.reviewerUserId && o.reviewerUserId !== userId) {
    throw new BadRequestException(
      "Payload reviewerUserId must match the authenticated user."
    );
  }
  if ("roles" in o || "role" in o) {
    throw new BadRequestException("Role spoofing via request body is forbidden.");
  }
  if (
    o.providerFacingAlertsEnabled === true ||
    o.orderBlockingEnabled === true ||
    o.clinicalActivationEnabled === true ||
    o.clinicalActivationPerformed === true
  ) {
    throw new BadRequestException(
      "Phase 11 forbids enabling alerts, order blocking, or clinical activation."
    );
  }
  if (
    o.candidateStatus === "ACTIVE" ||
    o.candidateStatus === "ENABLED" ||
    o.candidateStatus === "LIVE" ||
    o.candidateStatus === "PRODUCTION_ALERTING" ||
    o.readinessResult === "READY_FOR_ACTIVATION"
  ) {
    throw new BadRequestException("Forbidden activation status.");
  }
}

@Injectable()
export class MedicationSafetyValidationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  coverageDashboard() {
    return getCoverageDashboard(this.prisma);
  }

  async listFamilies(limit = 100, offset = 0) {
    return this.prisma.medicationFamilyCoverageProfile.findMany({
      orderBy: [{ emergencyMedicinePriority: "asc" }, { displayName: "asc" }],
      take: Math.min(limit, 500),
      skip: offset,
      include: { domainScores: true },
    });
  }

  async getFamily(id: string) {
    const row = await this.prisma.medicationFamilyCoverageProfile.findUnique({
      where: { id },
      include: { domainScores: true, knowledgeGaps: true },
    });
    if (!row) throw new NotFoundException("Profil de couverture introuvable.");
    return row;
  }

  recalculateCoverage(actor: ValidationActor) {
    return recalculateFamilyCoverage(this.prisma, actor.userId);
  }

  async coverageGaps() {
    const [knowledge, identity, context, inventory] = await Promise.all([
      listKnowledgeGaps(this.prisma, "OPEN"),
      listIdentityGaps(this.prisma, "OPEN"),
      listContextGaps(this.prisma, "OPEN"),
      collectMedicationInventory(this.prisma),
    ]);
    return { knowledge, identity, context, inventory };
  }

  listCases(filters: {
    status?: string;
    reviewerUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    return listValidationCases(this.prisma, filters);
  }

  getCase(id: string, actor: ValidationActor) {
    return getValidationCase(this.prisma, id, actor);
  }

  assignCase(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({ reviewerUserIds: z.array(z.string().min(1)).min(1) })
      .parse(body);
    return assignReviewers(this.prisma, id, parsed.reviewerUserIds, actor);
  }

  reviewCase(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        classification: z.string().min(1),
        clinicalRelevance: z.string().optional(),
        severityAssessment: z.string().optional(),
        patientContextAssessment: z.string().optional(),
        knowledgeAssessment: z.string().optional(),
        engineAssessment: z.string().optional(),
        rationale: z.string().min(1),
        recommendedAction: z.string().optional(),
        confidence: z.enum(["LOW", "MODERATE", "HIGH"]).optional(),
      })
      .parse(body);
    return submitReview(this.prisma, id, parsed, actor);
  }

  deferCase(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const reason =
      body && typeof body === "object"
        ? String((body as any).reason ?? "")
        : undefined;
    return deferOrExcludeCase(this.prisma, id, "DEFERRED", actor, reason);
  }

  excludeCase(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const reason =
      body && typeof body === "object"
        ? String((body as any).reason ?? "")
        : undefined;
    return deferOrExcludeCase(this.prisma, id, "EXCLUDED", actor, reason);
  }

  listAdjudications() {
    return this.prisma.medicationSafetyValidationAdjudication.findMany({
      where: { status: "OPEN" },
      include: { validationCase: { include: { reviews: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getAdjudication(id: string) {
    const row = await this.prisma.medicationSafetyValidationAdjudication.findUnique({
      where: { id },
      include: { validationCase: { include: { reviews: true, assignments: true } } },
    });
    if (!row) throw new NotFoundException("Adjudication introuvable.");
    return row;
  }

  resolveAdj(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        finalClassification: z.string().min(1),
        finalSeverity: z.string().optional(),
        adjudicationRationale: z.string().min(1),
      })
      .parse(body);
    return resolveAdjudication(this.prisma, id, parsed, actor);
  }

  listBatches() {
    return this.prisma.medicationSafetyValidationBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getBatch(id: string) {
    const row = await this.prisma.medicationSafetyValidationBatch.findUnique({
      where: { id },
      include: { cases: true },
    });
    if (!row) throw new NotFoundException("Lot introuvable.");
    return row;
  }

  createBatch(body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        batchType: z.string().min(1),
        selectionCriteria: z.record(z.unknown()).optional(),
        targetFindingCount: z.number().int().positive().optional(),
        fixtureMarker: z.string().optional(),
      })
      .parse(body);
    return createValidationBatch(this.prisma, parsed, actor);
  }

  startBatch(id: string, actor: ValidationActor) {
    return startValidationBatch(this.prisma, id, actor);
  }

  completeBatch(id: string, actor: ValidationActor) {
    return completeValidationBatch(this.prisma, id, actor);
  }

  lockBatch(id: string, actor: ValidationActor) {
    return lockValidationBatch(this.prisma, id, actor);
  }

  listReferenceSets() {
    return listReferenceSets(this.prisma);
  }

  getReferenceSet(id: string) {
    return getReferenceSet(this.prisma, id);
  }

  createReferenceSet(body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    return createReferenceSet(this.prisma, body as any, actor);
  }

  runReferenceSet(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const engineRunId =
      body && typeof body === "object"
        ? (body as any).engineRunId
        : undefined;
    return runReferenceSet(this.prisma, id, actor, engineRunId);
  }

  approveReferenceSet(id: string, actor: ValidationActor) {
    return approveReferenceSet(this.prisma, id, actor);
  }

  analyticsAccuracy() {
    return getAccuracyAnalytics(this.prisma);
  }
  analyticsSeverity() {
    return getSeverityCalibration(this.prisma);
  }
  analyticsBurden() {
    return getAlertBurdenSimulation(this.prisma);
  }
  analyticsEmergency() {
    return getEmergencyContextAnalytics(this.prisma);
  }
  analyticsReliability() {
    return getReliabilityAnalytics(this.prisma);
  }
  analyticsSuppressions() {
    return getSuppressionEffectiveness(this.prisma);
  }
  analyticsFalsePositive() {
    return getFalsePositiveAnalytics(this.prisma);
  }
  analyticsFalseNegative() {
    return getFalseNegativeAnalytics(this.prisma);
  }

  listKnowledgeGaps(status?: string) {
    return listKnowledgeGaps(this.prisma, status);
  }
  transitionKnowledgeGap(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const status = z.object({ status: z.string() }).parse(body).status;
    return transitionKnowledgeGap(this.prisma, id, status, actor);
  }
  listIdentityGaps(status?: string) {
    return listIdentityGaps(this.prisma, status);
  }
  transitionIdentityGap(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const status = z.object({ status: z.string() }).parse(body).status;
    return transitionIdentityGap(this.prisma, id, status, actor);
  }
  listContextGaps(status?: string) {
    return listContextGaps(this.prisma, status);
  }
  transitionContextGap(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const status = z.object({ status: z.string() }).parse(body).status;
    return transitionContextGap(this.prisma, id, status, actor);
  }

  listPolicies() {
    return this.prisma.medicationSafetyActivationReadinessPolicy.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  createPolicy(body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        name: z.string().min(1),
        version: z.string().min(1),
        scope: z.string().min(1),
        findingTypes: z.array(z.string()).optional(),
        medicationFamilies: z.array(z.string()).optional(),
      })
      .parse(body);
    return createReadinessPolicy(this.prisma, parsed, actor);
  }

  transitionPolicy(id: string, body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const status = z.object({ status: z.string() }).parse(body).status;
    return transitionReadinessPolicy(this.prisma, id, status, actor);
  }

  approvePolicy(id: string, actor: ValidationActor) {
    return approveReadinessPolicy(this.prisma, id, actor);
  }

  listAssessments() {
    return this.prisma.medicationSafetyActivationReadinessAssessment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  assess(body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        readinessPolicyId: z.string().min(1),
        scopeType: z.string().min(1),
        scopeIdentifier: z.string().min(1),
        engineVersion: z.string().optional(),
        sampleSource: z.string().optional(),
      })
      .parse(body);
    return assessReadiness(this.prisma, parsed, actor);
  }

  listCandidates() {
    return this.prisma.medicationSafetyActivationCandidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  createCandidate(body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    return createActivationCandidate(this.prisma, body as any, actor);
  }

  listAttestations() {
    return this.prisma.medicationSafetyActivationReadinessAttestation.findMany({
      orderBy: { attestedAt: "desc" },
      take: 100,
    });
  }

  attest(body: unknown, actor: ValidationActor) {
    assertNoSpoof(body, actor.userId);
    const parsed = z
      .object({
        assessmentId: z.string().min(1),
        limitations: z.string().optional(),
        unresolvedRisks: z.string().optional(),
        reviewedByPharmacistUserId: z.string().optional(),
        reviewedByMedicalDirectorUserId: z.string().optional(),
      })
      .parse(body);
    return createReadinessAttestation(this.prisma, parsed, actor);
  }
}
