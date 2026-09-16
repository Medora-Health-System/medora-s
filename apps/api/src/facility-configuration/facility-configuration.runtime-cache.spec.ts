import { FacilityConfigurationRuntimeCache } from "./facility-configuration.runtime-cache";
import { defaultFacilityConfigurationSettings } from "@medora/shared";

describe("FacilityConfigurationRuntimeCache", () => {
  it("keeps last valid configuration after invalidation", () => {
    const cache = new FacilityConfigurationRuntimeCache();
    const settings = defaultFacilityConfigurationSettings();
    cache.put("fac-a", 4, settings);
    cache.invalidate("fac-a");
    expect(cache.get("fac-a")).toBeUndefined();
    expect(cache.lastValidFor("fac-a")?.revision).toBe(4);
    expect(cache.failoverRuntime("fac-a").revision).toBe(4);
  });

  it("does not leak Hospital A cache into Hospital B", () => {
    const cache = new FacilityConfigurationRuntimeCache();
    const a = defaultFacilityConfigurationSettings();
    const b = defaultFacilityConfigurationSettings();
    b.digitalCare.secureMessaging = false;
    cache.put("fac-a", 1, a);
    cache.put("fac-b", 1, b);
    expect(cache.get("fac-a")?.settings.digitalCare.secureMessaging).toBe(true);
    expect(cache.get("fac-b")?.settings.digitalCare.secureMessaging).toBe(false);
  });
});
