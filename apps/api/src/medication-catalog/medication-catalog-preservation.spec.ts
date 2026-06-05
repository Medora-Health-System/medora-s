import { evaluateProviderOrderSearchGate } from "../medication-master/medication-product-activation-gates.util";
import { defaultProductRuntimeActivationMeta } from "../medication-master/medication-product-runtime-activation.util";
import {
  buildCatalogMedicationVisibilityWhere,
  expandMedicationSearchQuery,
} from "./medication-catalog-search.util";
import { resolveWave4CatalogIsActiveForSeed } from "@medora/shared";

describe("M1.7C.12B medication preservation", () => {
  it("Wave 4 ENRICH cannot deactivate active Haiti legacy catalog", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "ENRICH",
        catalogCode: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
        existingIsActive: true,
      })
    ).toBe(true);
  });

  it("Wave 4 ENRICH restores deactivated Haiti essential catalog", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "ENRICH",
        catalogCode: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
        existingIsActive: false,
      })
    ).toBe(true);
  });

  it("Wave 4 CREATE keeps new catalog inactive", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "CREATE",
        catalogCode: "REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE",
        existingIsActive: undefined,
      })
    ).toBe(false);
  });

  it("provider search gate preserves insulin-linked inactive enterprise product", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      formularyOnFormulary: false,
      facilityId: "fac-a",
      formularyFacilityId: "fac-a",
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
      linkageOnlyHaitiM15e: false,
    });
    expect(gate.allowed).toBe(true);
  });

  it("provider search gate preserves heparin-linked inactive enterprise product", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      formularyOnFormulary: false,
      facilityId: "fac-a",
      formularyFacilityId: "fac-a",
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
    });
    expect(gate.allowed).toBe(true);
  });

  it("search visibility includes deactivated Haiti essentials for insulin", () => {
    const terms = expandMedicationSearchQuery("insulin");
    const where = buildCatalogMedicationVisibilityWhere(terms);
    expect(where.OR).toHaveLength(2);
    expect(JSON.stringify(where)).toContain("REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS");
  });

  it("brand expansions resolve Rocephin, Versed, and Zofran", () => {
    expect(expandMedicationSearchQuery("rocephin")).toEqual(
      expect.arrayContaining(["rocephin", "ceftriaxone"])
    );
    expect(expandMedicationSearchQuery("versed")).toEqual(
      expect.arrayContaining(["versed", "midazolam"])
    );
    expect(expandMedicationSearchQuery("zofran")).toEqual(
      expect.arrayContaining(["zofran", "ondansetron"])
    );
  });
});
