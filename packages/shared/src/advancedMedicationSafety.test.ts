import { describe, expect, it } from "vitest";
import {
  computeAdvancedMedicationSafetyWarnings,
  computeAdvancedMedicationSafetyForSingleLine,
  type AdvancedMedicationSafetyLine,
} from "./advancedMedicationSafety";

const morphine: AdvancedMedicationSafetyLine = {
  lineKey: "m1",
  catalogItemId: "cat-morph",
  genericName: "morphine",
  displayName: "Morphine sulfate",
  therapeuticClass: "Analgesic opioid",
  strength: "2 mg/mL",
  route: "IVP",
  quantity: 1,
};

const morphineDup: AdvancedMedicationSafetyLine = {
  lineKey: "m2",
  catalogItemId: "cat-morph-2",
  genericName: "morphine",
  displayName: "Morphine injection",
  therapeuticClass: "Analgesic opioid",
  strength: "1 mg/mL",
  route: "IVP",
  quantity: 1,
};

const lorazepam: AdvancedMedicationSafetyLine = {
  lineKey: "l1",
  catalogItemId: "cat-loraz",
  genericName: "lorazepam",
  displayName: "Lorazepam",
  therapeuticClass: "Benzodiazepine",
  strength: "2 mg/mL",
  route: "IVP",
  quantity: 1,
};

describe("computeAdvancedMedicationSafetyWarnings", () => {
  it("flags duplicate same generic across staged lines", () => {
    const w = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [morphine, morphineDup],
      activeEncounterLines: [],
    });
    expect(w.some((x) => x.messageKey === "duplicate_generic_therapy")).toBe(true);
  });

  it("flags opioid + benzodiazepine stacking", () => {
    const w = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [morphine, lorazepam],
      activeEncounterLines: [],
    });
    expect(w.some((x) => x.messageKey === "stacking_opioid_benzodiazepine")).toBe(true);
  });

  it("flags missing dose for high-risk med", () => {
    const w = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [
        {
          lineKey: "x",
          catalogItemId: "c1",
          genericName: "morphine",
          displayName: "Morphine",
          route: "IVP",
          quantity: undefined,
          strength: "",
          notes: "",
        },
      ],
      activeEncounterLines: [],
    });
    expect(w.some((x) => x.messageKey === "dose_review_required_missing")).toBe(true);
  });

  it("flags duplicate high-risk therapeutic class twice", () => {
    const a: AdvancedMedicationSafetyLine = {
      lineKey: "a1",
      catalogItemId: "id-a",
      genericName: "warfarin",
      displayName: "Warfarin",
      therapeuticClass: "Anticoagulant oral",
      strength: "5 mg",
      route: "PO",
      quantity: 30,
    };
    const b: AdvancedMedicationSafetyLine = {
      lineKey: "a2",
      catalogItemId: "id-b",
      genericName: "apixaban",
      displayName: "Apixaban",
      therapeuticClass: "Anticoagulant oral",
      strength: "5 mg",
      route: "PO",
      quantity: 60,
    };
    const w = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [a, b],
      activeEncounterLines: [],
    });
    expect(w.some((x) => x.messageKey === "duplicate_high_risk_therapeutic_class")).toBe(true);
  });

  it("flags duplicate active catalog medication", () => {
    const staged: AdvancedMedicationSafetyLine = {
      lineKey: "s1",
      catalogItemId: "same-id",
      genericName: "acetaminophen",
      displayName: "Acetaminophen",
      strength: "500 mg",
      route: "PO",
      quantity: 20,
    };
    const active: AdvancedMedicationSafetyLine = {
      lineKey: "o1",
      catalogItemId: "same-id",
      genericName: "acetaminophen",
      displayName: "Acetaminophen",
      strength: "500 mg",
      route: "PO",
      quantity: 10,
    };
    const w = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [staged],
      activeEncounterLines: [active],
    });
    expect(w.some((x) => x.messageKey === "duplicate_active_catalog")).toBe(true);
  });
});

describe("computeAdvancedMedicationSafetyForSingleLine", () => {
  it("combines primary line with siblings for stacking", () => {
    const w = computeAdvancedMedicationSafetyForSingleLine({
      primaryLine: morphine,
      siblingEncounterLines: [lorazepam],
    });
    expect(w.some((x) => x.messageKey === "stacking_opioid_benzodiazepine")).toBe(true);
  });
});
