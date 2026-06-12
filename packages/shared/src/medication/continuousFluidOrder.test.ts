import { describe, expect, it } from "vitest";
import {
  isContinuousFluidOrder,
  isFluidBolusOrder,
  isRecognizedHospitalFluidLabel,
  parseFluidBagSizeMl,
  resolveFluidOrderType,
  resolveFluidRate,
} from "./continuousFluidOrder.js";

describe("continuousFluidOrder (K.10B.8)", () => {
  it("recognizes hospital fluid labels", () => {
    expect(isRecognizedHospitalFluidLabel("Normal Saline 0.9%", "Soluté")).toBe(true);
    expect(isRecognizedHospitalFluidLabel("Lactated Ringer", null)).toBe(true);
    expect(isRecognizedHospitalFluidLabel("D5W 1000 mL", null)).toBe(true);
    expect(isRecognizedHospitalFluidLabel("Morphine 10 mg/mL", null)).toBe(false);
  });

  it("resolveFluidRate parses standard rates and specials", () => {
    expect(resolveFluidRate("NS 0.9% at 100 mL/hr")).toEqual({
      kind: "rate",
      rateMlPerHr: 100,
    });
    expect(resolveFluidRate("KVO")?.kind).toBe("kvo");
    expect(resolveFluidRate("wide open")?.kind).toBe("wide_open");
  });

  it("classifies continuous vs bolus", () => {
    const continuous = {
      medicationLabel: "Normal Saline 0.9%",
      directionsSig: "NS 0.9% at 100 mL/hr",
      route: "IV",
    };
    expect(resolveFluidOrderType(continuous)).toBe("CONTINUOUS");
    expect(isContinuousFluidOrder(continuous)).toBe(true);
    expect(isFluidBolusOrder(continuous)).toBe(false);

    const bolus = {
      medicationLabel: "Normal Saline 0.9%",
      directionsSig: "NS 0.9% bolus 1000 mL",
      route: "IV",
    };
    expect(resolveFluidOrderType(bolus)).toBe("BOLUS");
    expect(isFluidBolusOrder(bolus)).toBe(true);
    expect(isContinuousFluidOrder(bolus)).toBe(false);
  });

  it("parses bag sizes", () => {
    expect(parseFluidBagSizeMl("NS 0.9% 1000 mL bag at 100 mL/hr")).toBe(1000);
    expect(parseFluidBagSizeMl("500 mL bolus")).toBe(500);
  });

  it("does not classify vancomycin IVPB as continuous fluid", () => {
    expect(
      isContinuousFluidOrder({
        medicationLabel: "Vancomycin 1 g",
        directionsSig: "1 g IVPB q12h",
        route: "IVPB",
      })
    ).toBe(false);
  });
});
