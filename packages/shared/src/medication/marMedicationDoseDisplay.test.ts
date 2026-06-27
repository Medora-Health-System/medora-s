import { describe, expect, it } from "vitest";
import { buildMarMedicationDoseDisplayFields } from "./marMedicationDoseDisplay.js";

describe("buildMarMedicationDoseDisplayFields", () => {
  it("shows potassium chloride 20 mEq PO with directions and computed total", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      quantity: "2",
      route: "PO",
      frequencyCode: "ONCE",
      directionsSig: "2 tabs PO now",
    });

    expect(fields.doseLabel).toBe("20 mEq");
    expect(fields.totalDoseLabel).toBe("40 mEq");
    expect(fields.directionsLabel).toBe("2 tabs PO now");
    expect(fields.routeLabel).toBe("PO");
    expect(fields.frequencyLabel).toBe("ONCE");
  });

  it("does not compute total dose without structured numeric quantity and dose value", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      route: "PO",
      directionsSig: "2 tabs PO now",
    });

    expect(fields.doseLabel).toBe("20 mEq");
    expect(fields.totalDoseLabel).toBeNull();
    expect(fields.directionsLabel).toBe("2 tabs PO now");
  });

  it("does not compute total dose when quantity is one", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      quantity: "1",
      route: "PO",
    });

    expect(fields.totalDoseLabel).toBeNull();
  });

  it("uses fallback dose label when structured fields are missing", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      fallbackDoseLabel: "20 mEq",
      route: "PO",
      directionsSig: "Give now",
    });

    expect(fields.doseLabel).toBe("20 mEq");
    expect(fields.totalDoseLabel).toBeNull();
    expect(fields.directionsLabel).toBe("Give now");
  });

  it("omits directions when identical to dose label", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      directionsSig: "20 mEq",
      route: "PO",
    });

    expect(fields.directionsLabel).toBeNull();
  });
});
