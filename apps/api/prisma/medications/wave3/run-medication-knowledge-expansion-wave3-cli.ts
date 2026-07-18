/**
 *   pnpm medication:wave3:audit
 *   pnpm medication:wave3:validate
 *   pnpm medication:wave3:dry-run
 *   pnpm medication:wave3:apply
 *   pnpm medication:wave3:verify
 *   pnpm medication:wave3:report
 *   pnpm medication:wave3:reconcile
 */
import { PrismaClient } from "@prisma/client";
import type { MkExpansionWave3PipelineMode } from "@medora/shared";
import {
  collectWave3Baseline,
  reconcileWave3Concepts,
  runWave3Import,
  writeWave3Artifact,
} from "./medication-knowledge-expansion-wave3-import";

const prisma = new PrismaClient();

function parseMode(raw: string | undefined): MkExpansionWave3PipelineMode {
  const m = (raw ?? "AUDIT").trim().toUpperCase();
  if (
    m === "AUDIT" ||
    m === "VALIDATE" ||
    m === "DRY_RUN" ||
    m === "APPLY" ||
    m === "VERIFY" ||
    m === "REPORT" ||
    m === "RECONCILE"
  ) {
    return m;
  }
  throw new Error(`Unknown Wave 3 mode: ${raw}`);
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const mode = parseMode(process.argv[2]);
  const sourceKey = parseArg("--source") ?? "MEDORA_CURATED";
  const filePath = parseArg("--file");

  if (mode === "RECONCILE") {
    const report = await reconcileWave3Concepts(prisma);
    const path = writeWave3Artifact(
      "medication-knowledge-expansion-wave3-reconcile.json",
      { mode, ...report }
    );
    console.log(JSON.stringify({ path, ...report }, null, 2));
    return;
  }

  if (mode === "AUDIT") {
    const baseline = await collectWave3Baseline(prisma);
    const path = writeWave3Artifact(
      "medication-knowledge-expansion-wave3-baseline.json",
      {
        title: "Medication Knowledge Expansion Wave 3 — Baseline",
        ...baseline,
        note: "Counts from live database; not hardcoded.",
      }
    );
    // Also run VALIDATE-style source check without mutations
    const validated = await runWave3Import(prisma, "VALIDATE", { sourceKey, filePath });
    writeWave3Artifact("medication-knowledge-expansion-wave3-validate.json", validated);
    console.log(
      JSON.stringify(
        {
          path,
          baseline: {
            catalogTotal: baseline.catalogTotal,
            distinctNormalizedGenerics: baseline.distinctNormalizedGenerics,
            rxNormMappedConcepts: baseline.rxNormMappedConcepts,
            rxNormStagingConcepts: baseline.rxNormStagingConcepts,
          },
          sourceChecksumSha256: validated.sourceChecksumSha256,
          rowsReceived: validated.rowsReceived,
          rowsValid: validated.rowsValid,
          rowsInvalid: validated.rowsInvalid,
        },
        null,
        2
      )
    );
    return;
  }

  const result = await runWave3Import(prisma, mode, { sourceKey, filePath });
  const artifactName =
    mode === "APPLY" && result.catalogRowsCreated === 0
      ? "medication-knowledge-expansion-wave3-apply-idempotent.json"
      : `medication-knowledge-expansion-wave3-${mode.toLowerCase()}.json`;
  const path = writeWave3Artifact(artifactName, result);

  console.log(
    JSON.stringify(
      {
        path,
        mode: result.mode,
        jobId: result.jobId,
        sourceKey: result.sourceKey,
        sourceChecksumSha256: result.sourceChecksumSha256,
        rowsReceived: result.rowsReceived,
        rowsValid: result.rowsValid,
        newCanonicalConcepts: result.newCanonicalConcepts,
        existingNewProducts: result.existingNewProducts,
        duplicateRejected: result.duplicateRejected,
        catalogRowsCreated: result.catalogRowsCreated,
        conceptsCreated: result.conceptsCreated,
        productsCreated: result.productsCreated,
        packagesCreated: result.packagesCreated,
        aliasesCreated: result.aliasesCreated,
        orderMutations: result.orderMutations,
        marMutations: result.marMutations,
        baselineBefore: result.baselineBefore
          ? {
              catalogTotal: result.baselineBefore.catalogTotal,
              distinctNormalizedGenerics:
                result.baselineBefore.distinctNormalizedGenerics,
            }
          : null,
        baselineAfter: result.baselineAfter
          ? {
              catalogTotal: result.baselineAfter.catalogTotal,
              distinctNormalizedGenerics:
                result.baselineAfter.distinctNormalizedGenerics,
            }
          : null,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
