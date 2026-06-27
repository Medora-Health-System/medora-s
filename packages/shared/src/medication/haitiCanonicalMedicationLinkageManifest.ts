/**
 * M1.5D — Haiti canonical linkage manifest (253 Haiti formulary codes).
 * Consumed by M1.5E seed/backfill — does not write to DB.
 */

import { buildHaitiCanonicalLinkageManifest } from "./haitiCanonicalMedicationLinkageBuild.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { HAITI_MEDICATION_FORMULARY_EXPECTED_COUNT } from "./haitiMedicationFormularyCatalog.js";
import type { HaitiCanonicalMedicationLinkageEntry } from "./haitiCanonicalMedicationLinkageTypes.js";
import { assertHaitiCanonicalLinkageManifest } from "./haitiCanonicalMedicationValidation.js";

export const HAITI_CANONICAL_LINKAGE_MANIFEST_VERSION = "M1.5D" as const;

export const HAITI_CANONICAL_LINKAGE_MANIFEST_EXPECTED_COUNT = HAITI_MEDICATION_FORMULARY_EXPECTED_COUNT;

/** Full Haiti formulary linkage manifest (one row per unique catalog code). */
export const HAITI_CANONICAL_LINKAGE_MANIFEST: HaitiCanonicalMedicationLinkageEntry[] =
  buildHaitiCanonicalLinkageManifest(HAITI_MEDICATION_FORMULARY_CATALOG);

export const HAITI_CANONICAL_LINKAGE_BY_CATALOG_CODE: Record<string, HaitiCanonicalMedicationLinkageEntry> =
  Object.fromEntries(HAITI_CANONICAL_LINKAGE_MANIFEST.map((e) => [e.catalogMedicationCode, e]));

assertHaitiCanonicalLinkageManifest(
  HAITI_CANONICAL_LINKAGE_MANIFEST,
  HAITI_MEDICATION_FORMULARY_CATALOG
);
