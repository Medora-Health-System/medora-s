/**
 * Phase 15 Part 2A — authoritative source lifecycle on Phase 14A registrations.
 * Extends MedicationEvidenceSourceRegistration; does not replace evidence governance.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_SOURCE_CATEGORY_VALUES,
  PHASE15_SOURCE_LIFECYCLE_STATUS_VALUES,
  assertPhase15NoCopyrightEmbed,
  assertPhase15NoWorkflowControl,
  canPromoteToAuthoritativeSourceConfirmed,
  resolveLifecycleStatusFromAlias,
  type Phase15SourceCategory,
  type Phase15SourceLifecycleStatus,
  type Phase15SourceTier,
} from "@medora/shared";
import { isRemediationAdmin } from "./medication-remediation.roles";

export type RemediationActor = { userId: string; roles: string[] };

function requireAdmin(actor: RemediationActor) {
  if (!isRemediationAdmin(actor.roles)) {
    throw new ForbiddenException("Administrateur médicament requis.");
  }
}

function assertSafetyDefaults() {
  assertPhase15NoWorkflowControl(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase15NoCopyrightEmbed(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.embedCopyrightedSourceContentInRepo
  );
}

async function audit(
  prisma: PrismaClient,
  input: {
    programId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
) {
  await prisma.medicationRemediationAuditEvent.create({
    data: {
      programId: input.programId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeState: (input.before as Prisma.InputJsonValue) ?? undefined,
      afterState: (input.after as Prisma.InputJsonValue) ?? undefined,
      performedByUserId: input.userId,
      reason: input.reason,
    },
  });
}

function normalizeLicensingStatus(
  raw: string | null | undefined
): "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN" {
  const v = (raw ?? "UNKNOWN").toUpperCase();
  if (v === "LICENSED" || v === "PUBLIC_DOMAIN") return v;
  if (v === "RESTRICTED" || v === "INSTITUTIONAL_USE") return "RESTRICTED";
  return "UNKNOWN";
}

export async function advanceEvidenceSourceLifecycle(
  prisma: PrismaClient,
  actor: RemediationActor,
  input: {
    registrationId: string;
    /** Alias (registered|verified|authoritative|deprecated|superseded) or status enum. */
    targetStatus: string;
    sourceCategory?: Phase15SourceCategory;
    reviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
    licensingStatus?: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
    lifecycleNotes?: string;
    reason?: string;
  }
) {
  requireAdmin(actor);
  assertSafetyDefaults();

  const resolved = resolveLifecycleStatusFromAlias(input.targetStatus);
  if (
    !resolved ||
    !(PHASE15_SOURCE_LIFECYCLE_STATUS_VALUES as readonly string[]).includes(
      resolved
    )
  ) {
    throw new BadRequestException(
      `Statut de cycle de vie source invalide: ${input.targetStatus}`
    );
  }

  if (
    input.sourceCategory &&
    !(PHASE15_SOURCE_CATEGORY_VALUES as readonly string[]).includes(
      input.sourceCategory
    )
  ) {
    throw new BadRequestException("Catégorie de source invalide.");
  }

  const reg = await prisma.medicationEvidenceSourceRegistration.findUnique({
    where: { id: input.registrationId },
  });
  if (!reg) throw new NotFoundException("Enregistrement de source introuvable.");

  const nextReview = input.reviewStatus ?? (reg.reviewStatus as "PENDING" | "APPROVED" | "REJECTED" | null) ?? "PENDING";
  const nextLicensing =
    input.licensingStatus ??
    normalizeLicensingStatus(reg.licensingStatus ?? reg.licenseStatus);

  if (
    resolved === "AUTHORITATIVE_SOURCE_CONFIRMED" ||
    resolved === "ACCEPTED_FOR_KNOWLEDGE_USE"
  ) {
    const ok = canPromoteToAuthoritativeSourceConfirmed({
      sourceTier: reg.sourceTier as Phase15SourceTier,
      licensingStatus: nextLicensing,
      reviewStatus: nextReview === "APPROVED" ? "APPROVED" : "PENDING",
      lifecycleStatus: resolved as Phase15SourceLifecycleStatus,
    });
    if (!ok) {
      throw new BadRequestException(
        "Promotion autoritative refusée: tier/licence/revue insuffisants (pas de promotion par catalogue inférieur seul)."
      );
    }
  }

  const updated = await prisma.medicationEvidenceSourceRegistration.update({
    where: { id: reg.id },
    data: {
      acquisitionStatus: resolved,
      sourceCategory: input.sourceCategory ?? reg.sourceCategory,
      reviewStatus: nextReview,
      licensingStatus: nextLicensing,
      lifecycleNotes: input.lifecycleNotes ?? reg.lifecycleNotes,
    },
  });

  await audit(prisma, {
    entityType: "MedicationEvidenceSourceRegistration",
    entityId: reg.id,
    action: "SOURCE_LIFECYCLE_ADVANCED",
    userId: actor.userId,
    before: {
      acquisitionStatus: reg.acquisitionStatus,
      reviewStatus: reg.reviewStatus,
    },
    after: {
      acquisitionStatus: updated.acquisitionStatus,
      reviewStatus: updated.reviewStatus,
      sourceCategory: updated.sourceCategory,
    },
    reason: input.reason,
  });

  return updated;
}

export function isAuthoritativeRegistrationStatus(status: string): boolean {
  return (
    status === "AUTHORITATIVE_SOURCE_CONFIRMED" ||
    status === "ACCEPTED_FOR_KNOWLEDGE_USE"
  );
}
