/**
 * Phase 9 — allergen concepts, mappings, cross-reactivity rules (knowledge only).
 */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  requireSafetyOperator,
  writeSafetyAudit,
  type SafetyKnowledgeActor,
} from "./medication-safety-knowledge.service";

function normalizeAllergenName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function upsertAllergenConcept(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    allergenType: string;
    displayName: string;
    displayNameFr?: string;
    codeSystem?: string;
    code?: string;
    parentAllergenId?: string;
    description?: string;
  }
) {
  requireSafetyOperator(actor);
  const normalizedName = normalizeAllergenName(input.displayName);
  return prisma.medicationAllergenConcept.upsert({
    where: {
      allergenType_normalizedName: {
        allergenType: input.allergenType,
        normalizedName,
      },
    },
    create: {
      id: randomUUID(),
      allergenType: input.allergenType,
      normalizedName,
      displayName: input.displayName,
      displayNameFr: input.displayNameFr,
      codeSystem: input.codeSystem,
      code: input.code,
      parentAllergenId: input.parentAllergenId,
      description: input.description,
    },
    update: {
      displayName: input.displayName,
      displayNameFr: input.displayNameFr,
      codeSystem: input.codeSystem,
      code: input.code,
      parentAllergenId: input.parentAllergenId,
      description: input.description,
    },
  });
}

export async function listAllergenConcepts(prisma: PrismaClient) {
  return prisma.medicationAllergenConcept.findMany({
    where: { active: true },
    orderBy: { displayName: "asc" },
    take: 500,
  });
}

export async function createAllergenMapping(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    allergenConceptId: string;
    medicationConceptId?: string;
    medicationProductId?: string;
    therapeuticClassId?: string;
    relationshipType: string;
    reactionKind?: string;
    crossReactivityRisk?: string;
    evidenceLevel?: string;
    clinicalDescription?: string;
    sourceVersionId: string;
  }
) {
  requireSafetyOperator(actor);
  if (
    !input.medicationConceptId &&
    !input.medicationProductId &&
    !input.therapeuticClassId
  ) {
    throw new Error(
      "Allergen mapping must reference a concept, product, or therapeutic class."
    );
  }
  const row = await prisma.medicationAllergenMapping.create({
    data: {
      id: randomUUID(),
      allergenConceptId: input.allergenConceptId,
      medicationConceptId: input.medicationConceptId,
      medicationProductId: input.medicationProductId,
      therapeuticClassId: input.therapeuticClassId,
      relationshipType: input.relationshipType,
      reactionKind: input.reactionKind,
      crossReactivityRisk: input.crossReactivityRisk,
      evidenceLevel: input.evidenceLevel,
      clinicalDescription: input.clinicalDescription,
      futureAlertEligible: false,
      clinicalActivationAllowed: false,
      sourceVersionId: input.sourceVersionId,
      status: "DRAFT",
      reviewedByUserId: actor.userId,
    },
  });
  await writeSafetyAudit(prisma, {
    entityType: "MedicationAllergenMapping",
    entityId: row.id,
    action: "ALLERGEN_MAPPING_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
    afterState: {
      relationshipType: input.relationshipType,
      reactionKind: input.reactionKind ?? null,
      clinicalActivationAllowed: false,
    },
  });
  return row;
}

export async function listAllergenMappings(prisma: PrismaClient) {
  return prisma.medicationAllergenMapping.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { allergenConcept: true, concept: true, sourceVersion: true },
  });
}

export async function createCrossReactivityRule(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    sourceAllergenId: string;
    targetMedicationConceptId?: string;
    targetMedicationProductId?: string;
    targetTherapeuticClassId?: string;
    riskLevel: string;
    crossReactivityType?: string;
    evidenceLevel?: string;
    estimatedFrequency?: string;
    clinicalDescription?: string;
    managementRecommendation?: string;
    sourceVersionId: string;
  }
) {
  requireSafetyOperator(actor);
  const target =
    input.targetMedicationConceptId ??
    input.targetMedicationProductId ??
    input.targetTherapeuticClassId;
  if (!target) {
    throw new Error("Cross-reactivity rule requires a target identity.");
  }
  const normalizedIdentityKey = [
    input.sourceAllergenId.trim().toLowerCase(),
    target.trim().toLowerCase(),
    input.sourceVersionId.trim().toLowerCase(),
  ].join("|");

  const existing = await prisma.medicationAllergyCrossReactivityRule.findFirst({
    where: {
      normalizedIdentityKey,
      status: { in: ["DRAFT", "UNDER_REVIEW", "APPROVED"] },
    },
  });
  if (existing) {
    throw new Error(`Duplicate cross-reactivity rule blocked (${existing.id}).`);
  }

  const row = await prisma.medicationAllergyCrossReactivityRule.create({
    data: {
      id: randomUUID(),
      sourceAllergenId: input.sourceAllergenId,
      targetMedicationConceptId: input.targetMedicationConceptId,
      targetMedicationProductId: input.targetMedicationProductId,
      targetTherapeuticClassId: input.targetTherapeuticClassId,
      normalizedIdentityKey,
      riskLevel: input.riskLevel,
      crossReactivityType: input.crossReactivityType,
      evidenceLevel: input.evidenceLevel,
      estimatedFrequency: input.estimatedFrequency,
      clinicalDescription: input.clinicalDescription,
      managementRecommendation: input.managementRecommendation,
      futureAlertEligible: false,
      clinicalActivationAllowed: false,
      sourceVersionId: input.sourceVersionId,
      status: "DRAFT",
    },
  });
  await writeSafetyAudit(prisma, {
    entityType: "MedicationAllergyCrossReactivityRule",
    entityId: row.id,
    action: "CROSS_REACTIVITY_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
  });
  return row;
}

export async function listCrossReactivityRules(prisma: PrismaClient) {
  return prisma.medicationAllergyCrossReactivityRule.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { sourceAllergen: true, targetConcept: true, targetClass: true },
  });
}
