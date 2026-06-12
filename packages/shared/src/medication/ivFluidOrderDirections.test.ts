import { describe, expect, it } from "vitest";
import {
  formatIvInfusionRateDisplay,
  isIvFluidMedicationLabel,
  medicationDirectionQuickPicksForIvFluid,
  parseIvInfusionRateFromDirections,
} from "./ivFluidOrderDirections.js";

describe("ivFluidOrderDirections (K.10B.4)", () => {
  it("parses 100 mL/hr", () => {
    const parsed = parseIvInfusionRateFromDirections("NS 0.9% at 100 mL/hr");
    expect(parsed).toEqual({ kind: "rate", rateValue: 100, rateUnit: "mL/hr" });
    expect(formatIvInfusionRateDisplay(parsed!)).toBe("100 mL/hr");
  });

  it('parses "100 ml x hr"', () => {
    const parsed = parseIvInfusionRateFromDirections("100 ml x hr");
    expect(parsed).toEqual({ kind: "rate", rateValue: 100, rateUnit: "mL/hr" });
  });

  it("parses bolus", () => {
    const parsed = parseIvInfusionRateFromDirections("NS 0.9% bolus");
    expect(parsed).toEqual({ kind: "bolus" });
    expect(formatIvInfusionRateDisplay(parsed!)).toBe("BOLUS");
  });

  it("parses KVO", () => {
    const parsed = parseIvInfusionRateFromDirections("KVO");
    expect(parsed?.kind).toBe("kvo");
  });

  it("detects Normal Saline as IV fluid", () => {
    expect(isIvFluidMedicationLabel("Normal Saline 0.9% 1 L", "Soluté")).toBe(true);
  });

  it("NS fluid quick-picks include 100 mL/hr", () => {
    const picks = medicationDirectionQuickPicksForIvFluid("IVPB", "Normal Saline 0.9%");
    expect(picks).toContain("NS 0.9% at 100 mL/hr");
    expect(picks).toContain("NS 0.9% bolus");
  });
});
