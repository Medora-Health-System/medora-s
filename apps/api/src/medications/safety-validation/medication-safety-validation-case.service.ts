import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  MEDICATION_VALIDATION_CLASSIFICATION_VALUES,
  PHASE11_SAFETY_VALIDATION_DEFAULTS,
} from "@medora/shared";
import {
  isSafetyValidationAdjudicator,
  isSafetyValidationAdmin,
  isSafetyValidationReviewer,
} from "./medication-safety-validation.roles";

export type ValidationActor = {
  userId: string;
  roles: string[];
};

const DUAL_REVIEW_SEVERITIES = new Set([
  "CONTRAINDICATED",
  "SEVERE",
  "CRITICAL",
  "HIGH",
]);

const DUAL_REVIEW_FINDING_TYPES = new Set([
  "DRUG_INTERACTION",
  "ALLERGY",
  "ALLERGY_CROSS_REACTIVITY",
  "DUPLICATE_THERAPY",
  "PREGNANCY_CONTRAINDICATION",
  "RENAL_ADJUSTMENT",
  "HEPATIC_ADJUSTMENT",
  "PEDIATRIC_HIGH_RISK",
]);

function requiresDualReview(findingType: string, severity: string | null | undefined) {
  const sev = String(severity ?? "").toUpperCase();
  const type = String(findingType ?? "").toUpperCase();
  return (
    DUAL_REVIEW_SEVERITIES.has(sev) ||
    DUAL_REVIEW_FINDING_TYPES.has(type) ||
    type.includes("ANAPHYLAXIS") ||
    type.includes("CROSS_REACTIVITY")
  );
}

async function audit(
  prisma: PrismaClient,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    before?: unknown;
    after?: unknown;
    identifiableAccess?: boolean;
    reason?: string;
  }
) {
  await prisma.medicationSafetyValidationAuditEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeState: input.before as any,
      afterState: input.after as any,
      performedByUserId: input.userId,
      identifiableAccess: input.identifiableAccess ?? false,
      reason: input.reason,
    },
  });
}

export async function listValidationCases(
  prisma: PrismaClient,
  filters: {
    status?: string;
    reviewerUserId?: string;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.medicationSafetyValidationCase.findMany({
    where: {
      validationStatus: filters.status,
      ...(filters.reviewerUserId
        ? { assignments: { some: { reviewerUserId: filters.reviewerUserId } } }
        : {}),
    },
    include: {
      assignments: true,
      reviews: {
        select: {
          id: true,
          reviewerUserId: true,
          reviewedAt: true,
          lockedAt: true,
          // Hide classification for blind peers at list level
          classification: true,
          confidence: true,
        },
      },
      adjudication: true,
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(filters.limit ?? 50, 200),
    skip: filters.offset ?? 0,
  });
}

export async function getValidationCase(
  prisma: PrismaClient,
  id: string,
  actor: ValidationActor
) {
  const row = await prisma.medicationSafetyValidationCase.findUnique({
    where: { id },
    include: {
      assignments: true,
      reviews: true,
      adjudication: true,
      familyCoverageProfile: true,
      validationBatch: true,
    },
  });
  if (!row) throw new NotFoundException("Dossier de validation introuvable.");

  await audit(prisma, {
    entityType: "MedicationSafetyValidationCase",
    entityId: id,
    action: "IDENTIFIABLE_CASE_ACCESS",
    userId: actor.userId,
    identifiableAccess: true,
  });

  if (row.blindReviewEnabled && !isSafetyValidationAdjudicator(actor.roles)) {
    const myReviewDone = row.reviews.some((r) => r.reviewerUserId === actor.userId);
    if (!myReviewDone) {
      return {
        ...row,
        reviews: row.reviews
          .filter((r) => r.reviewerUserId === actor.userId)
          .map((r) => ({
            id: r.id,
            reviewerUserId: r.reviewerUserId,
            reviewedAt: r.reviewedAt,
            lockedAt: r.lockedAt,
            classification: r.classification,
            rationale: r.rationale,
            confidence: r.confidence,
          })),
        blindPeerReviewsHidden: true,
      };
    }
  }
  return { ...row, blindPeerReviewsHidden: false };
}

export async function createCaseFromFinding(
  prisma: PrismaClient,
  findingId: string,
  actor: ValidationActor,
  opts?: { batchId?: string; fixtureMarker?: string }
) {
  const finding = await prisma.medicationSafetyEvaluationFinding.findUnique({
    where: { id: findingId },
  });
  if (!finding) throw new NotFoundException("Constat introuvable.");
  if (!finding.shadowOnly) {
    throw new BadRequestException("Phase 11 only validates shadow findings.");
  }

  const dual = requiresDualReview(finding.findingType, finding.severity);
  const priority =
    dual || String(finding.severity ?? "").toUpperCase() === "CONTRAINDICATED"
      ? "CRITICAL"
      : String(finding.severity ?? "").toUpperCase() === "SEVERE"
        ? "HIGH"
        : "ROUTINE";

  const created = await prisma.medicationSafetyValidationCase.upsert({
    where: { evaluationFindingId: findingId },
    create: {
      evaluationFindingId: findingId,
      evaluationRunId: finding.evaluationRunId,
      findingType: finding.findingType,
      severity: finding.severity,
      clinicalSignificance: finding.clinicalSignificance,
      validationPriority: priority,
      requiresDualReview: dual,
      validationBatchId: opts?.batchId,
      fixtureMarker: opts?.fixtureMarker ?? finding.fixtureMarker,
    },
    update: {},
  });

  await audit(prisma, {
    entityType: "MedicationSafetyValidationCase",
    entityId: created.id,
    action: "CASE_CREATE",
    userId: actor.userId,
    after: created,
  });
  return created;
}

export async function assignReviewers(
  prisma: PrismaClient,
  caseId: string,
  reviewerUserIds: string[],
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles) && !isSafetyValidationAdjudicator(actor.roles)) {
    throw new ForbiddenException("Seul un administrateur médicament peut assigner.");
  }
  if (reviewerUserIds.some((id) => id === actor.userId) && !isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Auto-assignation interdite pour ce rôle.");
  }

  const validationCase = await prisma.medicationSafetyValidationCase.findUnique({
    where: { id: caseId },
    include: { validationBatch: true },
  });
  if (!validationCase) throw new NotFoundException("Dossier introuvable.");
  if (validationCase.validationBatch?.status === "LOCKED") {
    throw new BadRequestException("Lot verrouillé — assignation interdite.");
  }

  const unique = [...new Set(reviewerUserIds)];
  for (let i = 0; i < unique.length; i++) {
    await prisma.medicationSafetyValidationAssignment.upsert({
      where: {
        validationCaseId_reviewerUserId: {
          validationCaseId: caseId,
          reviewerUserId: unique[i],
        },
      },
      create: {
        validationCaseId: caseId,
        reviewerUserId: unique[i],
        assignmentRole: i === 0 ? "PRIMARY" : "SECONDARY",
        assignedByUserId: actor.userId,
      },
      update: {},
    });
  }

  const updated = await prisma.medicationSafetyValidationCase.update({
    where: { id: caseId },
    data: {
      assignedReviewerCount: unique.length,
      validationStatus: "ASSIGNED",
      requiresDualReview:
        validationCase.requiresDualReview || unique.length >= 2,
    },
  });

  await audit(prisma, {
    entityType: "MedicationSafetyValidationCase",
    entityId: caseId,
    action: "CASE_ASSIGN",
    userId: actor.userId,
    after: { reviewerUserIds: unique },
  });
  return updated;
}

export async function submitReview(
  prisma: PrismaClient,
  caseId: string,
  body: {
    classification: string;
    clinicalRelevance?: string;
    severityAssessment?: string;
    patientContextAssessment?: string;
    knowledgeAssessment?: string;
    engineAssessment?: string;
    rationale: string;
    recommendedAction?: string;
    confidence?: string;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationReviewer(actor.roles)) {
    throw new ForbiddenException("Rôle pharmacien / reviewer requis.");
  }
  if (
    !(MEDICATION_VALIDATION_CLASSIFICATION_VALUES as readonly string[]).includes(
      body.classification
    )
  ) {
    throw new BadRequestException("Classification invalide.");
  }

  const validationCase = await prisma.medicationSafetyValidationCase.findUnique({
    where: { id: caseId },
    include: {
      assignments: true,
      reviews: true,
      validationBatch: true,
      adjudication: true,
    },
  });
  if (!validationCase) throw new NotFoundException("Dossier introuvable.");
  if (validationCase.validationBatch?.status === "LOCKED") {
    throw new BadRequestException("Lot verrouillé — revue interdite.");
  }
  if (
    ["VALIDATED", "CLOSED", "EXCLUDED"].includes(validationCase.validationStatus)
  ) {
    throw new BadRequestException("Dossier déjà clôturé.");
  }

  const assigned = validationCase.assignments.some(
    (a) => a.reviewerUserId === actor.userId
  );
  if (!assigned && !isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Revue réservée aux assignés.");
  }

  const existing = validationCase.reviews.find(
    (r) => r.reviewerUserId === actor.userId
  );
  if (existing?.lockedAt) {
    throw new BadRequestException(
      "Revue verrouillée — modification interdite (intégrité de revue indépendante)."
    );
  }

  const now = new Date();
  const review = existing
    ? await prisma.medicationSafetyValidationReview.update({
        where: { id: existing.id },
        data: {
          ...body,
          confidence: body.confidence ?? "MODERATE",
          lockedAt: now,
          reviewedAt: now,
        },
      })
    : await prisma.medicationSafetyValidationReview.create({
        data: {
          validationCaseId: caseId,
          reviewerUserId: actor.userId,
          ...body,
          confidence: body.confidence ?? "MODERATE",
          lockedAt: now,
        },
      });

  const reviews = await prisma.medicationSafetyValidationReview.findMany({
    where: { validationCaseId: caseId },
  });
  const completed = reviews.length;
  const needDual = validationCase.requiresDualReview;
  let status = "IN_REVIEW";
  let requiresAdjudication = false;

  if (needDual && completed === 1) {
    status = "AWAITING_SECOND_REVIEW";
  } else if (completed >= (needDual ? 2 : 1)) {
    if (needDual && completed >= 2) {
      const [a, b] = reviews;
      const classAgree = a.classification === b.classification;
      const sevAgree =
        (a.severityAssessment ?? "") === (b.severityAssessment ?? "");
      requiresAdjudication = !classAgree || !sevAgree;
      await prisma.medicationSafetyValidationAdjudication.upsert({
        where: { validationCaseId: caseId },
        create: {
          validationCaseId: caseId,
          reviewAgreement: classAgree && sevAgree,
          classificationAgreement: classAgree,
          severityAgreement: sevAgree,
          adjudicationRequired: requiresAdjudication,
          status: requiresAdjudication ? "OPEN" : "RESOLVED",
          finalClassification: classAgree ? a.classification : null,
          finalSeverity: sevAgree ? a.severityAssessment : null,
          adjudicatedAt: requiresAdjudication ? null : now,
        },
        update: {
          reviewAgreement: classAgree && sevAgree,
          classificationAgreement: classAgree,
          severityAgreement: sevAgree,
          adjudicationRequired: requiresAdjudication,
          status: requiresAdjudication ? "OPEN" : "RESOLVED",
          finalClassification: classAgree ? a.classification : undefined,
          finalSeverity: sevAgree ? a.severityAssessment : undefined,
        },
      });
      status = requiresAdjudication ? "AWAITING_ADJUDICATION" : "VALIDATED";
    } else {
      status = "VALIDATED";
      await prisma.medicationSafetyValidationCase.update({
        where: { id: caseId },
        data: {
          finalClassification: body.classification,
          finalSeverity: body.severityAssessment,
        },
      });
    }
  }

  const updated = await prisma.medicationSafetyValidationCase.update({
    where: { id: caseId },
    data: {
      completedReviewerCount: completed,
      validationStatus: status,
      requiresAdjudication,
      ...(status === "VALIDATED" && !requiresAdjudication
        ? {
            finalClassification: reviews[0]?.classification ?? body.classification,
            finalSeverity: reviews[0]?.severityAssessment ?? body.severityAssessment,
          }
        : {}),
    },
  });

  // Mirror into Phase 10 finding validation (non-destructive).
  await prisma.medicationSafetyFindingValidation.create({
    data: {
      findingId: validationCase.evaluationFindingId,
      classification: body.classification,
      reason: body.rationale,
      notes: body.recommendedAction,
      reviewedByUserId: actor.userId,
      reviewedAt: now,
    },
  });

  await audit(prisma, {
    entityType: "MedicationSafetyValidationReview",
    entityId: review.id,
    action: "REVIEW_SUBMIT",
    userId: actor.userId,
    after: { classification: body.classification, lockedAt: now },
  });

  return { case: updated, review, phase11Defaults: PHASE11_SAFETY_VALIDATION_DEFAULTS };
}

export async function resolveAdjudication(
  prisma: PrismaClient,
  adjudicationId: string,
  body: {
    finalClassification: string;
    finalSeverity?: string;
    adjudicationRationale: string;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdjudicator(actor.roles)) {
    throw new ForbiddenException("Rôle adjudicateur requis.");
  }
  const row = await prisma.medicationSafetyValidationAdjudication.findUnique({
    where: { id: adjudicationId },
    include: { validationCase: { include: { reviews: true } } },
  });
  if (!row) throw new NotFoundException("Adjudication introuvable.");
  if (
    row.validationCase.reviews.some((r) => r.reviewerUserId === actor.userId) &&
    !isSafetyValidationAdmin(actor.roles)
  ) {
    throw new ForbiddenException(
      "Un reviewer ne peut pas adjudiquer son propre dossier contesté."
    );
  }

  const now = new Date();
  const updated = await prisma.medicationSafetyValidationAdjudication.update({
    where: { id: adjudicationId },
    data: {
      finalClassification: body.finalClassification,
      finalSeverity: body.finalSeverity,
      adjudicationRationale: body.adjudicationRationale,
      adjudicatedByUserId: actor.userId,
      adjudicatedAt: now,
      status: "RESOLVED",
      adjudicationRequired: false,
    },
  });
  await prisma.medicationSafetyValidationCase.update({
    where: { id: row.validationCaseId },
    data: {
      validationStatus: "VALIDATED",
      finalClassification: body.finalClassification,
      finalSeverity: body.finalSeverity,
      requiresAdjudication: false,
    },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyValidationAdjudication",
    entityId: adjudicationId,
    action: "ADJUDICATION_RESOLVE",
    userId: actor.userId,
    after: body,
  });
  return updated;
}

export async function deferOrExcludeCase(
  prisma: PrismaClient,
  caseId: string,
  action: "DEFERRED" | "EXCLUDED",
  actor: ValidationActor,
  reason?: string
) {
  if (!isSafetyValidationReviewer(actor.roles)) {
    throw new ForbiddenException("Autorisation insuffisante.");
  }
  const updated = await prisma.medicationSafetyValidationCase.update({
    where: { id: caseId },
    data: { validationStatus: action },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyValidationCase",
    entityId: caseId,
    action: action === "DEFERRED" ? "CASE_DEFER" : "CASE_EXCLUDE",
    userId: actor.userId,
    reason,
  });
  return updated;
}

export async function createValidationBatch(
  prisma: PrismaClient,
  input: {
    name: string;
    description?: string;
    batchType: string;
    selectionCriteria?: Record<string, unknown>;
    targetFindingCount?: number;
    fixtureMarker?: string;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const batch = await prisma.medicationSafetyValidationBatch.create({
    data: {
      name: input.name,
      description: input.description,
      batchType: input.batchType,
      selectionCriteriaJson: (input.selectionCriteria ??
        {}) as Prisma.InputJsonValue,
      targetFindingCount: input.targetFindingCount ?? 25,
      createdByUserId: actor.userId,
      fixtureMarker: input.fixtureMarker,
      status: "DRAFT",
    },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyValidationBatch",
    entityId: batch.id,
    action: "BATCH_CREATE",
    userId: actor.userId,
    after: batch,
  });
  return batch;
}

export async function startValidationBatch(
  prisma: PrismaClient,
  batchId: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const batch = await prisma.medicationSafetyValidationBatch.findUnique({
    where: { id: batchId },
  });
  if (!batch) throw new NotFoundException("Lot introuvable.");
  if (batch.status === "LOCKED") {
    throw new BadRequestException("Lot verrouillé.");
  }

  const criteria = (batch.selectionCriteriaJson ?? {}) as Record<string, unknown>;
  const findings = await prisma.medicationSafetyEvaluationFinding.findMany({
    where: {
      shadowOnly: true,
      ...(criteria.findingType
        ? { findingType: String(criteria.findingType) }
        : {}),
      ...(criteria.severity ? { severity: String(criteria.severity) } : {}),
    },
    take: batch.targetFindingCount,
    orderBy: { createdAt: "desc" },
  });

  for (const f of findings) {
    await createCaseFromFinding(prisma, f.id, actor, {
      batchId,
      fixtureMarker: batch.fixtureMarker ?? undefined,
    });
  }

  const updated = await prisma.medicationSafetyValidationBatch.update({
    where: { id: batchId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
      selectedFindingCount: findings.length,
      engineVersion: "phase10-shadow-1.0.0",
    },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyValidationBatch",
    entityId: batchId,
    action: "BATCH_START",
    userId: actor.userId,
    after: { selected: findings.length },
  });
  return updated;
}

export async function completeValidationBatch(
  prisma: PrismaClient,
  batchId: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  return prisma.medicationSafetyValidationBatch.update({
    where: { id: batchId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function lockValidationBatch(
  prisma: PrismaClient,
  batchId: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const updated = await prisma.medicationSafetyValidationBatch.update({
    where: { id: batchId },
    data: { status: "LOCKED", lockedAt: new Date() },
  });
  await audit(prisma, {
    entityType: "MedicationSafetyValidationBatch",
    entityId: batchId,
    action: "BATCH_LOCK",
    userId: actor.userId,
    after: updated,
  });
  return updated;
}
