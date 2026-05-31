import { PrismaClient } from "@prisma/client";
import { runCatalogClassifierBackfill } from "../../src/terminology/catalog-classifier-backfill.service";
import { isTerminologyBackfillEnabled } from "../../src/terminology/terminology-flags.util";

const prisma = new PrismaClient();

async function main() {
  if (!isTerminologyBackfillEnabled()) {
    console.log("[backfill-catalog-classifiers] TERMINOLOGY_BACKFILL_ENABLED is not true — exiting without changes.");
    return;
  }

  const summary = await runCatalogClassifierBackfill(prisma);
  console.log("[backfill-catalog-classifiers] complete", summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
