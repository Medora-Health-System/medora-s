import {
  projectEffectiveFacilityConfiguration,
} from "./countryPolicy.js";
import { seedFacilityConfigurationSettings } from "./facilityConfiguration.js";

const optionalModules = {
  laboratory: true,
  radiology: true,
  pharmacy: true,
  publicHealth: false,
  billing: true,
};

function settings() {
  return seedFacilityConfigurationSettings({
    facilityType: "HOSPITAL",
    serviceLines: ["MEDSURG"],
    optionalModules,
  });
}

describe("Phase 4 effective runtime projection", () => {
  it("does not mutate the stored facility configuration", () => {
    const stored = settings();
    stored.modules.radiology.enabled = false;
    stored.patientPortal.radiology = true;
    const effective = projectEffectiveFacilityConfiguration({ country: "US", facilitySettings: stored });
    expect(stored.patientPortal.radiology).toBe(true);
    expect(effective.patientPortal.radiology).toBe(false);
  });

  it("removes radiology child surfaces when this facility disables Radiology", () => {
    const stored = settings();
    stored.modules.radiology.enabled = false;
    stored.radiology.patientResults = true;
    stored.patientPortal.radiology = true;
    stored.integrations.radiology.enabled = true;
    stored.integrations.pacs.enabled = true;

    const effective = projectEffectiveFacilityConfiguration({ country: "DO", facilitySettings: stored });
    expect(effective.modules.radiology.enabled).toBe(false);
    expect(effective.radiology.enabled).toBe(false);
    expect(effective.radiology.patientResults).toBe(false);
    expect(effective.patientPortal.radiology).toBe(false);
    expect(effective.integrations.radiology.enabled).toBe(false);
    expect(effective.integrations.pacs.enabled).toBe(false);
  });

  it("keeps same-country facilities independent", () => {
    const clinicA = settings();
    const clinicB = settings();
    clinicB.modules.radiology.enabled = false;

    expect(projectEffectiveFacilityConfiguration({ country: "HT", facilitySettings: clinicA }).modules.radiology.enabled).toBe(true);
    expect(projectEffectiveFacilityConfiguration({ country: "HT", facilitySettings: clinicB }).modules.radiology.enabled).toBe(false);
  });

  it("narrows lab, pharmacy and billing dependent patient surfaces", () => {
    const stored = settings();
    stored.modules.laboratory.enabled = false;
    stored.modules.pharmacy.enabled = false;
    stored.modules.billing.enabled = false;

    const effective = projectEffectiveFacilityConfiguration({ country: "US", facilitySettings: stored });
    expect(effective.patientPortal.labResults).toBe(false);
    expect(effective.patientPortal.medications).toBe(false);
    expect(effective.patientPortal.invoices).toBe(false);
    expect(effective.digitalCare.medicationSharing).toBe(false);
  });

  it("narrows all portal children when Patient Portal is disabled", () => {
    const stored = settings();
    stored.modules.patientPortal.enabled = false;
    const effective = projectEffectiveFacilityConfiguration({ country: "DO", facilitySettings: stored });
    expect(effective.patientPortal.enabled).toBe(false);
    expect(effective.patientPortal.messages).toBe(false);
    expect(effective.patientPortal.labResults).toBe(false);
    expect(effective.patientPortal.radiology).toBe(false);
    expect(effective.patientPortal.carePlans).toBe(false);
  });
});
