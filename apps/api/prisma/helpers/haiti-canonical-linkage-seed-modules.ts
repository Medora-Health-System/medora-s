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
      `[haiti-canonical-linkage-seed] missing ${modulePath} — run pnpm --filter @medora/shared build first`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadHaitiCanonicalLinkageSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest")
    >("haitiCanonicalMedicationLinkageManifest");
    const formulary = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiMedicationFormularyCatalog")
    >("haitiMedicationFormularyCatalog");
    const validation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationValidation")
    >("haitiCanonicalMedicationValidation");
    const quarantine = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationQuarantine")
    >("haitiCanonicalMedicationQuarantine");
    const matching = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationMatching")
    >("haitiCanonicalMedicationMatching");
    const billingNdc = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingNdcByCatalogCode")
    >("medicationBillingNdcByCatalogCode");
    const billingManifest = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingManifest")
    >("medicationBillingMappingManifest");
    const billingValidation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingValidation")
    >("medicationBillingMappingValidation");
    return {
      HAITI_CANONICAL_LINKAGE_MANIFEST: manifest.HAITI_CANONICAL_LINKAGE_MANIFEST,
      HAITI_MEDICATION_FORMULARY_CATALOG: formulary.HAITI_MEDICATION_FORMULARY_CATALOG,
      assertHaitiCanonicalLinkageManifest: validation.assertHaitiCanonicalLinkageManifest,
      validateManifest: validation.validateManifest,
      isQuarantinedCanonicalProduct: quarantine.isQuarantinedCanonicalProduct,
      classifyQuarantine: quarantine.classifyQuarantine,
      getQuarantineReason: quarantine.getQuarantineReason,
      productCodeLooksQuarantined: matching.productCodeLooksQuarantined,
      isQuarantinedMatchTarget: matching.isQuarantinedMatchTarget,
      MEDICATION_BILLING_NDC_BY_CATALOG_CODE: billingNdc.MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
      MEDICATION_BILLING_MAPPING_BY_CODE: billingManifest.MEDICATION_BILLING_MAPPING_BY_CODE,
      resolveMedicationHcpcsForCatalogRow: billingValidation.resolveMedicationHcpcsForCatalogRow,
    };
  }

  const [
    manifest,
    formulary,
    validation,
    quarantine,
    matching,
    billingNdc,
    billingManifest,
    billingValidation,
  ] = await Promise.all([
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest")
    >("haitiCanonicalMedicationLinkageManifest"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiMedicationFormularyCatalog")
    >("haitiMedicationFormularyCatalog"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationValidation")
    >("haitiCanonicalMedicationValidation"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationQuarantine")
    >("haitiCanonicalMedicationQuarantine"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationMatching")
    >("haitiCanonicalMedicationMatching"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingNdcByCatalogCode")
    >("medicationBillingNdcByCatalogCode"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingManifest")
    >("medicationBillingMappingManifest"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/medicationBillingMappingValidation")
    >("medicationBillingMappingValidation"),
  ]);

  return {
    HAITI_CANONICAL_LINKAGE_MANIFEST: manifest.HAITI_CANONICAL_LINKAGE_MANIFEST,
    HAITI_MEDICATION_FORMULARY_CATALOG: formulary.HAITI_MEDICATION_FORMULARY_CATALOG,
    assertHaitiCanonicalLinkageManifest: validation.assertHaitiCanonicalLinkageManifest,
    validateManifest: validation.validateManifest,
    isQuarantinedCanonicalProduct: quarantine.isQuarantinedCanonicalProduct,
    classifyQuarantine: quarantine.classifyQuarantine,
    getQuarantineReason: quarantine.getQuarantineReason,
    productCodeLooksQuarantined: matching.productCodeLooksQuarantined,
    isQuarantinedMatchTarget: matching.isQuarantinedMatchTarget,
    MEDICATION_BILLING_NDC_BY_CATALOG_CODE: billingNdc.MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
    MEDICATION_BILLING_MAPPING_BY_CODE: billingManifest.MEDICATION_BILLING_MAPPING_BY_CODE,
    resolveMedicationHcpcsForCatalogRow: billingValidation.resolveMedicationHcpcsForCatalogRow,
  };
}
