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
      `[enterprise-wave3-seed] missing ${modulePath} — run pnpm --filter @medora/shared build first`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadEnterpriseWave3FormularySeedModules() {
  if (isJestRuntime()) {
    const formulary = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseWave3FormularyManifest")
    >("enterpriseWave3FormularyManifest");
    const billing = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseWave3BillingManifest")
    >("enterpriseWave3BillingManifest");
    const validation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseWave3FormularyValidation")
    >("enterpriseWave3FormularyValidation");
    const billingValidation = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseWave3BillingValidation")
    >("enterpriseWave3BillingValidation");
    const search = requireSharedSrcModule<
      typeof import("../../../../packages/shared/src/medication/enterpriseWave3SearchValidation")
    >("enterpriseWave3SearchValidation");
    return {
      ...formulary,
      ...billing,
      ...validation,
      ...billingValidation,
      ...search,
    };
  }

  const formulary = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseWave3FormularyManifest")
  >("enterpriseWave3FormularyManifest");
  const billing = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseWave3BillingManifest")
  >("enterpriseWave3BillingManifest");
  const validation = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseWave3FormularyValidation")
  >("enterpriseWave3FormularyValidation");
  const billingValidation = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseWave3BillingValidation")
  >("enterpriseWave3BillingValidation");
  const search = await importSharedDistModule<
    typeof import("../../../../packages/shared/src/medication/enterpriseWave3SearchValidation")
  >("enterpriseWave3SearchValidation");

  return {
    ...formulary,
    ...billing,
    ...validation,
    ...billingValidation,
    ...search,
  };
}
