/**
 *   pnpm medication:wave2:catalog:audit
 *   pnpm medication:wave2:catalog:dry-run
 *   pnpm medication:wave2:catalog:apply
 *   pnpm medication:wave2:catalog:verify
 *   pnpm medication:wave2:catalog:report
 */
import { PrismaClient } from "@prisma/client";
import type { MkExpansionWave2CatalogMode } from "@medora/shared";
import {
  collectWave2CatalogBaseline,
  runWave2CatalogImport,
  writeWave2CatalogArtifact,
} from "./medication-knowledge-expansion-wave2-catalog-import";

const prisma = new PrismaClient();

function parseMode(raw: string | undefined): MkExpansionWave2CatalogMode {
  const m = (raw ?? "AUDIT").trim().toUpperCase();
  if (
    m === "AUDIT" ||
    m === "DRY_RUN" ||
    m === "APPLY" ||
    m === "VERIFY" ||
    m === "REPORT"
  ) {
    return m;
  }
  throw new Error(`Unknown mode: ${raw}`);
}

async function main() {
  const mode = parseMode(process.argv[2]);

  if (mode === "AUDIT") {
    const baseline = await collectWave2CatalogBaseline(prisma);
    const path = writeWave2CatalogArtifact(
      "medication-knowledge-expansion-wave2-baseline.json",
      {
        title: "Medication Knowledge Expansion Wave 2 — Baseline",
        ...baseline,
        note: "Counts from live database; not hardcoded.",
      }
    );
    console.log(JSON.stringify({ path, baseline }, null, 2));
    return;
  }

  const result = await runWave2CatalogImport(prisma, mode);
  // Never clobber a successful APPLY metrics artifact with a later idempotent zero-create run.
  const artifactName =
    mode === "APPLY" && result.catalogRowsCreated === 0
      ? "medication-knowledge-expansion-wave2-catalog-apply-idempotent.json"
      : `medication-knowledge-expansion-wave2-catalog-${mode.toLowerCase()}.json`;
  const path = writeWave2CatalogArtifact(artifactName, result);
  console.log(
    JSON.stringify(
      {
        path,
        mode: result.mode,
        candidatesEvaluated: result.candidatesEvaluated,
        newCanonicalConcepts: result.newCanonicalConcepts,
        existingConceptNewVariants: result.existingConceptNewVariants,
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
