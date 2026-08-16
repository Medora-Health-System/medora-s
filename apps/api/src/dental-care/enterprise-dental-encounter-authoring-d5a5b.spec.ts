import {
  D5A5B_CERTIFICATION_ID,
  D5A5_DENTAL_HISTORY_REVIEW_KEY,
  resolveEnterpriseDentalEncounterAuthoring,
} from "@medora/shared";

describe("MEDUI.D5A.5B API dental authoring gate", () => {
  it("exports certification", () => {
    expect(D5A5B_CERTIFICATION_ID).toBe("MEDUI.D5A.5B");
    expect(D5A5_DENTAL_HISTORY_REVIEW_KEY).toBe("dentalHistoryReviewV1");
  });

  it("PROVIDER + OPEN => writable; FACILITY_ADMIN-only => writable (D5A.5C)", () => {
    const provider = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(provider.canEditPeriodontal).toBe(true);
    expect(provider.canEditEnterpriseHistory).toBe(true);
    expect(provider.isReadOnly).toBe(false);

    const admin = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(admin.canEditPeriodontal).toBe(true);
    expect(admin.isReadOnly).toBe(false);
    expect(admin.readOnlyReason).toBeNull();
  });

  it("ADMIN+PROVIDER retains write; CLOSED locks", () => {
    const both = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(both.canDocumentProcedure).toBe(true);
    const closed = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
      encounterStatus: "CLOSED",
      serviceLine: "DENTAL",
    });
    expect(closed.isReadOnly).toBe(true);
    expect(closed.readOnlyReason).toBe("ENCOUNTER_NOT_OPEN");
  });
});
