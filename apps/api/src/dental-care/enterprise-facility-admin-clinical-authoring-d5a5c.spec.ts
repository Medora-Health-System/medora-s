import {
  D5A5C_CERTIFICATION_ID,
  resolveEnterpriseDentalEncounterAuthoring,
  resolveFacilityClinicalAuthoringAuthority,
} from "@medora/shared";

describe("MEDUI.D5A.5C API facility administrator clinical authoring", () => {
  it("exports certification", () => {
    expect(D5A5C_CERTIFICATION_ID).toBe("MEDUI.D5A.5C");
  });

  it("FACILITY_ADMIN dental authoring matrix", () => {
    expect(
      resolveFacilityClinicalAuthoringAuthority({
        roleCodes: ["ADMIN"],
        moduleEnabled: true,
        encounterStatus: "OPEN",
      }).allowed
    ).toBe(true);

    const dental = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(dental.isReadOnly).toBe(false);
    expect(dental.canSign).toBe(true);

    expect(
      resolveEnterpriseDentalEncounterAuthoring({
        roleCodes: ["MEDORA_SUPER_ADMIN"],
        dentalCareEnabled: true,
        encounterStatus: "OPEN",
        serviceLine: "DENTAL",
      }).isReadOnly
    ).toBe(true);
  });
});
