import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertCandidateNotAutoVerified,
  generateRxNormMappingCandidates,
  normalizeRxNormDisplayTerm,
  type RxNormImportMode,
  type RxNormMappingTarget,
} from "@medora/shared";
import {
  detectDuplicateNormalizedNames,
  detectDuplicateRxcui,
  parseSyntheticRxNormFixture,
  type ParsedRxNormStagingRow,
} from "./parse-rxnorm-synthetic";

export type RxNormImportRequest = {
  mode: RxNormImportMode;
  filePath: string;
  releaseIdentifier: string;
  startedByUserId?: string;
  dryRun?: boolean;
  confirmActivate?: boolean;
  confirmRollback?: boolean;
};

export type RxNormImportResult = {
  ok: boolean;
  mode: RxNormImportMode;
  releaseId?: string;
  releaseIdentifier: string;
  importStatus?: string;
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  conflictCount: number;
  warningCount: number;
  errorCount: number;
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
] as const;

/** Guardrail: Phase 3 import must not touch clinical runtime tables. */
export function assertNoClinicalRuntimeMutations(context: string): void {
  for (const model of FORBIDDEN_MUTATION_MODELS) {
    if (context.includes(`${model}.`)) {
      throw new Error(`Forbidden Phase 3 mutation target: ${model}`);
    }
  }
}

async function assertNoConcurrentImport(
  prisma: PrismaClient,
  sourceVocabulary: string,
  releaseId: string
): Promise<void> {
  // An ACTIVE reference release must not block staging a successor (activation supersedes).
  // Only one in-flight STAGING job per vocabulary is allowed.
  const staging = await prisma.rxNormReferenceRelease.findFirst({
    where: {
      sourceVocabulary,
      importStatus: "STAGING",
      id: { not: releaseId },
    },
    select: { releaseIdentifier: true },
  });
  if (staging) {
    throw new Error(
      `Another ${sourceVocabulary} import is STAGING (${staging.releaseIdentifier}). Wait for completion.`
    );
  }
}

async function upsertReleaseRecord(
  prisma: PrismaClient,
  input: {
    releaseIdentifier: string;
    sourceVocabulary: string;
    sourceChecksumSha256: string;
    sourceFormat: string;
    sourceFilename: string;
    isSynthetic: boolean;
    startedByUserId?: string;
  }
) {
  return prisma.rxNormReferenceRelease.upsert({
    where: {
      sourceVocabulary_releaseIdentifier: {
        sourceVocabulary: input.sourceVocabulary,
        releaseIdentifier: input.releaseIdentifier,
      },
    },
    create: {
      id: randomUUID(),
      sourceVocabulary: input.sourceVocabulary,
      releaseIdentifier: input.releaseIdentifier,
      sourceChecksumSha256: input.sourceChecksumSha256,
      sourceFormat: input.sourceFormat,
      sourceFilename: input.sourceFilename,
      isSynthetic: input.isSynthetic,
      importStatus: "REGISTERED",
      startedByUserId: input.startedByUserId ?? null,
      startedAt: new Date(),
    },
    update: {
      sourceChecksumSha256: input.sourceChecksumSha256,
      sourceFormat: input.sourceFormat,
      sourceFilename: input.sourceFilename,
      isSynthetic: input.isSynthetic,
      updatedAt: new Date(),
    },
  });
}

function summarizeParse(parse: ReturnType<typeof parseSyntheticRxNormFixture>) {
  const duplicateRxcui = detectDuplicateRxcui(parse.acceptedRows);
  const duplicateNames = detectDuplicateNormalizedNames(parse.acceptedRows);
  const warnings = [...parse.warnings];
  if (duplicateRxcui.length > 0) {
    warnings.push(`Duplicate RxCUIs in accepted rows: ${duplicateRxcui.join(", ")}`);
  }
  if (duplicateNames.length > 0) {
    warnings.push(`Duplicate normalized names: ${duplicateNames.join("; ")}`);
  }
  return {
    acceptedCount: parse.acceptedRows.length,
    rejectedCount: parse.rejectedRows.length,
    duplicateCount: duplicateRxcui.length + duplicateNames.length,
    conflictCount: 0,
    warningCount:
      parse.acceptedRows.filter((row) => row.validationStatus === "WARNING").length + warnings.length,
    errorCount: 0,
    warnings,
  };
}

async function createImportJob(
  prisma: PrismaClient,
  releaseId: string,
  mode: RxNormImportMode,
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
      startedByUserId: startedByUserId ?? null,
      startedAt: new Date(),
    },
  });
}

async function finishImportJob(
  prisma: PrismaClient,
  jobId: string,
  ok: boolean,
  counts: Pick<
    RxNormImportResult,
    "acceptedCount" | "rejectedCount" | "duplicateCount" | "conflictCount" | "warningCount" | "errorCount"
  >,
  failureReason?: string,
  resultSummaryJson?: Prisma.InputJsonValue
) {
  await prisma.rxNormImportJob.update({
    where: { id: jobId },
    data: {
      status: ok ? "SUCCEEDED" : "FAILED",
      completedAt: new Date(),
      acceptedCount: counts.acceptedCount,
      rejectedCount: counts.rejectedCount,
      duplicateCount: counts.duplicateCount,
      conflictCount: counts.conflictCount,
      warningCount: counts.warningCount,
      errorCount: counts.errorCount,
      failureReason: failureReason ?? null,
      resultSummaryJson,
    },
  });
}

async function stageRows(
  prisma: PrismaClient,
  releaseId: string,
  rows: ParsedRxNormStagingRow[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
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
          ingredientIdentity: row.ingredientIdentity,
          strengthText: row.strengthText,
          doseFormText: row.doseFormText,
          brandName: row.brandName,
          relationshipMetadata: (row.relationshipMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
          sourceRowNumber: row.sourceRowNumber,
          rowChecksum: row.rowChecksum,
          parsingStatus: row.parsingStatus,
          validationStatus: row.validationStatus,
          conflictStatus: "NONE",
          rejectionReason: row.rejectionReason,
          isSearchableReference: false,
          isOrderableEligible: false,
          dataClassification: row.dataClassification,
        },
      });
      inserted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unique constraint")) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { inserted, skipped };
}

async function loadMappingTargets(prisma: PrismaClient): Promise<RxNormMappingTarget[]> {
  const [concepts, products, catalogs] = await Promise.all([
    prisma.medicationConcept.findMany({
      select: {
        id: true,
        code: true,
        displayName: true,
        genericName: true,
        rxNormConceptId: true,
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
          },
        },
      },
    }),
    prisma.catalogMedication.findMany({
      select: {
        id: true,
        code: true,
        displayNameEn: true,
        name: true,
        strength: true,
        dosageForm: true,
      },
    }),
  ]);

  const targets: RxNormMappingTarget[] = [];

  for (const concept of concepts) {
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

  for (const catalog of catalogs) {
    const label = catalog.displayNameEn || catalog.name;
    targets.push({
      kind: "CATALOG_MEDICATION",
      id: catalog.id,
      code: catalog.code,
      displayName: label,
      normalizedDisplayName: normalizeRxNormDisplayTerm(label),
      strengthDisplay: catalog.strength,
      dosageForm: catalog.dosageForm,
    });
  }

  return targets;
}

async function runCandidateMapping(
  prisma: PrismaClient,
  releaseId: string
): Promise<{ candidateCount: number; conflictCount: number }> {
  const stagingRows = await prisma.rxNormStagingConcept.findMany({
    where: { releaseId, validationStatus: { in: ["ACCEPTED", "WARNING"] } },
  });
  const targets = await loadMappingTargets(prisma);

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
          await prisma.rxNormImportConflict.create({
            data: {
              id: randomUUID(),
              releaseId,
              conflictType:
                candidate.status === "AMBIGUOUS" ? "MULTIPLE_CANDIDATES" : "STRENGTH_MISMATCH",
              severity: "WARNING",
              message: `Candidate ${candidate.status} for staging concept ${stagingRow.rxcui}`,
              stagingConceptId: stagingRow.id,
              relatedTargetId: candidate.targetId,
              evidenceJson: candidate.evidenceJson,
            },
          });
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

export async function runRxNormImport(
  prisma: PrismaClient,
  request: RxNormImportRequest
): Promise<RxNormImportResult> {
  assertNoClinicalRuntimeMutations("rxnorm-import-service.runRxNormImport");

  const parse = parseSyntheticRxNormFixture({
    filePath: request.filePath,
    expectedReleaseIdentifier: request.releaseIdentifier,
  });
  const summary = summarizeParse(parse);
  const errors: string[] = [];

  const release = await upsertReleaseRecord(prisma, {
    releaseIdentifier: parse.fixture.releaseIdentifier,
    sourceVocabulary: parse.fixture.sourceVocabulary,
    sourceChecksumSha256: parse.sourceChecksumSha256,
    sourceFormat: parse.fixture.sourceFormat,
    sourceFilename: parse.sourceFilename,
    isSynthetic: true,
    startedByUserId: request.startedByUserId,
  });

  const baseResult: RxNormImportResult = {
    ok: true,
    mode: request.mode,
    releaseId: release.id,
    releaseIdentifier: release.releaseIdentifier,
    importStatus: release.importStatus,
    acceptedCount: summary.acceptedCount,
    rejectedCount: summary.rejectedCount,
    duplicateCount: summary.duplicateCount,
    conflictCount: summary.conflictCount,
    warningCount: summary.warningCount,
    errorCount: summary.errorCount,
    errors,
    warnings: summary.warnings,
  };

  if (request.mode === "VALIDATE_ONLY") {
    // Do not downgrade terminal/reference statuses on re-validate.
    const preservable = new Set(["STAGED", "ACTIVE", "ROLLED_BACK", "SUPERSEDED"]);
    const nextStatus = preservable.has(release.importStatus)
      ? release.importStatus
      : summary.acceptedCount > 0
        ? "VALIDATING"
        : "FAILED";
    await prisma.rxNormReferenceRelease.update({
      where: { id: release.id },
      data: {
        importStatus: nextStatus,
        importModeLast: request.mode,
        recordCount: parse.fixture.rows.length,
        acceptedCount: summary.acceptedCount,
        rejectedCount: summary.rejectedCount,
        duplicateCount: summary.duplicateCount,
        warningCount: summary.warningCount,
        errorCount: summary.errorCount,
        completedAt: new Date(),
      },
    });
    return {
      ...baseResult,
      ok: summary.acceptedCount > 0,
      importStatus: nextStatus,
    };
  }

  if (request.dryRun) {
    return { ...baseResult, message: "Dry run — no database writes beyond release registration." };
  }

  const job = await createImportJob(prisma, release.id, request.mode, request.startedByUserId, request.dryRun);

  try {
    await assertNoConcurrentImport(prisma, parse.fixture.sourceVocabulary, release.id);

    if (request.mode === "STAGE_ONLY") {
      if (release.importStatus === "ACTIVE") {
        throw new Error("Cannot stage into an ACTIVE release.");
      }

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: { importStatus: "STAGING", importModeLast: request.mode, startedAt: new Date() },
      });

      const staged = await stageRows(prisma, release.id, parse.acceptedRows);
      const nextStatus = "STAGED";

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          importStatus: nextStatus,
          importModeLast: request.mode,
          importedAt: new Date(),
          recordCount: parse.fixture.rows.length,
          acceptedCount: summary.acceptedCount,
          rejectedCount: summary.rejectedCount,
          duplicateCount: summary.duplicateCount + staged.skipped,
          warningCount: summary.warningCount,
          errorCount: summary.errorCount,
          completedAt: new Date(),
        },
      });

      await finishImportJob(prisma, job.id, nextStatus === "STAGED", {
        ...summary,
        duplicateCount: summary.duplicateCount + staged.skipped,
      }, undefined, { inserted: staged.inserted, skipped: staged.skipped });

      return {
        ...baseResult,
        ok: nextStatus === "STAGED",
        importStatus: nextStatus,
        duplicateCount: summary.duplicateCount + staged.skipped,
        message: `Staged ${staged.inserted} rows (${staged.skipped} skipped as duplicates).`,
      };
    }

    if (request.mode === "CANDIDATE_MAPPING") {
      if (release.importStatus !== "STAGED" && release.importStatus !== "ACTIVE") {
        throw new Error(`Release must be STAGED before candidate mapping (current: ${release.importStatus}).`);
      }

      const { candidateCount, conflictCount } = await runCandidateMapping(prisma, release.id);

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          importModeLast: request.mode,
          conflictCount,
          completedAt: new Date(),
        },
      });

      await finishImportJob(
        prisma,
        job.id,
        true,
        { ...summary, conflictCount },
        undefined,
        { candidateCount }
      );

      return {
        ...baseResult,
        candidateCount,
        conflictCount,
        message: `Created ${candidateCount} mapping candidates.`,
      };
    }

    if (request.mode === "ACTIVATE_REFERENCE_RELEASE") {
      if (!request.confirmActivate) {
        throw new Error("ACTIVATE_REFERENCE_RELEASE requires --confirm-activate");
      }
      const current = await prisma.rxNormReferenceRelease.findUnique({ where: { id: release.id } });
      if (!current || current.importStatus !== "STAGED") {
        throw new Error(`Release must be STAGED before activation (current: ${current?.importStatus}).`);
      }
      if (summary.errorCount > 0) {
        throw new Error("Cannot activate release with validation errors.");
      }

      await prisma.$transaction([
        prisma.rxNormReferenceRelease.updateMany({
          where: {
            sourceVocabulary: current.sourceVocabulary,
            isActiveReference: true,
          },
          data: {
            isActiveReference: false,
            importStatus: "SUPERSEDED",
          },
        }),
        prisma.rxNormReferenceRelease.update({
          where: { id: release.id },
          data: {
            isActiveReference: true,
            importStatus: "ACTIVE",
            importModeLast: request.mode,
            completedAt: new Date(),
          },
        }),
      ]);

      await finishImportJob(prisma, job.id, true, summary);
      return {
        ...baseResult,
        importStatus: "ACTIVE",
        message: "Reference release activated (staging only — not wired to clinical search).",
      };
    }

    if (request.mode === "ROLLBACK_RELEASE") {
      if (!request.confirmRollback) {
        throw new Error("ROLLBACK_RELEASE requires --confirm-rollback");
      }

      await prisma.rxNormReferenceRelease.update({
        where: { id: release.id },
        data: {
          isActiveReference: false,
          importStatus: "ROLLED_BACK",
          rollbackStatus: "ROLLED_BACK",
          importModeLast: request.mode,
          completedAt: new Date(),
        },
      });

      await finishImportJob(prisma, job.id, true, summary);
      return {
        ...baseResult,
        importStatus: "ROLLED_BACK",
        message: "Reference release rolled back; staging history preserved.",
      };
    }

    throw new Error(`Unsupported import mode: ${request.mode}`);
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    errors.push(failureReason);
    // Preserve terminal/reference statuses — do not wipe STAGED/ACTIVE/ROLLED_BACK/SUPERSEDED on confirm failures.
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
        data: {
          failureReason,
          completedAt: new Date(),
        },
      });
    }
    await finishImportJob(prisma, job.id, false, summary, failureReason);
    return { ...baseResult, ok: false, errors, message: failureReason };
  }
}

export function canActivateRelease(importStatus: string, errorCount: number): boolean {
  return importStatus === "STAGED" && errorCount === 0;
}

export function canRollbackRelease(importStatus: string): boolean {
  return importStatus === "ACTIVE" || importStatus === "STAGED";
}
