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
import { seedMedicationSafetyClassifiers } from "./helpers/seed-medication-safety-classifiers";
import { seedControlledSubstanceGovernance } from "./helpers/seed-controlled-substance-governance";
import { seedHighAlertMedicationGovernance } from "./helpers/seed-high-alert-medication-governance";
import { seedLasaMedicationGovernance } from "./helpers/seed-lasa-medication-governance";
import { seedHaitiImagingWave1 } from "./helpers/seed-haiti-imaging-wave1";
import { seedHaitiImagingWave2 } from "./helpers/seed-haiti-imaging-wave2";
import { seedHaitiImagingWave3 } from "./helpers/seed-haiti-imaging-wave3";
import { seedHaitiImagingWave4 } from "./helpers/seed-haiti-imaging-wave4";
import { seedUsErLabCatalog } from "./helpers/seed-us-er-lab-catalog";

const prisma = new PrismaClient();

async function main() {
  assertNoStaleHaitiCatalogArtifacts(join(__dirname, ".."));
  await seedHaitiLabImagingCatalog(prisma, HAITI_LAB_CATALOG, HAITI_IMAGING_CATALOG);
  // ER lab extension: uses existing repo billing defaults only; official LOINC/CMS import remains pending.
  await seedUsErLabCatalog(prisma, US_ER_LAB_CATALOG);
  await seedMrvClassifiers(prisma);
  await seedMedicationSafetyClassifiers(prisma);
  console.log("✅ Medication safety classifiers seeded (TermClassifier reference vocabulary only)");
  const wave1 = await seedHaitiImagingWave1(prisma);
  console.log(
    `✅ Wave 1 imaging catalog (${wave1.catalogUpserted} studies, ${wave1.aliasesCreated} aliases, ${wave1.xrChestTupleAliasesCreated} XR_CHEST tuple aliases)`
  );
  const wave2 = await seedHaitiImagingWave2(prisma);
  console.log(
    `✅ Wave 2 imaging catalog (${wave2.catalogUpserted} studies, ${wave2.aliasesCreated} aliases, ${wave2.usTupleMappingsApplied} US tuple mappings, ${wave2.usTupleAliasesCreated} tuple aliases, ${wave2.usTupleProtocolsUpdated} tuple protocol updates)`
  );
  const wave3 = await seedHaitiImagingWave3(prisma);
  console.log(
    `✅ Wave 3 imaging catalog (${wave3.catalogUpserted} studies, ${wave3.aliasesCreated} aliases)`
  );
  const wave4 = await seedHaitiImagingWave4(prisma);
  console.log(
    `✅ Wave 4 imaging catalog (${wave4.catalogUpserted} studies, ${wave4.aliasesCreated} aliases)`
  );

  // Medications — reuse full Haiti catalog (offline-first, stable codes, aliases, searchText)
  await seedHaitiMedicationCatalog(prisma, HAITI_MEDICATION_CATALOG);

  const controlledGov = await seedControlledSubstanceGovernance(prisma);
  console.log(
    `✅ Controlled substance governance applied (matched=${controlledGov.catalogMatched}, updated=${controlledGov.catalogUpdated}, already=${controlledGov.catalogAlreadyCompliant}, notFound=${controlledGov.catalogNotFound}, manualReviewSkipped=${controlledGov.manualReviewSkipped})`
  );

  const highAlertGov = await seedHighAlertMedicationGovernance(prisma);
  console.log(
    `✅ High-alert medication governance applied (matched=${highAlertGov.catalogMatched}, catalogWitnessUpdated=${highAlertGov.catalogWitnessFlagsUpdated}, profileUpdated=${highAlertGov.safetyProfileUpdated}, profileSkippedNoProfile=${highAlertGov.safetyProfileSkippedNoProfile}, manualReviewSkipped=${highAlertGov.manualReviewSkipped}, safetyReqCodes=${highAlertGov.safetyRequirementMappingCount})`
  );

  const lasaGov = await seedLasaMedicationGovernance(prisma);
  console.log(
    `✅ LASA medication governance applied (groups=${lasaGov.applyGroupCount}, members=${lasaGov.applyMemberCount}, matched=${lasaGov.catalogMatched}, profileUpdated=${lasaGov.safetyProfileUpdated}, manualReviewSkipped=${lasaGov.manualReviewSkipped}, missingSkipped=${lasaGov.missingCatalogSkipped})`
  );

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
