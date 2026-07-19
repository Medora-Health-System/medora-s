/**
 *   pnpm medication:formulation:provider-validate
 */
import { PrismaClient } from "@prisma/client";
import { runProviderAvailabilityValidation } from "./medication-provider-availability-validation";

const prisma = new PrismaClient();

async function main() {
  const report = await runProviderAvailabilityValidation(prisma, { limit: 40 });
  console.log(
    JSON.stringify(
      {
        corpusSize: report.corpusSize,
        queryCount: report.queryCount,
        searchPassRate: report.searchPassRate,
        orderabilityPassRate: report.orderabilityPassRate,
        exactRankingPassRate: report.exactRankingPassRate,
        hardAcceptance: report.hardAcceptance,
        absentFamilies: report.absentFamilies.length,
        partialFamilies: report.partialFamilies.length,
        failedSample: report.failedQueries.slice(0, 20),
      },
      null,
      2
    )
  );
  if (!report.hardAcceptance.pass) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
