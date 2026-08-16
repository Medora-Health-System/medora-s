import { describe, expect, it } from "vitest";
import {
  D5A5C_CERTIFICATION_ID,
  hasFacilityClinicalAuthoringRoleCodes,
  resolveEnterpriseDentalEncounterAuthoring,
  resolveFacilityClinicalAuthoringAuthority,
} from "@medora/shared";

describe("MEDUI.D5A.5C web facility administrator clinical authoring", () => {
  it("certification and facility admin write", () => {
    expect(D5A5C_CERTIFICATION_ID).toBe("MEDUI.D5A.5C");
    expect(hasFacilityClinicalAuthoringRoleCodes(["ADMIN"])).toBe(true);
    expect(
      resolveFacilityClinicalAuthoringAuthority({
        roleCodes: ["ADMIN"],
        moduleEnabled: true,
        encounterStatus: "OPEN",
      }).allowed
    ).toBe(true);
    const a = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(a.isReadOnly).toBe(false);
    expect(a.canEditClinicalEvaluation).toBe(true);
  });
});
