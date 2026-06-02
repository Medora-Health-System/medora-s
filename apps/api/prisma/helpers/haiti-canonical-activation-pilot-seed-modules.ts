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
      `[haiti-pilot-activation-seed] missing ${modulePath} — run pnpm --filter @medora/shared build first`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadHaitiCanonicalActivationPilotSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalActivationPilotManifest")
    >("haitiCanonicalActivationPilotManifest");
    const validation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalActivationPilotValidation")
    >("haitiCanonicalActivationPilotValidation");
    const duplicate = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalActivationPilotDuplicate")
    >("haitiCanonicalActivationPilotDuplicate");
    const quarantine = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationQuarantine")
    >("haitiCanonicalMedicationQuarantine");
    const matching = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationMatching")
    >("haitiCanonicalMedicationMatching");
    return {
      HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST,
      HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE,
      HAITI_CANONICAL_ACTIVATION_PILOT_STATS: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_STATS,
      assertPilotManifestReady: validation.assertPilotManifestReady,
      validatePilotActivationCandidate: validation.validatePilotActivationCandidate,
      validatePilotBillingPreservation: validation.validatePilotBillingPreservation,
      validateProviderSearchNonRegression: validation.validateProviderSearchNonRegression,
      computePilotReadinessScores: validation.computePilotReadinessScores,
      getPilotEligibleCatalogCodes: validation.getPilotEligibleCatalogCodes,
      isQuarantinedCanonicalProduct: quarantine.isQuarantinedCanonicalProduct,
      productCodeLooksQuarantined: matching.productCodeLooksQuarantined,
    };
  }

  const [manifest, validation, duplicate, quarantine, matching] = await Promise.all([
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalActivationPilotManifest")
    >("haitiCanonicalActivationPilotManifest"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalActivationPilotValidation")
    >("haitiCanonicalActivationPilotValidation"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalActivationPilotDuplicate")
    >("haitiCanonicalActivationPilotDuplicate"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationQuarantine")
    >("haitiCanonicalMedicationQuarantine"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationMatching")
    >("haitiCanonicalMedicationMatching"),
  ]);

  return {
    HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST,
    HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE,
    HAITI_CANONICAL_ACTIVATION_PILOT_STATS: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_STATS,
    assertPilotManifestReady: validation.assertPilotManifestReady,
    validatePilotActivationCandidate: validation.validatePilotActivationCandidate,
    validatePilotBillingPreservation: validation.validatePilotBillingPreservation,
    validateProviderSearchNonRegression: validation.validateProviderSearchNonRegression,
    computePilotReadinessScores: validation.computePilotReadinessScores,
    getPilotEligibleCatalogCodes: validation.getPilotEligibleCatalogCodes,
    isQuarantinedCanonicalProduct: quarantine.isQuarantinedCanonicalProduct,
    productCodeLooksQuarantined: matching.productCodeLooksQuarantined,
  };
}
