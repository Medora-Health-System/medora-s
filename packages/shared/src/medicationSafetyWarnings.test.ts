import { describe, expect, it } from "vitest";
import { getMedicationSafetyWarnings, medicationSafetyHaystack, type MedicationSafetyCatalogInput } from "./medicationSafetyWarnings";

describe("medicationSafetyHaystack", () => {
  it("joins catalog fields into a normalized haystack", () => {
    const h = medicationSafetyHaystack({
      code: "MORPHINE_IV",
      displayName: "Morphine sulfate",
      genericName: "morphine",
      strength: "2 mg/mL",
    });
    expect(h).toContain("morphine");
    expect(h).toContain("2 mg ml");
  });
});

describe("getMedicationSafetyWarnings", () => {
  it("flags opioids and sedation", () => {
    const w = getMedicationSafetyWarnings({
      displayName: "Morphine",
      genericName: "morphine",
    });
    expect(w.some((x) => x.ruleId === "sedation_opioid")).toBe(true);
    expect(w.some((x) => x.ruleId === "high_risk_opioid")).toBe(true);
  });

  it("flags vasopressors without matching norepinephrine as epinephrine substring", () => {
    const w = getMedicationSafetyWarnings({ displayName: "Norepinephrine infusion" });
    expect(w.some((x) => x.category === "VASOPRESSOR_HIGH_ALERT")).toBe(true);
    const w2 = getMedicationSafetyWarnings({ displayName: "Epinephrine injection" });
    expect(w2.some((x) => x.category === "VASOPRESSOR_HIGH_ALERT")).toBe(true);
  });

  it("flags LASA pair only when sibling present", () => {
    const morph: MedicationSafetyCatalogInput = { displayName: "Morphine sulfate" };
    const hydro: MedicationSafetyCatalogInput = { displayName: "Hydromorphone" };
    expect(getMedicationSafetyWarnings(morph, { siblingMedications: [] }).some((x) => x.ruleId === "lasa_morphine_hydromorphone")).toBe(
      false
    );
    expect(
      getMedicationSafetyWarnings(morph, { siblingMedications: [hydro] }).some((x) => x.ruleId === "lasa_morphine_hydromorphone")
    ).toBe(true);
  });

  it("flags controlled substances", () => {
    const w = getMedicationSafetyWarnings({ displayName: "Fentanyl", isControlled: true });
    expect(w.some((x) => x.category === "CONTROLLED_SUBSTANCE")).toBe(true);
  });
});
