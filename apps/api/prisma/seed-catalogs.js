"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const haiti_medications_1 = require("./data/haiti-medications");
const haiti_lab_tests_1 = require("./data/haiti-lab-tests");
const haiti_imaging_studies_1 = require("./data/haiti-imaging-studies");
const seed_haiti_medication_catalog_1 = require("./helpers/seed-haiti-medication-catalog");
const seed_haiti_lab_imaging_catalog_1 = require("./helpers/seed-haiti-lab-imaging-catalog");
const prisma = new client_1.PrismaClient();
async function main() {
    await (0, seed_haiti_lab_imaging_catalog_1.seedHaitiLabImagingCatalog)(prisma, haiti_lab_tests_1.HAITI_LAB_CATALOG, haiti_imaging_studies_1.HAITI_IMAGING_CATALOG);
    await (0, seed_haiti_medication_catalog_1.seedHaitiMedicationCatalog)(prisma, haiti_medications_1.HAITI_MEDICATION_CATALOG);
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
//# sourceMappingURL=seed-catalogs.js.map