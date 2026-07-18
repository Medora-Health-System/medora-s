/**
 * Phase 9 — safety knowledge hub: sources, versions, dashboard, audit.
 * Storage/governance only — never evaluates patients or blocks orders.
 */
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertSafetyKnowledgeActivationDisabled,
  PHASE9_SAFETY_KNOWLEDGE_DEFAULTS,
} from "@medora/shared";

export type SafetyKnowledgeActor = { userId: string; roles: string[] };

export function requireSafetyOperator(actor: SafetyKnowledgeActor): void {
  const allowed = ["MEDICATION_ADMIN", "MEDICATION_REVIEWER", "MEDORA_SUPER_ADMIN", "ADMIN"];
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new Error("Unauthorized safety knowledge operator.");
  }
}

export async function writeSafetyAudit(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    performedByUserId: string;
    reason?: string;
    beforeState?: Prisma.InputJsonValue;
    afterState?: Prisma.InputJsonValue;
    sourceVersionId?: string;
  }
) {
  return prisma.medicationSafetyKnowledgeAuditEvent.create({
    data: {
      id: randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      performedByUserId: input.performedByUserId,
      reason: input.reason,
      beforeState: input.beforeState,
      afterState: input.afterState,
      sourceVersionId: input.sourceVersionId,
    },
  });
}

export async function upsertSafetyKnowledgeSource(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    sourceCode: string;
    name: string;
    sourceType?: string;
    publisher?: string;
    sourceUrl?: string;
    licenseReference?: string;
    releaseVersion?: string;
  }
) {
  requireSafetyOperator(actor);
  return prisma.medicationSafetyKnowledgeSource.upsert({
    where: { sourceCode: input.sourceCode },
    create: {
      id: randomUUID(),
      sourceCode: input.sourceCode,
      name: input.name,
      sourceType: input.sourceType ?? "INTERNAL_CURATED",
      publisher: input.publisher,
      sourceUrl: input.sourceUrl,
      licenseReference: input.licenseReference,
      releaseVersion: input.releaseVersion,
    },
    update: {
      name: input.name,
      sourceType: input.sourceType,
      publisher: input.publisher,
      sourceUrl: input.sourceUrl,
      licenseReference: input.licenseReference,
      releaseVersion: input.releaseVersion,
    },
  });
}

export async function createSafetyKnowledgeVersion(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    sourceId: string;
    version: string;
    releaseIdentifier?: string;
    notes?: string;
    checksum?: string;
  }
) {
  requireSafetyOperator(actor);
  const row = await prisma.medicationSafetyKnowledgeVersion.create({
    data: {
      id: randomUUID(),
      sourceId: input.sourceId,
      version: input.version,
      releaseIdentifier: input.releaseIdentifier,
      importedAt: new Date(),
      importedByUserId: actor.userId,
      checksum: input.checksum,
      status: "DRAFT",
      notes: input.notes,
    },
  });
  await writeSafetyAudit(prisma, {
    entityType: "MedicationSafetyKnowledgeVersion",
    entityId: row.id,
    action: "SAFETY_VERSION_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: row.id,
    afterState: { version: row.version, status: row.status },
  });
  return row;
}

export async function listSafetyKnowledgeSources(prisma: PrismaClient) {
  return prisma.medicationSafetyKnowledgeSource.findMany({
    orderBy: { name: "asc" },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
}

export async function listSafetyKnowledgeVersions(
  prisma: PrismaClient,
  sourceId?: string
) {
  return prisma.medicationSafetyKnowledgeVersion.findMany({
    where: sourceId ? { sourceId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { source: true },
  });
}

export async function getSafetyKnowledgeDashboard(prisma: PrismaClient) {
  assertSafetyKnowledgeActivationDisabled(
    PHASE9_SAFETY_KNOWLEDGE_DEFAULTS.automaticClinicalActivationEnabled
  );

  const [
    interactionsTotal,
    interactionsApproved,
    interactionsDraft,
    allergenMappings,
    crossReactivityRules,
    therapeuticClasses,
    classMemberships,
    duplicateTherapyGroups,
    duplicateTherapyRules,
    futureCdsEligible,
    clinicallyActivated,
    missingProvenance,
  ] = await Promise.all([
    prisma.medicationDrugInteraction.count(),
    prisma.medicationDrugInteraction.count({ where: { status: "APPROVED" } }),
    prisma.medicationDrugInteraction.count({ where: { status: "DRAFT" } }),
    prisma.medicationAllergenMapping.count(),
    prisma.medicationAllergyCrossReactivityRule.count(),
    prisma.medicationTherapeuticClass.count(),
    prisma.medicationTherapeuticClassMembership.count(),
    prisma.medicationDuplicateTherapyGroup.count(),
    prisma.medicationDuplicateTherapyRule.count(),
    prisma.medicationDrugInteraction.count({
      where: { status: "APPROVED", futureAlertEligible: true },
    }),
    prisma.medicationDrugInteraction.count({
      where: { clinicalActivationAllowed: true },
    }),
    prisma.medicationDrugInteraction.count({
      where: { OR: [{ evidenceLevel: null }, { sourceVersionId: "" }] },
    }),
  ]);

  return {
    interactionsTotal,
    interactionsApproved,
    interactionsDraft,
    unresolvedIdentityCandidates: 0,
    possibleDuplicates: 0,
    conflicts: 0,
    allergenMappings,
    crossReactivityRules,
    therapeuticClasses,
    classMemberships,
    duplicateTherapyGroups,
    duplicateTherapyRules,
    missingProvenance,
    futureCdsEligible,
    clinicallyActivatedRecords: clinicallyActivated,
    automaticClinicalActivationEnabled: false,
    patientSpecificEvaluationEnabled: false,
    interactionAlertsEnabled: false,
    allergyAlertsEnabled: false,
    duplicateTherapyAlertsEnabled: false,
    orderBlockingEnabled: false,
    orderingBehaviorChanged: false,
    medicationSearchChanged: false,
    marChanged: false,
    billingChanged: false,
    phase8BehaviorChanged: false,
  };
}

export function checksumPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
