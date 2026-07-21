import { describe, expect, it } from "vitest";
import {
  buildHospitalCensusV1,
  filterHospitalCensusPatients,
  placementDisabledMustNotHideClinicalCensus,
  UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("D3E.6A unified hospital census UI contracts", () => {
  it("mirrors D3E.6A i18n keys", () => {
    expect(Object.keys(en.hospitalCareD3e6a.filters).sort()).toEqual(
      Object.keys(fr.hospitalCareD3e6a.filters).sort()
    );
  });

  it("French empty states are scoped and do not blame placement for clinical zeros", () => {
    expect(fr.hospitalCareD3e6a.empty.observation).toMatch(/Observation/i);
    expect(fr.hospitalCareD3e6a.featureOffGuidance.toLowerCase()).toContain("placement");
    expect(fr.hospitalCareD3e6a.featureOffGuidance.toLowerCase()).toContain("restent visibles");
  });

  it("placement OFF keeps Observation census from open encounters", () => {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        {
          id: "e1",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          billingClassification: "OBSERVATION",
          admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
          patient: { firstName: "A", lastName: "B", mrn: "1" },
        },
      ],
    });
    expect(census.summary.activeObservation).toBe(1);
    expect(census.summary.awaitingBed).toBe(0);
    expect(placementDisabledMustNotHideClinicalCensus()).toBe(true);
    expect(census.certification).toBe(UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID);
  });

  it("shared filters subset the canonical list", () => {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      encounters: [
        {
          id: "obs",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          billingClassification: "OBSERVATION",
          admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
          patient: { firstName: "Obs", lastName: "One", mrn: "O1" },
        },
        {
          id: "ip",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          billingClassification: "INPATIENT",
          admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
          patient: { firstName: "Ip", lastName: "Two", mrn: "I2" },
        },
      ],
    });
    expect(
      filterHospitalCensusPatients(census.allHospitalPatients, { clinicalContext: "OBSERVATION" })
    ).toHaveLength(1);
  });
});
