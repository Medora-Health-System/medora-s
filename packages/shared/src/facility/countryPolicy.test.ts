import {
  applyCountryPolicyToFacilityConfiguration,
  normalizeMedoraCountryCode,
  resolveCountryPolicy,
  resolveEffectiveFacilityModuleCapability,
} from "./countryPolicy.js";
import { seedFacilityConfigurationSettings } from "./facilityConfiguration.js";

const optionalModules = (radiology: boolean, laboratory = false) => ({
  laboratory,
  radiology,
  pharmacy: false,
  publicHealth: false,
  billing: true,
});

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

  it("does not make language a jurisdiction authority", () => {
    expect(resolveCountryPolicy("fr")).toBeNull();
    expect(resolveCountryPolicy("es")).toBeNull();
    expect(resolveCountryPolicy("en")).toBeNull();
  });

  it("lets facilities independently narrow an allowed country capability", () => {
    const facilityA = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: optionalModules(true),
    });
    const facilityB = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: optionalModules(false),
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

  it("country policy application never broadens a facility-disabled capability", () => {
    const facility = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: optionalModules(false),
    });
    const effective = applyCountryPolicyToFacilityConfiguration("US", facility);
    expect(effective.modules.radiology.enabled).toBe(false);
    expect(facility.modules.radiology.enabled).toBe(false);
  });

  it("preserves existing facility behavior for legacy/unregistered country values", () => {
    const facility = seedFacilityConfigurationSettings({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
      optionalModules: optionalModules(false, true),
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
