/**
 *   pnpm medication:orderable:audit
 *   pnpm medication:orderable:dry-run
 *   pnpm medication:orderable:complete
 *   pnpm medication:orderable:verify
 *   pnpm medication:orderable:report
 */
import { PrismaClient } from "@prisma/client";
import {
  collectOrderableBaseline,
  runOrderableCatalogCompletion,
  writeOrderableCompletionArtifact,
  type OrderableCompletionMode,
} from "./medication-orderable-catalog-completion";

const prisma = new PrismaClient();

function parseMode(raw: string | undefined): OrderableCompletionMode {
  const m = (raw ?? "AUDIT").trim().toUpperCase();
  if (
    m === "AUDIT" ||
    m === "COMPLETE" ||
    m === "VERIFY" ||
    m === "REPORT" ||
    m === "DRY_RUN"
  ) {
    return m;
  }
  throw new Error(`Unknown orderable-completion mode: ${raw}`);
}

async function main() {
  const mode = parseMode(process.argv[2]);

  if (mode === "AUDIT") {
    const baseline = await collectOrderableBaseline(prisma);
    const path = writeOrderableCompletionArtifact(
      "medication-orderable-catalog-completion-baseline.json",
      {
        title: "Medication Orderable Catalog Completion — Baseline",
        ...baseline,
      }
    );
    const audited = await runOrderableCatalogCompletion(prisma, "AUDIT");
    writeOrderableCompletionArtifact(
      "medication-orderable-catalog-completion-audit.json",
      audited
    );
    console.log(
      JSON.stringify(
        {
          path,
          baseline: {
            catalogTotal: baseline.catalogTotal,
            catalogActive: baseline.catalogActive,
            distinctGenerics: baseline.distinctGenerics,
            providerOrderableCatalogRows: baseline.providerOrderableCatalogRows,
            nonOrderableCatalogRows: baseline.nonOrderableCatalogRows,
            coveragePercent: baseline.coveragePercent,
            aliases: baseline.aliases,
            brandAliasRows: baseline.brandAliasRows,
            blockers: baseline.blockers,
          },
          commonClinicalSearch: audited.commonClinicalSearch,
        },
        null,
        2
      )
    );
    return;
  }

  const result = await runOrderableCatalogCompletion(prisma, mode);
  const path = writeOrderableCompletionArtifact(
    `medication-orderable-catalog-completion-${mode.toLowerCase()}.json`,
    result
  );
  console.log(
    JSON.stringify(
      {
        path,
        mode: result.mode,
        metadataStrengthFilled: result.metadataStrengthFilled,
        metadataFormFilled: result.metadataFormFilled,
        aliasesCreated: result.aliasesCreated,
        searchTextUpdated: result.searchTextUpdated,
        manualReviewCount: result.manualReview.length,
        commonClinicalSearch: result.commonClinicalSearch,
        baselineBefore: result.baselineBefore
          ? {
              providerOrderableCatalogRows:
                result.baselineBefore.providerOrderableCatalogRows,
              coveragePercent: result.baselineBefore.coveragePercent,
              aliases: result.baselineBefore.aliases,
              brandAliasRows: result.baselineBefore.brandAliasRows,
            }
          : null,
        baselineAfter: result.baselineAfter
          ? {
              providerOrderableCatalogRows:
                result.baselineAfter.providerOrderableCatalogRows,
              nonOrderableCatalogRows: result.baselineAfter.nonOrderableCatalogRows,
              coveragePercent: result.baselineAfter.coveragePercent,
              aliases: result.baselineAfter.aliases,
              brandAliasRows: result.baselineAfter.brandAliasRows,
              distinctGenerics: result.baselineAfter.distinctGenerics,
            }
          : null,
        productsActivated: result.productsActivated,
        orderMutations: result.orderMutations,
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
