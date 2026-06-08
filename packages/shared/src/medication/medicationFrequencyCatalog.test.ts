import { describe, expect, it } from "vitest";
import {
  getMedicationFrequencyDefinition,
  MEDICATION_FREQUENCY_BY_CODE,
  MEDICATION_FREQUENCY_CATALOG,
  MEDICATION_FREQUENCY_CATALOG_EXPECTED_COUNT,
  MEDICATION_FREQUENCY_ER_PICKER_CODES,
  medicationFrequencyProducesScheduledInstances,
  medicationFrequencyUsesInfusionLifecycle,
  parseMedicationFrequencyCode,
} from "./medicationFrequencyCatalog.js";
import { assertMedicationFrequencyCatalog } from "./medicationFrequencyCatalogValidation.js";
import { normalizeMedicationFrequencyFromSig } from "./medicationFrequencyNormalization.js";

describe("medicationFrequencyCatalog (M1.8B.6)", () => {
  it("has exactly one entry per canonical code", () => {
    expect(MEDICATION_FREQUENCY_CATALOG).toHaveLength(MEDICATION_FREQUENCY_CATALOG_EXPECTED_COUNT);
    expect(() => assertMedicationFrequencyCatalog()).not.toThrow();
  });

  it("indexes all codes in MEDICATION_FREQUENCY_BY_CODE", () => {
    for (const entry of MEDICATION_FREQUENCY_CATALOG) {
      expect(MEDICATION_FREQUENCY_BY_CODE[entry.code]).toEqual(entry);
    }
  });

  it("parses frequency codes case-insensitively", () => {
    expect(parseMedicationFrequencyCode("bid")).toBe("BID");
    expect(parseMedicationFrequencyCode(" Q6H ")).toBe("Q6H");
    expect(parseMedicationFrequencyCode("invalid")).toBeNull();
  });

  it("defines interval minutes for q4h/q6h/q12h observation and antibiotic schedules", () => {
    expect(getMedicationFrequencyDefinition("Q4H")?.intervalMinutes).toBe(240);
    expect(getMedicationFrequencyDefinition("Q6H")?.intervalMinutes).toBe(360);
    expect(getMedicationFrequencyDefinition("Q12H")?.intervalMinutes).toBe(720);
    expect(getMedicationFrequencyDefinition("Q12H")?.dosesPerDay).toBe(2);
  });

  it("defines ACHS as meal composite with 4 doses per day", () => {
    const achs = getMedicationFrequencyDefinition("ACHS");
    expect(achs?.expansionStrategy).toBe("MEAL_COMPOSITE");
    expect(achs?.mealAnchor).toBe("ACHS_COMPOSITE");
    expect(achs?.dosesPerDay).toBe(4);
  });

  it("marks CONTINUOUS as infusion lifecycle without standing dose instances", () => {
    expect(medicationFrequencyUsesInfusionLifecycle("CONTINUOUS")).toBe(true);
    expect(medicationFrequencyProducesScheduledInstances("CONTINUOUS")).toBe(false);
  });

  it("marks PRN as on-demand without standing scheduled instances", () => {
    expect(getMedicationFrequencyDefinition("PRN")?.expansionStrategy).toBe("ON_DEMAND");
    expect(medicationFrequencyProducesScheduledInstances("PRN")).toBe(false);
  });

  it("includes ED-safe picker codes without inpatient-only frequencies", () => {
    expect(MEDICATION_FREQUENCY_ER_PICKER_CODES).toEqual(["NOW", "ONCE", "STAT", "PRN"]);
    for (const code of MEDICATION_FREQUENCY_ER_PICKER_CODES) {
      expect(getMedicationFrequencyDefinition(code)).not.toBeNull();
    }
  });

  it("supports TAPER with TAPER_STEP strategy for future schedules", () => {
    expect(getMedicationFrequencyDefinition("TAPER")?.expansionStrategy).toBe("TAPER_STEP");
  });
});

describe("medicationFrequencyNormalization (M1.8B.6)", () => {
  it("normalizes common sig strings to catalog codes", () => {
    expect(normalizeMedicationFrequencyFromSig("1 tab PO BID").frequencyCode).toBe("BID");
    expect(normalizeMedicationFrequencyFromSig("q6h PRN").frequencyCode).toBe("Q6H");
    expect(normalizeMedicationFrequencyFromSig("q6h PRN").prnModifier).toBe(true);
    expect(normalizeMedicationFrequencyFromSig("ACHS").frequencyCode).toBe("ACHS");
  });

  it("returns ambiguous when multiple frequencies match", () => {
    const r = normalizeMedicationFrequencyFromSig("daily q24h");
    expect(r.confidence).toBe("LOW");
    expect(r.ambiguousMatches.length).toBeGreaterThan(1);
    expect(r.frequencyCode).toBeNull();
  });

  it("returns NONE for unrecognized sig", () => {
    expect(normalizeMedicationFrequencyFromSig("take as directed").confidence).toBe("NONE");
  });
});
