import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertNoStaleHaitiCatalogArtifacts } from "./assert-no-stale-haiti-catalog-artifacts";
import { seedHaitiMedicationCatalog } from "./seed-haiti-medication-catalog";
import { seedHaitiLabImagingCatalog } from "./seed-haiti-lab-imaging-catalog";
import { seedHaitiImagingWave1 } from "./seed-haiti-imaging-wave1";
import { seedHaitiImagingWave2 } from "./seed-haiti-imaging-wave2";
import { seedHaitiImagingWave3 } from "./seed-haiti-imaging-wave3";
import { seedHaitiImagingWave4 } from "./seed-haiti-imaging-wave4";
import { seedMrvClassifiers } from "./seed-mrv-classifiers";
import { seedUsErLabCatalog } from "./seed-us-er-lab-catalog";
import { seedBillingCatalogCommonMappings } from "./seed-billing-catalog";
import { seedMedicationBillingMappingRemediation } from "./seed-medication-billing-mapping-remediation";
import { seedUsInsurancePayers } from "./seed-us-insurance-payers";
import { HAITI_MEDICATION_CATALOG_FULL } from "../data/haiti-medication-catalog-full";
import { HAITI_LAB_CATALOG } from "../data/haiti-lab-tests";
import { HAITI_IMAGING_CATALOG } from "../data/haiti-imaging-studies";
import { US_ER_LAB_CATALOG } from "../data/er-us-lab-tests";

/**
 * Enterprise clinical catalogs (lab, imaging, medications, vaccines, payers, billing).
 * Idempotent. Safe for production configuration seeding.
 */
export async function seedEnterpriseCatalogs(prisma: PrismaClient) {
  assertNoStaleHaitiCatalogArtifacts(join(__dirname, ".."));
  await seedHaitiLabImagingCatalog(prisma, HAITI_LAB_CATALOG, HAITI_IMAGING_CATALOG);
  await seedMrvClassifiers(prisma);
  await seedHaitiImagingWave1(prisma);
  await seedHaitiImagingWave2(prisma);
  await seedHaitiImagingWave3(prisma);
  await seedHaitiImagingWave4(prisma);
  await seedUsErLabCatalog(prisma, US_ER_LAB_CATALOG);
  await seedBillingCatalogCommonMappings(prisma);
  await seedUsInsurancePayers(prisma);

  const medCatalogIds = await seedHaitiMedicationCatalog(prisma, HAITI_MEDICATION_CATALOG_FULL);
  const medBillingRemediation = await seedMedicationBillingMappingRemediation(prisma);
  console.log(
    `✅ Medication billing mapping remediation (manifest=${medBillingRemediation.manifestEntries}, billingCatalogCreated=${medBillingRemediation.billingCatalogCreated}, billingDefaultCreated=${medBillingRemediation.catalogBillingDefaultCreated}, ndcCreated=${medBillingRemediation.catalogNdcCreated}, packageProfiles=${medBillingRemediation.packageBillingProfileCreated}, skippedExisting=${medBillingRemediation.duplicateProtected})`,
  );

  const vaccineCatalog = [
    { code: "OPV", name: "Oral Polio Vaccine", description: "Polio", manufacturer: "WHO prequalified" },
    { code: "BCG", name: "BCG", description: "Tuberculosis", manufacturer: "WHO prequalified" },
    { code: "MMR", name: "MMR", description: "Measles, mumps, rubella", manufacturer: "WHO prequalified" },
    { code: "DTP", name: "DTP", description: "Diphtheria, tetanus, pertussis", manufacturer: "WHO prequalified" },
    { code: "HEPB", name: "Hepatitis B", description: "Hep B", manufacturer: "WHO prequalified" },
    { code: "TYPHOID", name: "Typhoid vaccine", description: "Typhoid fever", manufacturer: "WHO prequalified" },
    { code: "CHOLERA", name: "Cholera vaccine", description: "Cholera (oral)", manufacturer: "WHO prequalified" },
    { code: "YELLOW_FEVER", name: "Yellow fever vaccine", description: "Yellow fever", manufacturer: "WHO prequalified" },
  ];
  const vaccineCatalogIds: Record<string, string> = {};
  for (const v of vaccineCatalog) {
    const created = await prisma.vaccineCatalog.upsert({
      where: { code: v.code },
      update: {
        name: v.name,
        description: v.description ?? undefined,
        manufacturer: v.manufacturer ?? undefined,
      },
      create: v,
    });
    vaccineCatalogIds[v.code] = created.id;
  }

  return { medCatalogIds, vaccineCatalogIds };
}
