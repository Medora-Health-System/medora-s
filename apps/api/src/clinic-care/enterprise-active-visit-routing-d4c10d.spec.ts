import {
  D4C10D_CERTIFICATION_ID,
  clinicAmbulatoryWorklistServiceLineWhere,
  dedupeWorklistRowsByEncounterId,
  isClinicAmbulatoryWorklistServiceLine,
  isDentalWorklistEncounter,
  listClinicOwnershipBlockersForDentalReroute,
  planDentalVisitStart,
} from "@medora/shared";

describe("MEDUI.D4C.10D API worklist routing contracts", () => {
  it("exports certification id", () => {
    expect(D4C10D_CERTIFICATION_ID).toBe("MEDUI.D4C.10D");
  });

  it("Clinic board excludes Dental serviceLine", () => {
    expect(isClinicAmbulatoryWorklistServiceLine("DENTAL")).toBe(false);
    expect(isClinicAmbulatoryWorklistServiceLine("CLINIC")).toBe(true);
    const where = clinicAmbulatoryWorklistServiceLineWhere();
    expect(JSON.stringify(where)).toContain("CLINIC");
    expect(JSON.stringify(where)).not.toContain("DENTAL");
  });

  it("Dental worklist includes only Dental destination", () => {
    expect(
      isDentalWorklistEncounter({
        id: "1",
        status: "OPEN",
        type: "OUTPATIENT",
        serviceLine: "DENTAL",
      })
    ).toBe(true);
    expect(
      isDentalWorklistEncounter({
        id: "2",
        status: "OPEN",
        type: "OUTPATIENT",
        serviceLine: "CLINIC",
      })
    ).toBe(false);
  });

  it("dedupe is by encounterId", () => {
    expect(
      dedupeWorklistRowsByEncounterId([{ id: "a" }, { id: "a" }, { id: "b" }]).map((r) => r.id)
    ).toEqual(["a", "b"]);
  });

  it("safe wait routes; any ownership marker creates new Dental", () => {
    expect(
      planDentalVisitStart([
        {
          id: "w",
          type: "OUTPATIENT",
          status: "OPEN",
          serviceLine: "CLINIC",
          workflowState: "ARRIVED",
          billingFinalizationStatus: "NOT_READY",
        },
      ]).action
    ).toBe("ROUTE_UNCLAIMED_CLINIC");

    const owned = {
      id: "d",
      type: "OUTPATIENT" as const,
      status: "OPEN" as const,
      serviceLine: "CLINIC",
      physicianAssignedUserId: "md-1",
    };
    expect(listClinicOwnershipBlockersForDentalReroute(owned)).toContain("PROVIDER_ASSIGNED");
    expect(planDentalVisitStart([owned]).action).toBe("CREATE_NEW_DENTAL");
  });
});
