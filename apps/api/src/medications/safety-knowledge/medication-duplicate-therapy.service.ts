/**
 * Phase 9 — duplicate-therapy groups, memberships, and rules (not executed against patients).
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  requireSafetyOperator,
  writeSafetyAudit,
  type SafetyKnowledgeActor,
} from "./medication-safety-knowledge.service";

export async function upsertDuplicateTherapyGroup(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    code: string;
    displayName: string;
    displayNameFr?: string;
    description?: string;
    severity?: string;
    defaultClinicalSignificance?: string;
  }
) {
  requireSafetyOperator(actor);
  const normalizedName = input.displayName.trim().toLowerCase();
  return prisma.medicationDuplicateTherapyGroup.upsert({
    where: { code: input.code },
    create: {
      id: randomUUID(),
      code: input.code,
      normalizedName,
      displayName: input.displayName,
      displayNameFr: input.displayNameFr,
      description: input.description,
      severity: input.severity,
      defaultClinicalSignificance: input.defaultClinicalSignificance,
    },
    update: {
      normalizedName,
      displayName: input.displayName,
      displayNameFr: input.displayNameFr,
      description: input.description,
      severity: input.severity,
      defaultClinicalSignificance: input.defaultClinicalSignificance,
    },
  });
}

export async function listDuplicateTherapyGroups(prisma: PrismaClient) {
  return prisma.medicationDuplicateTherapyGroup.findMany({
    where: { active: true },
    orderBy: { displayName: "asc" },
    include: { _count: { select: { memberships: true, rules: true } } },
  });
}

export async function createDuplicateTherapyMembership(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    duplicateTherapyGroupId: string;
    medicationConceptId?: string;
    medicationProductId?: string;
    ingredientConceptId?: string;
    membershipRole: string;
    sourceVersionId: string;
  }
) {
  requireSafetyOperator(actor);
  if (
    !input.medicationConceptId &&
    !input.medicationProductId &&
    !input.ingredientConceptId
  ) {
    throw new Error(
      "Duplicate-therapy membership requires concept, product, or ingredient identity."
    );
  }
  const row = await prisma.medicationDuplicateTherapyMembership.create({
    data: {
      id: randomUUID(),
      duplicateTherapyGroupId: input.duplicateTherapyGroupId,
      medicationConceptId: input.medicationConceptId,
      medicationProductId: input.medicationProductId,
      ingredientConceptId: input.ingredientConceptId,
      membershipRole: input.membershipRole,
      sourceVersionId: input.sourceVersionId,
      status: "DRAFT",
      futureAlertEligible: false,
      clinicalActivationAllowed: false,
    },
  });
  await writeSafetyAudit(prisma, {
    entityType: "MedicationDuplicateTherapyMembership",
    entityId: row.id,
    action: "DUP_THERAPY_MEMBERSHIP_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
  });
  return row;
}

export async function createDuplicateTherapyRule(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    duplicateTherapyGroupId: string;
    ruleType: string;
    severity: string;
    clinicalSignificance?: string;
    minimumDistinctMedications?: number;
    maximumRecommendedConcurrentAgents?: number;
    sameIngredientOnly?: boolean;
    sameRouteOnly?: boolean;
    sameDosageFormOnly?: boolean;
    includeCombinationProducts?: boolean;
    excludeTopicalProducts?: boolean;
    excludeSingleAdministrationEmergencyUse?: boolean;
    emergencyContextNotesJson?: Prisma.InputJsonValue;
    sourceVersionId: string;
  }
) {
  requireSafetyOperator(actor);
  const row = await prisma.medicationDuplicateTherapyRule.create({
    data: {
      id: randomUUID(),
      duplicateTherapyGroupId: input.duplicateTherapyGroupId,
      ruleType: input.ruleType,
      severity: input.severity,
      clinicalSignificance: input.clinicalSignificance,
      minimumDistinctMedications: input.minimumDistinctMedications ?? 2,
      maximumRecommendedConcurrentAgents: input.maximumRecommendedConcurrentAgents,
      sameIngredientOnly: input.sameIngredientOnly ?? false,
      sameRouteOnly: input.sameRouteOnly ?? false,
      sameDosageFormOnly: input.sameDosageFormOnly ?? false,
      includeCombinationProducts: input.includeCombinationProducts ?? true,
      excludeTopicalProducts: input.excludeTopicalProducts ?? false,
      excludeSingleAdministrationEmergencyUse:
        input.excludeSingleAdministrationEmergencyUse ?? false,
      emergencyContextNotesJson: input.emergencyContextNotesJson,
      futureAlertEligible: false,
      clinicalActivationAllowed: false,
      sourceVersionId: input.sourceVersionId,
      status: "DRAFT",
    },
  });
  await writeSafetyAudit(prisma, {
    entityType: "MedicationDuplicateTherapyRule",
    entityId: row.id,
    action: "DUP_THERAPY_RULE_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
    afterState: {
      ruleType: input.ruleType,
      patientEvaluation: false,
      clinicalActivationAllowed: false,
    },
  });
  return row;
}

export async function listDuplicateTherapyRules(prisma: PrismaClient) {
  return prisma.medicationDuplicateTherapyRule.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { group: true, sourceVersion: true },
  });
}

export async function listDuplicateTherapyMemberships(prisma: PrismaClient) {
  return prisma.medicationDuplicateTherapyMembership.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { group: true, concept: true, product: true },
  });
}
