/**
 * MEDUI.MEDICATION.PRODUCTION_DB_PARITY_REMAINING_GAPS_ANALYSIS.1
 * Read-only deep gap analysis — does NOT modify production data.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildUnifiedOrderabilityMap,
  getActiveProviderOrderableCatalogCodes,
  prewarmProviderOrderableCatalogCodesRegistry,
  resolveMedicationBillingReadiness,
  listActiveTranche1PilotCatalogCodes,
  listActiveTranche2ProviderOrderingCatalogCodes,
  listActiveCriticalCareProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveCardiologyProviderOrderingCatalogCodes,
  listActiveIvFluidsProviderOrderingCatalogCodes,
  listActiveAnticoagulationProviderOrderingCatalogCodes,
  listActiveInsulinDiabetesProviderOrderingCatalogCodes,
  listActiveVaccineProviderOrderingCatalogCodes,
  listActiveObgynProviderOrderingCatalogCodes,
  listActivePsychiatryProviderOrderingCatalogCodes,
  listActiveGastroenterologyProviderOrderingCatalogCodes,
  listActivePediatricsProviderOrderingCatalogCodes,
  listActiveSurgeryPerioperativeProviderOrderingCatalogCodes,
  listActivePainManagementProviderOrderingCatalogCodes,
  listActiveControlledSubstanceProviderOrderingCatalogCodes,
  ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE,
  ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE1_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE2_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE3_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE,
} from "@medora/shared";
import { CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES } from "../prisma/helpers/seed-enterprise-controlled-substance-catalog";
import { ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE } from "../../../packages/shared/dist/medication/enterpriseCardiologyFormularyManifest.js";
import { ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE } from "../../../packages/shared/dist/medication/enterprisePsychiatryFormularyManifest.js";
import { ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE } from "../../../packages/shared/dist/medication/enterpriseGastroenterologyFormularyManifest.js";
import { ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE } from "../../../packages/shared/dist/medication/enterprisePediatricsFormularyManifest.js";
import { ENTERPRISE_OBGYN_FORMULARY_BY_CODE } from "../../../packages/shared/dist/medication/enterpriseObgynFormularyManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE } from "../../../packages/shared/dist/medication/enterpriseNeurologyInfectiousDiseaseFormularyManifest.js";

const prisma = new PrismaClient();

const DOMAIN_LISTS: Array<{ domain: string; codes: () => string[] }> = [
  { domain: "Tranche 1", codes: () => listActiveTranche1PilotCatalogCodes() },
  { domain: "Tranche 2", codes: () => listActiveTranche2ProviderOrderingCatalogCodes() },
  { domain: "Critical Care", codes: () => listActiveCriticalCareProviderOrderingCatalogCodes() },
  { domain: "Neurology", codes: () => listActiveNeurologyProviderOrderingCatalogCodes() },
  { domain: "Infectious Disease", codes: () => listActiveInfectiousDiseaseProviderOrderingCatalogCodes() },
  { domain: "Cardiology", codes: () => listActiveCardiologyProviderOrderingCatalogCodes() },
  { domain: "IV Fluids", codes: () => listActiveIvFluidsProviderOrderingCatalogCodes() },
  { domain: "Anticoagulation", codes: () => listActiveAnticoagulationProviderOrderingCatalogCodes() },
  { domain: "Diabetes", codes: () => listActiveInsulinDiabetesProviderOrderingCatalogCodes() },
  { domain: "Vaccines", codes: () => listActiveVaccineProviderOrderingCatalogCodes() },
  { domain: "OBGYN", codes: () => listActiveObgynProviderOrderingCatalogCodes() },
  { domain: "Psychiatry", codes: () => listActivePsychiatryProviderOrderingCatalogCodes() },
  { domain: "Gastroenterology", codes: () => listActiveGastroenterologyProviderOrderingCatalogCodes() },
  { domain: "Pediatrics", codes: () => listActivePediatricsProviderOrderingCatalogCodes() },
  { domain: "Surgery", codes: () => listActiveSurgeryPerioperativeProviderOrderingCatalogCodes() },
  { domain: "Pain Management", codes: () => listActivePainManagementProviderOrderingCatalogCodes() },
  { domain: "Controlled Substances", codes: () => listActiveControlledSubstanceProviderOrderingCatalogCodes() },
];

const MANIFEST_SOURCES: Array<{ file: string; has: (code: string) => boolean }> = [
  { file: "enterpriseIvFluidsFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseControlledSubstanceFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseWave1FormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_WAVE1_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseWave2FormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_WAVE2_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseWave3FormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_WAVE3_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseWave4EdHospitalFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseCardiologyFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE[c]) },
  { file: "enterprisePsychiatryFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseGastroenterologyFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[c]) },
  { file: "enterprisePediatricsFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseObgynFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_OBGYN_FORMULARY_BY_CODE[c]) },
  { file: "enterpriseNeurologyInfectiousDiseaseFormularyManifest.ts", has: (c) => Boolean(ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE[c]) },
];

const IV_FLUIDS_SEED_CODES = new Set(listActiveIvFluidsProviderOrderingCatalogCodes());
const WAVE_C_SEED = new Set(CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES as readonly string[]);

function domainsFor(code: string): string[] {
  return DOMAIN_LISTS.filter((d) => d.codes().includes(code)).map((d) => d.domain);
}

function manifestFilesFor(code: string): string[] {
  return MANIFEST_SOURCES.filter((m) => m.has(code)).map((m) => m.file);
}

function expectedSeedHelper(code: string): string {
  if (IV_FLUIDS_SEED_CODES.has(code)) return "seed-enterprise-iv-fluids-catalog.ts";
  if (WAVE_C_SEED.has(code)) return "seed-enterprise-controlled-substance-catalog.ts";
  if (ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[code]) return "seed-enterprise-wave4-ed-hospital-formulary.ts (MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1)";
  if (ENTERPRISE_WAVE3_FORMULARY_BY_CODE[code]) return "seed-enterprise-wave3-formulary.ts (MEDORA_ENABLE_ENTERPRISE_WAVE3_FORMULARY=1)";
  if (ENTERPRISE_WAVE2_FORMULARY_BY_CODE[code]) return "seed-enterprise-wave2-formulary.ts (MEDORA_ENABLE_ENTERPRISE_WAVE2_FORMULARY=1)";
  if (ENTERPRISE_WAVE1_FORMULARY_BY_CODE[code]) return "seed-enterprise-wave1-formulary.ts (MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY=1)";
  if (ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE[code]) return "NO_DEDICATED_SEED — domain manifest only; wave4 enrich or new domain seed needed";
  if (ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[code]) return "NO_DEDICATED_SEED — domain manifest only; wave4 enrich or new domain seed needed";
  if (ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[code]) return "NO_DEDICATED_SEED — domain manifest only";
  if (ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[code]) return "NO_DEDICATED_SEED — domain manifest only";
  if (ENTERPRISE_OBGYN_FORMULARY_BY_CODE[code]) return "NO_DEDICATED_SEED — domain manifest only";
  if (ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE[code]) return "NO_DEDICATED_SEED — domain manifest only";
  return "seed-haiti-medication-catalog.ts or unknown";
}

function whySeedDidNotCreate(code: string): string {
  if (IV_FLUIDS_SEED_CODES.has(code) && !ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[code]) {
    return "In IV fluids activation registry but absent from IV fluids formulary manifest — seed skips";
  }
  if (IV_FLUIDS_SEED_CODES.has(code)) {
    return "IV fluids seed only creates active IV fluid registry codes present in manifest; row may not have run in production or code not in seed manifest subset";
  }
  if (WAVE_C_SEED.has(code)) return "Should be created by Wave C seed — verify production seed ran after deploy";
  const helper = expectedSeedHelper(code);
  if (helper.startsWith("NO_DEDICATED_SEED")) {
    return "Manifest defines CREATE row but no catalog seed helper exists — wave seeds only ENRICH existing Haiti rows";
  }
  if (helper.includes("MEDORA_ENABLE")) {
    return "Enterprise wave seed is flag-gated CREATE/ENRICH — row missing from Haiti catalog and wave seed did not CREATE it";
  }
  return "Not in any always-on seed pipeline";
}

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

async function main() {
  prewarmProviderOrderableCatalogCodesRegistry();
  const activeCodes = [...getActiveProviderOrderableCatalogCodes()];
  const orderability = buildUnifiedOrderabilityMap();

  const dbRows = await prisma.catalogMedication.findMany({
    where: { code: { in: activeCodes } },
    select: {
      code: true,
      genericName: true,
      displayNameEn: true,
      displayNameFr: true,
      name: true,
      strength: true,
      dosageForm: true,
      route: true,
      isActive: true,
      billingCodeDefault: true,
      ndc11: true,
    },
  });
  const dbByCode = new Map(dbRows.map((r) => [r.code, r]));

  const productCounts = await prisma.$queryRaw<Array<{ catalog_code: string; product_count: number }>>`
    SELECT cm.code AS catalog_code, COUNT(mp.id)::int AS product_count
    FROM "CatalogMedication" cm
    JOIN "MedicationProduct" mp ON mp."legacyCatalogMedicationId" = cm.id
    WHERE cm.code = ANY(${activeCodes})
    GROUP BY cm.code`;
  const productByCode = new Map(productCounts.map((r) => [r.catalog_code, r.product_count]));

  const inventoryCounts = await prisma.$queryRaw<Array<{ catalog_code: string; item_count: number }>>`
    SELECT cm.code AS catalog_code, COUNT(ii.id)::int AS item_count
    FROM "CatalogMedication" cm
    JOIN "InventoryItem" ii ON ii."catalogMedicationId" = cm.id
    WHERE cm.code = ANY(${activeCodes})
    GROUP BY cm.code`;
  const inventoryByCode = new Map(inventoryCounts.map((r) => [r.catalog_code, r.item_count]));

  const missingRows = [];
  const mismatchRows = [];
  const inactiveActiveRows = [];
  const billingGaps = [];
  const inventoryGaps = [];

  for (const code of activeCodes) {
    const expected = orderability.get(code);
    const db = dbByCode.get(code);

    if (!db) {
      missingRows.push({
        catalogCode: code,
        sourceDomains: domainsFor(code),
        manifestFiles: manifestFilesFor(code),
        expectedSeedHelper: expectedSeedHelper(code),
        whySeedDidNotCreate: whySeedDidNotCreate(code),
      });
      continue;
    }

    const mismatches: Array<{ field: string; dbValue: string | null; expectedValue: string | null }> = [];
    if (!db.isActive) {
      mismatches.push({ field: "isActive", dbValue: "false", expectedValue: "true" });
    }
    if (expected) {
      if (norm(db.genericName) !== norm(expected.genericName)) {
        mismatches.push({ field: "genericName", dbValue: db.genericName, expectedValue: expected.genericName });
      }
      if (norm(db.displayNameEn) !== norm(expected.displayNameEn)) {
        mismatches.push({ field: "displayNameEn", dbValue: db.displayNameEn, expectedValue: expected.displayNameEn });
      }
      if (norm(db.displayNameFr ?? db.name) !== norm(expected.displayNameFr)) {
        mismatches.push({ field: "displayNameFr", dbValue: db.displayNameFr ?? db.name, expectedValue: expected.displayNameFr });
      }
      if (norm(db.strength) !== norm(expected.strength)) {
        mismatches.push({ field: "strength", dbValue: db.strength, expectedValue: expected.strength });
      }
      if (norm(db.dosageForm) !== norm(expected.dosageForm)) {
        mismatches.push({ field: "dosageForm", dbValue: db.dosageForm, expectedValue: expected.dosageForm });
      }
      if (norm(db.route) !== norm(expected.route)) {
        mismatches.push({ field: "route", dbValue: db.route, expectedValue: expected.route });
      }
    }

    if (mismatches.length) {
      mismatchRows.push({
        catalogCode: code,
        sourceDomains: domainsFor(code),
        manifestFiles: manifestFilesFor(code),
        likelySeedHelper: expectedSeedHelper(code),
        mismatches,
      });
      if (mismatches.some((m) => m.field === "isActive")) {
        inactiveActiveRows.push({
          catalogCode: code,
          sourceDomains: domainsFor(code),
          likelySeedHelper: expectedSeedHelper(code),
          fix: db.isActive
            ? "N/A"
            : helperForActivation(code),
        });
      }
    }

    const billing = resolveMedicationBillingReadiness(code);
    const hasHcpcsDb = Boolean(db.billingCodeDefault?.trim());
    const hasNdcDb = Boolean(db.ndc11?.trim());
    const hasProduct = (productByCode.get(code) ?? 0) > 0;
    if (billing.billingReady && !hasHcpcsDb && !hasProduct) {
      billingGaps.push({
        catalogCode: code,
        classification: "MISSING",
        manifestHcpcs: billing.hcpcs,
        manifestNdc: billing.ndc11,
        dbBillingCodeDefault: db.billingCodeDefault,
        dbNdc11: db.ndc11,
        hasMedicationProduct: hasProduct,
        billingSource: billing.source,
      });
    } else if (billing.billingReady && (!hasHcpcsDb || !hasNdcDb)) {
      billingGaps.push({
        catalogCode: code,
        classification: "PARTIAL",
        manifestHcpcs: billing.hcpcs,
        manifestNdc: billing.ndc11,
        dbBillingCodeDefault: db.billingCodeDefault,
        dbNdc11: db.ndc11,
        hasMedicationProduct: hasProduct,
        billingSource: billing.source,
      });
    }

    const invCount = inventoryByCode.get(code) ?? 0;
    const prodCount = productByCode.get(code) ?? 0;
    if (prodCount === 0 && invCount === 0) {
      inventoryGaps.push({
        catalogCode: code,
        inventoryItemCount: invCount,
        medicationProductCount: prodCount,
        sourceDomains: domainsFor(code),
      });
    }
  }

  const report = {
    ticket: "MEDUI.MEDICATION.PRODUCTION_DB_PARITY_REMAINING_GAPS_ANALYSIS.1",
    generatedAt: new Date().toISOString(),
    summary: {
      activeRegistryCount: activeCodes.length,
      match: activeCodes.length - missingRows.length - mismatchRows.length,
      missing: missingRows.length,
      mismatch: mismatchRows.length,
      inactiveActiveMismatch: inactiveActiveRows.length,
      billingGaps: billingGaps.length,
      inventoryGaps: inventoryGaps.length,
    },
    RemainingMissingDbRowsReport: missingRows,
    RemainingMetadataMismatchReport: mismatchRows,
    RemainingInactiveActiveMismatchReport: inactiveActiveRows,
    RemainingBillingMismatchReport: {
      missing: billingGaps.filter((g) => g.classification === "MISSING").length,
      partial: billingGaps.filter((g) => g.classification === "PARTIAL").length,
      rows: billingGaps,
    },
    RemainingInventoryMismatchReport: {
      withoutProductOrInventory: inventoryGaps.length,
      rows: inventoryGaps,
    },
    finalDecision: "PRODUCTION_DB_REMAINING_GAPS_IDENTIFIED",
  };

  const outDir = join(__dirname, "../../../exports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "production-db-remaining-gaps-analysis.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outPath, summary: report.summary }, null, 2));
}

function helperForActivation(code: string): string {
  if (IV_FLUIDS_SEED_CODES.has(code)) return "Re-run seed-enterprise-iv-fluids-catalog (sets isActive=true on enrich)";
  if (WAVE_C_SEED.has(code)) return "Re-run seed-enterprise-controlled-substance-catalog (sets isActive=true)";
  if (ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[code]) return "Re-run seed-enterprise-wave4-ed-hospital-formulary with MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1";
  if (ENTERPRISE_WAVE3_FORMULARY_BY_CODE[code]) return "Re-run seed-enterprise-wave3-formulary with MEDORA_ENABLE_ENTERPRISE_WAVE3_FORMULARY=1";
  if (ENTERPRISE_WAVE2_FORMULARY_BY_CODE[code]) return "Re-run seed-enterprise-wave2-formulary with MEDORA_ENABLE_ENTERPRISE_WAVE2_FORMULARY=1";
  if (ENTERPRISE_WAVE1_FORMULARY_BY_CODE[code]) return "Re-run seed-enterprise-wave1-formulary with MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY=1";
  return "No activation seed — requires new domain catalog seed helper or manual isActive correction scoped to manifest";
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
