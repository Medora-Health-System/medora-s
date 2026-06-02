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
      `[haiti-m15r-seed] missing ${modulePath} — run pnpm --filter @medora/shared build first`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadHaitiCanonicalStabilizationRemediationSeedModules() {
  if (isJestRuntime()) {
    const remediation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalStabilizationRemediation")
    >("haitiCanonicalStabilizationRemediation");
    const validation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalStabilizationRemediationValidation")
    >("haitiCanonicalStabilizationRemediationValidation");
    const manifest = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest")
    >("haitiCanonicalMedicationLinkageManifest");
    return { ...remediation, ...validation, HAITI_CANONICAL_LINKAGE_MANIFEST: manifest.HAITI_CANONICAL_LINKAGE_MANIFEST };
  }

  const [remediation, validation, manifest] = await Promise.all([
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalStabilizationRemediation")
    >("haitiCanonicalStabilizationRemediation"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalStabilizationRemediationValidation")
    >("haitiCanonicalStabilizationRemediationValidation"),
    importSharedDistModule<
      typeof import("../../../../packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest")
    >("haitiCanonicalMedicationLinkageManifest"),
  ]);

  return {
    ...remediation,
    ...validation,
    HAITI_CANONICAL_LINKAGE_MANIFEST: manifest.HAITI_CANONICAL_LINKAGE_MANIFEST,
  };
}
