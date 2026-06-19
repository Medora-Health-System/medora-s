import { describe, expect, it } from "vitest";
import {
  CONTROLLED_SUBSTANCE_CLASSES,
  HIGH_ALERT_CLASSES,
  LASA_RISK_LEVELS,
  MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
  MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT,
  SAFETY_REQUIREMENT_CODES,
  controlledScheduleToClass,
  parseControlledSubstanceClass,
  parseHighAlertClass,
  parseLasaRiskLevel,
  parseSafetyRequirementCode,
  validateMedicationSafetyClassifierCode,
} from "./medicationSafetyClassifiers.js";
import {
  MEDICATION_SAFETY_CLASSIFIER_MANIFEST,
  MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS as MANIFEST_DOMAIN_COUNTS,
} from "./medicationSafetyClassifierManifest.js";
import {
  assertMedicationSafetyClassifierManifest,
  findDuplicateMedicationSafetyClassifierCodes,
  validateMedicationSafetyClassifierManifest,
} from "./medicationSafetyClassifierValidation.js";

describe("medicationSafetyClassifiers", () => {
  it("exposes expected domain counts", () => {
    expect(MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS).toEqual({
      CONTROLLED_SUBSTANCE: 6,
      HIGH_ALERT: 13,
      SAFETY_REQUIREMENT: 11,
      LASA: 4,
    });
    expect(MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT).toBe(34);
  });

  it("parses valid enum codes", () => {
    expect(parseControlledSubstanceClass("controlled_schedule_ii")).toBe("CONTROLLED_SCHEDULE_II");
    expect(parseHighAlertClass("HIGH_ALERT_INSULIN")).toBe("HIGH_ALERT_INSULIN");
    expect(parseSafetyRequirementCode("requires_witness")).toBe("REQUIRES_WITNESS");
    expect(parseLasaRiskLevel("lasa_high")).toBe("LASA_HIGH");
  });

  it("rejects invalid classifier codes", () => {
    expect(parseControlledSubstanceClass("CONTROLLED_SCHEDULE_I")).toBeNull();
    expect(validateMedicationSafetyClassifierCode("HIGH_ALERT", "HIGH_ALERT_FOO")).toEqual({
      ok: false,
      error: "invalid code HIGH_ALERT_FOO for domain HIGH_ALERT",
    });
    expect(validateMedicationSafetyClassifierCode("UNKNOWN", "LASA_HIGH")).toEqual({
      ok: false,
      error: "invalid domain: UNKNOWN",
    });
  });

  it("maps legacy schedule strings to controlled class", () => {
    expect(controlledScheduleToClass("II", true)).toBe("CONTROLLED_SCHEDULE_II");
    expect(controlledScheduleToClass(null, false)).toBe("CONTROLLED_NONE");
    expect(controlledScheduleToClass("custom", true)).toBe("CONTROLLED_OTHER");
  });
});

describe("medicationSafetyClassifierManifest", () => {
  it("is complete and has no duplicate codes", () => {
    expect(() => assertMedicationSafetyClassifierManifest(MEDICATION_SAFETY_CLASSIFIER_MANIFEST)).not.toThrow();
    expect(findDuplicateMedicationSafetyClassifierCodes(MEDICATION_SAFETY_CLASSIFIER_MANIFEST)).toEqual([]);
    expect(MEDICATION_SAFETY_CLASSIFIER_MANIFEST).toHaveLength(34);
    expect(MANIFEST_DOMAIN_COUNTS).toEqual(MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS);
  });

  it("includes every defined code exactly once", () => {
    const codes = (domain: string) =>
      MEDICATION_SAFETY_CLASSIFIER_MANIFEST.filter((e) => e.domain === domain).map((e) => e.code);
    expect(codes("CONTROLLED_SUBSTANCE").sort()).toEqual([...CONTROLLED_SUBSTANCE_CLASSES].sort());
    expect(codes("HIGH_ALERT").sort()).toEqual([...HIGH_ALERT_CLASSES].sort());
    expect(codes("SAFETY_REQUIREMENT").sort()).toEqual([...SAFETY_REQUIREMENT_CODES].sort());
    expect(codes("LASA").sort()).toEqual([...LASA_RISK_LEVELS].sort());
  });

  it("rejects manifest with duplicate codes", () => {
    const duped = [
      ...MEDICATION_SAFETY_CLASSIFIER_MANIFEST,
      { ...MEDICATION_SAFETY_CLASSIFIER_MANIFEST[0]! },
    ];
    const issues = validateMedicationSafetyClassifierManifest(duped);
    expect(issues.some((i) => i.kind === "DUPLICATE_CODE")).toBe(true);
  });
});
