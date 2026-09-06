/**
 * Generic licensed/source ICD-10-CM terminology importer (P3-F).
 * Consumes an operator-provided CSV or JSONL. Does not translate or invent labels.
 * Does not insert search aliases. Does not write licensed artifacts into git.
 *
 *   pnpm --filter @medora/api run icd:import-licensed-terminology -- --file=/secure/path/fr.jsonl --release=FY2026 --dry-run
 *   pnpm --filter @medora/api run icd:import-licensed-terminology -- --file=/secure/path/es.csv --release=FY2026 --supersede-prior
 *
 * --release is required. Do not silently assume FY2026.
 * Writes are bounded chunk transactions (default 500) + one effective-recompute pass.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  applyLicensedImportPlanInChunks,
  buildLicensedIcd10TerminologyImportPlan,
  formatLicensedImportReport,
  ICD10_CM_CODE_SYSTEM,
  ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
  ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE,
  licensedArtifactFileName,
  parseLicensedTerminologyArtifact,
  uniqueLicensedImportIdentities,
  type Icd10EffectiveRecomputeStats,
  type Icd10LicensedExistingRow,
  type Icd10LicensedImportPlan,
  type Icd10LicensedTerminologyRow,
  type LicensedImportChunkWriter,
} from "@medora/shared";
import {
  recomputeIcd10EffectiveClinicianLabels,
  type Icd10EffectiveRecomputeStore,
} from "../../src/diagnoses/icd10-terminology-effective";

export function parseLicensedImportArgs(argv: string[]) {
  let file = "";
  let releaseVersion = "";
  let dryRun = false;
  let supersedePrior = false;
  let allowSameVersionUpdate = false;
  let allowRejects = false;
  let allowMixedSourceIds = false;
  let chunkSize = ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE;
  let recomputeBatchSize = ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--supersede-prior") supersedePrior = true;
    else if (arg === "--allow-same-version-update") allowSameVersionUpdate = true;
    else if (arg === "--allow-rejects") allowRejects = true;
    else if (arg === "--allow-mixed-source-ids") allowMixedSourceIds = true;
    else if (arg.startsWith("--file=")) file = arg.slice("--file=".length).trim();
    else if (arg.startsWith("--release=")) releaseVersion = arg.slice("--release=".length).trim();
    else if (arg.startsWith("--chunk-size=")) {
      const parsed = Number(arg.slice("--chunk-size=".length));
      if (Number.isFinite(parsed) && parsed >= 1) chunkSize = Math.floor(parsed);
    } else if (arg.startsWith("--recompute-batch-size=")) {
      const parsed = Number(arg.slice("--recompute-batch-size=".length));
      if (Number.isFinite(parsed) && parsed >= 1) recomputeBatchSize = Math.floor(parsed);
    }
  }
  return {
    file,
    releaseVersion,
    dryRun,
    supersedePrior,
    allowSameVersionUpdate,
    allowRejects,
    allowMixedSourceIds,
    chunkSize,
    recomputeBatchSize,
  };
}

function detectFormat(filePath: string): "csv" | "jsonl" {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".jsonl" || ext === ".ndjson" || ext === ".json") return "jsonl";
  return "csv";
}

export function sha256Utf8(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function toCreateData(row: Icd10LicensedTerminologyRow) {
  return {
    id: randomUUID(),
    icd10CatalogId: row.icd10CatalogId,
    codeSystem: row.codeSystem,
    releaseVersion: row.releaseVersion,
    code: row.code,
    normalizedCode: row.normalizedCode,
    locale: row.locale,
    preferredLabel: row.preferredLabel,
    labelRegister: row.labelRegister,
    provenance: row.provenance,
    exactness: row.exactness,
    sourceId: row.sourceId,
    terminologyVersion: row.terminologyVersion,
    sourcePriority: row.sourcePriority,
    status: row.status,
    isEffective: false,
    reviewedAt: new Date(),
  };
}

export function createPrismaLicensedImportWriter(
  prisma: PrismaClient,
  options: { releaseVersion: string; transactionTimeoutMs?: number },
): LicensedImportChunkWriter {
  const timeout = options.transactionTimeoutMs ?? 120_000;
  return {
    async insertChunk(rows) {
      const data = rows.map(toCreateData);
      const result = await prisma.$transaction(
        async (tx) => tx.icd10DiagnosisTerminology.createMany({ data, skipDuplicates: true }),
        { timeout },
      );
      return { count: result.count };
    },
    async updateRow(row) {
      await prisma.$transaction(
        async (tx) =>
          tx.icd10DiagnosisTerminology.update({
            where: {
              codeSystem_releaseVersion_code_locale_labelRegister_provenance_sourceId_terminologyVersion: {
                codeSystem: row.codeSystem,
                releaseVersion: row.releaseVersion,
                code: row.code,
                locale: row.locale,
                labelRegister: row.labelRegister,
                provenance: row.provenance,
                sourceId: row.sourceId,
                terminologyVersion: row.terminologyVersion,
              },
            },
            data: {
              preferredLabel: row.preferredLabel,
              exactness: row.exactness,
              sourcePriority: row.sourcePriority,
              status: row.status,
              reviewedAt: new Date(),
            },
          }),
        { timeout },
      );
    },
    async supersedeChunk(targets) {
      await prisma.$transaction(
        async (tx) => {
          for (const target of targets) {
            await tx.icd10DiagnosisTerminology.updateMany({
              where: {
                codeSystem: ICD10_CM_CODE_SYSTEM,
                releaseVersion: options.releaseVersion,
                code: target.code,
                locale: target.locale,
                provenance: target.provenance,
                sourceId: target.sourceId,
                labelRegister: target.labelRegister,
                terminologyVersion: { not: target.keepTerminologyVersion },
                status: "APPROVED",
              },
              data: { status: "SUPERSEDED", isEffective: false },
            });
          }
        },
        { timeout },
      );
    },
  };
}

export type LicensedImportOptions = {
  file: string;
  releaseVersion: string;
  dryRun: boolean;
  supersedePrior: boolean;
  allowSameVersionUpdate: boolean;
  artifactText?: string;
  chunkSize?: number;
  allowRejects?: boolean;
  allowMixedSourceIds?: boolean;
  writer?: LicensedImportChunkWriter;
  recompute?: (identities: ReturnType<typeof uniqueLicensedImportIdentities>) => Promise<void>;
  recomputeStore?: Icd10EffectiveRecomputeStore;
  recomputeBatchSize?: number;
  skipCoverageQuery?: boolean;
};

function attachArtifactAudit(
  plan: Icd10LicensedImportPlan,
  meta: { sha256: string; fileName: string; chunkSize: number },
): void {
  plan.report.ARTIFACT_SHA256 = meta.sha256;
  plan.report.ARTIFACT_FILE = meta.fileName;
  plan.report.ARTIFACT_FILE_NAME = meta.fileName;
  plan.report.INPUT_ROW_COUNT = plan.report.TOTAL_INPUT;
  plan.report.CHUNK_SIZE = meta.chunkSize;
}

export async function importLicensedIcd10Terminology(
  prisma: PrismaClient,
  options: LicensedImportOptions,
): Promise<Icd10LicensedImportPlan> {
  if (!options.releaseVersion) {
    throw new Error("Missing --release=<releaseVersion>. Do not silently assume FY2026.");
  }
  if (!options.file && options.artifactText == null) {
    throw new Error("Missing --file=/absolute/path/to/artifact.csv|jsonl (licensed sources are not in git).");
  }
  const text = options.artifactText ?? readFileSync(options.file, "utf8");
  const sha256 = sha256Utf8(text);
  const fileName = licensedArtifactFileName(options.file);
  const chunkSize = options.chunkSize ?? ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE;
  const format = options.file ? detectFormat(options.file) : text.trimStart().startsWith("{") ? "jsonl" : "csv";
  const records = parseLicensedTerminologyArtifact({ text, format });

  const catalogRows = await prisma.icd10DiagnosisCode.findMany({
    where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: options.releaseVersion },
    select: {
      id: true,
      code: true,
      normalizedCode: true,
      codeSystem: true,
      releaseVersion: true,
      isSelectable: true,
      isBillable: true,
    },
  });
  const catalogByNormalizedCode = new Map(catalogRows.map((row) => [row.normalizedCode, row]));
  const otherRelease = await prisma.icd10DiagnosisCode.findMany({
    where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: { not: options.releaseVersion } },
    select: { normalizedCode: true },
  });
  const otherReleaseNormalizedCodes = new Set(otherRelease.map((row) => row.normalizedCode));

  const existingDb = await prisma.icd10DiagnosisTerminology.findMany({
    where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: options.releaseVersion },
    select: {
      code: true,
      locale: true,
      labelRegister: true,
      provenance: true,
      sourceId: true,
      terminologyVersion: true,
      preferredLabel: true,
      exactness: true,
      sourcePriority: true,
      status: true,
    },
  });
  const existingRows: Icd10LicensedExistingRow[] = existingDb;

  const plan = buildLicensedIcd10TerminologyImportPlan({
    records,
    catalogByNormalizedCode,
    expectedReleaseVersion: options.releaseVersion,
    existingRows,
    otherReleaseNormalizedCodes,
    allowSameVersionUpdate: options.allowSameVersionUpdate,
    supersedePrior: options.supersedePrior,
    allowMixedSourceIds: options.allowMixedSourceIds,
  });
  attachArtifactAudit(plan, { sha256, fileName, chunkSize });

  console.log(`ARTIFACT_FILE_NAME=${fileName}`);
  console.log(`ARTIFACT_SHA256=${sha256}`);
  console.log(`RELEASE=${options.releaseVersion}`);
  console.log(`DRY_RUN=${options.dryRun ? "YES" : "NO"}`);
  console.log(`SUPERSEDE_PRIOR=${options.supersedePrior ? "YES" : "NO"}`);
  console.log(`ALLOW_SAME_VERSION_UPDATE=${options.allowSameVersionUpdate ? "YES" : "NO"}`);
  console.log(`CHUNK_SIZE=${chunkSize}`);
  for (const row of plan.rejected) {
    console.log(`REJECT ${row.locale} ${row.code} ${row.reason}`);
  }

  const plannedInsertChunks = Math.ceil(plan.acceptedInserts.length / chunkSize) || 0;
  const plannedUpdateChunks = Math.ceil(plan.acceptedUpdates.length / chunkSize) || 0;
  plan.report.CHUNK_COUNT = plannedInsertChunks + plannedUpdateChunks;

  if (options.dryRun) {
    const selectable = catalogRows.filter((row) => row.isSelectable !== false && row.isBillable !== false).length;
    const currentFr = existingDb.filter(
      (row) => row.locale === "fr" && row.status === "APPROVED" && row.labelRegister === "CLINICIAN_PREFERRED",
    ).length;
    const currentEs = existingDb.filter(
      (row) => row.locale === "es" && row.status === "APPROVED" && row.labelRegister === "CLINICIAN_PREFERRED",
    ).length;
    plan.report.IMPORT_STATUS = "DRY_RUN";
    plan.report.COVERAGE_AFTER = `EN=${selectable} FR~${currentFr + plan.acceptedInserts.filter((r) => r.locale === "fr").length} ES~${currentEs + plan.acceptedInserts.filter((r) => r.locale === "es").length} (dry-run projection; run certifier after ingest)`;
    for (const line of formatLicensedImportReport(plan.report)) console.log(line);
    return plan;
  }

  if (plan.rejected.length > 0 && options.allowRejects !== true) {
    plan.report.IMPORT_STATUS = "NOT_APPLIED";
    console.error("STOP: artifact has rejected rows. Re-run with --dry-run, or pass --allow-rejects only if those rejects are understood.");
    for (const line of formatLicensedImportReport(plan.report)) console.log(line);
    return plan;
  }

  const writer = options.writer ?? createPrismaLicensedImportWriter(prisma, { releaseVersion: options.releaseVersion });
  try {
    const applied = await applyLicensedImportPlanInChunks({
      plan,
      writer,
      chunkSize,
      supersedePrior: options.supersedePrior,
      onChunk: (info) => {
        console.log(`CHUNK ${info.index}/${info.total} ${info.phase} size=${info.size}`);
      },
    });
    plan.report.CHUNK_COUNT = applied.insertChunks + (options.supersedePrior ? applied.supersedeChunks : 0);
    plan.report.WRITE_ROUND_TRIPS = applied.writeRoundTrips;
    plan.report.FAILED_CHUNK = null;
    plan.report.FAILED_PHASE = null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const chunkMatch = /CHUNK_(\d+)_FAILED/.exec(message);
    const phaseMatch = /LICENSED_IMPORT_(INSERT|UPDATE|SUPERSEDE|RECOMPUTE)_/.exec(message);
    plan.report.IMPORT_STATUS = "PARTIAL";
    plan.report.FAILED_CHUNK = chunkMatch ? Number(chunkMatch[1]) : null;
    plan.report.FAILED_PHASE = (phaseMatch?.[1] as Icd10LicensedImportPlan["report"]["FAILED_PHASE"]) ?? "INSERT";
    console.error(message);
    for (const line of formatLicensedImportReport(plan.report)) console.log(line);
    throw err;
  }

  const identities = uniqueLicensedImportIdentities([
    ...plan.acceptedInserts,
    ...plan.acceptedUpdates,
    ...plan.unchanged,
  ]);
  plan.report.RECOMPUTE_CALL_COUNT = identities.length;
  try {
    if (options.recompute) {
      await options.recompute(identities);
    } else {
      const stats: Icd10EffectiveRecomputeStats = await recomputeIcd10EffectiveClinicianLabels(prisma, identities, {
        batchSize: options.recomputeBatchSize ?? ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
        store: options.recomputeStore,
        onBatch: (info) => {
          console.log(`RECOMPUTE_BATCH ${info.index}/${info.total} size=${info.size}`);
        },
      });
      plan.report.RECOMPUTE_CALL_COUNT = stats.identityCount;
      plan.report.RECOMPUTE_BATCH_SIZE = stats.batchSize;
      plan.report.RECOMPUTE_BATCH_COUNT = stats.batchCount;
      plan.report.RECOMPUTE_SELECT_OPERATIONS = stats.selectOperations;
      plan.report.RECOMPUTE_CLEAR_OPERATIONS = stats.clearOperations;
      plan.report.RECOMPUTE_SET_OPERATIONS = stats.setOperations;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const recomputeBatch = /EFFECTIVE_RECOMPUTE_BATCH_(\d+)_FAILED/.exec(message);
    plan.report.IMPORT_STATUS = "PARTIAL";
    plan.report.FAILED_PHASE = "RECOMPUTE";
    if (recomputeBatch) plan.report.FAILED_CHUNK = Number(recomputeBatch[1]);
    console.error(message);
    for (const line of formatLicensedImportReport(plan.report)) console.log(line);
    throw err;
  }

  if (options.skipCoverageQuery === true) {
    plan.report.IMPORT_STATUS = "COMPLETE";
    plan.report.COVERAGE_AFTER = "skipped (isolated test)";
    for (const line of formatLicensedImportReport(plan.report)) console.log(line);
    return plan;
  }

  const [selectable, enExact, frExact, esExact, effective] = await Promise.all([
    prisma.icd10DiagnosisCode.count({
      where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: options.releaseVersion, isActive: true, isSelectable: true },
    }),
    prisma.icd10DiagnosisCode.count({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: options.releaseVersion,
        isActive: true,
        isSelectable: true,
        shortDescription: { not: "" },
      },
    }),
    prisma.icd10DiagnosisTerminology.count({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: options.releaseVersion,
        locale: "fr",
        isEffective: true,
        labelRegister: "CLINICIAN_PREFERRED",
        status: "APPROVED",
      },
    }),
    prisma.icd10DiagnosisTerminology.count({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: options.releaseVersion,
        locale: "es",
        isEffective: true,
        labelRegister: "CLINICIAN_PREFERRED",
        status: "APPROVED",
      },
    }),
    prisma.icd10DiagnosisTerminology.count({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: options.releaseVersion,
        isEffective: true,
        labelRegister: "CLINICIAN_PREFERRED",
      },
    }),
  ]);
  plan.report.EFFECTIVE_AFTER = effective;
  plan.report.COVERAGE_AFTER = `EN=${enExact}/${selectable} FR=${frExact}/${selectable} ES=${esExact}/${selectable}`;
  plan.report.IMPORT_STATUS = "COMPLETE";
  for (const line of formatLicensedImportReport(plan.report)) console.log(line);
  return plan;
}

async function main() {
  const options = parseLicensedImportArgs(process.argv.slice(2));
  if (!options.file || !options.releaseVersion) {
    console.error(
      "Usage: icd:import-licensed-terminology --file=/secure/path/artifact.csv|jsonl --release=FY2026 [--dry-run] [--supersede-prior] [--allow-same-version-update] [--allow-rejects] [--chunk-size=500]",
    );
    process.exitCode = 64;
    return;
  }
  const prisma = new PrismaClient();
  try {
    const plan = await importLicensedIcd10Terminology(prisma, options);
    if (plan.report.IMPORT_STATUS === "NOT_APPLIED" || plan.report.IMPORT_STATUS === "PARTIAL") {
      process.exitCode = 1;
    } else if (
      plan.rejected.length > 0 &&
      plan.acceptedInserts.length === 0 &&
      plan.acceptedUpdates.length === 0 &&
      plan.unchanged.length === 0
    ) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
