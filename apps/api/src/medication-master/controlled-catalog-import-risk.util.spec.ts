import {
  classifyControlledMedicationRow,
  controlledMedicationMatchKey,
} from "./controlled-catalog-import-risk.util";

describe("controlled-catalog-import-risk", () => {
  it("classifies missing fields", () => {
    expect(
      classifyControlledMedicationRow({ medication: "", dose: "5mg", form: "Tablet" }, null)
    ).toBe("MISSING_REQUIRED_FIELDS");
  });

  it("classifies morphine as high risk", () => {
    expect(
      classifyControlledMedicationRow(
        { medication: "Morphine", dose: "10mg", form: "Injection" },
        null
      )
    ).toBe("HIGH_RISK_MANUAL_REVIEW");
  });

  it("classifies acetaminophen as safe when no duplicate", () => {
    expect(
      classifyControlledMedicationRow(
        { medication: "Acetaminophen", dose: "500mg", form: "Tablet" },
        null
      )
    ).toBe("SAFE_LOW_RISK");
  });

  it("classifies duplicate match", () => {
    expect(
      classifyControlledMedicationRow(
        { medication: "Acetaminophen", dose: "500mg", form: "Tablet" },
        { conceptId: "c1", productId: "p1", productCode: "X" }
      )
    ).toBe("DUPLICATE_OR_CONFLICT");
  });

  it("builds stable match keys", () => {
    const k = controlledMedicationMatchKey("Acetaminophen", "500 mg", "Tablet");
    expect(k.length).toBeGreaterThan(0);
  });
});
