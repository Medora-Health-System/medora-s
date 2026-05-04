import type { MedicationInfusionCatalogSlice } from "./medication-infusion-candidate-from-order-item.util";
import { shouldBlockDirectMarAdministeredForInfusionLine } from "./medication-infusion-candidate-from-order-item.util";

function bedsideMed(overrides: Record<string, unknown> = {}) {
  return {
    catalogItemType: "MEDICATION",
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    route: null as string | null,
    catalogItemId: "cat-1",
    manualLabel: null as string | null,
    manualSecondaryText: null as string | null,
    strength: null as string | null,
    ...overrides,
  } as Parameters<typeof shouldBlockDirectMarAdministeredForInfusionLine>[0];
}

const nsCatalog: MedicationInfusionCatalogSlice = {
  code: "NS09-1000",
  name: "Sodium chloride 0.9%",
  displayNameEn: "Normal saline 0.9% 1 L",
  genericName: "sodium chloride",
  route: "IVP",
  strength: null,
  therapeuticClass: null,
};

const ceftriaxoneCatalog: MedicationInfusionCatalogSlice = {
  code: "CEF-1G",
  name: "Ceftriaxone",
  displayNameEn: "Ceftriaxone 1 g",
  genericName: "ceftriaxone",
  route: "injectable",
  strength: "1 g",
  therapeuticClass: null,
};

describe("shouldBlockDirectMarAdministeredForInfusionLine", () => {
  it("blocks NS 1L with IVP route (mislabelled bag)", () => {
    expect(shouldBlockDirectMarAdministeredForInfusionLine(bedsideMed({ route: "IVP" }), nsCatalog, "IVP")).toBe(
      true
    );
  });

  it("blocks ceftriaxone with injectable route", () => {
    expect(
      shouldBlockDirectMarAdministeredForInfusionLine(bedsideMed({ route: "injectable" }), ceftriaxoneCatalog, "injectable")
    ).toBe(true);
  });

  it("allows morphine IV push (push med list)", () => {
    const cat: MedicationInfusionCatalogSlice = {
      code: "MOR-2",
      name: "Morphine",
      displayNameEn: "Morphine 2 mg",
      genericName: "morphine",
      route: "IVP",
      strength: "2 mg",
      therapeuticClass: null,
    };
    expect(shouldBlockDirectMarAdministeredForInfusionLine(bedsideMed({ route: "IVP" }), cat, "IVP")).toBe(false);
  });

  it("allows ondansetron IVP", () => {
    const cat: MedicationInfusionCatalogSlice = {
      code: "OND-4",
      name: "Ondansetron",
      displayNameEn: "Ondansetron 4 mg",
      genericName: "ondansetron",
      route: "IVP",
      strength: null,
      therapeuticClass: null,
    };
    expect(shouldBlockDirectMarAdministeredForInfusionLine(bedsideMed({ route: "IVP" }), cat, "IVP")).toBe(false);
  });

  it("does not apply to pharmacy dispense lines (refused/administered MAR not used on that path)", () => {
    expect(
      shouldBlockDirectMarAdministeredForInfusionLine(
        bedsideMed({ medicationFulfillmentIntent: "PHARMACY_DISPENSE", route: "IVP" }),
        nsCatalog,
        "IVP"
      )
    ).toBe(false);
  });
});
