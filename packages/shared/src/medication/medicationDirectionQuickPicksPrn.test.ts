import { describe, expect, it } from "vitest";
import { medicationDirectionQuickPicksForPrnCategory } from "./medicationDirectionQuickPicksPrn.js";

describe("medicationDirectionQuickPicksForPrnCategory (K.10B.6)", () => {
  it("Ondansetron / Zofran includes PRN nausea picks", () => {
    const picks = medicationDirectionQuickPicksForPrnCategory("Ondansetron 4 mg");
    expect(picks).toContain("4 mg IVP q6h PRN nausea/vomiting");
    expect(picks).toContain("4 mg PO q8h PRN nausea/vomiting");
  });

  it("pain category includes PRN severe pain picks", () => {
    const picks = medicationDirectionQuickPicksForPrnCategory("Acetaminophen 500 mg");
    expect(picks).toContain("1 tab PO q6h PRN moderate pain");
  });

  it("returns null for non-PRN-eligible labels", () => {
    expect(medicationDirectionQuickPicksForPrnCategory("Sodium Chloride")).toBeNull();
  });
});
