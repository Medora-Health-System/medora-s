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

  it("role matrix: PROVIDER write; FACILITY_ADMIN write; ADMIN+PROVIDER write; platform-only deny", () => {
    const medicine = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      professionCodes: ["MEDICINE"],
      departmentCodes: ["PRIMARY_CARE"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(medicine.canView).toBe(false);

    const provider = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"], professionCodes: ["DENTIST"], departmentCodes: ["DENTAL"],
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
    expect(admin.canEditEnterpriseHistory).toBe(true);
    expect(admin.canEditPeriodontal).toBe(true);

    const both = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(both.canEditTreatmentPlan).toBe(true);

    const platform = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["MEDORA_SUPER_ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(platform.isReadOnly).toBe(true);
    expect(["NO_VIEW", "NO_CLINICAL_CAPABILITY"]).toContain(platform.readOnlyReason);
  });

  it("multi-tooth odontogram codes remain per-tooth", () => {
    expect(normalizeBulkToothCodes(["PERM_11", "PERM_12"])).toEqual(["PERM_11", "PERM_12"]);
  });
});
