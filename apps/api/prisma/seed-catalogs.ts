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
import { seedBillingCatalogCommonMappings } from "./helpers/seed-billing-catalog";
import { seedMedicationBillingMappingRemediation } from "./helpers/seed-medication-billing-mapping-remediation";
import { seedHaitiCanonicalMedicationLinkage } from "./helpers/seed-haiti-canonical-medication-linkage";
import { seedEnterpriseWave1Formulary } from "./helpers/seed-enterprise-wave1-formulary";
import { seedEnterpriseWave2Formulary } from "./helpers/seed-enterprise-wave2-formulary";
import { seedEnterpriseMedicationSearchAliases } from "./helpers/seed-enterprise-medication-search-aliases";

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

  await seedBillingCatalogCommonMappings(prisma);
  const medBillingRemediation = await seedMedicationBillingMappingRemediation(prisma);
  console.log(
    `✅ Medication billing mapping remediation (manifest=${medBillingRemediation.manifestEntries}, billingCatalogCreated=${medBillingRemediation.billingCatalogCreated}, billingDefaultCreated=${medBillingRemediation.catalogBillingDefaultCreated}, duplicateProtected=${medBillingRemediation.duplicateProtected})`
  );

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

  if (process.env.MEDORA_ENABLE_HAITI_CANONICAL_LINKAGE_BACKFILL === "1") {
    const linkage = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false });
    console.log(
      `✅ Haiti canonical linkage backfill (concepts=${linkage.createdConcepts}, products=${linkage.createdProducts}, packages=${linkage.createdPackages}, linked=${linkage.linkedCatalogMedications}, skippedManualReview=${linkage.skippedManualReview})`
    );
  }

  if (process.env.MEDORA_ENABLE_HAITI_CANONICAL_ACTIVATION_PILOT === "1") {
    const facility = await prisma.facility.findFirst({ select: { id: true } });
    if (!facility) {
      throw new Error(
        "[haiti-pilot] no facility found — seed facility before MEDORA_ENABLE_HAITI_CANONICAL_ACTIVATION_PILOT=1"
      );
    }
    const { seedHaitiCanonicalActivationPilot } = await import(
      "./helpers/seed-haiti-canonical-activation-pilot"
    );
    const pilot = await seedHaitiCanonicalActivationPilot(prisma, {
      facilityId: facility.id,
      dryRun: process.env.MEDORA_HAITI_CANONICAL_ACTIVATION_PILOT_DRY_RUN === "1",
    });
    console.log(
      `✅ Haiti canonical activation pilot (eligible=${pilot.pilotEligible}, activated=${pilot.activatedProducts}, skippedValidation=${pilot.skippedValidationFailed}, dryRun=${pilot.dryRun})`
    );
  }

  if (process.env.MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY === "1") {
    const wave1Med = await seedEnterpriseWave1Formulary(prisma, { dryRun: false });
    console.log(
      `✅ Enterprise Wave 1 formulary (manifest=${wave1Med.manifestEntries}, catalogCreated=${wave1Med.catalogCreated}, catalogEnriched=${wave1Med.catalogEnriched}, products=${wave1Med.productsCreated}, billingProfiles=${wave1Med.billingProfilesCreated}, wave1MarkersUpdated=${wave1Med.wave1GovernanceNotesUpdated}, wave1ReadinessPct=${wave1Med.readinessReport.wave1ReadinessPct})`
    );
  }

  if (process.env.MEDORA_ENABLE_ENTERPRISE_WAVE2_FORMULARY === "1") {
    const wave2Med = await seedEnterpriseWave2Formulary(prisma, { dryRun: false });
    console.log(
      `✅ Enterprise Wave 2 formulary (manifest=${wave2Med.manifestEntries}, catalogCreated=${wave2Med.catalogCreated}, catalogEnriched=${wave2Med.catalogEnriched}, products=${wave2Med.productsCreated}, billingProfiles=${wave2Med.billingProfilesCreated}, wave2MarkersUpdated=${wave2Med.wave2GovernanceNotesUpdated}, wave2ReadinessPct=${wave2Med.readinessReport.wave2ReadinessPct})`
    );
  }

  if (process.env.MEDORA_ENABLE_ENTERPRISE_WAVE3_FORMULARY === "1") {
    const { seedEnterpriseWave3Formulary } = await import("./helpers/seed-enterprise-wave3-formulary");
    const wave3Med = await seedEnterpriseWave3Formulary(prisma, { dryRun: false });
    console.log(
      `✅ Enterprise Wave 3 formulary (manifest=${wave3Med.manifestEntries}, catalogCreated=${wave3Med.catalogCreated}, catalogEnriched=${wave3Med.catalogEnriched}, products=${wave3Med.productsCreated}, billingProfiles=${wave3Med.billingProfilesCreated}, wave3MarkersUpdated=${wave3Med.wave3GovernanceNotesUpdated}, wave3ReadinessPct=${wave3Med.readinessReport.wave3ReadinessPct})`
    );
  }

  if (process.env.MEDORA_ENABLE_ENTERPRISE_MEDICATION_SEARCH_ALIASES === "1") {
    const searchAlias = await seedEnterpriseMedicationSearchAliases(prisma, { dryRun: false });
    console.log(
      `✅ Enterprise medication search aliases (manifest=${searchAlias.manifestEntries}, catalogsFound=${searchAlias.catalogsFound}, missing=${searchAlias.catalogsMissing}, aliasesAdded=${searchAlias.aliasesUpserted}, searchTextUpdated=${searchAlias.searchTextUpdated})`
    );
  }

  if (
    process.env.MEDORA_ENTERPRISE_PILOT_ROLLBACK === "1" &&
    process.env.MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION === "1"
  ) {
    throw new Error(
      "[enterprise-pilot] cannot set MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 together with MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1"
    );
  }

  if (process.env.MEDORA_ENTERPRISE_PILOT_ROLLBACK === "1") {
    const facility = await prisma.facility.findFirst({ select: { id: true } });
    if (!facility) {
      throw new Error(
        "[enterprise-pilot] no facility found — seed facility before MEDORA_ENTERPRISE_PILOT_ROLLBACK=1"
      );
    }
    const { rollbackEnterpriseFormularyPilotTrancheA, parseEnterprisePilotCatalogCodesFromEnv } =
      await import("./helpers/seed-enterprise-formulary-pilot-activation");
    const catalogCodes = parseEnterprisePilotCatalogCodesFromEnv(
      process.env.MEDORA_ENTERPRISE_PILOT_CATALOG_CODES
    );
    const rollback = await rollbackEnterpriseFormularyPilotTrancheA(prisma, {
      facilityId: facility.id,
      dryRun: process.env.MEDORA_ENTERPRISE_PILOT_DRY_RUN === "1",
      catalogCodes,
    });
    console.log(
      `✅ Enterprise formulary pilot rollback (rolledBack=${rollback.rolledBack}, failures=${rollback.failures.length}, dryRun=${rollback.dryRun})`
    );
    if (rollback.failures.length > 0) {
      console.warn(`[enterprise-pilot] rollback warnings: ${rollback.failures.join("; ")}`);
    }
  }

  if (process.env.MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION === "1") {
    const facility = await prisma.facility.findFirst({ select: { id: true } });
    if (!facility) {
      throw new Error(
        "[enterprise-pilot] no facility found — seed facility before MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1"
      );
    }
    const { activateEnterpriseFormularyPilotTrancheA, parseEnterprisePilotCatalogCodesFromEnv } =
      await import("./helpers/seed-enterprise-formulary-pilot-activation");
    const catalogCodes = parseEnterprisePilotCatalogCodesFromEnv(
      process.env.MEDORA_ENTERPRISE_PILOT_CATALOG_CODES
    );
    const pilot = await activateEnterpriseFormularyPilotTrancheA(prisma, {
      facilityId: facility.id,
      dryRun: process.env.MEDORA_ENTERPRISE_PILOT_DRY_RUN === "1",
      catalogCodes,
      pilotNote: process.env.MEDORA_ENTERPRISE_PILOT_NOTE?.trim(),
      activatedBy: process.env.MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY?.trim(),
    });
    console.log(
      `✅ Enterprise formulary pilot Tranche A (requested=${pilot.requested}, activated=${pilot.activatedProducts}, alreadyActivated=${pilot.alreadyActivated}, skippedValidation=${pilot.skippedValidationFailed}, pending=${pilot.dashboard.pendingReviewCount}, activationReadinessPct=${pilot.dashboard.activationReadinessPct}, dryRun=${pilot.dryRun})`
    );
  }

  if (process.env.MEDORA_ENABLE_HAITI_CANONICAL_STABILIZATION_REMEDIATION === "1") {
    const { remediateHaitiCanonicalStabilization, auditHaitiCanonicalStabilization } =
      await import("./helpers/seed-haiti-canonical-stabilization-remediation");
    const dryRun = process.env.MEDORA_HAITI_STABILIZATION_REMEDIATION_DRY_RUN !== "0";
    const auditBefore = await auditHaitiCanonicalStabilization(prisma);
    const remediation = await remediateHaitiCanonicalStabilization(prisma, { dryRun });
    console.log(
      `✅ Haiti canonical stabilization remediation (dryRun=${remediation.dryRun}, unlinked=${remediation.unlinkedInvalidProducts}, deactivatedCatalogs=${remediation.deactivatedPollutionCatalogs}, pollutionBefore=${auditBefore.activePollutionCatalogs})`
    );
  }

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
