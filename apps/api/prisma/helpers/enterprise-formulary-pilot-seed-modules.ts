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
      `[enterprise-pilot-seed] missing ${modulePath} — run pnpm --filter @medora/shared build first`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadEnterpriseFormularyPilotSeedModules() {
  if (isJestRuntime()) {
    const tranche = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseFormularyPilotTrancheAManifest")
    >("enterpriseFormularyPilotTrancheAManifest");
    const validation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseFormularyPilotValidation")
    >("enterpriseFormularyPilotValidation");
    const billing = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseWave1BillingValidation")
    >("enterpriseWave1BillingValidation");
    return { ...tranche, ...validation, ...billing };
  }

  const tranche = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseFormularyPilotTrancheAManifest")
  >("enterpriseFormularyPilotTrancheAManifest");
  const validation = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseFormularyPilotValidation")
  >("enterpriseFormularyPilotValidation");
  const billing = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseWave1BillingValidation")
  >("enterpriseWave1BillingValidation");

  return { ...tranche, ...validation, ...billing };
}
