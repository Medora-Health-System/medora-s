/**
 * Phase 9 — therapeutic class registry + governed memberships.
 * Reuses existing MedicationTherapeuticClass; does not create parallel master tables.
 */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  requireSafetyOperator,
  writeSafetyAudit,
  type SafetyKnowledgeActor,
} from "./medication-safety-knowledge.service";

export async function upsertTherapeuticClass(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    code: string;
    name: string;
    codeSystem?: string;
    normalizedName?: string;
    displayNameFr?: string;
    description?: string;
    parentId?: string;
    active?: boolean;
  }
) {
  requireSafetyOperator(actor);
  const normalizedName =
    input.normalizedName?.trim().toLowerCase() ||
    input.name.trim().toLowerCase();
  return prisma.medicationTherapeuticClass.upsert({
    where: { code: input.code },
    create: {
      id: randomUUID(),
      code: input.code,
      name: input.name,
      codeSystem: input.codeSystem,
      normalizedName,
      displayNameFr: input.displayNameFr,
      description: input.description,
      parentId: input.parentId,
      active: input.active ?? true,
    },
    update: {
      name: input.name,
      codeSystem: input.codeSystem,
      normalizedName,
      displayNameFr: input.displayNameFr,
      description: input.description,
      parentId: input.parentId,
      active: input.active ?? true,
    },
  });
}

export async function listTherapeuticClasses(prisma: PrismaClient) {
  return prisma.medicationTherapeuticClass.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { parent: true, children: true },
  });
}

export async function createClassMembership(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    medicationConceptId?: string;
    medicationProductId?: string;
    therapeuticClassId: string;
    membershipType: string;
    sourceVersionId: string;
  }
) {
  requireSafetyOperator(actor);
  if (!input.medicationConceptId && !input.medicationProductId) {
    throw new Error("Class membership requires conceptId and/or productId.");
  }
  const row = await prisma.medicationTherapeuticClassMembership.create({
    data: {
      id: randomUUID(),
      medicationConceptId: input.medicationConceptId,
      medicationProductId: input.medicationProductId,
      therapeuticClassId: input.therapeuticClassId,
      membershipType: input.membershipType,
      sourceVersionId: input.sourceVersionId,
      status: "DRAFT",
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      futureAlertEligible: false,
      clinicalActivationAllowed: false,
    },
  });
  await writeSafetyAudit(prisma, {
    entityType: "MedicationTherapeuticClassMembership",
    entityId: row.id,
    action: "CLASS_MEMBERSHIP_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
  });
  return row;
}

export async function listClassMemberships(
  prisma: PrismaClient,
  filters?: { therapeuticClassId?: string; status?: string }
) {
  return prisma.medicationTherapeuticClassMembership.findMany({
    where: {
      therapeuticClassId: filters?.therapeuticClassId,
      status: filters?.status,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { therapeuticClass: true, concept: true, product: true },
  });
}
