import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { isSafetyValidationAdmin, isSafetyValidationReviewer } from "./medication-safety-validation.roles";
import type { ValidationActor } from "./medication-safety-validation-case.service";

const KNOWLEDGE_STATUSES = [
  "OPEN",
  "TRIAGED",
  "IN_REMEDIATION",
  "RESOLVED",
  "DEFERRED",
  "NOT_APPLICABLE",
] as const;

const IDENTITY_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_EXISTING_IDENTITY",
  "REQUIRES_GOVERNED_MAPPING",
  "DEFERRED",
  "INVALID_SOURCE_DATA",
] as const;

export async function listKnowledgeGaps(prisma: PrismaClient, status?: string) {
  return prisma.medicationKnowledgeGap.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function transitionKnowledgeGap(
  prisma: PrismaClient,
  id: string,
  status: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationReviewer(actor.roles)) {
    throw new ForbiddenException("Autorisation insuffisante.");
  }
  if (!(KNOWLEDGE_STATUSES as readonly string[]).includes(status)) {
    throw new BadRequestException("Statut invalide.");
  }
  // Never auto-approve knowledge
  if (status === "RESOLVED" && !isSafetyValidationAdmin(actor.roles)) {
    // reviewers may mark resolved as remediation complete tracking only
  }
  const existing = await prisma.medicationKnowledgeGap.findUnique({ where: { id } });
  if (!existing) throw new NotFoundException("Écart de connaissance introuvable.");
  const updated = await prisma.medicationKnowledgeGap.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedByUserId: status === "RESOLVED" ? actor.userId : null,
    },
  });
  await prisma.medicationSafetyValidationAuditEvent.create({
    data: {
      entityType: "MedicationKnowledgeGap",
      entityId: id,
      action: "GAP_TRANSITION",
      beforeState: { status: existing.status },
      afterState: { status },
      performedByUserId: actor.userId,
    },
  });
  return updated;
}

export async function listIdentityGaps(prisma: PrismaClient, status?: string) {
  return prisma.medicationIdentityGap.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function transitionIdentityGap(
  prisma: PrismaClient,
  id: string,
  status: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationReviewer(actor.roles)) {
    throw new ForbiddenException("Autorisation insuffisante.");
  }
  if (!(IDENTITY_STATUSES as readonly string[]).includes(status)) {
    throw new BadRequestException("Statut invalide.");
  }
  // Never create canonical medication identities from Phase 11
  if (status === "RESOLVED_EXISTING_IDENTITY" || status === "REQUIRES_GOVERNED_MAPPING") {
    // route through existing identity governance — no auto-create
  }
  const existing = await prisma.medicationIdentityGap.findUnique({ where: { id } });
  if (!existing) throw new NotFoundException("Écart d'identité introuvable.");
  return prisma.medicationIdentityGap.update({
    where: { id },
    data: {
      status,
      resolvedAt:
        status.startsWith("RESOLVED") || status === "INVALID_SOURCE_DATA"
          ? new Date()
          : null,
      resolvedByUserId: actor.userId,
    },
  });
}

export async function listContextGaps(prisma: PrismaClient, status?: string) {
  return prisma.medicationPatientContextGap.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function transitionContextGap(
  prisma: PrismaClient,
  id: string,
  status: string,
  actor: ValidationActor
) {
  if (!isSafetyValidationReviewer(actor.roles)) {
    throw new ForbiddenException("Autorisation insuffisante.");
  }
  // Never write missing patient context back into the chart
  const existing = await prisma.medicationPatientContextGap.findUnique({
    where: { id },
  });
  if (!existing) throw new NotFoundException("Écart de contexte introuvable.");
  return prisma.medicationPatientContextGap.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedByUserId: status === "RESOLVED" ? actor.userId : null,
    },
  });
}

export async function upsertKnowledgeGapFromCoverage(
  prisma: PrismaClient,
  input: {
    familyCoverageProfileId?: string;
    medicationConceptId?: string;
    gapType: string;
    description: string;
    severity?: string;
  }
) {
  try {
    return await prisma.medicationKnowledgeGap.create({
      data: {
        medicationFamilyCoverageProfileId: input.familyCoverageProfileId,
        medicationConceptId: input.medicationConceptId,
        gapType: input.gapType,
        description: input.description,
        severity: input.severity ?? "MODERATE",
        status: "OPEN",
      },
    });
  } catch {
    // duplicate prevention via unique constraint
    return null;
  }
}
