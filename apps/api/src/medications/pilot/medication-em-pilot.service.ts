/**
 * Phase 6.5 — controlled EM pilot workflow (manifest/validate/dedupe/preview/stage/candidates/rollback).
 * Never creates clinically active catalog records or auto-verifies mappings.
 */
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertNoBulkRealMappingApproval,
  assertPilotClinicalActivationDisabled,
  assessMedicationDuplicate,
  buildConceptIdentityKey,
  buildPackageIdentityKey,
  buildProductIdentityKey,
  EM_PILOT_DATASET_ROWS,
  EM_PILOT_DEFAULT_MANIFEST_META,
  unresolvedExactDuplicatesBlockStaging,
  type DuplicateAssessmentResult,
  type EmPilotDatasetRow,
  type MedicationDuplicateClassification,
} from "@medora/shared";

export type PilotActor = {
  userId: string;
  roles: string[];
};

function requireMedicationAdmin(actor: PilotActor, action: string): void {
  if (!actor.roles.includes("MEDICATION_ADMIN") && !actor.roles.includes("MEDORA_SUPER_ADMIN")) {
    throw new Error(`Only MEDICATION_ADMIN may ${action}.`);
  }
}

function requirePilotOperator(actor: PilotActor): void {
  const allowed = ["MEDICATION_ADMIN", "MEDICATION_REVIEWER", "MEDORA_SUPER_ADMIN", "ADMIN"];
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new Error("Unauthorized pilot operator.");
  }
}

function hashManifest(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function rowIdentity(row: EmPilotDatasetRow) {
  const input = {
    genericName: row.genericName,
    brandName: row.brandName,
    strengthDisplay: row.strengthDisplay,
    concentrationText: row.concentrationText,
    dosageForm: row.dosageForm,
    route: row.route,
    releaseType: row.releaseType,
    packageQuantity: row.packageQuantity,
    packageUnit: row.packageUnit,
    containerType: row.containerType,
    singleOrMultiDose: row.singleOrMultiDose,
  };
  return {
    conceptIdentityKey: buildConceptIdentityKey(input),
    productIdentityKey: buildProductIdentityKey(input),
    packageIdentityKey: buildPackageIdentityKey(input),
    input,
  };
}

export function buildEmPilotManifestPayload(rows: EmPilotDatasetRow[] = EM_PILOT_DATASET_ROWS) {
  const body = {
    ...EM_PILOT_DEFAULT_MANIFEST_META,
    medicationCountExpected: rows.length,
    items: rows.map((row) => ({
      ...row,
      ...rowIdentity(row),
    })),
  };
  const sourceManifestHash = hashManifest(body);
  return { ...body, sourceManifestHash };
}

export async function registerOrLoadPilotManifest(
  prisma: PrismaClient,
  actor: PilotActor
): Promise<{
  manifestId: string;
  pilotId: string;
  sourceManifestHash: string;
  approvalStatus: string;
  medicationCountExpected: number;
  clinicalActivationAllowed: boolean;
}> {
  requirePilotOperator(actor);
  const payload = buildEmPilotManifestPayload();
  assertPilotClinicalActivationDisabled(payload.clinicalActivationAllowed);

  const existing = await prisma.medicationPilotManifest.findUnique({
    where: { pilotId: payload.pilotId },
  });
  if (existing) {
    if (
      existing.approvalStatus === "APPROVED" &&
      existing.sourceManifestHash !== payload.sourceManifestHash
    ) {
      throw new Error("Approved pilot manifest is immutable; create a new pilotVersion to change scope.");
    }
    return {
      manifestId: existing.id,
      pilotId: existing.pilotId,
      sourceManifestHash: existing.sourceManifestHash,
      approvalStatus: existing.approvalStatus,
      medicationCountExpected: existing.medicationCountExpected,
      clinicalActivationAllowed: existing.clinicalActivationAllowed,
    };
  }

  const created = await prisma.medicationPilotManifest.create({
    data: {
      id: randomUUID(),
      pilotId: payload.pilotId,
      pilotName: payload.pilotName,
      pilotVersion: payload.pilotVersion,
      scope: payload.scope,
      clinicalDomain: payload.clinicalDomain,
      createdByUserId: actor.userId,
      approvalStatus: "DRAFT",
      medicationCountExpected: payload.medicationCountExpected,
      sourceManifestHash: payload.sourceManifestHash,
      dataClassification: payload.dataClassification,
      pilotStatus: "DRAFT",
      clinicalActivationAllowed: false,
      rollbackAllowed: true,
      notes: payload.notes,
    },
  });

  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "PILOT_CREATED",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationAdmin",
      rationaleNotes: `Created pilot ${created.pilotId}`,
      evidenceJson: {
        pilotId: created.pilotId,
        sourceManifestHash: created.sourceManifestHash,
        medicationCountExpected: created.medicationCountExpected,
      },
    },
  });

  return {
    manifestId: created.id,
    pilotId: created.pilotId,
    sourceManifestHash: created.sourceManifestHash,
    approvalStatus: created.approvalStatus,
    medicationCountExpected: created.medicationCountExpected,
    clinicalActivationAllowed: created.clinicalActivationAllowed,
  };
}

export async function approvePilotManifest(
  prisma: PrismaClient,
  actor: PilotActor
): Promise<{ ok: true; approvalStatus: string }> {
  requireMedicationAdmin(actor, "approve pilot manifests");
  const registered = await registerOrLoadPilotManifest(prisma, actor);
  const updated = await prisma.medicationPilotManifest.update({
    where: { id: registered.manifestId },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedByUserId: actor.userId,
      pilotStatus: "VALIDATED",
    },
  });
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "PILOT_APPROVED",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationAdmin",
      rationaleNotes: `Approved pilot ${updated.pilotId}`,
      evidenceJson: { sourceManifestHash: updated.sourceManifestHash },
    },
  });
  return { ok: true, approvalStatus: updated.approvalStatus };
}

export async function validatePilot(
  prisma: PrismaClient,
  actor: PilotActor
): Promise<{
  ok: boolean;
  sourceManifestHash: string;
  medicationCountExpected: number;
  clinicalActivationAllowed: false;
  automaticVerificationEnabled: false;
  licensingAcknowledged: true;
}> {
  requirePilotOperator(actor);
  const registered = await registerOrLoadPilotManifest(prisma, actor);
  assertPilotClinicalActivationDisabled(registered.clinicalActivationAllowed);
  if (EM_PILOT_DATASET_ROWS.length < 75 || EM_PILOT_DATASET_ROWS.length > 125) {
    throw new Error("Pilot dataset size must be approximately 75–125 medications.");
  }
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "PILOT_VALIDATED",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationReviewer",
      rationaleNotes: "Pilot validation completed",
      evidenceJson: { sourceManifestHash: registered.sourceManifestHash },
    },
  });
  return {
    ok: true,
    sourceManifestHash: registered.sourceManifestHash,
    medicationCountExpected: registered.medicationCountExpected,
    clinicalActivationAllowed: false,
    automaticVerificationEnabled: false,
    licensingAcknowledged: true,
  };
}

export type PilotPreviewReport = {
  totalSourceRows: number;
  validRows: number;
  invalidRows: number;
  exactDuplicates: number;
  normalizedDuplicates: number;
  probableDuplicates: number;
  possibleDuplicates: number;
  packageDuplicates: number;
  sourceDuplicates: number;
  newConceptsProposed: number;
  newProductsProposed: number;
  newPackagesProposed: number;
  existingEntitiesReused: number;
  candidateMappingsProposed: number;
  ambiguousRecords: number;
  blockedRecords: number;
  classifications: Record<string, number>;
};

async function runDedupeEngine(
  prisma: PrismaClient,
  persist: boolean,
  actor: PilotActor
): Promise<{
  assessments: Array<DuplicateAssessmentResult & { itemCode: string; productIdentityKey: string }>;
  preview: PilotPreviewReport;
  manifestId: string;
}> {
  requirePilotOperator(actor);
  const registered = await registerOrLoadPilotManifest(prisma, actor);
  const payload = buildEmPilotManifestPayload();

  const existingConcepts = await prisma.medicationConcept.findMany({
    where: { isActive: true },
    select: { id: true, code: true, genericName: true, identityKey: true },
    take: 5000,
  });
  const conceptByKey = new Map(
    existingConcepts
      .filter((c) => c.identityKey)
      .map((c) => [c.identityKey!, c])
  );
  const conceptByGeneric = new Map(
    existingConcepts.map((c) => [c.genericName.trim().toLowerCase(), c])
  );

  const existingProducts = await prisma.medicationProduct.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      identityKey: true,
      strengthDisplay: true,
      dosageForm: true,
      concept: { select: { genericName: true, identityKey: true } },
    },
    take: 8000,
  });
  const productByKey = new Map(
    existingProducts.filter((p) => p.identityKey).map((p) => [p.identityKey!, p])
  );

  const withinPilotKeys = new Map<string, string>();
  const assessments: Array<
    DuplicateAssessmentResult & { itemCode: string; productIdentityKey: string }
  > = [];

  for (const row of payload.items) {
    const keys = rowIdentity(row);
    let matched:
      | {
          entityId: string;
          entityType: string;
          genericName: string;
          strengthDisplay?: string;
          dosageForm?: string;
          route?: string;
        }
      | null = null;

    const priorItemCode = withinPilotKeys.get(keys.productIdentityKey);
    if (priorItemCode) {
      const assessment = assessMedicationDuplicate({
        source: { ...keys.input, itemCode: row.itemCode },
        matched: {
          ...keys.input,
          entityId: priorItemCode,
          entityType: "PILOT_ITEM",
        },
        sameSourceRow: true,
      });
      assessments.push({
        ...assessment,
        itemCode: row.itemCode,
        productIdentityKey: keys.productIdentityKey,
      });
      continue;
    }
    withinPilotKeys.set(keys.productIdentityKey, row.itemCode);

    const productHit = productByKey.get(keys.productIdentityKey);
    if (productHit) {
      matched = {
        entityId: productHit.id,
        entityType: "MEDICATION_PRODUCT",
        genericName: productHit.concept.genericName,
        strengthDisplay: productHit.strengthDisplay,
        dosageForm: productHit.dosageForm,
        route: row.route,
      };
    } else {
      const conceptHit =
        conceptByKey.get(keys.conceptIdentityKey) ||
        conceptByGeneric.get(row.genericName.trim().toLowerCase());
      if (conceptHit) {
        matched = {
          entityId: conceptHit.id,
          entityType: "MEDICATION_CONCEPT",
          genericName: conceptHit.genericName,
        };
      }
    }

    const assessment = assessMedicationDuplicate({
      source: { ...keys.input, itemCode: row.itemCode },
      matched: matched
        ? {
            genericName: matched.genericName,
            strengthDisplay: matched.strengthDisplay,
            dosageForm: matched.dosageForm,
            route: matched.route ?? row.route,
            entityId: matched.entityId,
            entityType: matched.entityType,
          }
        : null,
    });
    assessments.push({
      ...assessment,
      itemCode: row.itemCode,
      productIdentityKey: keys.productIdentityKey,
    });
  }

  const classifications: Record<string, number> = {};
  for (const a of assessments) {
    classifications[a.duplicateClassification] =
      (classifications[a.duplicateClassification] ?? 0) + 1;
  }

  const preview: PilotPreviewReport = {
    totalSourceRows: payload.items.length,
    validRows: payload.items.length,
    invalidRows: 0,
    exactDuplicates: classifications.EXACT_DUPLICATE ?? 0,
    normalizedDuplicates: classifications.NORMALIZED_DUPLICATE ?? 0,
    probableDuplicates: classifications.PROBABLE_DUPLICATE ?? 0,
    possibleDuplicates: classifications.POSSIBLE_DUPLICATE ?? 0,
    packageDuplicates: classifications.PACKAGE_DUPLICATE ?? 0,
    sourceDuplicates: classifications.SOURCE_DUPLICATE ?? 0,
    newConceptsProposed: assessments.filter((a) =>
      a.recommendedAction === "CREATE_NEW_CONCEPT"
    ).length,
    newProductsProposed: assessments.filter((a) =>
      a.recommendedAction === "CREATE_NEW_PRODUCT"
    ).length,
    newPackagesProposed: assessments.filter((a) =>
      a.recommendedAction === "CREATE_NEW_PACKAGE"
    ).length,
    existingEntitiesReused: assessments.filter((a) =>
      a.recommendedAction.startsWith("REUSE_")
    ).length,
    candidateMappingsProposed: 0,
    ambiguousRecords:
      (classifications.PROBABLE_DUPLICATE ?? 0) + (classifications.POSSIBLE_DUPLICATE ?? 0),
    blockedRecords: assessments.filter((a) => a.recommendedAction === "BLOCK_FOR_REVIEW").length,
    classifications,
  };

  if (persist) {
    await prisma.$transaction(async (tx) => {
      await tx.medicationDuplicateAssessment.deleteMany({
        where: { manifestId: registered.manifestId, resolutionStatus: "OPEN" },
      });
      for (const a of assessments) {
        await tx.medicationDuplicateAssessment.create({
          data: {
            id: randomUUID(),
            pilotId: registered.pilotId,
            manifestId: registered.manifestId,
            sourceEntityType: "PILOT_ITEM",
            sourceEntityId: a.itemCode,
            matchedEntityType: a.matchedEntityType,
            matchedEntityId: a.matchedEntityId,
            classification: a.duplicateClassification,
            confidenceScore: a.confidenceScore,
            normalizedIdentityKey: a.productIdentityKey,
            matchedIdentityKey: a.matchedEntityId
              ? a.productIdentityKey
              : null,
            evidenceJson: a.evidence as Prisma.InputJsonValue,
            recommendedAction: a.recommendedAction,
            resolutionStatus: "OPEN",
          },
        });
        await tx.rxNormReviewAuditEvent.create({
          data: {
            id: randomUUID(),
            action: "DUPLICATE_DETECTED",
            actorUserId: actor.userId,
            actorRoleLabel: "MedicationReviewer",
            rationaleNotes: `${a.itemCode}: ${a.duplicateClassification}`,
            evidenceJson: {
              classification: a.duplicateClassification,
              recommendedAction: a.recommendedAction,
            },
          },
        });
      }
    });
  }

  return { assessments, preview, manifestId: registered.manifestId };
}

export async function dedupePilot(prisma: PrismaClient, actor: PilotActor) {
  return runDedupeEngine(prisma, true, actor);
}

export async function previewPilot(prisma: PrismaClient, actor: PilotActor) {
  const { preview, manifestId } = await runDedupeEngine(prisma, false, actor);
  return { ...preview, manifestId, clinicalActivations: 0 as const };
}

export async function stagePilot(
  prisma: PrismaClient,
  actor: PilotActor,
  opts: { confirmStage: boolean }
) {
  requireMedicationAdmin(actor, "authorize staging");
  if (!opts.confirmStage) throw new Error("stage requires --confirm-stage");

  const registered = await registerOrLoadPilotManifest(prisma, actor);
  if (registered.approvalStatus !== "APPROVED") {
    throw new Error("Unapproved pilot cannot stage.");
  }
  assertPilotClinicalActivationDisabled(registered.clinicalActivationAllowed);

  const { assessments, preview, manifestId } = await runDedupeEngine(prisma, true, actor);
  const blockingClassifications = assessments.map(
    (a) => a.duplicateClassification as MedicationDuplicateClassification
  );
  if (unresolvedExactDuplicatesBlockStaging(blockingClassifications)) {
    throw new Error("Unresolved exact/source/mapping duplicates block staging.");
  }

  const payload = buildEmPilotManifestPayload();
  if (payload.sourceManifestHash !== registered.sourceManifestHash) {
    throw new Error("Manifest hash mismatch blocks staging/resume.");
  }

  const existingJob = await prisma.medicationPilotImportJob.findUnique({
    where: {
      manifestId_manifestHash_mode: {
        manifestId,
        manifestHash: registered.sourceManifestHash,
        mode: "STAGE",
      },
    },
  });
  if (existingJob && existingJob.status === "SUCCEEDED" && !existingJob.resumeAllowed) {
    throw new Error("Duplicate pilot import job for this manifest hash (use resume mode).");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.medicationPilotItem.deleteMany({ where: { manifestId } });
    let staged = 0;
    for (const row of payload.items) {
      const keys = rowIdentity(row);
      const assessment = assessments.find((a) => a.itemCode === row.itemCode);
      await tx.medicationPilotItem.create({
        data: {
          id: randomUUID(),
          manifestId,
          itemCode: row.itemCode,
          genericName: row.genericName,
          brandName: row.brandName,
          strengthDisplay: row.strengthDisplay,
          concentrationText: row.concentrationText,
          dosageForm: row.dosageForm,
          route: row.route,
          releaseType: row.releaseType,
          packageQuantity: row.packageQuantity,
          packageUnit: row.packageUnit,
          containerType: row.containerType,
          singleOrMultiDose: row.singleOrMultiDose,
          category: row.category,
          conceptIdentityKey: keys.conceptIdentityKey,
          productIdentityKey: keys.productIdentityKey,
          packageIdentityKey: keys.packageIdentityKey,
          lifecycleStatus: "PILOT_STAGED",
          reuseDecision: assessment?.recommendedAction ?? "CREATE_NEW_PRODUCT",
          matchedConceptId:
            assessment?.matchedEntityType === "MEDICATION_CONCEPT"
              ? assessment.matchedEntityId
              : null,
          matchedProductId:
            assessment?.matchedEntityType === "MEDICATION_PRODUCT"
              ? assessment.matchedEntityId
              : null,
          sourcePayloadJson: row as unknown as Prisma.InputJsonValue,
        },
      });
      staged += 1;
    }

    await tx.medicationPilotManifest.update({
      where: { id: manifestId },
      data: { pilotStatus: "STAGED" },
    });

    await tx.medicationPilotImportJob.upsert({
      where: {
        manifestId_manifestHash_mode: {
          manifestId,
          manifestHash: registered.sourceManifestHash,
          mode: "STAGE",
        },
      },
      create: {
        id: randomUUID(),
        manifestId,
        mode: "STAGE",
        status: "SUCCEEDED",
        manifestHash: registered.sourceManifestHash,
        startedByUserId: actor.userId,
        completedAt: new Date(),
        summaryJson: { staged, preview },
      },
      update: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        summaryJson: { staged, preview },
      },
    });

    await tx.rxNormReviewAuditEvent.create({
      data: {
        id: randomUUID(),
        action: "PILOT_STAGED",
        actorUserId: actor.userId,
        actorRoleLabel: "MedicationAdmin",
        rationaleNotes: `Staged ${staged} pilot items`,
        evidenceJson: { staged, clinicalActivations: 0 },
      },
    });

    return { staged, preview };
  });

  return {
    ok: true,
    staged: result.staged,
    preview: result.preview,
    clinicalActivations: 0 as const,
    autoVerified: false as const,
  };
}

export async function generatePilotCandidates(
  prisma: PrismaClient,
  actor: PilotActor
): Promise<{
  ok: true;
  candidatesProposed: number;
  autoVerified: false;
  requiresHumanReview: true;
  clinicalActivationAllowed: false;
}> {
  requirePilotOperator(actor);
  assertNoBulkRealMappingApproval("BULK_APPROVE");
  const registered = await registerOrLoadPilotManifest(prisma, actor);
  const items = await prisma.medicationPilotItem.count({
    where: { manifestId: registered.manifestId },
  });
  if (items === 0) {
    throw new Error("No staged pilot items; run stage before candidates.");
  }

  // Phase 6.5 prepares candidate intent only — does not create verified mappings.
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "CANDIDATES_CREATED",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationReviewer",
      rationaleNotes: `Pilot candidate preparation for ${items} staged items (autoVerified=false)`,
      evidenceJson: {
        stagedItems: items,
        autoVerified: false,
        requiresHumanReview: true,
        clinicalActivationAllowed: false,
        note: "Candidates remain in Phase 4 human verification lifecycle; no verified mappings created here.",
      },
    },
  });

  return {
    ok: true,
    candidatesProposed: items,
    autoVerified: false,
    requiresHumanReview: true,
    clinicalActivationAllowed: false,
  };
}

export async function rollbackPilot(
  prisma: PrismaClient,
  actor: PilotActor,
  opts: { confirmRollback: boolean }
) {
  requireMedicationAdmin(actor, "authorize rollback");
  if (!opts.confirmRollback) throw new Error("rollback requires --confirm-rollback");

  const registered = await registerOrLoadPilotManifest(prisma, actor);
  const manifest = await prisma.medicationPilotManifest.findUniqueOrThrow({
    where: { id: registered.manifestId },
  });
  if (!manifest.rollbackAllowed) {
    throw new Error("Rollback not allowed for this pilot.");
  }

  const verifiedDeps = await prisma.rxNormVerifiedMapping.count({
    where: {
      isActive: true,
      isSynthetic: false,
      dataClassification: "CONTROLLED_REAL_PILOT",
    },
  });
  if (verifiedDeps > 0) {
    throw new Error(
      "Rollback refused: dependent verified mappings exist. Supply retirement/supersession plan first."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.medicationDuplicateAssessment.deleteMany({
      where: { manifestId: registered.manifestId },
    });
    await tx.medicationPilotItem.deleteMany({ where: { manifestId: registered.manifestId } });
    await tx.medicationPilotImportJob.deleteMany({ where: { manifestId: registered.manifestId } });
    await tx.medicationPilotManifest.update({
      where: { id: registered.manifestId },
      data: { pilotStatus: "ROLLED_BACK", approvalStatus: "DRAFT" },
    });
    await tx.rxNormReviewAuditEvent.create({
      data: {
        id: randomUUID(),
        action: "PILOT_ROLLED_BACK",
        actorUserId: actor.userId,
        actorRoleLabel: "MedicationAdmin",
        rationaleNotes: "Pilot staging rolled back",
        evidenceJson: { clinicalActivations: 0 },
      },
    });
  });

  return { ok: true, clinicalActivations: 0 as const };
}

export async function resolvePilotDuplicateAssessment(
  prisma: PrismaClient,
  actor: PilotActor,
  input: {
    assessmentId: string;
    action:
      | "LINK_TO_EXISTING"
      | "APPROVE_NEW_RECORD"
      | "CONFIRM_DISTINCT"
      | "REJECT_DUPLICATE"
      | "DEFER"
      | "REQUEST_CLARIFICATION";
    rationale: string;
  }
): Promise<{ ok: true; resolutionStatus: string }> {
  requirePilotOperator(actor);
  if (!input.rationale.trim()) {
    throw new Error("Duplicate resolution requires rationale.");
  }
  if (
    (input.action === "APPROVE_NEW_RECORD" || input.action === "LINK_TO_EXISTING") &&
    !actor.roles.includes("MEDICATION_ADMIN") &&
    !actor.roles.includes("MEDORA_SUPER_ADMIN")
  ) {
    throw new Error("Only MEDICATION_ADMIN may approve new canonical records or link merges.");
  }

  const statusByAction: Record<string, string> = {
    LINK_TO_EXISTING: "LINKED_TO_EXISTING",
    APPROVE_NEW_RECORD: "NEW_RECORD_APPROVED",
    CONFIRM_DISTINCT: "CONFIRMED_DISTINCT",
    REJECT_DUPLICATE: "REJECTED",
    DEFER: "DEFERRED",
    REQUEST_CLARIFICATION: "OPEN",
  };
  const resolutionStatus = statusByAction[input.action];
  if (!resolutionStatus) throw new Error(`Unsupported action ${input.action}`);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.medicationDuplicateAssessment.findUnique({
      where: { id: input.assessmentId },
    });
    if (!row) throw new Error("Duplicate assessment not found.");
    const next = await tx.medicationDuplicateAssessment.update({
      where: { id: input.assessmentId },
      data: {
        resolutionStatus,
        resolvedByUserId: actor.userId,
        resolvedAt: new Date(),
        resolutionRationale: input.rationale.trim(),
      },
    });
    await tx.rxNormReviewAuditEvent.create({
      data: {
        id: randomUUID(),
        action:
          input.action === "CONFIRM_DISTINCT"
            ? "DUPLICATE_DISMISSED"
            : input.action === "REJECT_DUPLICATE"
              ? "DUPLICATE_CONFIRMED"
              : input.action === "LINK_TO_EXISTING"
                ? "EXISTING_ENTITY_REUSED"
                : "NEW_ENTITY_PROPOSED",
        actorUserId: actor.userId,
        actorRoleLabel: actor.roles.includes("MEDICATION_ADMIN")
          ? "MedicationAdmin"
          : "MedicationReviewer",
        rationaleNotes: input.rationale.trim(),
        evidenceJson: {
          assessmentId: input.assessmentId,
          action: input.action,
          before: row.resolutionStatus,
          after: resolutionStatus,
        },
      },
    });
    return next;
  });

  return { ok: true, resolutionStatus: updated.resolutionStatus };
}

export async function getPilotDuplicateMetrics(prisma: PrismaClient) {
  const [manifest, stagedItems, assessments, openAssessments] = await Promise.all([
    prisma.medicationPilotManifest.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    prisma.medicationPilotItem.count(),
    prisma.medicationDuplicateAssessment.groupBy({
      by: ["classification"],
      _count: { _all: true },
    }),
    prisma.medicationDuplicateAssessment.count({ where: { resolutionStatus: "OPEN" } }),
  ]);
  const byClass = Object.fromEntries(
    assessments.map((a) => [a.classification, a._count._all])
  );
  const resolved = await prisma.medicationDuplicateAssessment.count({
    where: { resolutionStatus: { not: "OPEN" } },
  });
  const totalAssessments = openAssessments + resolved;
  return {
    pilotId: manifest?.pilotId ?? null,
    pilotStatus: manifest?.pilotStatus ?? null,
    approvalStatus: manifest?.approvalStatus ?? null,
    pilotSourceRows: manifest?.medicationCountExpected ?? 0,
    stagedItems,
    exactDuplicates: byClass.EXACT_DUPLICATE ?? 0,
    normalizedDuplicates: byClass.NORMALIZED_DUPLICATE ?? 0,
    probableDuplicates: byClass.PROBABLE_DUPLICATE ?? 0,
    possibleDuplicates: byClass.POSSIBLE_DUPLICATE ?? 0,
    openDuplicateAssessments: openAssessments,
    duplicateResolutionRate:
      totalAssessments > 0 ? resolved / totalAssessments : null,
    clinicalActivations: 0 as const,
    clinicalActivationAllowed: false as const,
    automaticVerificationEnabled: false as const,
  };
}

export async function getPilotReport(prisma: PrismaClient, actor: PilotActor) {
  requirePilotOperator(actor);
  const registered = await registerOrLoadPilotManifest(prisma, actor);
  const [items, openDupes, resolvedDupes, auditCount] = await Promise.all([
    prisma.medicationPilotItem.count({ where: { manifestId: registered.manifestId } }),
    prisma.medicationDuplicateAssessment.count({
      where: { manifestId: registered.manifestId, resolutionStatus: "OPEN" },
    }),
    prisma.medicationDuplicateAssessment.count({
      where: {
        manifestId: registered.manifestId,
        resolutionStatus: { not: "OPEN" },
      },
    }),
    prisma.rxNormReviewAuditEvent.count({
      where: {
        action: {
          in: [
            "PILOT_CREATED",
            "PILOT_APPROVED",
            "PILOT_VALIDATED",
            "DUPLICATE_DETECTED",
            "PILOT_STAGED",
            "CANDIDATES_CREATED",
            "PILOT_ROLLED_BACK",
          ],
        },
      },
    }),
  ]);
  const preview = await previewPilot(prisma, actor);
  return {
    ...registered,
    stagedItems: items,
    openDuplicateAssessments: openDupes,
    resolvedDuplicateAssessments: resolvedDupes,
    pilotAuditEvents: auditCount,
    preview,
    clinicalActivations: 0,
    automaticVerificationEnabled: false,
    bulkRealMappingApprovalEnabled: false,
  };
}
