/**
 * M1.7C.12B — Preserve legacy catalog visibility during Wave 4 ENRICH.
 * Wave 4 CREATE rows stay inactive; ENRICH must not hide Haiti/legacy essentials.
 */

import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";

const HAITI_LEGACY_ACTIVE_CATALOG_CODES = new Set(
  HAITI_MEDICATION_FORMULARY_CATALOG.filter((row) => row.isActive).map((row) => row.code)
);

export type Wave4CatalogSeedMode = "CREATE" | "ENRICH";

export function isHaitiLegacyActiveCatalogCode(catalogCode: string): boolean {
  return HAITI_LEGACY_ACTIVE_CATALOG_CODES.has(catalogCode.trim());
}

export function getHaitiLegacyActiveCatalogCodeSet(): ReadonlySet<string> {
  return HAITI_LEGACY_ACTIVE_CATALOG_CODES;
}

export function getHaitiLegacyActiveCatalogCodes(): readonly string[] {
  return [...HAITI_LEGACY_ACTIVE_CATALOG_CODES];
}

/**
 * Resolve CatalogMedication.isActive for Wave 4 seed upserts.
 * - CREATE: always inactive (Wave 4 governance preserved).
 * - ENRICH: preserve active legacy rows; restore Haiti essentials wrongly deactivated.
 */
export function resolveWave4CatalogIsActiveForSeed(params: {
  mode: Wave4CatalogSeedMode;
  catalogCode: string;
  existingIsActive: boolean | null | undefined;
}): boolean {
  if (params.mode === "CREATE") {
    return false;
  }

  if (isHaitiLegacyActiveCatalogCode(params.catalogCode)) {
    return true;
  }

  if (params.existingIsActive === true) {
    return true;
  }

  return false;
}
