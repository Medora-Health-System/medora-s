/**
 * D4A.2.8-HF1 — shared census + resolution category contracts.
 */
import { describe, expect, it } from "vitest";
import {
  buildHospitalCensusV1,
  ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES,
} from "../index.js";

describe("MEDUI.HOSPITAL_CENSUS_INPATIENT_RECOVERY.D4A2_8_HF1 shared", () => {
  it("includes HF1 client error categories", () => {
    expect(ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES).toContain("SCHEMA_COMPATIBILITY");
    expect(ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES).toContain("FORBIDDEN");
    expect(ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES).toContain("SERVER_ERROR");
    expect(ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES).toContain("ENCOUNTER_TYPE_MISMATCH");
  });

  it("census remains encounter-authoritative with stale bed warning", () => {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        {
          id: "enc-ip",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
          roomLabel: "MS-1-A",
          patient: { firstName: "Ada", lastName: "Lovelace", mrn: "1" },
        },
        {
          id: "enc-obs",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          billingClassification: "OBSERVATION",
          admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
          roomLabel: "OBS-1-A",
          patient: { firstName: "Obs", lastName: "Pt", mrn: "2" },
        },
      ],
      occupiedBedKeysWithoutEncounter: ["MS:9:Z"],
    });
    expect(census.summary.activeInpatient).toBe(1);
    expect(census.summary.activeObservation).toBe(1);
    expect(
      census.diagnostics.some(
        (d) => d.code === "OCCUPIED_BED_WITHOUT_ACTIVE_ENCOUNTER" && d.bedKey === "MS:9:Z"
      )
    ).toBe(true);
  });

  it("does not downgrade bare INPATIENT type to UNKNOWN", () => {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        {
          id: "enc-direct",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          admissionSummaryJson: {},
          roomLabel: "MS-2-B",
        },
      ],
    });
    expect(census.summary.activeInpatient).toBe(1);
    expect(census.inpatientPatients[0]?.clinicalContext).toBe("INPATIENT");
  });
});
