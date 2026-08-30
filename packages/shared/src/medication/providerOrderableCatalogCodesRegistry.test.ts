import { afterEach, describe, expect, it } from "vitest";
import {
  getActiveProviderOrderableCatalogCodes,
  hydrateProviderOrderableCatalogCodesRegistry,
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
  snapshotProviderOrderableCatalogCodesRegistry,
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

  it("hydrates a snapshot without rebuilding (worker handoff)", () => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    const applied = hydrateProviderOrderableCatalogCodesRegistry({
      merged: ["HYDRATE_TEST_CODE"],
      activeByDomain: { tranche2: ["HYDRATE_TEST_CODE"] },
      priorByDomain: {},
    });
    expect(applied).toBe(true);
    expect(getActiveProviderOrderableCatalogCodes().has("HYDRATE_TEST_CODE")).toBe(true);
    const snap = snapshotProviderOrderableCatalogCodesRegistry();
    expect(snap.merged).toContain("HYDRATE_TEST_CODE");
    expect(hydrateProviderOrderableCatalogCodesRegistry(snap)).toBe(false);
  });

  it("rejects empty or malformed snapshots so lazy-load is not frozen", () => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    expect(
      hydrateProviderOrderableCatalogCodesRegistry({
        merged: [],
        activeByDomain: {},
        priorByDomain: {},
      })
    ).toBe(false);
    expect(
      hydrateProviderOrderableCatalogCodesRegistry({
        merged: ["ONLY_MERGED"],
        activeByDomain: {},
        priorByDomain: {},
      })
    ).toBe(false);
    const applied = hydrateProviderOrderableCatalogCodesRegistry({
      merged: ["LAZY_STILL_AVAILABLE"],
      activeByDomain: { tranche2: ["LAZY_STILL_AVAILABLE"] },
      priorByDomain: {},
    });
    expect(applied).toBe(true);
    expect(getActiveProviderOrderableCatalogCodes().has("LAZY_STILL_AVAILABLE")).toBe(true);
  });
});
