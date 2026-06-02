import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Shared medication modules are ESM (`@medora/shared` type: module).
 * Prisma seeds run via ts-node (CJS) — load compiled `dist` with native `import()`.
 * Jest uses ts-jest CJS `require()` against shared `src` (see jest.config.cjs).
 */
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

/** ts-node (CJS) rewrites `import()` to `require()`; keep native ESM import for compiled dist. */
const importEsm = new Function(
  "specifier",
  "return import(specifier)"
) as (specifier: string) => Promise<unknown>;

async function importSharedDistModule<T>(fileBaseName: string): Promise<T> {
  const modulePath = join(SHARED_MEDICATION_DIST, `${fileBaseName}.js`);
  if (!existsSync(modulePath)) {
    throw new Error(
      `[medication-governance-seed] missing ${modulePath} — run pnpm --filter @medora/shared build before prisma:seed-catalogs`
    );
  }
  return (await importEsm(pathToFileURL(modulePath).href)) as T;
}

function requireSharedSrcModule<T>(fileBaseName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(SHARED_MEDICATION_SRC, fileBaseName)) as T;
}

export async function loadMedicationSafetyClassifierSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/medicationSafetyClassifierManifest")>(
      "medicationSafetyClassifierManifest"
    );
    const validation = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/medicationSafetyClassifierValidation")>(
      "medicationSafetyClassifierValidation"
    );
    return {
      MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS: manifest.MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
      MEDICATION_SAFETY_CLASSIFIER_MANIFEST: manifest.MEDICATION_SAFETY_CLASSIFIER_MANIFEST,
      assertMedicationSafetyClassifierManifest: validation.assertMedicationSafetyClassifierManifest,
    };
  }

  const [manifest, validation] = await Promise.all([
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/medicationSafetyClassifierManifest")>(
      "medicationSafetyClassifierManifest"
    ),
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/medicationSafetyClassifierValidation")>(
      "medicationSafetyClassifierValidation"
    ),
  ]);
  return {
    MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS: manifest.MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
    MEDICATION_SAFETY_CLASSIFIER_MANIFEST: manifest.MEDICATION_SAFETY_CLASSIFIER_MANIFEST,
    assertMedicationSafetyClassifierManifest: validation.assertMedicationSafetyClassifierManifest,
  };
}

export async function loadControlledSubstanceGovernanceSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/controlledSubstanceGovernanceManifest")>(
      "controlledSubstanceGovernanceManifest"
    );
    const validation = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/controlledSubstanceGovernanceValidation")>(
      "controlledSubstanceGovernanceValidation"
    );
    return {
      CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST: manifest.CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST,
      catalogRowMatchesGovernanceEntry: validation.catalogRowMatchesGovernanceEntry,
      legacyControlledFlagsFromManifestEntry: validation.legacyControlledFlagsFromManifestEntry,
    };
  }

  const [manifest, validation] = await Promise.all([
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/controlledSubstanceGovernanceManifest")>(
      "controlledSubstanceGovernanceManifest"
    ),
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/controlledSubstanceGovernanceValidation")>(
      "controlledSubstanceGovernanceValidation"
    ),
  ]);
  return {
    CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST: manifest.CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST,
    catalogRowMatchesGovernanceEntry: validation.catalogRowMatchesGovernanceEntry,
    legacyControlledFlagsFromManifestEntry: validation.legacyControlledFlagsFromManifestEntry,
  };
}

export async function loadHighAlertMedicationGovernanceSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/highAlertMedicationGovernanceManifest")>(
      "highAlertMedicationGovernanceManifest"
    );
    const validation = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/highAlertMedicationGovernanceValidation")>(
      "highAlertMedicationGovernanceValidation"
    );
    return {
      HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST: manifest.HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST,
      catalogRowMatchesHighAlertGovernanceEntry: validation.catalogRowMatchesHighAlertGovernanceEntry,
      safetyProfilePayloadFromHighAlertEntry: validation.safetyProfilePayloadFromHighAlertEntry,
      countUniqueSafetyRequirementCodesInManifest: validation.countUniqueSafetyRequirementCodesInManifest,
    };
  }

  const [manifest, validation] = await Promise.all([
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/highAlertMedicationGovernanceManifest")>(
      "highAlertMedicationGovernanceManifest"
    ),
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/highAlertMedicationGovernanceValidation")>(
      "highAlertMedicationGovernanceValidation"
    ),
  ]);
  return {
    HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST: manifest.HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST,
    catalogRowMatchesHighAlertGovernanceEntry: validation.catalogRowMatchesHighAlertGovernanceEntry,
    safetyProfilePayloadFromHighAlertEntry: validation.safetyProfilePayloadFromHighAlertEntry,
    countUniqueSafetyRequirementCodesInManifest: validation.countUniqueSafetyRequirementCodesInManifest,
  };
}

export async function loadLasaMedicationGovernanceSeedModules() {
  if (isJestRuntime()) {
    const manifest = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/lasaMedicationGovernanceManifest")>(
      "lasaMedicationGovernanceManifest"
    );
    const validation = requireSharedSrcModule<typeof import("../../../../packages/shared/src/medication/lasaMedicationGovernanceValidation")>(
      "lasaMedicationGovernanceValidation"
    );
    return {
      LASA_MEDICATION_GOVERNANCE_MANIFEST: manifest.LASA_MEDICATION_GOVERNANCE_MANIFEST,
      LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT: manifest.LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT,
      catalogRowMatchesLasaGovernanceEntry: validation.catalogRowMatchesLasaGovernanceEntry,
      lasaCategoriesPayloadFromEntry: validation.lasaCategoriesPayloadFromEntry,
      mergeLasaIntoHighAlertCategories: validation.mergeLasaIntoHighAlertCategories,
      lasaProfileCompliant: validation.lasaProfileCompliant,
    };
  }

  const [manifest, validation] = await Promise.all([
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/lasaMedicationGovernanceManifest")>(
      "lasaMedicationGovernanceManifest"
    ),
    importSharedDistModule<typeof import("../../../../packages/shared/src/medication/lasaMedicationGovernanceValidation")>(
      "lasaMedicationGovernanceValidation"
    ),
  ]);
  return {
    LASA_MEDICATION_GOVERNANCE_MANIFEST: manifest.LASA_MEDICATION_GOVERNANCE_MANIFEST,
    LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT: manifest.LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT,
    catalogRowMatchesLasaGovernanceEntry: validation.catalogRowMatchesLasaGovernanceEntry,
    lasaCategoriesPayloadFromEntry: validation.lasaCategoriesPayloadFromEntry,
    mergeLasaIntoHighAlertCategories: validation.mergeLasaIntoHighAlertCategories,
    lasaProfileCompliant: validation.lasaProfileCompliant,
  };
}
