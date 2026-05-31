import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { HAITI_MEDICATION_CATALOG } from "./data/haiti-medications";
import { HAITI_LAB_CATALOG } from "./data/haiti-lab-tests";
import { HAITI_IMAGING_CATALOG } from "./data/haiti-imaging-studies";
import { US_ER_LAB_CATALOG } from "./data/er-us-lab-tests";
import { assertNoStaleHaitiCatalogArtifacts } from "./helpers/assert-no-stale-haiti-catalog-artifacts";
import { seedHaitiMedicationCatalog } from "./helpers/seed-haiti-medication-catalog";
import { seedHaitiLabImagingCatalog } from "./helpers/seed-haiti-lab-imaging-catalog";
import { seedMrvClassifiers } from "./helpers/seed-mrv-classifiers";
import { seedUsErLabCatalog } from "./helpers/seed-us-er-lab-catalog";

const prisma = new PrismaClient();

async function main() {
  assertNoStaleHaitiCatalogArtifacts(join(__dirname, ".."));
  await seedHaitiLabImagingCatalog(prisma, HAITI_LAB_CATALOG, HAITI_IMAGING_CATALOG);
  // ER lab extension: uses existing repo billing defaults only; official LOINC/CMS import remains pending.
  await seedUsErLabCatalog(prisma, US_ER_LAB_CATALOG);
  await seedMrvClassifiers(prisma);

  // Medications — reuse full Haiti catalog (offline-first, stable codes, aliases, searchText)
  await seedHaitiMedicationCatalog(prisma, HAITI_MEDICATION_CATALOG);

  console.log("✅ Catalogs seeded (lab, imaging, medications)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
