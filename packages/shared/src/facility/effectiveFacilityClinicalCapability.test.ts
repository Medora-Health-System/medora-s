import {
  resolveEffectiveCarePlansCapability,
  type FacilityConfigurationSettings,
} from "./countryPolicy.js";
import { seedFacilityConfigurationSettings } from "./facilityConfiguration.js";

const optionalModules = {
  laboratory: true,
  radiology: true,
  pharmacy: true,
  publicHealth: false,
  billing: true,
};

function hospitalSettings(): FacilityConfigurationSettings {
  return seedFacilityConfigurationSettings({
    facilityType: "HOSPITAL",
    serviceLines: ["MEDSURG"],
    optionalModules,
  });
}

describe("Phase 3 effective facility clinical capabilities", () => {
  it("allows care plans only when the facility hospital capability and care-plan preference are enabled", () => {
    const settings = hospitalSettings();
    settings.digitalCare.carePlans = true;
    expect(resolveEffectiveCarePlansCapability({
      country: "US",
      facilitySettings: settings,
    }).effectiveEnabled).toBe(true);
  });

  it("lets Hospital B independently disable care plans while Hospital A keeps them", () => {
    const hospitalA = hospitalSettings();
    const hospitalB = hospitalSettings();
    hospitalA.digitalCare.carePlans = true;
    hospitalB.digitalCare.carePlans = false;

    expect(resolveEffectiveCarePlansCapability({ country: "DO", facilitySettings: hospitalA }).effectiveEnabled).toBe(true);
    expect(resolveEffectiveCarePlansCapability({ country: "DO", facilitySettings: hospitalB }).effectiveEnabled).toBe(false);
  });

  it("does not let a child care-plan switch resurrect a disabled Hospital module", () => {
    const settings = hospitalSettings();
    settings.modules.hospital.enabled = false;
    settings.digitalCare.carePlans = true;

    const result = resolveEffectiveCarePlansCapability({
      country: "HT",
      facilitySettings: settings,
    });
    expect(result.effectiveEnabled).toBe(false);
    expect(result.parentModule).toBe("hospital");
  });

  it("keeps country and facility decisions independent", () => {
    const settings = hospitalSettings();
    settings.digitalCare.carePlans = false;
    const result = resolveEffectiveCarePlansCapability({
      country: "Haiti",
      facilitySettings: settings,
    });
    expect(result.country).toBe("HT");
    expect(result.countryDecision).toBe("ALLOWED");
    expect(result.facilityEnabled).toBe(false);
    expect(result.effectiveEnabled).toBe(false);
  });
});
