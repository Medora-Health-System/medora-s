import { describe, expect, it } from "vitest";
import { suggestInfusionBilling } from "./infusionBillingRules.js";

describe("suggestInfusionBilling", () => {
  it("NS 89 min → HYDRATION, initial hour 1, manual review", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: 89,
      medicationLabel: "Normal Saline 1000 mL",
    });
    expect(r.billingClass).toBe("HYDRATION");
    expect(r.manualReviewRequired).toBe(true);
    expect(r.suggestedUnits.initialHour).toBe(1);
    expect(r.suggestedUnits.additionalHoursOrIntervals).toBeUndefined();
    expect(r.warnings.some((w) => w.toLowerCase().includes("assureur"))).toBe(true);
  });

  it("NS 20 min → HYDRATION with short-duration warning", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: 20,
      medicationLabel: "0.9% Sodium Chloride",
    });
    expect(r.billingClass).toBe("HYDRATION");
    expect(r.manualReviewRequired).toBe(true);
    expect(r.suggestedUnits.initialHour).toBeUndefined();
    expect(r.warnings.some((w) => w.toLowerCase().includes("31"))).toBe(true);
  });

  it("Vancomycin 89 min → THERAPEUTIC, initial hour 1", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: 89,
      medicationLabel: "Vancomycin 1 g IV",
    });
    expect(r.billingClass).toBe("THERAPEUTIC");
    expect(r.suggestedUnits.initialHour).toBe(1);
    expect(r.manualReviewRequired).toBe(true);
  });

  it("Ceftriaxone 30 min → THERAPEUTIC with under-threshold warning", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: 30,
      medicationLabel: "Ceftriaxone 1g",
    });
    expect(r.billingClass).toBe("THERAPEUTIC");
    expect(r.suggestedUnits.initialHour).toBeUndefined();
    expect(r.warnings.some((w) => w.toLowerCase().includes("31"))).toBe(true);
    expect(r.warnings.some((w) => w.toLowerCase().includes("thérapeutique"))).toBe(true);
  });

  it("Missing duration → UNKNOWN with warning", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: NaN,
      medicationLabel: "Lactated Ringer",
    });
    expect(r.billingClass).toBe("UNKNOWN");
    expect(r.manualReviewRequired).toBe(true);
    expect(r.warnings.some((w) => w.toLowerCase().includes("durée"))).toBe(true);
  });

  it("Ambiguous medication → UNKNOWN with warning", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: 120,
      medicationLabel: "Medication",
    });
    expect(r.billingClass).toBe("UNKNOWN");
    expect(r.warnings.some((w) => w.toLowerCase().includes("incertaine"))).toBe(true);
  });

  it("hydration label with antibiotic name → THERAPEUTIC wins", () => {
    const r = suggestInfusionBilling({
      infusionDurationMinutes: 60,
      medicationLabel: "Normal Saline with Vancomycin",
    });
    expect(r.billingClass).toBe("THERAPEUTIC");
  });
});
