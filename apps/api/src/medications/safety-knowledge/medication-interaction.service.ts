/**
 * Phase 9 — drug–drug / drug–class / class–class interaction knowledge.
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertApprovedSafetyKnowledgeImmutable,
  assertLegalSafetyKnowledgeLifecycleTransition,
  assertOnlyAdminMayApproveSafetyKnowledge,
  assertSafetyKnowledgeActivationDisabled,
  buildDirectionalInteractionIdentityKey,
  buildSymmetricInteractionPairKey,
  type MedicationSafetyKnowledgeLifecycle,
} from "@medora/shared";
import {
  requireSafetyOperator,
  writeSafetyAudit,
  type SafetyKnowledgeActor,
} from "./medication-safety-knowledge.service";

function resolvePairEndpoints(input: {
  directional: boolean;
  interactionScope: string;
  sourceVersionId: string;
  subjectMedicationConceptId?: string;
  objectMedicationConceptId?: string;
  subjectMedicationProductId?: string;
  objectMedicationProductId?: string;
}): { normalizedPairKey: string; leftId: string; rightId: string } {
  const leftId =
    input.subjectMedicationProductId ??
    input.subjectMedicationConceptId ??
    "";
  const rightId =
    input.objectMedicationProductId ?? input.objectMedicationConceptId ?? "";
  if (!leftId || !rightId) {
    throw new Error(
      "Interaction must resolve to canonical concept/product identities on both sides."
    );
  }
  const normalizedPairKey = input.directional
    ? buildDirectionalInteractionIdentityKey({
        subjectMedicationId: leftId,
        objectMedicationId: rightId,
        interactionScope: input.interactionScope,
        sourceVersionId: input.sourceVersionId,
      })
    : buildSymmetricInteractionPairKey({
        leftMedicationId: leftId,
        rightMedicationId: rightId,
        interactionScope: input.interactionScope,
        sourceVersionId: input.sourceVersionId,
      });
  return { normalizedPairKey, leftId, rightId };
}

export async function createDraftDrugInteraction(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: {
    subjectMedicationConceptId?: string;
    objectMedicationConceptId?: string;
    subjectMedicationProductId?: string;
    objectMedicationProductId?: string;
    directional?: boolean;
    interactionScope: string;
    interactionType: string;
    severity: string;
    clinicalSignificance?: string;
    evidenceLevel?: string;
    onset?: string;
    mechanism?: string;
    clinicalEffect?: string;
    managementRecommendation?: string;
    monitoringRecommendation?: string;
    administrationSeparationMinutes?: number;
    contraindicatedCombination?: boolean;
    emergencyContextNotesJson?: Prisma.InputJsonValue;
    sourceVersionId: string;
    notes?: string;
  }
) {
  requireSafetyOperator(actor);
  assertSafetyKnowledgeActivationDisabled(false);
  if (!input.evidenceLevel) {
    throw new Error("Source provenance requires evidenceLevel on interaction drafts.");
  }

  const directional = input.directional ?? false;
  const { normalizedPairKey } = resolvePairEndpoints({
    directional,
    interactionScope: input.interactionScope,
    sourceVersionId: input.sourceVersionId,
    subjectMedicationConceptId: input.subjectMedicationConceptId,
    objectMedicationConceptId: input.objectMedicationConceptId,
    subjectMedicationProductId: input.subjectMedicationProductId,
    objectMedicationProductId: input.objectMedicationProductId,
  });

  const existing = await prisma.medicationDrugInteraction.findFirst({
    where: {
      normalizedPairKey,
      status: { in: ["DRAFT", "UNDER_REVIEW", "APPROVED"] },
    },
  });
  if (existing) {
    throw new Error(
      `Duplicate interaction knowledge blocked for key ${normalizedPairKey} (${existing.id}).`
    );
  }

  const row = await prisma.medicationDrugInteraction.create({
    data: {
      id: randomUUID(),
      subjectMedicationConceptId: input.subjectMedicationConceptId,
      objectMedicationConceptId: input.objectMedicationConceptId,
      subjectMedicationProductId: input.subjectMedicationProductId,
      objectMedicationProductId: input.objectMedicationProductId,
      normalizedPairKey,
      directional,
      interactionScope: input.interactionScope,
      interactionType: input.interactionType,
      severity: input.severity,
      clinicalSignificance: input.clinicalSignificance,
      evidenceLevel: input.evidenceLevel,
      onset: input.onset,
      mechanism: input.mechanism,
      clinicalEffect: input.clinicalEffect,
      managementRecommendation: input.managementRecommendation,
      monitoringRecommendation: input.monitoringRecommendation,
      administrationSeparationMinutes: input.administrationSeparationMinutes,
      contraindicatedCombination: input.contraindicatedCombination ?? false,
      emergencyContextNotesJson: input.emergencyContextNotesJson,
      futureAlertEligible: false,
      clinicalActivationAllowed: false,
      sourceVersionId: input.sourceVersionId,
      status: "DRAFT",
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      notes: input.notes,
    },
  });

  await writeSafetyAudit(prisma, {
    entityType: "MedicationDrugInteraction",
    entityId: row.id,
    action: "INTERACTION_DRAFT_CREATED",
    performedByUserId: actor.userId,
    sourceVersionId: input.sourceVersionId,
    afterState: {
      normalizedPairKey,
      directional,
      clinicalActivationAllowed: false,
    },
  });
  return row;
}

export async function updateDraftDrugInteraction(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  id: string,
  patch: { notes?: string; managementRecommendation?: string; monitoringRecommendation?: string }
) {
  requireSafetyOperator(actor);
  const existing = await prisma.medicationDrugInteraction.findUniqueOrThrow({
    where: { id },
  });
  assertApprovedSafetyKnowledgeImmutable(existing.status);
  if (existing.status !== "DRAFT") {
    throw new Error("Only DRAFT interactions may be edited; return to draft first.");
  }
  return prisma.medicationDrugInteraction.update({
    where: { id },
    data: {
      notes: patch.notes ?? existing.notes,
      managementRecommendation:
        patch.managementRecommendation ?? existing.managementRecommendation,
      monitoringRecommendation:
        patch.monitoringRecommendation ?? existing.monitoringRecommendation,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      clinicalActivationAllowed: false,
    },
  });
}

export async function transitionDrugInteraction(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  input: { id: string; toStatus: MedicationSafetyKnowledgeLifecycle; rationale: string }
) {
  requireSafetyOperator(actor);
  if (!input.rationale.trim()) throw new Error("Lifecycle transition requires rationale.");
  const existing = await prisma.medicationDrugInteraction.findUniqueOrThrow({
    where: { id: input.id },
  });
  assertLegalSafetyKnowledgeLifecycleTransition(
    existing.status as MedicationSafetyKnowledgeLifecycle,
    input.toStatus
  );
  if (input.toStatus === "APPROVED") {
    assertOnlyAdminMayApproveSafetyKnowledge(actor.roles);
    assertSafetyKnowledgeActivationDisabled(existing.clinicalActivationAllowed);
  }

  const updated = await prisma.medicationDrugInteraction.update({
    where: { id: existing.id },
    data: {
      status: input.toStatus,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      approvedByUserId:
        input.toStatus === "APPROVED" ? actor.userId : existing.approvedByUserId,
      approvedAt: input.toStatus === "APPROVED" ? new Date() : existing.approvedAt,
      clinicalActivationAllowed: false,
    },
  });

  await writeSafetyAudit(prisma, {
    entityType: "MedicationDrugInteraction",
    entityId: existing.id,
    action: "INTERACTION_LIFECYCLE",
    performedByUserId: actor.userId,
    reason: input.rationale.trim(),
    sourceVersionId: existing.sourceVersionId,
    beforeState: { status: existing.status },
    afterState: { status: input.toStatus, clinicalActivationAllowed: false },
  });
  return updated;
}

export async function forkApprovedDrugInteraction(
  prisma: PrismaClient,
  actor: SafetyKnowledgeActor,
  approvedId: string,
  sourceVersionId: string
) {
  requireSafetyOperator(actor);
  const approved = await prisma.medicationDrugInteraction.findUniqueOrThrow({
    where: { id: approvedId },
  });
  if (approved.status !== "APPROVED") {
    throw new Error("Only APPROVED interactions can be forked.");
  }

  const draft = await createDraftDrugInteraction(prisma, actor, {
    subjectMedicationConceptId: approved.subjectMedicationConceptId ?? undefined,
    objectMedicationConceptId: approved.objectMedicationConceptId ?? undefined,
    subjectMedicationProductId: approved.subjectMedicationProductId ?? undefined,
    objectMedicationProductId: approved.objectMedicationProductId ?? undefined,
    directional: approved.directional,
    interactionScope: approved.interactionScope,
    interactionType: approved.interactionType,
    severity: approved.severity,
    clinicalSignificance: approved.clinicalSignificance ?? undefined,
    evidenceLevel: approved.evidenceLevel ?? "UNKNOWN",
    onset: approved.onset ?? undefined,
    mechanism: approved.mechanism ?? undefined,
    clinicalEffect: approved.clinicalEffect ?? undefined,
    managementRecommendation: approved.managementRecommendation ?? undefined,
    monitoringRecommendation: approved.monitoringRecommendation ?? undefined,
    administrationSeparationMinutes:
      approved.administrationSeparationMinutes ?? undefined,
    contraindicatedCombination: approved.contraindicatedCombination,
    emergencyContextNotesJson: approved.emergencyContextNotesJson as
      | Prisma.InputJsonValue
      | undefined,
    sourceVersionId,
    notes: approved.notes ?? undefined,
  });

  return prisma.medicationDrugInteraction.update({
    where: { id: draft.id },
    data: { supersedesId: approved.id },
  });
}

export async function listDrugInteractions(
  prisma: PrismaClient,
  filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const where = filters.status ? { status: filters.status } : undefined;
  const [rows, total] = await Promise.all([
    prisma.medicationDrugInteraction.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: { sourceVersion: { include: { source: true } } },
    }),
    prisma.medicationDrugInteraction.count({ where }),
  ]);
  return { rows, total, limit, offset };
}

export async function getDrugInteraction(prisma: PrismaClient, id: string) {
  return prisma.medicationDrugInteraction.findUnique({
    where: { id },
    include: {
      sourceVersion: { include: { source: true } },
      evidenceRows: true,
      subjectConcept: true,
      objectConcept: true,
    },
  });
}
