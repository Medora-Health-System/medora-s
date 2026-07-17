import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, normalize, relative, resolve } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  assertRealSyntheticBoundary,
  buildRealReleaseIdentifier,
  generateRxNormMappingCandidates,
  normalizeRxNormDisplayTerm,
  REAL_IMPORT_MODE_VALUES,
  resolveIsSyntheticFromClassification,
  RXNORM_NORMALIZATION_VERSION,
  RXNORM_PARSING_VERSION,
  rxNormReleaseManifestSchema,
  stagingDataClassificationForSource,
  type RxNormMappingTarget,
  type RxNormRealImportMode,
  type RxNormReleaseManifest,
  validateRxNormReleaseManifest,
} from "@medora/shared";
import { parseRxnconsoRrf } from "./parse-rxnconso-rrf";
import { computeFileChecksumSha256 } from "./rxnorm-row-checksum";

export type RxNormRealImportRequest = {
  mode: RxNormRealImportMode;
  manifestPath: string;
  sourceDir: string;
  actor?: string;
  dryRun?: boolean;
  confirmRealSource?: boolean;
  confirmNonClinicalOnly?: boolean;
  confirmFullRelease?: boolean;
  confirmRollbackRealRelease?: boolean;
  startedByUserId?: string;
};

export type RxNormRealImportResult = {
  ok: boolean;
  mode: RxNormRealImportMode;
  releaseId?: string;
  releaseIdentifier?: string;
  importStatus?: string;
  manifestHashSha256?: string;
  rowsRead: number;
  rowsAccepted: number;
  rowsSkipped: number;
  malformedRows: number;
  candidateCount?: number;
  message?: string;
  errors: string[];
  warnings: string[];
};

const FORBIDDEN_MUTATION_MODELS = [
  "catalogMedication",
  "order",
  "orderItem",
  "medicationAdministration",
  "medicationBillingProfile",
  "facilityFormularyItem",
] as const;

const STAGING_BATCH_SIZE = 100;

export function assertNoClinicalRuntimeMutationsForRealImport(context: string): void {
  for (const model of FORBIDDEN_MUTATION_MODELS) {
    if (context.includes(`${model}.`)) {
      throw new Error(`Forbidden Phase 5 real import mutation target: ${model}`);
    }
  }
}

export function resolveSafeSourcePath(sourceDir: string, fileName: string): string {
  const normalizedDir = resolve(sourceDir);
  const baseName = basename(fileName.trim());
  if (!baseName || baseName !== fileName.trim() || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error(`Unsafe fileName (path traversal rejected): ${fileName}`);
  }
  const candidate = resolve(normalizedDir, baseName);
  const rel = relative(normalizedDir, candidate);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path traversal rejected for fileName: ${fileName}`);
  }
  return candidate;
}

function computeManifestHashSha256(manifest: RxNormReleaseManifest): string {
  return createHash("sha256")
    .update(JSON.stringify(manifest), "utf8")
    .digest("hex");
}

export function loadAndValidateManifest(manifestPath: string): {
  manifest: RxNormReleaseManifest;
  manifestHashSha256: string;
  errors: string[];
} {
  const raw = readFileSync(manifestPath, "utf8");
  const parsedJson = JSON.parse(raw) as unknown;
  const schemaResult = rxNormReleaseManifestSchema.safeParse(parsedJson);
  if (!schemaResult.success) {
    return {
      manifest: {} as RxNormReleaseManifest,
      manifestHashSha256: "",
      errors: schemaResult.error.issues.map(
        (issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`
      ),
    };
  }

  const manifest = schemaResult.data;
  const errors = validateRxNormReleaseManifest(manifest);
  const manifestHashSha256 = computeManifestHashSha256(manifest);
  return { manifest, manifestHashSha256, errors };
}

export function validateSourceFiles(
  manifest: RxNormReleaseManifest,
  sourceDir: string
): { ok: boolean; errors: string[]; fileManifest: Array<{ fileName: string; sha256: string; byteSize: number }> } {
  const errors: string[] = [];
  const fileManifest: Array<{ fileName: string; sha256: string; byteSize: number }> = [];

  for (const entry of manifest.files) {
    let filePath: string;
    try {
      filePath = resolveSafeSourcePath(sourceDir, entry.fileName);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    try {
      statSync(filePath);
    } catch {
      errors.push(`Missing source file: ${entry.fileName}`);
      continue;
    }

    const content = readFileSync(filePath);
    const sha256 = computeFileChecksumSha256(content);
    fileManifest.push({
      fileName: entry.fileName,
      sha256,
      byteSize: content.byteLength,
    });

    if (sha256.toLowerCase() !== entry.sha256.toLowerCase()) {
      errors.push(
        `Checksum mismatch for ${entry.fileName}: expected ${entry.sha256}, got ${sha256}`
      );
    }
  }

  return { ok: errors.length === 0, errors, fileManifest };
}

function resolveRxnconsoFile(manifest: RxNormReleaseManifest): { fileName: string; sha256: string } {
  const rxnconso = manifest.files.find((file) => file.fileRole === "RXNCONSO");
  if (!rxnconso) {
    throw new Error("Manifest missing RXNCONSO file entry.");
  }
  return rxnconso;
}

async function assertNoConcurrentRealImport(
  prisma: PrismaClient,
  releaseId: string
): Promise<void> {
  const staging = await prisma.rxNormReferenceRelease.findFirst({
    where: {
      sourceVocabulary: "RXNORM",
      importStatus: "STAGING",
      id: { not: releaseId },
      isSynthetic: false,
    },
    select: { releaseIdentifier: true },
  });
  if (staging) {
    throw new Error(
      `Another real RXNORM import is STAGING (${staging.releaseIdentifier}). Wait for completion.`
    );
  }
}

export async function registerOrReuseRelease(
  prisma: PrismaClient,
  input: {
    manifest: RxNormReleaseManifest;
    manifestHashSha256: string;
    fileManifest: Array<{ fileName: string; sha256: string; byteSize: number }>;
    actor?: string;
    startedByUserId?: string;
  }
) {
  const isSynthetic = resolveIsSyntheticFromClassification(input.manifest.sourceClassification);
  assertRealSyntheticBoundary({
    sourceClassification: input.manifest.sourceClassification,
    isSynthetic,
  });

  const releaseIdentifier = buildRealReleaseIdentifier({
    releaseVersionOfficial: input.manifest.releaseVersionOfficial,
    releaseScope: input.manifest.releaseScope,
    manifestHashSha256: input.manifestHashSha256,
  });

  const rxnconso = resolveRxnconsoFile(input.manifest);

  return prisma.rxNormReferenceRelease.upsert({
    where: {
      sourceVocabulary_releaseIdentifier: {
        sourceVocabulary: "RXNORM",
        releaseIdentifier,
      },
    },
    create: {
      id: randomUUID(),
      sourceVocabulary: "RXNORM",
      releaseIdentifier,
      sourceChecksumSha256: rxnconso.sha256,
      sourceFormat: "RXNCONSO_RRF",
      sourceFilename: rxnconso.fileName,
      isSynthetic,
      importStatus: "REGISTERED",
      sourceClassification: input.manifest.sourceClassification,
      releaseScope: input.manifest.releaseScope,
      releaseVersionOfficial: input.manifest.releaseVersionOfficial,
      retrievedAt: input.manifest.retrievedAt ? new Date(input.manifest.retrievedAt) : null,
      sourceUrlOrDescription: input.manifest.sourceUrlOrDescription ?? null,
      licenseAcknowledged: input.manifest.licenseAcknowledged,
      importPurpose: input.manifest.importPurpose,
      authorizedOperator: input.actor ?? input.manifest.authorizedOperator ?? null,
      manifestJson: input.manifest as unknown as Prisma.InputJsonValue,
      manifestHashSha256: input.manifestHashSha256,
      fileManifestJson: input.fileManifest as unknown as Prisma.InputJsonValue,
      normalizationVersion: RXNORM_NORMALIZATION_VERSION,
      parsingVersion: RXNORM_PARSING_VERSION,
      referenceActivationStatus: "REFERENCE_RELEASE_ACTIVE",
      startedByUserId: input.startedByUserId ?? null,
      startedAt: new Date(),
    },
    update: {
      sourceChecksumSha256: rxnconso.sha256,
      sourceFilename: rxnconso.fileName,
      isSynthetic,
      sourceClassification: input.manifest.sourceClassification,
      releaseScope: input.manifest.releaseScope,
      releaseVersionOfficial: input.manifest.releaseVersionOfficial,
      licenseAcknowledged: input.manifest.licenseAcknowledged,
      importPurpose: input.manifest.importPurpose,
      authorizedOperator: input.actor ?? input.manifest.authorizedOperator ?? null,
      manifestJson: input.manifest as unknown as Prisma.InputJsonValue,
      manifestHashSha256: input.manifestHashSha256,
      fileManifestJson: input.fileManifest as unknown as Prisma.InputJsonValue,
      normalizationVersion: RXNORM_NORMALIZATION_VERSION,
      parsingVersion: RXNORM_PARSING_VERSION,
      updatedAt: new Date(),
    },
  });
}

async function createRealImportJob(
  prisma: PrismaClient,
  releaseId: string,
  mode: RxNormRealImportMode,
  manifestHashSha256: string,
  startedByUserId?: string,
  dryRun?: boolean
) {
  return prisma.rxNormImportJob.create({
    data: {
      id: randomUUID(),
      releaseId,
      mode,
      status: "RUNNING",
      dryRun: dryRun ?? false,
      manifestHashSha256,
      startedByUserId: startedByUserId ?? null,
      startedAt: new Date(),
    },
  });
}

async function finishRealImportJob(
  prisma: PrismaClient,
  jobId: string,
  ok: boolean,
  counts: Pick<
    RxNormRealImportResult,
    "rowsRead" | "rowsAccepted" | "rowsSkipped" | "malformedRows"
  >,
  checkpointJson?: Prisma.InputJsonValue,
  failureReason?: string,
  resultSummaryJson?: Prisma.InputJsonValue
) {
  await prisma.rxNormImportJob.update({
    where: { id: jobId },
    data: {
      status: ok ? "SUCCEEDED" : "FAILED",
      completedAt: new Date(),
      acceptedCount: counts.rowsAccepted,
      rejectedCount: counts.rowsSkipped,
      rowsRead: counts.rowsRead,
      rowsSkipped: counts.rowsSkipped,
      malformedRows: counts.malformedRows,
      checkpointJson,
      failureReason: failureReason ?? null,
      resultSummaryJson,
    },
  });
}

async function loadCanonicalMappingTargets(prisma: PrismaClient): Promise<RxNormMappingTarget[]> {
  const [concepts, products] = await Promise.all([
    prisma.medicationConcept.findMany({
      select: {
        id: true,
        code: true,
        displayName: true,
        genericName: true,
        rxNormConceptId: true,
        dataClassification: true,
      },
    }),
    prisma.medicationProduct.findMany({
      select: {
        id: true,
        code: true,
        strengthDisplay: true,
        dosageForm: true,
        concept: {
          select: {
            displayName: true,
            genericName: true,
            rxNormConceptId: true,
            dataClassification: true,
          },
        },
      },
    }),
  ]);

  const targets: RxNormMappingTarget[] = [];

  for (const concept of concepts) {
    if (concept.dataClassification === "PRODUCTION") continue;
    targets.push({
      kind: "MEDICATION_CONCEPT",
      id: concept.id,
      code: concept.code,
      rxNormConceptId: concept.rxNormConceptId,
      displayName: concept.displayName || concept.genericName,
      normalizedDisplayName: normalizeRxNormDisplayTerm(concept.displayName || concept.genericName),
    });
  }

  for (const product of products) {
    if (product.concept.dataClassification === "PRODUCTION") continue;
    const label = [product.concept.displayName || product.concept.genericName, product.strengthDisplay]
      .filter(Boolean)
      .join(" ");
    targets.push({
      kind: "MEDICATION_PRODUCT",
      id: product.id,
      code: product.code,
      rxNormConceptId: product.concept.rxNormConceptId,
      displayName: label,
      normalizedDisplayName: normalizeRxNormDisplayTerm(label),
      strengthDisplay: product.strengthDisplay,
      dosageForm: product.dosageForm,
    });
  }

  return targets;
}

async function stageRealReference(
  prisma: PrismaClient,
  releaseId: string,
  manifest: RxNormReleaseManifest,
  sourceDir: string
): Promise<{
  rowsRead: number;
  rowsAccepted: number;
  rowsSkipped: number;
  malformedRows: number;
  inserted: number;
  skippedDuplicates: number;
  checkpointJson: Prisma.InputJsonValue;
}> {
  const rxnconso = resolveRxnconsoFile(manifest);
  const filePath = resolveSafeSourcePath(sourceDir, rxnconso.fileName);
  const dataClassification = stagingDataClassificationForSource(manifest.sourceClassification);
  const isSynthetic = resolveIsSyntheticFromClassification(manifest.sourceClassification);

  const parsed = await parseRxnconsoRrf({
    filePath,
    termTypes: manifest.termTypes,
    rxcuiAllowlist: manifest.rxcuiAllowlist,
  });

  let inserted = 0;
  let skippedDuplicates = 0;

  for (let offset = 0; offset < parsed.acceptedRows.length; offset += STAGING_BATCH_SIZE) {
    const batch = parsed.acceptedRows.slice(offset, offset + STAGING_BATCH_SIZE);
    for (const row of batch) {
      assertRealSyntheticBoundary({
        sourceClassification: manifest.sourceClassification,
        isSynthetic,
        rxcui: row.rxcui,
      });

      try {
        await prisma.rxNormStagingConcept.create({
          data: {
            id: randomUUID(),
            releaseId,
            rxcui: row.rxcui,
            termType: row.termType,
            language: row.language,
            suppressFlag: row.suppressFlag,
            sourceVocabulary: row.sourceVocabulary,
            sourceCode: row.sourceCode,
            displayTerm: row.displayTerm,
            normalizedTerm: row.normalizedTerm,
            sourceRowNumber: row.sourceLineNumber,
            rowChecksum: row.rowChecksum,
            parsingStatus: "PARSED",
            validationStatus: "ACCEPTED",
            conflictStatus: "NONE",
            isSearchableReference: false,
            isOrderableEligible: false,
            dataClassification,
          },
        });
        inserted += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Unique constraint")) {
          skippedDuplicates += 1;
          continue;
        }
        throw error;
      }
    }
  }

  const checkpointJson = {
    lastBatchOffset: parsed.acceptedRows.length,
    inserted,
    skippedDuplicates,
    rowsRead: parsed.rowsRead,
    rowsSkipped: parsed.rowsSkipped,
    malformedRows: parsed.malformedRows,
  };

  return {
    rowsRead: parsed.rowsRead,
    rowsAccepted: parsed.rowsAccepted,
    rowsSkipped: parsed.rowsSkipped,
    malformedRows: parsed.malformedRows,
    inserted,
    skippedDuplicates,
    checkpointJson,
  };
}

async function generateRealCandidates(
  prisma: PrismaClient,
  releaseId: string
): Promise<{ candidateCount: number; conflictCount: number }> {
  const stagingRows = await prisma.rxNormStagingConcept.findMany({
    where: { releaseId, validationStatus: { in: ["ACCEPTED", "WARNING"] } },
  });
  const targets = await loadCanonicalMappingTargets(prisma);

  let candidateCount = 0;
  let conflictCount = 0;

  for (const stagingRow of stagingRows) {
    const generated = generateRxNormMappingCandidates(
      {
        id: stagingRow.id,
        rxcui: stagingRow.rxcui,
        termType: stagingRow.termType,
        displayTerm: stagingRow.displayTerm,
        normalizedTerm: stagingRow.normalizedTerm,
        strengthText: stagingRow.strengthText,
        doseFormText: stagingRow.doseFormText,
        ingredientIdentity: stagingRow.ingredientIdentity,
      },
      targets
    );

    for (const candidate of generated) {
      assertCandidateNotAutoVerified(candidate.autoVerified);
      try {
        await prisma.rxNormMappingCandidate.create({
          data: {
            id: randomUUID(),
            releaseId,
            stagingConceptId: stagingRow.id,
            targetKind: candidate.targetKind,
            targetId: candidate.targetId,
            targetCode: candidate.targetCode,
            status: candidate.status,
            confidence: candidate.confidence ?? null,
            evidenceJson: candidate.evidenceJson,
            autoVerified: false,
          },
        });
        candidateCount += 1;
        if (candidate.status === "CONFLICT" || candidate.status === "AMBIGUOUS") {
          conflictCount += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Unique constraint")) continue;
        throw error;
      }
    }
  }

  return { candidateCount, conflictCount };
}

export async function rollbackRealRelease(
  prisma: PrismaClient,
  releaseId: string,
  confirmRollback: boolean
): Promise<{ ok: boolean; message: string }> {
  if (!confirmRollback) {
    throw new Error("ROLLBACK_REAL_RELEASE requires --confirm-rollback-real-release");
  }

  const release = await prisma.rxNormReferenceRelease.findUnique({ where: { id: releaseId } });
  if (!release) {
    throw new Error(`Release not found: ${releaseId}`);
  }
  if (release.sourceFormat === "SYNTHETIC_JSON" || release.sourceClassification === "SYNTHETIC_FIXTURE") {
    throw new Error(
      "rollbackRealRelease refuses Phase 3 synthetic fixtures — use Phase 3 rollback."
    );
  }

  const verifiedCount = await prisma.rxNormVerifiedMapping.count({
    where: { releaseId },
  });
  if (verifiedCount > 0) {
    throw new Error(
      `Cannot rollback release with ${verifiedCount} verified mapping(s). Retire mappings first.`
    );
  }

  await prisma.$transaction([
    prisma.rxNormMappingCandidate.updateMany({
      where: { releaseId, status: { not: "RETIRED" } },
      data: { status: "RETIRED" },
    }),
    prisma.rxNormReferenceRelease.update({
      where: { id: releaseId },
      data: {
        isActiveReference: false,
        importStatus: "ROLLED_BACK",
        rollbackStatus: "ROLLED_BACK",
        referenceActivationStatus: "REFERENCE_RELEASE_ACTIVE",
        completedAt: new Date(),
      },
    }),
  ]);

  return { ok: true, message: "Real reference release rolled back; staging history preserved." };
}

export async function runRxNormRealImport(
  prisma: PrismaClient,
  request: RxNormRealImportRequest
): Promise<RxNormRealImportResult> {
  assertNoClinicalRuntimeMutationsForRealImport("rxnorm-real-import-service.runRxNormRealImport");

  if (!(REAL_IMPORT_MODE_VALUES as readonly string[]).includes(request.mode)) {
    throw new Error(`Unsupported real import mode: ${request.mode}`);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const baseResult: RxNormRealImportResult = {
    ok: false,
    mode: request.mode,
    rowsRead: 0,
    rowsAccepted: 0,
    rowsSkipped: 0,
    malformedRows: 0,
    errors,
    warnings,
  };

  const loaded = loadAndValidateManifest(request.manifestPath);
  if (loaded.errors.length > 0) {
    return { ...baseResult, errors: loaded.errors, message: "Manifest validation failed." };
  }

  const { manifest, manifestHashSha256 } = loaded;

  if (request.mode === "VALIDATE_MANIFEST") {
    return {
      ...baseResult,
      ok: true,
      manifestHashSha256,
      message: "Manifest schema and governance checks passed.",
    };
  }

  const sourceValidation = validateSourceFiles(manifest, request.sourceDir);
  if (sourceValidation.errors.length > 0) {
    return {
      ...baseResult,
      manifestHashSha256,
      errors: sourceValidation.errors,
      message: "Source file validation failed.",
    };
  }

  if (request.mode === "VALIDATE_SOURCE") {
    return {
      ...baseResult,
      ok: true,
      manifestHashSha256,
      message: "Manifest and source file checksums validated.",
    };
  }

  if (request.dryRun) {
    const rxnconso = resolveRxnconsoFile(manifest);
    const filePath = resolveSafeSourcePath(request.sourceDir, rxnconso.fileName);
    const parsed = await parseRxnconsoRrf({
      filePath,
      termTypes: manifest.termTypes,
      rxcuiAllowlist: manifest.rxcuiAllowlist,
      dryRun: true,
    });
    return {
      ...baseResult,
      ok: true,
      manifestHashSha256,
      rowsRead: parsed.rowsRead,
      rowsAccepted: parsed.rowsAccepted,
      rowsSkipped: parsed.rowsSkipped,
      malformedRows: parsed.malformedRows,
      warnings: parsed.warnings,
      message: "Dry run — no database writes.",
    };
  }

  const release = await registerOrReuseRelease(prisma, {
    manifest,
    manifestHashSha256,
    fileManifest: sourceValidation.fileManifest,
    actor: request.actor,
    startedByUserId: request.startedByUserId,
  });

  const job = await createRealImportJob(
    prisma,
    release.id,
    request.mode,
    manifestHashSha256,
    request.startedByUserId,
    request.dryRun
  );

  try {
    if (request.mode === "STAGE_REAL_REFERENCE") {
      if (!request.confirmRealSource || !request.confirmNonClinicalOnly) {
        throw new Error(
          "STAGE_REAL_REFERENCE requires --confirm-real-source and --confirm-nonclinical-only"
        );
      }
      if (manifest.releaseScope === "FULL_RELEASE" && !request.confirmFullRelease) {
        throw new Error("FULL_RELEASE scope requires --confirm-full-release");
      }

      await assertNoConcurrentRealImport(prisma, release.id);

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          importStatus: "STAGING",
          importModeLast: request.mode,
          startedAt: new Date(),
        },
      });

      const staged = await stageRealReference(prisma, release.id, manifest, request.sourceDir);

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          importStatus: "STAGED",
          importModeLast: request.mode,
          importedAt: new Date(),
          recordCount: staged.rowsRead,
          acceptedCount: staged.inserted,
          rejectedCount: staged.rowsSkipped,
          duplicateCount: staged.skippedDuplicates,
          errorCount: staged.malformedRows,
          lastCheckpointJson: staged.checkpointJson,
          completedAt: new Date(),
        },
      });

      await finishRealImportJob(
        prisma,
        job.id,
        true,
        {
          rowsRead: staged.rowsRead,
          rowsAccepted: staged.inserted,
          rowsSkipped: staged.rowsSkipped,
          malformedRows: staged.malformedRows,
        },
        staged.checkpointJson,
        undefined,
        staged.checkpointJson
      );

      return {
        ok: true,
        mode: request.mode,
        releaseId: release.id,
        releaseIdentifier: release.releaseIdentifier,
        importStatus: "STAGED",
        manifestHashSha256,
        rowsRead: staged.rowsRead,
        rowsAccepted: staged.inserted,
        rowsSkipped: staged.rowsSkipped,
        malformedRows: staged.malformedRows,
        errors,
        warnings,
        message: `Staged ${staged.inserted} real reference rows (${staged.skippedDuplicates} duplicate skips).`,
      };
    }

    if (request.mode === "GENERATE_REAL_CANDIDATES") {
      if (!request.confirmRealSource || !request.confirmNonClinicalOnly) {
        throw new Error(
          "GENERATE_REAL_CANDIDATES requires --confirm-real-source and --confirm-nonclinical-only"
        );
      }
      const current = await prisma.rxNormReferenceRelease.findUnique({ where: { id: release.id } });
      if (!current || (current.importStatus !== "STAGED" && current.importStatus !== "ACTIVE")) {
        throw new Error(
          `Release must be STAGED before candidate generation (current: ${current?.importStatus}).`
        );
      }

      const { candidateCount, conflictCount } = await generateRealCandidates(prisma, release.id);

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          importModeLast: request.mode,
          conflictCount,
          completedAt: new Date(),
        },
      });

      await finishRealImportJob(
        prisma,
        job.id,
        true,
        { rowsRead: 0, rowsAccepted: candidateCount, rowsSkipped: 0, malformedRows: 0 },
        undefined,
        undefined,
        { candidateCount, conflictCount }
      );

      return {
        ok: true,
        mode: request.mode,
        releaseId: release.id,
        releaseIdentifier: release.releaseIdentifier,
        importStatus: current.importStatus,
        manifestHashSha256,
        rowsRead: 0,
        rowsAccepted: candidateCount,
        rowsSkipped: 0,
        malformedRows: 0,
        candidateCount,
        errors,
        warnings,
        message: `Created ${candidateCount} real mapping candidates (autoVerified=false).`,
      };
    }

    if (request.mode === "REPORT_RELEASE") {
      const current = await prisma.rxNormReferenceRelease.findUnique({
        where: { id: release.id },
        include: {
          _count: {
            select: {
              stagingConcepts: true,
              mappingCandidates: true,
              verifiedMappings: true,
              conflicts: true,
            },
          },
        },
      });
      if (!current) {
        throw new Error(`Release not found after registration: ${release.id}`);
      }

      await finishRealImportJob(
        prisma,
        job.id,
        true,
        { rowsRead: current.recordCount, rowsAccepted: current.acceptedCount, rowsSkipped: current.rejectedCount, malformedRows: current.errorCount },
        current.lastCheckpointJson ?? undefined,
        undefined,
        {
          stagingConcepts: current._count.stagingConcepts,
          mappingCandidates: current._count.mappingCandidates,
          verifiedMappings: current._count.verifiedMappings,
          conflicts: current._count.conflicts,
        }
      );

      return {
        ok: true,
        mode: request.mode,
        releaseId: release.id,
        releaseIdentifier: release.releaseIdentifier,
        importStatus: current.importStatus,
        manifestHashSha256,
        rowsRead: current.recordCount,
        rowsAccepted: current.acceptedCount,
        rowsSkipped: current.rejectedCount,
        malformedRows: current.errorCount,
        candidateCount: current._count.mappingCandidates,
        errors,
        warnings,
        message: `Release report: ${current._count.stagingConcepts} staged, ${current._count.mappingCandidates} candidates, ${current._count.verifiedMappings} verified.`,
      };
    }

    if (request.mode === "ROLLBACK_REAL_RELEASE") {
      const rolled = await rollbackRealRelease(
        prisma,
        release.id,
        request.confirmRollbackRealRelease ?? false
      );
      await finishRealImportJob(
        prisma,
        job.id,
        rolled.ok,
        { rowsRead: 0, rowsAccepted: 0, rowsSkipped: 0, malformedRows: 0 },
        undefined,
        undefined,
        { message: rolled.message }
      );
      return {
        ok: rolled.ok,
        mode: request.mode,
        releaseId: release.id,
        releaseIdentifier: release.releaseIdentifier,
        importStatus: "ROLLED_BACK",
        manifestHashSha256,
        rowsRead: 0,
        rowsAccepted: 0,
        rowsSkipped: 0,
        malformedRows: 0,
        errors,
        warnings,
        message: rolled.message,
      };
    }

    throw new Error(`Unhandled real import mode: ${request.mode}`);
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    errors.push(failureReason);
    const current = await prisma.rxNormReferenceRelease.findUnique({
      where: { id: release.id },
      select: { importStatus: true },
    });
    const preservable = new Set(["STAGED", "ACTIVE", "ROLLED_BACK", "SUPERSEDED"]);
    if (!current || !preservable.has(current.importStatus)) {
      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          importStatus: "FAILED",
          failureReason,
          completedAt: new Date(),
        },
      });
    } else {
      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: { failureReason, completedAt: new Date() },
      });
    }
    await finishRealImportJob(
      prisma,
      job.id,
      false,
      { rowsRead: 0, rowsAccepted: 0, rowsSkipped: 0, malformedRows: 0 },
      undefined,
      failureReason
    );
    return {
      ...baseResult,
      releaseId: release.id,
      releaseIdentifier: release.releaseIdentifier,
      manifestHashSha256,
      errors,
      message: failureReason,
    };
  }
}

export function canRollbackRealRelease(importStatus: string, verifiedMappingCount: number): boolean {
  return (
    (importStatus === "STAGED" || importStatus === "ACTIVE" || importStatus === "REGISTERED") &&
    verifiedMappingCount === 0
  );
}
