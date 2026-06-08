import {
  MEDICATION_FREQUENCY_CATALOG,
  MEDICATION_FREQUENCY_CATALOG_EXPECTED_COUNT,
  MEDICATION_FREQUENCY_CATALOG_VERSION,
  MEDICATION_FREQUENCY_CODES,
  type MedicationFrequencyDefinition,
} from "./medicationFrequencyCatalog.js";

export function assertMedicationFrequencyCatalog(
  catalog: readonly MedicationFrequencyDefinition[] = MEDICATION_FREQUENCY_CATALOG
): void {
  if (catalog.length !== MEDICATION_FREQUENCY_CATALOG_EXPECTED_COUNT) {
    throw new Error(
      `Medication frequency catalog count mismatch: expected ${MEDICATION_FREQUENCY_CATALOG_EXPECTED_COUNT}, got ${catalog.length}`
    );
  }

  const seenCodes = new Set<string>();
  for (const entry of catalog) {
    if (seenCodes.has(entry.code)) {
      throw new Error(`Duplicate medication frequency code: ${entry.code}`);
    }
    seenCodes.add(entry.code);

    if (!(MEDICATION_FREQUENCY_CODES as readonly string[]).includes(entry.code)) {
      throw new Error(`Unknown medication frequency code in catalog: ${entry.code}`);
    }

    if (entry.catalogVersion !== MEDICATION_FREQUENCY_CATALOG_VERSION) {
      throw new Error(
        `Catalog version mismatch for ${entry.code}: expected ${MEDICATION_FREQUENCY_CATALOG_VERSION}, got ${entry.catalogVersion}`
      );
    }

    if (entry.expansionStrategy === "INTERVAL_FROM_ANCHOR") {
      if (entry.intervalMinutes == null || entry.intervalMinutes <= 0) {
        throw new Error(`Interval frequency ${entry.code} requires positive intervalMinutes`);
      }
    }

    if (entry.expansionStrategy === "FIXED_DAILY_CLOCK") {
      if (entry.dosesPerDay == null || entry.dosesPerDay <= 0) {
        throw new Error(`Fixed-daily frequency ${entry.code} requires positive dosesPerDay`);
      }
    }

    if (entry.expansionStrategy === "MEAL_ANCHORED" || entry.expansionStrategy === "MEAL_COMPOSITE") {
      if (entry.mealAnchor === "NONE") {
        throw new Error(`Meal frequency ${entry.code} requires mealAnchor`);
      }
    }

    if (entry.code === "PRN" && entry.expansionStrategy !== "ON_DEMAND") {
      throw new Error("PRN must use ON_DEMAND expansion strategy");
    }

    if (entry.code === "CONTINUOUS" && entry.expansionStrategy !== "CONTINUOUS_INFUSION") {
      throw new Error("CONTINUOUS must use CONTINUOUS_INFUSION expansion strategy");
    }

    if (entry.code === "TAPER" && entry.expansionStrategy !== "TAPER_STEP") {
      throw new Error("TAPER must use TAPER_STEP expansion strategy");
    }
  }

  for (const code of MEDICATION_FREQUENCY_CODES) {
    if (!seenCodes.has(code)) {
      throw new Error(`Missing medication frequency catalog entry for code: ${code}`);
    }
  }
}

assertMedicationFrequencyCatalog();
