import { describe, expect, it } from "vitest";
import {
  D5A5B_CERTIFICATION_ID,
  D5A5_OVERVIEW_SECTIONS,
  normalizeBulkToothCodes,
  resolveEnterpriseDentalEncounterAuthoring,
} from "@medora/shared";

describe("MEDUI.D5A.5B web dental final authoring gate", () => {
  it("certification and overview domains", () => {
    expect(D5A5B_CERTIFICATION_ID).toBe("MEDUI.D5A.5B");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("alertsHistory");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("documents");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("treatmentAcceptance");
  });

  it("role matrix: PROVIDER write; ADMIN-only no clinical; ADMIN+PROVIDER write", () => {
    const provider = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(provider.canEditEnterpriseHistory).toBe(true);
    expect(provider.canEditPeriodontal).toBe(true);

    const admin = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(admin.canEditEnterpriseHistory).toBe(false);

    const both = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(both.canEditTreatmentPlan).toBe(true);
  });

  it("multi-tooth odontogram codes remain per-tooth", () => {
    expect(normalizeBulkToothCodes(["PERM_11", "PERM_12"])).toEqual(["PERM_11", "PERM_12"]);
  });
});
