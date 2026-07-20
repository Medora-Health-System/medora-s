/**
 * pnpm medication:validate:critical|full|deployment
 */
import {
  permanentValidationExitCode,
  runPermanentMedicationValidation,
} from "./medication-permanent-validation-runner";
import type { PermanentValidationTier } from "@medora/shared";

async function main() {
  const tier = (process.argv[2] || "critical").toLowerCase() as PermanentValidationTier;
  if (!["critical", "full", "deployment"].includes(tier)) {
    console.error(`Unknown tier: ${tier}. Use critical | full | deployment`);
    process.exitCode = 1;
    return;
  }

  // Empty CI DBs cannot run catalog validation — skip only when explicitly allowed.
  if (process.env.MEDORA_MEDICATION_VALIDATE_ALLOW_SKIP === "1") {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const active = await prisma.catalogMedication.count({ where: { isActive: true } });
    await prisma.$disconnect();
    if (active < 50) {
      console.log(
        JSON.stringify({
          skipped: true,
          reason: "catalogActive_below_threshold",
          catalogActive: active,
          tier,
        })
      );
      return;
    }
  }

  const report = await runPermanentMedicationValidation(tier, { preferWayne: true });
  console.log(
    JSON.stringify(
      {
        tier: report.tier,
        familyCount: report.familyCount,
        queriesTested: report.queriesTested,
        searchPassRate: report.searchPassRate,
        orderabilityPassRate: report.orderabilityPassRate,
        exactBrandRankingPassRate: report.exactBrandRankingPassRate,
        exactGenericRankingPassRate: report.exactGenericRankingPassRate,
        hardAcceptancePass: report.hardAcceptancePass,
        failureCount: Array.isArray(report.failures) ? report.failures.length : 0,
        failureCountsByClassification: report.failureCountsByClassification,
        performance: report.performance,
        environment: report.environment,
        facility: report.facility,
      },
      null,
      2
    )
  );
  process.exitCode = permanentValidationExitCode(report);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
