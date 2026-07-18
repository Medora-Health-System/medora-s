/**
 * Phase 8 — clinical knowledge foundation service.
 * Stores versioned knowledge only; never activates clinical workflows or calculates patient doses.
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertApprovedKnowledgeImmutable,
  assertClinicalKnowledgeActivationDisabled,
  assertLegalClinicalKnowledgeLifecycleTransition,
  assertOnlyAdminMayApprove,
  PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS,
  type MedicationClinicalKnowledgeLifecycle,
} from "@medora/shared";

export type ClinicalKnowledgeActor = { userId: string; roles: string[] };

function requireOperator(actor: ClinicalKnowledgeActor): void {
  const allowed = ["MEDICATION_ADMIN", "MEDICATION_REVIEWER", "MEDORA_SUPER_ADMIN", "ADMIN"];
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new Error("Unauthorized clinical knowledge operator.");
  }
}

const PROFILE_INCLUDE = {
  source: true,
  knowledgeVersion: true,
  doseRecommendations: true,
  weightBasedDoses: true,
  renalAdjustments: true,
  hepaticAdjustments: true,
  administrationInstructions: true,
  infusionGuidance: true,
  monitoringRequirements: true,
  contraindications: true,
  precautions: true,
  blackBoxWarnings: true,
  pregnancyInformation: true,
  lactationInformation: true,
  highAlertProfiles: true,
  emergencyProfiles: true,
  storageRequirements: true,
  reconstitutionInstructions: true,
} as const;

export async function upsertKnowledgeSource(
  prisma: PrismaClient,
  actor: ClinicalKnowledgeActor,
  input: {
    sourceCode: string;
    sourceName: string;
    organization?: string;
    licenseNotes?: string;
    sourceUrl?: string;
  }
) {
  requireOperator(actor);
  return prisma.medicationClinicalKnowledgeSource.upsert({
    where: { sourceCode: input.sourceCode },
    create: {
      id: randomUUID(),
      sourceCode: input.sourceCode,
      sourceName: input.sourceName,
      organization: input.organization,
      licenseNotes: input.licenseNotes,
      sourceUrl: input.sourceUrl,
    },
    update: {
      sourceName: input.sourceName,
      organization: input.organization,
      licenseNotes: input.licenseNotes,
      sourceUrl: input.sourceUrl,
    },
  });
}

export async function createKnowledgeVersion(
  prisma: PrismaClient,
  actor: ClinicalKnowledgeActor,
  input: {
    sourceId: string;
    versionLabel: string;
    knowledgeVersion: string;
    effectiveDate?: Date;
    notes?: string;
  }
) {
  requireOperator(actor);
  return prisma.medicationClinicalKnowledgeVersion.create({
    data: {
      id: randomUUID(),
      sourceId: input.sourceId,
      versionLabel: input.versionLabel,
      knowledgeVersion: input.knowledgeVersion,
      effectiveDate: input.effectiveDate,
      retrievedAt: new Date(),
      notes: input.notes,
    },
  });
}

export async function createDraftClinicalProfile(
  prisma: PrismaClient,
  actor: ClinicalKnowledgeActor,
  input: {
    conceptId?: string;
    productId?: string;
    sourceId: string;
    knowledgeVersionId: string;
    evidenceLevel?: string;
    notes?: string;
    emergencyUseProfiles?: string[];
    doseRecommendation?: {
      doseKind: string;
      population?: string;
      routeCode?: string;
      doseAmount?: number;
      doseUnit?: string;
      doseMinAmount?: number;
      doseMaxAmount?: number;
      frequencyText?: string;
    };
    administration?: {
      routeCode: string;
      administrationMethod?: string;
      dilutionRequired?: boolean;
      ivPushRateText?: string;
      infusionRateText?: string;
      centralLineRequired?: boolean;
    };
  }
) {
  requireOperator(actor);
  assertClinicalKnowledgeActivationDisabled(
    PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS.automaticClinicalActivationEnabled
  );
  if (!input.conceptId && !input.productId) {
    throw new Error("Clinical knowledge must reference conceptId and/or productId.");
  }

  const source = await prisma.medicationClinicalKnowledgeSource.findUniqueOrThrow({
    where: { id: input.sourceId },
  });
  const version = await prisma.medicationClinicalKnowledgeVersion.findUniqueOrThrow({
    where: { id: input.knowledgeVersionId },
  });

  return prisma.$transaction(async (tx) => {
    const profile = await tx.medicationClinicalProfile.create({
      data: {
        id: randomUUID(),
        conceptId: input.conceptId,
        productId: input.productId,
        sourceId: input.sourceId,
        knowledgeVersionId: input.knowledgeVersionId,
        lifecycleStatus: "DRAFT",
        knowledgeSourceLabel: source.sourceName,
        knowledgeVersionLabel: version.versionLabel,
        evidenceLevel: input.evidenceLevel,
        clinicalActivationAllowed: false,
        notes: input.notes,
        reviewedByUserId: actor.userId,
      },
    });

    if (input.doseRecommendation) {
      await tx.medicationDoseRecommendation.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          doseKind: input.doseRecommendation.doseKind,
          population: input.doseRecommendation.population,
          routeCode: input.doseRecommendation.routeCode,
          doseAmount: input.doseRecommendation.doseAmount,
          doseUnit: input.doseRecommendation.doseUnit,
          doseMinAmount: input.doseRecommendation.doseMinAmount,
          doseMaxAmount: input.doseRecommendation.doseMaxAmount,
          frequencyText: input.doseRecommendation.frequencyText,
        },
      });
    }

    if (input.administration) {
      await tx.medicationAdministrationInstruction.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          routeCode: input.administration.routeCode,
          administrationMethod: input.administration.administrationMethod,
          dilutionRequired: input.administration.dilutionRequired ?? false,
          ivPushRateText: input.administration.ivPushRateText,
          infusionRateText: input.administration.infusionRateText,
          centralLineRequired: input.administration.centralLineRequired ?? false,
        },
      });
    }

    for (const useProfile of input.emergencyUseProfiles ?? []) {
      await tx.medicationEmergencyProfile.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          useProfile,
        },
      });
    }

    await tx.rxNormReviewAuditEvent.create({
      data: {
        id: randomUUID(),
        action: "CLINICAL_KNOWLEDGE_DRAFT_CREATED",
        actorUserId: actor.userId,
        actorRoleLabel: "MedicationReviewer",
        rationaleNotes: `Created draft clinical profile ${profile.id}`,
        evidenceJson: {
          profileId: profile.id,
          conceptId: input.conceptId,
          productId: input.productId,
          clinicalActivationAllowed: false,
        } as Prisma.InputJsonValue,
      },
    });

    return tx.medicationClinicalProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: PROFILE_INCLUDE,
    });
  });
}

export async function updateDraftClinicalProfileNotes(
  prisma: PrismaClient,
  actor: ClinicalKnowledgeActor,
  profileId: string,
  notes: string
) {
  requireOperator(actor);
  const existing = await prisma.medicationClinicalProfile.findUniqueOrThrow({
    where: { id: profileId },
  });
  assertApprovedKnowledgeImmutable(existing.lifecycleStatus);
  return prisma.medicationClinicalProfile.update({
    where: { id: profileId },
    data: { notes, reviewedByUserId: actor.userId },
    include: PROFILE_INCLUDE,
  });
}

export async function transitionClinicalProfileLifecycle(
  prisma: PrismaClient,
  actor: ClinicalKnowledgeActor,
  input: {
    profileId: string;
    toStatus: MedicationClinicalKnowledgeLifecycle;
    rationale: string;
  }
) {
  requireOperator(actor);
  if (!input.rationale.trim()) throw new Error("Lifecycle transition requires rationale.");

  const existing = await prisma.medicationClinicalProfile.findUniqueOrThrow({
    where: { id: input.profileId },
  });
  assertLegalClinicalKnowledgeLifecycleTransition(
    existing.lifecycleStatus as MedicationClinicalKnowledgeLifecycle,
    input.toStatus
  );

  if (input.toStatus === "APPROVED") {
    assertOnlyAdminMayApprove(actor.roles);
    assertClinicalKnowledgeActivationDisabled(existing.clinicalActivationAllowed);
  }

  return prisma.$transaction(async (tx) => {
    if (input.toStatus === "APPROVED" && existing.supersedesProfileId == null) {
      // Supersede any other approved profile for same identity+source
      const where: Prisma.MedicationClinicalProfileWhereInput = {
        id: { not: existing.id },
        sourceId: existing.sourceId,
        lifecycleStatus: "APPROVED",
        ...(existing.productId
          ? { productId: existing.productId }
          : { conceptId: existing.conceptId, productId: null }),
      };
      await tx.medicationClinicalProfile.updateMany({
        where,
        data: { lifecycleStatus: "SUPERSEDED" },
      });
    }

    const updated = await tx.medicationClinicalProfile.update({
      where: { id: existing.id },
      data: {
        lifecycleStatus: input.toStatus,
        reviewedByUserId: actor.userId,
        approvedByUserId: input.toStatus === "APPROVED" ? actor.userId : existing.approvedByUserId,
        approvalDate: input.toStatus === "APPROVED" ? new Date() : existing.approvalDate,
        clinicalActivationAllowed: false,
      },
      include: PROFILE_INCLUDE,
    });

    await tx.rxNormReviewAuditEvent.create({
      data: {
        id: randomUUID(),
        action: "CLINICAL_KNOWLEDGE_LIFECYCLE",
        actorUserId: actor.userId,
        actorRoleLabel: actor.roles.includes("MEDICATION_ADMIN")
          ? "MedicationAdmin"
          : "MedicationReviewer",
        rationaleNotes: input.rationale.trim(),
        evidenceJson: {
          profileId: existing.id,
          before: existing.lifecycleStatus,
          after: input.toStatus,
          clinicalActivationAllowed: false,
        } as Prisma.InputJsonValue,
      },
    });

    return updated;
  });
}

/** Create a new DRAFT version from an APPROVED profile (immutable history preserved). */
export async function createSupersedingDraft(
  prisma: PrismaClient,
  actor: ClinicalKnowledgeActor,
  approvedProfileId: string,
  knowledgeVersionId: string
) {
  requireOperator(actor);
  const approved = await prisma.medicationClinicalProfile.findUniqueOrThrow({
    where: { id: approvedProfileId },
    include: PROFILE_INCLUDE,
  });
  if (approved.lifecycleStatus !== "APPROVED") {
    throw new Error("Only APPROVED profiles can be versioned via superseding draft.");
  }

  return prisma.$transaction(async (tx) => {
    const draft = await tx.medicationClinicalProfile.create({
      data: {
        id: randomUUID(),
        conceptId: approved.conceptId,
        productId: approved.productId,
        sourceId: approved.sourceId,
        knowledgeVersionId,
        lifecycleStatus: "DRAFT",
        knowledgeSourceLabel: approved.knowledgeSourceLabel,
        knowledgeVersionLabel: approved.knowledgeVersionLabel,
        evidenceLevel: approved.evidenceLevel,
        supersedesProfileId: approved.id,
        clinicalActivationAllowed: false,
        notes: approved.notes,
        reviewedByUserId: actor.userId,
      },
    });

    for (const row of approved.doseRecommendations) {
      await tx.medicationDoseRecommendation.create({
        data: {
          id: randomUUID(),
          profileId: draft.id,
          doseKind: row.doseKind,
          population: row.population,
          routeCode: row.routeCode,
          doseAmount: row.doseAmount,
          doseUnit: row.doseUnit,
          doseMinAmount: row.doseMinAmount,
          doseMaxAmount: row.doseMaxAmount,
          frequencyText: row.frequencyText,
          indicationText: row.indicationText,
          structuredJson: row.structuredJson as Prisma.InputJsonValue,
        },
      });
    }

    await tx.rxNormReviewAuditEvent.create({
      data: {
        id: randomUUID(),
        action: "CLINICAL_KNOWLEDGE_VERSION_FORK",
        actorUserId: actor.userId,
        actorRoleLabel: "MedicationReviewer",
        rationaleNotes: `Forked draft from approved profile ${approved.id}`,
        evidenceJson: {
          approvedProfileId: approved.id,
          draftProfileId: draft.id,
        } as Prisma.InputJsonValue,
      },
    });

    return tx.medicationClinicalProfile.findUniqueOrThrow({
      where: { id: draft.id },
      include: PROFILE_INCLUDE,
    });
  });
}

export async function listClinicalProfiles(
  prisma: PrismaClient,
  filters: {
    conceptId?: string;
    productId?: string;
    lifecycleStatus?: string;
    emergencyUseProfile?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const where: Prisma.MedicationClinicalProfileWhereInput = {
    ...(filters.conceptId ? { conceptId: filters.conceptId } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.lifecycleStatus ? { lifecycleStatus: filters.lifecycleStatus } : {}),
    ...(filters.emergencyUseProfile
      ? { emergencyProfiles: { some: { useProfile: filters.emergencyUseProfile } } }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.medicationClinicalProfile.count({ where }),
    prisma.medicationClinicalProfile.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        source: true,
        knowledgeVersion: true,
        emergencyProfiles: true,
        highAlertProfiles: true,
      },
    }),
  ]);
  return { total, limit, offset, rows };
}

export async function getClinicalProfileDetail(prisma: PrismaClient, profileId: string) {
  return prisma.medicationClinicalProfile.findUnique({
    where: { id: profileId },
    include: PROFILE_INCLUDE,
  });
}

export async function getClinicalKnowledgeDashboard(prisma: PrismaClient) {
  const [
    profilesTotal,
    draftCount,
    underReviewCount,
    approvedCount,
    sourcesCount,
    versionsCount,
    missingEmergency,
  ] = await Promise.all([
    prisma.medicationClinicalProfile.count(),
    prisma.medicationClinicalProfile.count({ where: { lifecycleStatus: "DRAFT" } }),
    prisma.medicationClinicalProfile.count({ where: { lifecycleStatus: "UNDER_REVIEW" } }),
    prisma.medicationClinicalProfile.count({ where: { lifecycleStatus: "APPROVED" } }),
    prisma.medicationClinicalKnowledgeSource.count(),
    prisma.medicationClinicalKnowledgeVersion.count(),
    prisma.medicationConcept.count({
      where: {
        isActive: true,
        clinicalProfiles: { none: { emergencyProfiles: { some: {} } } },
      },
    }),
  ]);

  return {
    profilesTotal,
    draftCount,
    underReviewCount,
    approvedCount,
    sourcesCount,
    versionsCount,
    conceptsMissingEmergencyProfileEstimate: missingEmergency,
    automaticClinicalActivationEnabled: false as const,
    clinicalDecisionSupportEnabled: false as const,
    patientSpecificDosingEnabled: false as const,
    orderingBehaviorChanged: false as const,
    medicationSearchChanged: false as const,
    marChanged: false as const,
    billingChanged: false as const,
  };
}
