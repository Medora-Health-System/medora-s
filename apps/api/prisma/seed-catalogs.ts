import { PrismaClient } from "@prisma/client";
import { HAITI_MEDICATION_CATALOG } from "./data/haiti-medications";
import { HAITI_LAB_CATALOG } from "./data/haiti-lab-tests";
import { HAITI_IMAGING_CATALOG } from "./data/haiti-imaging-studies";
import { seedHaitiMedicationCatalog } from "./helpers/seed-haiti-medication-catalog";
import { seedHaitiLabImagingCatalog } from "./helpers/seed-haiti-lab-imaging-catalog";

const prisma = new PrismaClient();

async function main() {
  await seedHaitiLabImagingCatalog(prisma, HAITI_LAB_CATALOG, HAITI_IMAGING_CATALOG);

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
