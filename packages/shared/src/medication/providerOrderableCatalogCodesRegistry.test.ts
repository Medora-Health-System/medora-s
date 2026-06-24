import {
  getActiveProviderOrderableCatalogCodes,
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
  validateProviderOrderPlacementForCatalogCode,
} from "./providerOrderableCatalogCodesRegistry.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";

describe("providerOrderableCatalogCodesRegistry", () => {
  afterEach(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
  });

  it("prewarms a merged active-code set without recursive prior-domain listActive calls on lookup", () => {
    const active = prewarmProviderOrderableCatalogCodesRegistry();
    expect(active.size).toBeGreaterThan(0);
    expect(getActiveProviderOrderableCatalogCodes()).toBe(active);

    const tranche2Code = listActiveTranche2ProviderOrderingCatalogCodes()[0];
    expect(tranche2Code).toBeTruthy();
    expect(active.has(tranche2Code!)).toBe(true);
    expect(validateProviderOrderPlacementForCatalogCode("UNKNOWN_TEST_CODE")).toBeNull();
  });
});
