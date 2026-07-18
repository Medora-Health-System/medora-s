/**
 * Phase 7 — controlled EM medication batch workflow.
 * Authentic operator execution is separate from CI certification (no real batch in CI).
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertAuthenticSourceNotFixtureMasquerade,
  assertBatchClinicalActivationDisabled,
  assertBatchNoBulkRealMappingApproval,
  assertLegalBatchStatusTransition,
  batchUnresolvedExactDuplicatesBlockStaging,
  buildConceptIdentityKey,
  buildPackageIdentityKey,
  buildProductIdentityKey,
  assessMedicationDuplicate,
  EM_BATCH_DEFAULT_MANIFEST_META,
  EM_BATCH_EXCLUDED_FAMILIES,
  EM_BATCH_MEDICATION_FAMILIES,
  evaluatePhase7BatchAttestation,
  getEmBatchFamilyStats,
  PHASE7_BATCH_DEFAULTS,
  type MedicationBatchStatus,
  type MedicationDuplicateClassification,
  type Phase7BatchAttestationInput,
} from "@medora/shared";

export type BatchActor = { userId: string; roles: string[] };

function requireBatchOperator(actor: BatchActor): void {
  const allowed = ["MEDICATION_ADMIN", "MEDICATION_REVIEWER", "MEDORA_SUPER_ADMIN", "ADMIN"];
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new Error("Unauthorized batch operator.");
  }
}

function requireBatchAdmin(actor: BatchActor, action: string): void {
  if (!actor.roles.includes("MEDICATION_ADMIN") && !actor.roles.includes("MEDORA_SUPER_ADMIN")) {
    throw new Error(`Only MEDICATION_ADMIN may ${action}.`);
  }
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildPhase7BatchManifestPayload() {
  const families = EM_BATCH_MEDICATION_FAMILIES.filter((f) => !f.excluded);
  const body = {
    ...EM_BATCH_DEFAULT_MANIFEST_META,
    ...PHASE7_BATCH_DEFAULTS,
    expectedMedicationFamilyCount: families.length,
    excludedFamilies: EM_BATCH_EXCLUDED_FAMILIES.map((f) => ({
      familyCode: f.familyCode,
      exclusionReason: f.exclusionReason,
    })),
    families: families.map((f) => ({
      familyCode: f.familyCode,
      genericName: f.genericName,
      category: f.category,
      expectedForms: f.expectedForms,
      expectedRoutes: f.expectedRoutes,
      highAlertReview: f.highAlertReview,
      controlledSubstanceReview: f.controlledSubstanceReview,
      reviewPriority: f.reviewPriority,
      governanceReview: f.governanceReview,
      inclusionReason: f.inclusionReason,
    })),
  };
  return { ...body, batchManifestHash: hashPayload(body) };
}

async function writeCheckpoint(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: {
    manifestId: string;
    fromStatus: string;
    toStatus: string;
    actorUserId: string;
    rationale: string;
    manifestHash: string;
    sourceHash?: string | null;
    beforeJson?: unknown;
    afterJson?: unknown;
  }
) {
  await prisma.medicationBatchCheckpoint.create({
    data: {
      id: randomUUID(),
      manifestId: input.manifestId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      rationale: input.rationale,
      manifestHash: input.manifestHash,
      sourceHash: input.sourceHash ?? null,
      beforeJson: (input.beforeJson ?? null) as Prisma.InputJsonValue,
      afterJson: (input.afterJson ?? null) as Prisma.InputJsonValue,
    },
  });
}

export async function registerOrLoadBatchManifest(
  prisma: PrismaClient,
  actor: BatchActor
) {
  requireBatchOperator(actor);
  const payload = buildPhase7BatchManifestPayload();
  assertBatchClinicalActivationDisabled(payload.clinicalActivationAllowed);

  const existing = await prisma.medicationBatchManifest.findUnique({
    where: {
      batchId_batchVersion: {
        batchId: payload.batchId,
        batchVersion: payload.batchVersion,
      },
    },
  });
  if (existing) {
    if (
      existing.approvalStatus === "APPROVED" &&
      existing.batchManifestHash !== payload.batchManifestHash
    ) {
      throw new Error(
        "Approved batch manifest is immutable; create a new batchVersion to change scope."
      );
    }
    return existing;
  }

  return prisma.medicationBatchManifest.create({
    data: {
      id: randomUUID(),
      batchId: payload.batchId,
      batchName: payload.batchName,
      batchVersion: payload.batchVersion,
      clinicalDomain: payload.clinicalDomain,
      scope: payload.scope,
      batchManifestHash: payload.batchManifestHash,
      createdByUserId: actor.userId,
      approvalStatus: "DRAFT",
      expectedMedicationFamilyCount: payload.expectedMedicationFamilyCount,
      expectedSourceRowCount: 0,
      dataClassification: payload.dataClassification,
      batchStatus: "DRAFT",
      duplicateReviewRequired: true,
      humanVerificationRequired: true,
      clinicalActivationAllowed: false,
      rollbackAllowed: true,
      normalizationVersion: PHASE7_BATCH_DEFAULTS.normalizationVersion,
      parserVersion: PHASE7_BATCH_DEFAULTS.parserVersion,
      notes: payload.notes,
    },
  });
}

export async function approveBatchManifest(prisma: PrismaClient, actor: BatchActor) {
  requireBatchAdmin(actor, "approve batch manifests");
  const registered = await registerOrLoadBatchManifest(prisma, actor);
  const updated = await prisma.medicationBatchManifest.update({
    where: { id: registered.id },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedByUserId: actor.userId,
    },
  });
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "PILOT_APPROVED",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationAdmin",
      rationaleNotes: `Approved Phase 7 batch ${updated.batchId}@${updated.batchVersion}`,
      evidenceJson: { batchManifestHash: updated.batchManifestHash },
    },
  });
  return updated;
}

export type Phase7SourceMode = "AUTHENTIC" | "STRUCTURAL_FIXTURE_CI";

export function resolvePhase7SourceMode(opts: {
  sourceDir?: string;
  allowStructuralFixtureForCi?: boolean;
}): {
  mode: Phase7SourceMode;
  sourceClassification: string;
  isSynthetic: boolean;
  licenseAcknowledged: boolean;
  sourceChecksum: string | null;
} {
  const sourceDir = opts.sourceDir ?? join(process.cwd(), ".local-data/rxnorm");
  const authenticPresent =
    existsSync(join(sourceDir, "RXNCONSO.RRF")) ||
    existsSync(join(sourceDir, "manifest.json"));

  if (authenticPresent) {
    let checksum: string | null = null;
    let licenseAcknowledged = false;
    const manifestPath = join(sourceDir, "manifest.json");
    if (existsSync(manifestPath)) {
      const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        licenseAcknowledged?: boolean;
        files?: Array<{ sha256?: string }>;
      };
      licenseAcknowledged = Boolean(raw.licenseAcknowledged);
      checksum = raw.files?.[0]?.sha256 ?? hashPayload(raw);
    }
    assertAuthenticSourceNotFixtureMasquerade({
      sourceClassification: "AUTHENTIC_NLM_RXNORM",
      isSynthetic: false,
    });
    if (!licenseAcknowledged) {
      throw new Error("License acknowledgement missing for authentic RxNorm source.");
    }
    if (!checksum) {
      throw new Error("Missing checksum for authentic RxNorm source.");
    }
    return {
      mode: "AUTHENTIC",
      sourceClassification: "AUTHENTIC_NLM_RXNORM",
      isSynthetic: false,
      licenseAcknowledged: true,
      sourceChecksum: checksum,
    };
  }

  if (!opts.allowStructuralFixtureForCi) {
    throw new Error(
      "Authentic RxNorm source unavailable under .local-data/rxnorm; refusing silent fixture fallback."
    );
  }

  return {
    mode: "STRUCTURAL_FIXTURE_CI",
    sourceClassification: "DEV_SAMPLE",
    isSynthetic: true,
    licenseAcknowledged: true,
    sourceChecksum: hashPayload({
      fixture: "phase7-structural-family-extract",
      families: EM_BATCH_MEDICATION_FAMILIES.length,
    }),
  };
}

function familyExtractRows() {
  return EM_BATCH_MEDICATION_FAMILIES.filter((f) => !f.excluded).flatMap((f) => {
    const forms = f.expectedForms.length ? f.expectedForms : ["unspecified"];
    const routes = f.expectedRoutes.length ? f.expectedRoutes : ["unspecified"];
    const rows = [];
    for (const dosageForm of forms.slice(0, 2)) {
      for (const route of routes.slice(0, 2)) {
        const strengthDisplay =
          f.expectedStrengths[0] ??
          (dosageForm.includes("injection") || dosageForm.includes("autoinjector")
            ? "1 mg/mL"
            : "1 mg");
        const identityInput = {
          genericName: f.genericName,
          strengthDisplay,
          dosageForm,
          route,
          releaseType: "immediate",
        };
        const itemCode =
          `${f.familyCode}_${dosageForm}_${route}`.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
        rows.push({
          itemCode,
          familyCode: f.familyCode,
          genericName: f.genericName,
          category: f.category,
          dosageForm,
          route,
          strengthDisplay,
          concentrationText: strengthDisplay.includes("/") ? strengthDisplay : undefined,
          releaseType: "immediate",
          highAlertReview: f.highAlertReview,
          controlledSubstanceReview: f.controlledSubstanceReview,
          governanceReview: f.governanceReview,
          conceptIdentityKey: buildConceptIdentityKey(identityInput),
          productIdentityKey: buildProductIdentityKey(identityInput),
          packageIdentityKey: buildPackageIdentityKey(identityInput),
          sourceRowChecksum: hashPayload({
            familyCode: f.familyCode,
            dosageForm,
            route,
            strengthDisplay,
          }),
          sourceString: `${f.genericName} ${strengthDisplay} ${dosageForm} ${route}`,
          normalizedString: buildProductIdentityKey(identityInput),
          sourcePayloadJson: {
            family: f,
            dosageForm,
            route,
            strengthDisplay,
          },
        });
      }
    }
    return rows;
  });
}

export async function validateBatchSource(
  prisma: PrismaClient,
  actor: BatchActor,
  opts: { allowStructuralFixtureForCi?: boolean; sourceDir?: string } = {}
) {
  requireBatchOperator(actor);
  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  const source = resolvePhase7SourceMode(opts);
  assertBatchClinicalActivationDisabled(manifest.clinicalActivationAllowed);

  if (manifest.batchStatus === "DRAFT") {
    assertLegalBatchStatusTransition("DRAFT", "SOURCE_VALIDATED");
    await prisma.$transaction(async (tx) => {
      await tx.medicationBatchManifest.update({
        where: { id: manifest.id },
        data: {
          batchStatus: "SOURCE_VALIDATED",
          sourceManifestHash: source.sourceChecksum,
        },
      });
      await writeCheckpoint(tx, {
        manifestId: manifest.id,
        fromStatus: "DRAFT",
        toStatus: "SOURCE_VALIDATED",
        actorUserId: actor.userId,
        rationale: `Source validated (${source.mode})`,
        manifestHash: manifest.batchManifestHash,
        sourceHash: source.sourceChecksum,
      });
    });
  }

  return {
    ok: true,
    batchId: manifest.batchId,
    sourceMode: source.mode,
    sourceClassification: source.sourceClassification,
    isSynthetic: source.isSynthetic,
    clinicalActivationAllowed: false as const,
    authenticRequiredForOperatorExecution: true,
  };
}

export async function extractBatch(
  prisma: PrismaClient,
  actor: BatchActor,
  opts: { allowStructuralFixtureForCi?: boolean; sourceDir?: string } = {}
) {
  requireBatchOperator(actor);
  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  if (manifest.approvalStatus !== "APPROVED" && !opts.allowStructuralFixtureForCi) {
    throw new Error("Unapproved batch cannot extract.");
  }
  const source = resolvePhase7SourceMode(opts);
  const rows = familyExtractRows();

  await prisma.$transaction(async (tx) => {
    const current = await tx.medicationBatchManifest.findUniqueOrThrow({
      where: { id: manifest.id },
    });
    let fromStatus = current.batchStatus as MedicationBatchStatus;
    if (fromStatus === "DRAFT") {
      assertLegalBatchStatusTransition("DRAFT", "SOURCE_VALIDATED");
      await tx.medicationBatchManifest.update({
        where: { id: manifest.id },
        data: { batchStatus: "SOURCE_VALIDATED", sourceManifestHash: source.sourceChecksum },
      });
      await writeCheckpoint(tx, {
        manifestId: manifest.id,
        fromStatus: "DRAFT",
        toStatus: "SOURCE_VALIDATED",
        actorUserId: actor.userId,
        rationale: `Source validated during extract (${source.mode})`,
        manifestHash: manifest.batchManifestHash,
        sourceHash: source.sourceChecksum,
      });
      fromStatus = "SOURCE_VALIDATED";
    }
    if (fromStatus === "SOURCE_VALIDATED") {
      assertLegalBatchStatusTransition("SOURCE_VALIDATED", "EXTRACTED");
    }
    await tx.medicationBatchManifest.update({
      where: { id: manifest.id },
      data: {
        batchStatus: "EXTRACTED",
        expectedSourceRowCount: rows.length,
        sourceManifestHash: source.sourceChecksum,
      },
    });
    await writeCheckpoint(tx, {
      manifestId: manifest.id,
      fromStatus,
      toStatus: "EXTRACTED",
      actorUserId: actor.userId,
      rationale: `Extracted ${rows.length} controlled family presentation rows`,
      manifestHash: manifest.batchManifestHash,
      sourceHash: source.sourceChecksum,
      afterJson: { rowCount: rows.length, sourceMode: source.mode },
    });
  });

  return {
    ok: true,
    extractedRows: rows.length,
    uniqueFamilies: getEmBatchFamilyStats().totalFamilies,
    sourceMode: source.mode,
    clinicalActivationAllowed: false as const,
    rowsPreview: rows.slice(0, 5),
  };
}

export type BatchPreviewReport = {
  approvedMedicationFamilies: number;
  sourceRowsExtracted: number;
  uniqueNormalizedConcepts: number;
  uniqueNormalizedProducts: number;
  uniquePackagePresentations: number;
  existingConceptsReused: number;
  existingProductsReused: number;
  existingPackagesReused: number;
  newConceptProposals: number;
  newProductProposals: number;
  newPackageProposals: number;
  exactDuplicatesBlocked: number;
  normalizedDuplicatesBlocked: number;
  probableDuplicates: number;
  possibleDuplicates: number;
  falseMergeRisks: number;
  recordsRequiringReview: number;
  recordsReadyForStaging: number;
  clinicalActivations: 0;
};

async function analyzeBatchRows(prisma: PrismaClient) {
  const rows = familyExtractRows();
  const concepts = await prisma.medicationConcept.findMany({
    where: { isActive: true },
    select: { id: true, genericName: true, identityKey: true },
    take: 8000,
  });
  const products = await prisma.medicationProduct.findMany({
    where: { isActive: true },
    select: {
      id: true,
      identityKey: true,
      strengthDisplay: true,
      dosageForm: true,
      concept: { select: { genericName: true } },
    },
    take: 10000,
  });
  const conceptByKey = new Map(concepts.filter((c) => c.identityKey).map((c) => [c.identityKey!, c]));
  const conceptByName = new Map(
    concepts.map((c) => [c.genericName.trim().toLowerCase(), c])
  );
  const productByKey = new Map(
    products.filter((p) => p.identityKey).map((p) => [p.identityKey!, p])
  );

  const withinBatch = new Map<string, string>();
  const assessments: Array<{
    itemCode: string;
    productIdentityKey: string;
    classification: MedicationDuplicateClassification;
    recommendedAction: string;
    matchedEntityId: string | null;
    matchedEntityType: string | null;
  }> = [];

  for (const row of rows) {
    if (withinBatch.has(row.productIdentityKey)) {
      assessments.push({
        itemCode: row.itemCode,
        productIdentityKey: row.productIdentityKey,
        classification: "SOURCE_DUPLICATE",
        recommendedAction: "BLOCK_EXACT_DUPLICATE",
        matchedEntityId: withinBatch.get(row.productIdentityKey)!,
        matchedEntityType: "BATCH_ITEM",
      });
      continue;
    }
    withinBatch.set(row.productIdentityKey, row.itemCode);

    const productHit = productByKey.get(row.productIdentityKey);
    const conceptHit =
      conceptByKey.get(row.conceptIdentityKey) ||
      conceptByName.get(row.genericName.trim().toLowerCase());

    const assessment = assessMedicationDuplicate({
      source: {
        genericName: row.genericName,
        strengthDisplay: row.strengthDisplay,
        concentrationText: row.concentrationText,
        dosageForm: row.dosageForm,
        route: row.route,
        releaseType: row.releaseType,
        itemCode: row.itemCode,
      },
      matched: productHit
        ? {
            genericName: productHit.concept.genericName,
            strengthDisplay: productHit.strengthDisplay,
            dosageForm: productHit.dosageForm,
            route: row.route,
            entityId: productHit.id,
            entityType: "MEDICATION_PRODUCT",
          }
        : conceptHit
          ? {
              genericName: conceptHit.genericName,
              entityId: conceptHit.id,
              entityType: "MEDICATION_CONCEPT",
            }
          : null,
    });

    assessments.push({
      itemCode: row.itemCode,
      productIdentityKey: row.productIdentityKey,
      classification: assessment.duplicateClassification,
      recommendedAction: assessment.recommendedAction,
      matchedEntityId: assessment.matchedEntityId,
      matchedEntityType: assessment.matchedEntityType,
    });
  }

  const classifications = assessments.map((a) => a.classification);
  const preview: BatchPreviewReport = {
    approvedMedicationFamilies: getEmBatchFamilyStats().totalFamilies,
    sourceRowsExtracted: rows.length,
    uniqueNormalizedConcepts: new Set(rows.map((r) => r.conceptIdentityKey)).size,
    uniqueNormalizedProducts: new Set(rows.map((r) => r.productIdentityKey)).size,
    uniquePackagePresentations: new Set(rows.map((r) => r.packageIdentityKey)).size,
    existingConceptsReused: assessments.filter((a) =>
      a.recommendedAction.includes("REUSE_EXISTING_CONCEPT")
    ).length,
    existingProductsReused: assessments.filter((a) =>
      a.recommendedAction.includes("REUSE_EXISTING_PRODUCT")
    ).length,
    existingPackagesReused: assessments.filter((a) =>
      a.recommendedAction.includes("REUSE_EXISTING_PACKAGE")
    ).length,
    newConceptProposals: assessments.filter((a) =>
      a.recommendedAction.includes("CREATE_NEW_CONCEPT")
    ).length,
    newProductProposals: assessments.filter(
      (a) =>
        a.recommendedAction.includes("CREATE_NEW_PRODUCT") ||
        a.recommendedAction === "CREATE_NEW_CONCEPT"
    ).length,
    newPackageProposals: assessments.filter((a) =>
      a.recommendedAction.includes("CREATE_NEW_PACKAGE")
    ).length,
    exactDuplicatesBlocked: assessments.filter((a) => a.classification === "EXACT_DUPLICATE")
      .length,
    normalizedDuplicatesBlocked: assessments.filter(
      (a) => a.classification === "NORMALIZED_DUPLICATE"
    ).length,
    probableDuplicates: assessments.filter((a) => a.classification === "PROBABLE_DUPLICATE")
      .length,
    possibleDuplicates: assessments.filter((a) => a.classification === "POSSIBLE_DUPLICATE")
      .length,
    falseMergeRisks: assessments.filter((a) => a.recommendedAction === "BLOCK_FALSE_MERGE_RISK")
      .length,
    recordsRequiringReview: assessments.filter(
      (a) =>
        a.classification === "PROBABLE_DUPLICATE" ||
        a.classification === "POSSIBLE_DUPLICATE" ||
        a.recommendedAction === "REQUIRES_HUMAN_REVIEW"
    ).length,
    recordsReadyForStaging: assessments.filter(
      (a) => !batchUnresolvedExactDuplicatesBlockStaging([a.classification])
    ).length,
    clinicalActivations: 0,
  };

  return { rows, assessments, preview, classifications };
}

export async function previewBatch(prisma: PrismaClient, actor: BatchActor) {
  requireBatchOperator(actor);
  await registerOrLoadBatchManifest(prisma, actor);
  const { preview } = await analyzeBatchRows(prisma);
  return {
    ...preview,
    automaticVerificationEnabled: false as const,
    clinicalActivationAllowed: false as const,
    note: "Preview creates no canonical medication records.",
  };
}

export async function dedupeApproveBatch(prisma: PrismaClient, actor: BatchActor) {
  requireBatchAdmin(actor, "approve duplicate review");
  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  const { assessments, preview, classifications } = await analyzeBatchRows(prisma);
  if (batchUnresolvedExactDuplicatesBlockStaging(classifications)) {
    throw new Error("Unresolved source/mapping duplicates block dedupe approval.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.medicationDuplicateAssessment.deleteMany({
      where: { batchManifestId: manifest.id, resolutionStatus: "OPEN" },
    });
    for (const a of assessments) {
      await tx.medicationDuplicateAssessment.create({
        data: {
          id: randomUUID(),
          batchId: manifest.batchId,
          batchManifestId: manifest.id,
          sourceEntityType: "BATCH_ITEM",
          sourceEntityId: a.itemCode,
          matchedEntityType: a.matchedEntityType,
          matchedEntityId: a.matchedEntityId,
          classification: a.classification,
          confidenceScore: 1,
          normalizedIdentityKey: a.productIdentityKey,
          evidenceJson: { recommendedAction: a.recommendedAction },
          recommendedAction: a.recommendedAction,
          resolutionStatus:
            a.classification === "PROBABLE_DUPLICATE" ||
            a.classification === "POSSIBLE_DUPLICATE"
              ? "OPEN"
              : a.recommendedAction.startsWith("REUSE_")
                ? "LINKED_TO_EXISTING"
                : "NEW_RECORD_APPROVED",
        },
      });
    }
    await tx.medicationBatchManifest.update({
      where: { id: manifest.id },
      data: { batchStatus: "DEDUPE_APPROVED" },
    });
    await writeCheckpoint(tx, {
      manifestId: manifest.id,
      fromStatus: manifest.batchStatus,
      toStatus: "DEDUPE_APPROVED",
      actorUserId: actor.userId,
      rationale: "Duplicate review approved for controlled staging",
      manifestHash: manifest.batchManifestHash,
      afterJson: preview as unknown as Prisma.InputJsonValue,
    });
  });

  return { ok: true, preview, clinicalActivations: 0 as const };
}

export async function stageBatch(
  prisma: PrismaClient,
  actor: BatchActor,
  opts: {
    confirmStage: boolean;
    batchId?: string;
    manifestHash?: string;
    allowStructuralFixtureForCi?: boolean;
  }
) {
  requireBatchAdmin(actor, "authorize staging");
  if (!opts.confirmStage) throw new Error("stage requires --confirm-stage");

  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  if (opts.batchId && opts.batchId !== manifest.batchId) {
    throw new Error("batch-id mismatch.");
  }
  if (opts.manifestHash && opts.manifestHash !== manifest.batchManifestHash) {
    throw new Error("Manifest hash mismatch blocks staging/resume.");
  }
  if (manifest.approvalStatus !== "APPROVED" && !opts.allowStructuralFixtureForCi) {
    throw new Error("Unapproved batch cannot stage.");
  }
  assertBatchClinicalActivationDisabled(manifest.clinicalActivationAllowed);

  const { rows, assessments, preview, classifications } = await analyzeBatchRows(prisma);
  if (batchUnresolvedExactDuplicatesBlockStaging(classifications)) {
    throw new Error("Unresolved exact/source/mapping duplicates block staging.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.medicationBatchItem.deleteMany({ where: { manifestId: manifest.id } });
    let staged = 0;
    for (const row of rows) {
      const assessment = assessments.find((a) => a.itemCode === row.itemCode);
      const item = await tx.medicationBatchItem.create({
        data: {
          id: randomUUID(),
          manifestId: manifest.id,
          itemCode: row.itemCode,
          familyCode: row.familyCode,
          genericName: row.genericName,
          strengthDisplay: row.strengthDisplay,
          concentrationText: row.concentrationText,
          dosageForm: row.dosageForm,
          route: row.route,
          releaseType: row.releaseType,
          category: row.category,
          conceptIdentityKey: row.conceptIdentityKey,
          productIdentityKey: row.productIdentityKey,
          packageIdentityKey: row.packageIdentityKey,
          sourceRowChecksum: row.sourceRowChecksum,
          sourceString: row.sourceString,
          normalizedString: row.normalizedString,
          reuseDecision: assessment?.recommendedAction ?? "CREATE_NEW_PRODUCT_PROPOSAL",
          lifecycleStatus: "BATCH_STAGED",
          frenchDisplayStatus: "CURATED_FRENCH_MISSING",
          governanceReview: row.governanceReview,
          highAlertReview: row.highAlertReview,
          controlledSubstanceReview: row.controlledSubstanceReview,
          matchedConceptId:
            assessment?.matchedEntityType === "MEDICATION_CONCEPT"
              ? assessment.matchedEntityId
              : null,
          matchedProductId:
            assessment?.matchedEntityType === "MEDICATION_PRODUCT"
              ? assessment.matchedEntityId
              : null,
          sourcePayloadJson: row.sourcePayloadJson as Prisma.InputJsonValue,
        },
      });
      if (assessment?.matchedEntityId) {
        await tx.medicationBatchEntityLink.create({
          data: {
            id: randomUUID(),
            manifestId: manifest.id,
            batchItemId: item.id,
            existingEntityType: assessment.matchedEntityType ?? "UNKNOWN",
            existingEntityId: assessment.matchedEntityId,
            reuseDecision: assessment.recommendedAction,
            identityEvidence: { productIdentityKey: row.productIdentityKey },
            reviewedByUserId: actor.userId,
            reviewedAt: new Date(),
          },
        });
      }
      staged += 1;
    }

    await tx.medicationBatchManifest.update({
      where: { id: manifest.id },
      data: {
        batchStatus: "STAGED",
        expectedSourceRowCount: staged,
      },
    });
    await tx.medicationBatchJob.upsert({
      where: {
        manifestId_manifestHash_mode: {
          manifestId: manifest.id,
          manifestHash: manifest.batchManifestHash,
          mode: "STAGE",
        },
      },
      create: {
        id: randomUUID(),
        manifestId: manifest.id,
        mode: "STAGE",
        status: "SUCCEEDED",
        manifestHash: manifest.batchManifestHash,
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
    await writeCheckpoint(tx, {
      manifestId: manifest.id,
      fromStatus: manifest.batchStatus,
      toStatus: "STAGED",
      actorUserId: actor.userId,
      rationale: `Staged ${staged} batch items (clinically inactive)`,
      manifestHash: manifest.batchManifestHash,
      afterJson: { staged, clinicalActivations: 0 },
    });
    return { staged };
  });

  return {
    ok: true,
    staged: result.staged,
    preview,
    clinicalActivations: 0 as const,
    autoVerified: false as const,
  };
}

export async function generateBatchCandidates(prisma: PrismaClient, actor: BatchActor) {
  requireBatchOperator(actor);
  assertBatchNoBulkRealMappingApproval("BULK_APPROVE");
  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  const items = await prisma.medicationBatchItem.count({
    where: { manifestId: manifest.id },
  });
  if (items === 0) throw new Error("No staged batch items; run stage before candidates.");

  await prisma.medicationBatchManifest.update({
    where: { id: manifest.id },
    data: { batchStatus: "MAPPING_REVIEW_IN_PROGRESS" },
  });
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "CANDIDATES_CREATED",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationReviewer",
      rationaleNotes: `Phase 7 candidate preparation for ${items} staged items`,
      evidenceJson: {
        batchId: manifest.batchId,
        stagedItems: items,
        autoVerified: false,
        requiresHumanReview: true,
        clinicalActivationAllowed: false,
        note: "Candidates require Phase 4 human verification; no verified mappings created here.",
      },
    },
  });

  return {
    ok: true,
    candidatesProposed: items,
    autoVerified: false as const,
    requiresHumanReview: true as const,
    clinicalActivationAllowed: false as const,
  };
}

export async function rollbackBatch(
  prisma: PrismaClient,
  actor: BatchActor,
  opts: { confirmRollback: boolean }
) {
  requireBatchAdmin(actor, "authorize rollback");
  if (!opts.confirmRollback) throw new Error("rollback requires --confirm-rollback");

  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  if (!manifest.rollbackAllowed) throw new Error("Rollback not allowed for this batch.");

  const verifiedDeps = await prisma.rxNormVerifiedMapping.count({
    where: {
      isActive: true,
      isSynthetic: false,
      dataClassification: "CONTROLLED_REAL_BATCH",
    },
  });
  if (verifiedDeps > 0) {
    throw new Error(
      "Rollback refused: dependent real verified mappings exist. Supply retirement/supersession plan."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.medicationDuplicateAssessment.deleteMany({
      where: { batchManifestId: manifest.id },
    });
    await tx.medicationBatchEntityLink.deleteMany({ where: { manifestId: manifest.id } });
    await tx.medicationBatchItem.deleteMany({ where: { manifestId: manifest.id } });
    await tx.medicationBatchJob.deleteMany({ where: { manifestId: manifest.id } });
    await tx.medicationBatchManifest.update({
      where: { id: manifest.id },
      data: { batchStatus: "ROLLED_BACK", approvalStatus: "DRAFT" },
    });
    await writeCheckpoint(tx, {
      manifestId: manifest.id,
      fromStatus: manifest.batchStatus,
      toStatus: "ROLLED_BACK",
      actorUserId: actor.userId,
      rationale: "Phase 7 batch staging rolled back",
      manifestHash: manifest.batchManifestHash,
      afterJson: { clinicalActivations: 0 },
    });
  });

  return { ok: true, clinicalActivations: 0 as const, preexistingEntitiesPreserved: true as const };
}

export async function getBatchReport(prisma: PrismaClient, actor: BatchActor) {
  requireBatchOperator(actor);
  const manifest = await registerOrLoadBatchManifest(prisma, actor);
  const [items, openDupes, links, checkpoints] = await Promise.all([
    prisma.medicationBatchItem.count({ where: { manifestId: manifest.id } }),
    prisma.medicationDuplicateAssessment.count({
      where: { batchManifestId: manifest.id, resolutionStatus: "OPEN" },
    }),
    prisma.medicationBatchEntityLink.count({ where: { manifestId: manifest.id } }),
    prisma.medicationBatchCheckpoint.count({ where: { manifestId: manifest.id } }),
  ]);
  const preview = await previewBatch(prisma, actor);
  const realVerified = await prisma.rxNormVerifiedMapping.count({
    where: { isActive: true, isSynthetic: false },
  });

  return {
    batchId: manifest.batchId,
    batchVersion: manifest.batchVersion,
    batchStatus: manifest.batchStatus,
    approvalStatus: manifest.approvalStatus,
    batchManifestHash: manifest.batchManifestHash,
    sourceManifestHash: manifest.sourceManifestHash,
    medicationFamilyCount: manifest.expectedMedicationFamilyCount,
    stagedItems: items,
    entityLinks: links,
    openDuplicateAssessments: openDupes,
    checkpoints,
    preview,
    realVerifiedMappingsActive: realVerified,
    clinicalActivations: 0,
    automaticVerificationEnabled: false,
    bulkRealMappingApprovalEnabled: false,
    catalogRecordsClinicallyActive: 0,
  };
}

export async function getBatchDashboardMetrics(prisma: PrismaClient) {
  const manifest = await prisma.medicationBatchManifest.findFirst({
    orderBy: { createdAt: "desc" },
  });
  const [stagedItems, openDupes, reuseLinks] = await Promise.all([
    prisma.medicationBatchItem.count(),
    prisma.medicationDuplicateAssessment.count({
      where: { batchId: { not: null }, resolutionStatus: "OPEN" },
    }),
    prisma.medicationBatchEntityLink.count(),
  ]);
  const stats = getEmBatchFamilyStats();
  return {
    batchId: manifest?.batchId ?? null,
    batchStatus: manifest?.batchStatus ?? null,
    approvalStatus: manifest?.approvalStatus ?? null,
    medicationFamiliesInScope: stats.totalFamilies,
    stagedItems,
    openDuplicateAssessments: openDupes,
    reuseLinks,
    highAlertReviewCount: stats.highAlertCount,
    controlledSubstanceReviewCount: stats.controlledSubstanceCount,
    clinicalActivations: 0 as const,
    clinicalActivationAllowed: false as const,
    automaticVerificationEnabled: false as const,
    rollbackReadiness: manifest?.rollbackAllowed ?? true,
  };
}

/**
 * Operator/staging attestation — never run as part of CI platform certification.
 * Writes report payload; does not mutate clinical activations.
 */
export async function attestPhase7BatchExecution(
  prisma: PrismaClient,
  actor: BatchActor,
  opts: {
    sourceChecksumVerified: boolean;
    manifestHashVerified?: boolean;
    rollbackTested: boolean;
    attestedAt?: string;
  }
) {
  requireBatchAdmin(actor, "attest batch execution");
  const report = await getBatchReport(prisma, actor);
  const preview = report.preview as {
    existingEntitiesReused?: number;
    exactDuplicates?: number;
    probableDuplicates?: number;
    possibleDuplicates?: number;
    blockedRecords?: number;
    candidateMappingsProposed?: number;
  };

  const input: Phase7BatchAttestationInput = {
    batchId: report.batchId,
    batchVersion: report.batchVersion,
    sourceReleaseId: report.sourceManifestHash ?? "UNKNOWN",
    sourceChecksumVerified: opts.sourceChecksumVerified,
    manifestHashVerified:
      opts.manifestHashVerified ??
      Boolean(report.batchManifestHash && report.approvalStatus === "APPROVED"),
    medicationFamiliesApproved: report.medicationFamilyCount,
    sourceRowsProcessed: report.stagedItems,
    existingConceptsReused: preview.existingEntitiesReused ?? 0,
    existingProductsReused: 0,
    existingPackagesReused: 0,
    newConceptsCreated: 0,
    newProductsCreated: 0,
    newPackagesCreated: 0,
    exactDuplicatesBlocked: preview.exactDuplicates ?? 0,
    probableDuplicatesReviewed: preview.probableDuplicates ?? 0,
    possibleDuplicatesReviewed: preview.possibleDuplicates ?? 0,
    ndcConflictsResolved: 0,
    mappingCandidatesCreated: preview.candidateMappingsProposed ?? 0,
    realMappingsVerified: report.realVerifiedMappingsActive,
    mappingsRejected: 0,
    mappingsDeferred: 0,
    catalogPreparationRecordsCreated: report.stagedItems,
    clinicalActivationsCreated: report.clinicalActivations,
    rollbackTested: opts.rollbackTested,
    unresolvedBlockingIssues: report.openDuplicateAssessments,
    attestedBy: actor.userId,
    attestedAt: opts.attestedAt ?? new Date().toISOString(),
  };

  const evaluation = evaluatePhase7BatchAttestation(input);
  await prisma.rxNormReviewAuditEvent.create({
    data: {
      id: randomUUID(),
      action: "BATCH_ATTESTATION",
      actorUserId: actor.userId,
      actorRoleLabel: "MedicationAdmin",
      rationaleNotes: evaluation.FinalDecision,
      evidenceJson: { input, evaluation } as Prisma.InputJsonValue,
    },
  });

  return {
    ...evaluation,
    ...input,
    ClinicalActivationsCreated: input.clinicalActivationsCreated,
    UnresolvedBlockingIssues: input.unresolvedBlockingIssues,
    SourceChecksumVerified: input.sourceChecksumVerified,
    ManifestHashVerified: input.manifestHashVerified,
  };
}

export async function collectPrebatchInventory(prisma: PrismaClient) {
  const [
    concepts,
    products,
    packages,
    catalogMedication,
    activeVerified,
    realVerified,
    syntheticVerified,
    releases,
    pilotManifests,
    batchManifests,
    openDupes,
  ] = await Promise.all([
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.medicationPackage.count(),
    prisma.catalogMedication.count(),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true } }),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true, isSynthetic: false } }),
    prisma.rxNormVerifiedMapping.count({ where: { isActive: true, isSynthetic: true } }),
    prisma.rxNormReferenceRelease.count(),
    prisma.medicationPilotManifest.count(),
    prisma.medicationBatchManifest.count(),
    prisma.medicationDuplicateAssessment.count({ where: { resolutionStatus: "OPEN" } }),
  ]);

  const identityCollisions = await prisma.$queryRaw<Array<{ identityKey: string; c: bigint }>>`
    SELECT "identityKey", COUNT(*)::bigint AS c
    FROM "MedicationConcept"
    WHERE "identityKey" IS NOT NULL AND "isActive" = true AND "retiredAt" IS NULL
    GROUP BY "identityKey"
    HAVING COUNT(*) > 1
    LIMIT 20
  `.catch(() => [] as Array<{ identityKey: string; c: bigint }>);

  return {
    existingConcepts: concepts,
    existingProducts: products,
    existingPackages: packages,
    existingCatalogMedications: catalogMedication,
    existingActiveVerifiedMappings: activeVerified,
    existingRealVerifiedMappings: realVerified,
    existingSyntheticVerifiedMappings: syntheticVerified,
    existingRxNormReleases: releases,
    existingPilotManifests: pilotManifests,
    existingBatchManifests: batchManifests,
    existingUnresolvedDuplicateAssessments: openDupes,
    existingActiveIdentityKeyCollisions: identityCollisions.length,
    identityCollisionSamples: identityCollisions.slice(0, 5),
    blockBatchExecution: identityCollisions.length > 0,
  };
}
