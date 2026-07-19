/**
 *   pnpm medication:universal:audit
 *   pnpm medication:universal:dry-run
 *   pnpm medication:universal:apply
 *   pnpm medication:universal:validate
 *   pnpm medication:universal:verify
 */
import { PrismaClient } from "@prisma/client";
import {
  runUniversalCommonOrderability,
  type UniversalCompletionMode,
} from "./medication-universal-common-orderability";

const prisma = new PrismaClient();

function parseMode(raw: string | undefined): UniversalCompletionMode {
  const m = (raw ?? "AUDIT").trim().toUpperCase();
  if (
    m === "AUDIT" ||
    m === "DRY_RUN" ||
    m === "APPLY" ||
    m === "VERIFY" ||
    m === "VALIDATE"
  ) {
    return m;
  }
  throw new Error(`Unknown universal-completion mode: ${raw}`);
}

async function main() {
  const mode = parseMode(process.argv[2]);
  const report = await runUniversalCommonOrderability(prisma, mode);
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        benchmarkFamilyCount: report.benchmarkFamilyCount,
        searchPassRate: report.searchPassRate,
        orderabilityPassRate: report.orderabilityPassRate,
        exactBrandRankingPassRate: report.exactBrandRankingPassRate,
        exactGenericRankingPassRate: report.exactGenericRankingPassRate,
        completeFamilyCount: report.completeFamilyCount,
        missingFamilyCount: report.missingFamilyCount,
        partialFamilyCount: report.partialFamilyCount,
        classificationCounts: report.classificationCounts,
        enrichment: report.enrichment,
        hardAcceptance: report.hardAcceptance,
        aliasesCreated: (report.enrichment as { aliasesCreated?: number })?.aliasesCreated,
      },
      null,
      2
    )
  );
  if (report.hardAcceptance && !(report.hardAcceptance as { pass?: boolean }).pass) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
