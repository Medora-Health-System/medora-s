import { describe, expect, it } from "vitest";
import {
  buildFluidOrderDirections,
  defaultFluidOrderDraft,
  parseFluidOrderDraftFromDirections,
  shouldShowFluidOrderEntryFields,
} from "./fluidOrderEntry.js";

describe("fluidOrderEntry (K.10B.8A)", () => {
  it("shows fluid section for NS on IV route", () => {
    expect(
      shouldShowFluidOrderEntryFields({
        label: "Normal Saline 0.9%",
        therapeuticClass: "Soluté",
        route: "IV",
      })
    ).toBe(true);
  });

  it("builds continuous fluid directions with bag and rate", () => {
    expect(
      buildFluidOrderDirections({
        fluidType: "NS",
        bagSizeMl: 1000,
        rateSelection: { mode: "continuous", rateMlPerHr: 100 },
      })
    ).toBe("NS 0.9% 1000 mL at 100 mL/hr");
  });

  it("builds bolus directions from bag size", () => {
    expect(
      buildFluidOrderDirections({
        fluidType: "NS",
        bagSizeMl: 1000,
        rateSelection: { mode: "bolus" },
      })
    ).toBe("NS 0.9% 1000 mL bolus");
  });

  it("hides fluid section for non-fluid meds", () => {
    expect(
      shouldShowFluidOrderEntryFields({
        label: "Metformin 500 mg",
        route: "PO",
      })
    ).toBe(false);
  });

  it("parses structured directions back into draft", () => {
    const draft = parseFluidOrderDraftFromDirections("NS 0.9% 1000 mL at 100 mL/hr");
    expect(draft?.bagSizeMl).toBe(1000);
    expect(draft?.rateSelection).toEqual({ mode: "continuous", rateMlPerHr: 100 });
  });

  it("default draft produces valid directions", () => {
    expect(buildFluidOrderDirections(defaultFluidOrderDraft())).toContain("100 mL/hr");
  });
});
