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
    expect(fields.quantityLabel).toBeNull();
    expect(fields.totalDoseLabel).toBe("40 mEq");
    expect(fields.directionsLabel).toBe("2 tabs PO now");
    expect(fields.routeLabel).toBe("PO");
    expect(fields.frequencyLabel).toBe("ONCE");
  });

  it("never uses order quantity as clinical dose when dose fields are missing", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      quantity: "1",
      route: "PO",
      directionsSig: "2 tabs PO now",
    });

    expect(fields.doseLabel).toBeNull();
    expect(fields.quantityLabel).toBe("1");
    expect(fields.directionsLabel).toBe("2 tabs PO now");
  });

  it("prefers structured dose over quantity for potassium with quantity 1", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      quantity: "1",
      route: "PO",
      directionsSig: "2 tabs PO now",
    });

    expect(fields.doseLabel).toBe("20 mEq");
    expect(fields.quantityLabel).toBeNull();
  });

  it("uses order strength as clinical dose when snapshot dose fields are missing", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      quantity: "2",
      route: "IV",
      fallbackDoseLabel: "6 mg/2 mL",
    });

    expect(fields.doseLabel).toBe("6 mg/2 mL");
    expect(fields.quantityLabel).toBe("2");
  });

  it("shows adenosine clinical dose and keeps ampule quantity separate", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "6 mg/2 mL",
      quantity: "2",
      route: "IV",
    });

    expect(fields.doseLabel).toBe("6 mg/2 mL");
    expect(fields.quantityLabel).toBe("2");
  });

  it("never uses administeredQuantity as doseLabel", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      administeredQuantity: 2,
      fallbackDoseLabel: "6 mg",
      route: "IV",
    });

    expect(fields.doseLabel).toBe("6 mg");
    expect(fields.quantityLabel).toBe("2");
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
