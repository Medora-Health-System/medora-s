import {
  buildCareProfileJsonFromDto,
  listForbiddenFacilityEscalationKeys,
  mergeCareProfileJson,
  resolveServiceLinesForCareConfig,
} from "./facility-care-profile.util";

describe("facility-care-profile.util (MEDUI.D4C.1)", () => {
  it("builds clinic care profile JSON without facility names", () => {
    const json = buildCareProfileJsonFromDto(
      {
        careProfile: "CLINIC",
        ambulatoryOperatingMode: "CLINIC",
        operationalAddress: { line1: "10 Rue Test", city: "Port-au-Prince", phone: "509-000" },
        printDisplayName: "Letterhead Clinic",
        optionalModules: { laboratory: true, radiology: false, pharmacy: false },
      },
      "CLINIC"
    );
    expect(json.profile).toBe("CLINIC");
    expect(json.careSetting).toBe("AMBULATORY");
    expect(json.address?.line1).toBe("10 Rue Test");
    expect(JSON.stringify(json).toLowerCase()).not.toContain("rapid city");
  });

  it("resetToTypeDefaults restores clinic ambulatory lines", () => {
    const lines = resolveServiceLinesForCareConfig({
      facilityType: "CLINIC",
      dto: { resetToTypeDefaults: true },
      existingServiceLines: ["EMERGENCY", "OBSERVATION"],
    });
    expect(lines).toEqual(expect.arrayContaining(["CLINIC", "LABORATORY"]));
    expect(lines).not.toContain("EMERGENCY");
  });

  it("optional radiology/pharmacy can be enabled for clinic", () => {
    const lines = resolveServiceLinesForCareConfig({
      facilityType: "CLINIC",
      dto: {
        serviceLines: ["CLINIC", "LABORATORY"],
        optionalModules: { laboratory: true, radiology: true, pharmacy: true },
      },
    });
    expect(lines).toEqual(expect.arrayContaining(["CLINIC", "LABORATORY", "RADIOLOGY", "PHARMACY"]));
  });

  it("merge preserves prior address when patch omits address", () => {
    const merged = mergeCareProfileJson(
      {
        schemaVersion: 1,
        profile: "CLINIC",
        address: { line1: "Keep Me", city: "Jacmel", phone: null, line2: null, stateProvince: null, postalCode: null, country: null },
      },
      { careProfile: "CLINIC", ambulatoryOperatingMode: "CLINIC" },
      "CLINIC"
    );
    expect(merged.address?.line1).toBe("Keep Me");
  });

  it("lists forbidden escalation keys", () => {
    expect(listForbiddenFacilityEscalationKeys()).toContain("capabilities");
    expect(listForbiddenFacilityEscalationKeys()).toContain("ownerUserId");
  });
});
