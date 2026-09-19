import {
  COUNTRY_POLICY_REGISTRY,
  applyCountryPolicyToFacilityConfiguration,
  normalizeMedoraCountryCode,
  resolveCountryPolicy,
  resolveEffectiveFacilityModuleCapability,
} from "./countryPolicy.js";
import { seedFacilityConfigurationSettings } from "./facilityConfiguration.js";

describe("country policy authority", () => {
  it("normalizes existing country spellings without changing Facility.country storage", () => {
    expect(normalizeMedoraCountryCode("US")).toBe("US");
    expect(normalizeMedoraCountryCode("USA")).toBe("US");
    expect(normalizeMedoraCountryCode("United States")).toBe("US");
    expect(normalizeMedoraCountryCode("DO")).toBe("DO");
    expect(normalizeMedoraCountryCode("DR")).toBe("DO");
    expect(normalizeMedoraCountryCode("Dominican Republic")).toBe("DO");
    expect(normalizeMedoraCountryCode("HT")).toBe("HT");
    expect(normalizeMedoraCountryCode("HTI")).toBe("HT");
    expect(normalizeMedoraCountryCode("Haiti")).toBe("HT");
    expect(normalizeMedoraCountryCode("Haïti")).toBe("HT");
  });

  it("registers US, Dominican Republic and Haiti with presentation defaults only", () => {
    expect(resolveCountryPolicy("US")?.defaultLanguage).toBe("en");
    expect(resolveCountryPolicy("Dominican Republic")?.defaultLanguage).toBe("es");
    expect(resolveCountryPolicy("Haiti")?.defaultLanguage).toBe("fr");
  });

  it("does not make country language the jurisdiction authority", () => {
    expect(resolveCountryPolicy("fr")).toBeNull();
    expect(resolveCountryPolicy("es")).toBeNull();
    expect(resolveCountryPolicy("en")).toBeNull();
  });

  it("lets facilities independently narrow an allowed country capability", () => {
    const facilityA = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: { radiology: true },
    });
    const facilityB = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: { radiology: false },
    });

    expect(resolveEffectiveFacilityModuleCapability({
      country: "HT",
      module: "radiology",
      facilitySettings: facilityA,
    }).effectiveEnabled).toBe(true);

    expect(resolveEffectiveFacilityModuleCapability({
      country: "HT",
      module: "radiology",
      facilitySettings: facilityB,
    }).effectiveEnabled).toBe(false);
  });

  it("country prohibition wins over a facility enablement", () => {
    const facility = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: { radiology: true },
    });

    const original = COUNTRY_POLICY_REGISTRY.US.modules.radiology;
    (COUNTRY_POLICY_REGISTRY.US.modules as Record<string, unknown>).radiology = {
      decision: "PROHIBITED",
      reason: "test prohibition",
    };
    try {
      expect(resolveEffectiveFacilityModuleCapability({
        country: "US",
        module: "radiology",
        facilitySettings: facility,
      }).effectiveEnabled).toBe(false);

      const effective = applyCountryPolicyToFacilityConfiguration("US", facility);
      expect(effective.modules.radiology.enabled).toBe(false);
      expect(effective.modules.radiology.hidden).toBe(true);
    } finally {
      (COUNTRY_POLICY_REGISTRY.US.modules as Record<string, unknown>).radiology = original;
    }
  });

  it("preserves existing facility behavior for legacy/unregistered country values", () => {
    const facility = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: { laboratory: true },
    });
    const decision = resolveEffectiveFacilityModuleCapability({
      country: "CA",
      module: "laboratory",
      facilitySettings: facility,
    });
    expect(decision.countryDecision).toBe("UNCONFIGURED_COUNTRY");
    expect(decision.effectiveEnabled).toBe(true);
  });
});
