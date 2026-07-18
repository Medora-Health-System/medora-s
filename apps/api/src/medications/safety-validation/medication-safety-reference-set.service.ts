import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { isSafetyValidationAdmin } from "./medication-safety-validation.roles";
import type { ValidationActor } from "./medication-safety-validation-case.service";

export async function listReferenceSets(prisma: PrismaClient) {
  return prisma.medicationSafetyReferenceSet.findMany({
    include: {
      cases: { include: { expectedFindings: true, missedFindings: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getReferenceSet(prisma: PrismaClient, id: string) {
  const row = await prisma.medicationSafetyReferenceSet.findUnique({
    where: { id },
    include: {
      cases: { include: { expectedFindings: true, missedFindings: true } },
    },
  });
  if (!row) throw new NotFoundException("Jeu de référence introuvable.");
  return row;
}

export async function createReferenceSet(
  prisma: PrismaClient,
  input: {
    code: string;
    name: string;
    description?: string;
    version: string;
    cases?: Array<{
      caseKey: string;
      title: string;
      description?: string;
      syntheticContextJson?: Record<string, unknown>;
      expectedFindings?: Array<{
        expectedFindingType: string;
        expectedSeverity?: string;
        expectedKnowledgeEntityType?: string;
        expectedKnowledgeEntityId?: string;
        notes?: string;
      }>;
    }>;
  },
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const set = await prisma.medicationSafetyReferenceSet.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      version: input.version,
      createdByUserId: actor.userId,
      fixtureMarker: "MEDICATION_SAFETY_REFERENCE_FIXTURE",
      isValidationContent: true,
      excludedFromProductionAnalytics: true,
      status: "DRAFT",
      cases: {
        create: (input.cases ?? []).map((c) => ({
          caseKey: c.caseKey,
          title: c.title,
          description: c.description,
          syntheticContextJson: (c.syntheticContextJson ??
            {}) as Prisma.InputJsonValue,
          fixtureMarker: "MEDICATION_SAFETY_REFERENCE_FIXTURE",
          expectedFindings: {
            create: (c.expectedFindings ?? []).map((e) => ({
              expectedFindingType: e.expectedFindingType,
              expectedSeverity: e.expectedSeverity,
              expectedKnowledgeEntityType: e.expectedKnowledgeEntityType,
              expectedKnowledgeEntityId: e.expectedKnowledgeEntityId,
              notes: e.notes,
            })),
          },
        })),
      },
    },
    include: { cases: { include: { expectedFindings: true } } },
  });
  await prisma.medicationSafetyValidationAuditEvent.create({
    data: {
      entityType: "MedicationSafetyReferenceSet",
      entityId: set.id,
      action: "REFERENCE_SET_CREATE",
      afterState: { code: set.code, fixtureMarker: set.fixtureMarker },
      performedByUserId: actor.userId,
    },
  });
  return set;
}

export async function approveReferenceSet(
  prisma: PrismaClient,
  id: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  return prisma.medicationSafetyReferenceSet.update({
    where: { id },
    data: {
      status: "APPROVED",
      pharmacistApprovedBy: actor.userId,
      pharmacistApprovedAt: new Date(),
    },
  });
}

/**
 * Compare expected findings to a shadow engine run; record misses.
 * Does not mutate clinical data or approve knowledge.
 */
export async function runReferenceSet(
  prisma: PrismaClient,
  id: string,
  actor: ValidationActor,
  engineRunId?: string
) {
  if (!isSafetyValidationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
  const set = await getReferenceSet(prisma, id);
  const runFindings = engineRunId
    ? await prisma.medicationSafetyEvaluationFinding.findMany({
        where: { evaluationRunId: engineRunId, shadowOnly: true },
      })
    : [];

  const missed: string[] = [];
  for (const refCase of set.cases) {
    for (const expected of refCase.expectedFindings) {
      const hit = runFindings.some(
        (f) =>
          f.findingType === expected.expectedFindingType &&
          (!expected.expectedKnowledgeEntityId ||
            f.knowledgeEntityId === expected.expectedKnowledgeEntityId)
      );
      if (!hit) {
        const row = await prisma.medicationSafetyMissedFinding.create({
          data: {
            referenceCaseId: refCase.id,
            expectedFindingId: expected.id,
            expectedFindingType: expected.expectedFindingType,
            expectedKnowledgeEntityId: expected.expectedKnowledgeEntityId,
            engineRunId: engineRunId ?? null,
            missReason: engineRunId
              ? expected.expectedKnowledgeEntityId
                ? "ENGINE_LOGIC_ERROR"
                : "KNOWLEDGE_MISSING"
              : "UNKNOWN",
            identityResolved: false,
            knowledgeAvailable: !!expected.expectedKnowledgeEntityId,
            patientContextAvailable: true,
            ruleEligible: true,
            engineEvaluated: !!engineRunId,
            fixtureMarker: "MEDICATION_SAFETY_REFERENCE_FIXTURE",
          },
        });
        missed.push(row.id);
      }
    }
  }

  await prisma.medicationSafetyValidationAuditEvent.create({
    data: {
      entityType: "MedicationSafetyReferenceSet",
      entityId: id,
      action: "REFERENCE_SET_RUN",
      afterState: {
        missedCount: missed.length,
        engineRunId: engineRunId ?? null,
        fixtureDerived: true,
      },
      performedByUserId: actor.userId,
    },
  });

  if (!engineRunId && set.cases.length === 0) {
    throw new BadRequestException("Jeu de référence vide.");
  }

  return {
    referenceSetId: id,
    missedFindingIds: missed,
    sampleSource: "fixture-derived",
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
  };
}
