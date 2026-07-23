/**
 * D4A.2.8-HF1 — Hospital census encounter-authoritative + bed reconciliation.
 */

import { HospitalCensusService } from "./hospital-census.service";

describe("HospitalCensusService D4A.2.8-HF1", () => {
  function build() {
    const encounters = {
      findOpenHospitalEncountersForCensus: jest.fn().mockResolvedValue([
        {
          id: "enc-ip-1",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "INPATIENT",
          status: "OPEN",
          admittedAt: new Date("2026-07-22T10:00:00Z"),
          createdAt: new Date("2026-07-22T10:00:00Z"),
          roomLabel: "MS-1-A",
          chiefComplaint: "Pneumonia",
          admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
          billingClassification: null,
          physicianAssignedUserId: null,
          nurseAssignedUserId: null,
          hospitalEpisodeId: null,
          physicianAssigned: null,
          nurseAssigned: null,
          patient: {
            id: "pat-1",
            firstName: "Ada",
            lastName: "Lovelace",
            mrn: "MRN1",
            dob: null,
            sexAtBirth: "F",
          },
        },
        {
          id: "enc-obs-1",
          facilityId: "fac-1",
          patientId: "pat-2",
          type: "INPATIENT",
          status: "OPEN",
          admittedAt: new Date("2026-07-22T11:00:00Z"),
          createdAt: new Date("2026-07-22T11:00:00Z"),
          roomLabel: "OBS-1-A",
          chiefComplaint: "Chest pain",
          admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
          billingClassification: "OBSERVATION",
          physicianAssignedUserId: null,
          nurseAssignedUserId: null,
          hospitalEpisodeId: null,
          physicianAssigned: null,
          nurseAssigned: null,
          patient: {
            id: "pat-2",
            firstName: "Obs",
            lastName: "Patient",
            mrn: "MRN2",
            dob: null,
            sexAtBirth: "M",
          },
        },
      ]),
      isHospitalEpisodeFoundationEnabled: jest.fn().mockReturnValue(false),
    };
    const placement = {
      listFacilityQueue: jest.fn().mockResolvedValue({
        availability: "FEATURE_DISABLED",
        items: [],
      }),
    };
    const bedBoard = {
      getBedBoard: jest.fn().mockResolvedValue({
        generatedAt: new Date().toISOString(),
        units: [
          {
            unitCode: "MS",
            summary: { available: 1, occupied: 2, cleaning: 0, blocked: 0 },
            beds: [
              {
                bedKey: "MS:1:A",
                display: "MS-1-A",
                status: "OCCUPIED",
                occupantEncounterId: "enc-ip-1",
                occupantPatientName: "Ada Lovelace",
              },
              {
                bedKey: "MS:9:Z",
                display: "MS-9-Z",
                status: "OCCUPIED",
                occupantEncounterId: "stale-enc",
                occupantPatientName: "Stale Occupant",
              },
            ],
          },
        ],
      }),
    };
    const encounterAuthority = {
      certification: jest
        .fn()
        .mockReturnValue("MEDUI.AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY.D4A2_8_HF2"),
      getFacilityReconciliationReport: jest.fn(),
    };
    const svc = new HospitalCensusService(
      placement as never,
      bedBoard as never,
      encounters as never,
      encounterAuthority as never
    );
    return { svc, encounters, placement, bedBoard };
  }

  it("7: census counts Observation + Inpatient from encounters without hospitalEpisodeId", async () => {
    const { svc, encounters } = build();
    const census = await svc.getHospitalCensus("fac-1");
    expect(encounters.findOpenHospitalEncountersForCensus).toHaveBeenCalledWith("fac-1");
    expect(census.summary.activeInpatient).toBe(1);
    expect(census.summary.activeObservation).toBe(1);
    expect(census.summary.activeHospitalPatients).toBe(2);
    expect(census.inpatientPatients.some((p) => p.encounterId === "enc-ip-1")).toBe(true);
    expect(census.observationPatients.some((p) => p.encounterId === "enc-obs-1")).toBe(true);
  });

  it("8: Med/Surg patient remains in census while stale occupied bed emits warning", async () => {
    const { svc } = build();
    const census = await svc.getHospitalCensus("fac-1");
    expect(census.allHospitalPatients.some((p) => p.unitRoomBed === "MS-1-A")).toBe(true);
    expect(
      census.diagnostics.some(
        (d) =>
          d.code === "OCCUPIED_BED_WITHOUT_ACTIVE_ENCOUNTER" && d.bedKey === "MS:9:Z"
      )
    ).toBe(true);
  });

  it("9: placement FEATURE_DISABLED does not empty clinical census", async () => {
    const { svc, placement } = build();
    const census = await svc.getHospitalCensus("fac-1");
    expect(placement.listFacilityQueue).toHaveBeenCalled();
    expect(census.placementAvailability).toBe("FEATURE_DISABLED");
    expect(census.summary.activeHospitalPatients).toBe(2);
  });
});
