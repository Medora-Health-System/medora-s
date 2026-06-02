import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHARED_MEDICATION_DIST = resolve(
  __dirname,
  "../../../../packages/shared/dist/medication"
);

const SHARED_MEDICATION_SRC = resolve(
  __dirname,
  "../../../../packages/shared/src/medication"
);

function isJestRuntime(): boolean {
  return process.env.JEST_WORKER_ID != null;
}

const importEsm = new Function(
  "specifier",
  "return import(specifier)"
) as (specifier: string) => Promise<unknown>;

async function importSharedDistModule<T>(fileBaseName: string): Promise<T> {
  const modulePath = join(SHARED_MEDICATION_DIST, `${fileBaseName}.js`);
  if (!existsSync(modulePath)) {
    throw new Error(
      `[medication-billing-seed] missing ${modulePath} — run pnpm --filter @medora/shared build before seed`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadMedicationBillingMappingSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingManifest")
    >("medicationBillingMappingManifest");
    const ndc = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingNdcByCatalogCode")
    >("medicationBillingNdcByCatalogCode");
    const validation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingValidation")
    >("medicationBillingMappingValidation");
    return {
      MEDICATION_BILLING_MAPPING_ENTRIES: manifest.MEDICATION_BILLING_MAPPING_ENTRIES,
      MEDICATION_BILLING_MAPPING_BY_CODE: manifest.MEDICATION_BILLING_MAPPING_BY_CODE,
      MEDICATION_BILLING_NDC_BY_CATALOG_CODE: ndc.MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
      assertMedicationBillingMappingManifest: validation.assertMedicationBillingMappingManifest,
      resolveMedicationHcpcsForCatalogRow: validation.resolveMedicationHcpcsForCatalogRow,
      computeMedicationBillingCoverageReport: validation.computeMedicationBillingCoverageReport,
    };
  }

  const [manifest, ndc, validation] = await Promise.all([
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingManifest")
    >("medicationBillingMappingManifest"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingNdcByCatalogCode")
    >("medicationBillingNdcByCatalogCode"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingValidation")
    >("medicationBillingMappingValidation"),
  ]);

  return {
    MEDICATION_BILLING_MAPPING_ENTRIES: manifest.MEDICATION_BILLING_MAPPING_ENTRIES,
    MEDICATION_BILLING_MAPPING_BY_CODE: manifest.MEDICATION_BILLING_MAPPING_BY_CODE,
    MEDICATION_BILLING_NDC_BY_CATALOG_CODE: ndc.MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
    assertMedicationBillingMappingManifest: validation.assertMedicationBillingMappingManifest,
    resolveMedicationHcpcsForCatalogRow: validation.resolveMedicationHcpcsForCatalogRow,
    computeMedicationBillingCoverageReport: validation.computeMedicationBillingCoverageReport,
  };
}
