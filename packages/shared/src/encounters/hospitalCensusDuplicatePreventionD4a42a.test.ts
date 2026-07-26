/**
 * MEDUI.D4A.4.2A — Characterization + regression for inpatient census duplicate prevention.
 *
 * Fixture pattern mirrors the Med/Surg board defect:
 * same patient / MRN MS-2026-5D1E2DFD with rooms MS-1 and bare "3",
 * active patients = 2 while occupied beds = 1 before projection fix.
 */

import { describe, expect, it } from "vitest";
import {
  buildHospitalCensusV1,
  type HospitalCensusEncounterInput,
} from "./hospitalCensusV1.js";
import {
  collapseCensusEncountersByEncounterId,
  dedupeCensusRowsByEncounterId,
  INPATIENT_CENSUS_DUPLICATE_PREVENTION_CERTIFICATION_ID,
  pickCanonicalInpatientCensusEncounter,
  projectCanonicalCensusEncounterIds,
  scoreCanonicalInpatientCensusEncounter,
} from "./hospitalCensusDuplicatePreventionD4a42a.js";
import { filterCensusByUnitSelection } from "./hospitalUnitRegistryV1.js";

const FACILITY = "fac-d4a42a";
const PATIENT = "pat-jesenia";
const MRN = "MS-2026-5D1E2DFD";

function enc(
  partial: Partial<HospitalCensusEncounterInput> & { id: string }
): HospitalCensusEncounterInput {
  return {
    facilityId: FACILITY,
    type: "INPATIENT",
    status: "OPEN",
    billingClassification: "INPATIENT",
    patient: {
      id: PATIENT,
      firstName: "Jesenia",
      lastName: "Rodriguez",
      mrn: MRN,
    },
    createdAt: "2026-07-20T10:00:00.000Z",
    admittedAt: "2026-07-20T10:00:00.000Z",
    ...partial,
  };
}

describe("MEDUI.D4A.4.2A inpatient census duplicate prevention", () => {
  it("exposes certification id", () => {
    expect(INPATIENT_CENSUS_DUPLICATE_PREVENTION_CERTIFICATION_ID).toContain("D4A.4.2A");
  });

  it("characterizes screenshot pattern: same patient MS-1 vs bare 3 → one census row", () => {
    const staleEdResidue = enc({
      id: "enc-stale-ed-flip",
      roomLabel: "3",
      admittedAt: "2026-07-20T09:00:00.000Z",
      createdAt: "2026-07-20T08:00:00.000Z",
    });
    const receivingBed = enc({
      id: "enc-receiving-ms1",
      roomLabel: "MS-1",
      admittedAt: "2026-07-20T11:00:00.000Z",
      createdAt: "2026-07-20T11:00:00.000Z",
      admissionSummaryJson: {
        hospitalAdmissionCorrelation: {
          admissionCorrelationId: "corr-1",
          status: "ARRIVED",
          receivingEncounterId: "enc-receiving-ms1",
          admissionIntent: "PLACEMENT_RECEIVING",
        },
      },
    });

    const census = buildHospitalCensusV1({
      facilityId: FACILITY,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [staleEdResidue, receivingBed],
      bedSummary: { total: 10, available: 9, occupied: 1, cleaning: 0, blocked: 0 },
    });

    expect(census.inpatientPatients).toHaveLength(1);
    expect(census.inpatientPatients[0]?.encounterId).toBe("enc-receiving-ms1");
    expect(census.inpatientPatients[0]?.unitRoomBed).toBe("MS-1");
    expect(census.inpatientPatients[0]?.mrn).toBe(MRN);
    expect(census.summary.activeInpatient).toBe(1);
    expect(census.summary.activeHospitalPatients).toBe(1);
    expect(census.summary.bedsOccupied).toBe(1);
    expect(census.operationalSnapshot.active).toBe(1);

    const msUnit = filterCensusByUnitSelection(census.inpatientPatients, {
      kind: "UNIT",
      unitCode: "MS",
    });
    expect(msUnit).toHaveLength(1);

    expect(
      census.diagnostics.some((d) => d.code === "DUPLICATE_OPEN_INPATIENT_ON_CENSUS")
    ).toBe(true);
    expect(
      census.diagnostics.some((d) => d.encounterId === "enc-stale-ed-flip")
    ).toBe(true);
  });

  it("collapses multi-source same encounterId without patient grouping", () => {
    const row = enc({ id: "enc-once", roomLabel: "MS-2" });
    const { unique, duplicateEncounterIds } = collapseCensusEncountersByEncounterId([
      row,
      { ...row },
      { ...row },
    ]);
    expect(unique).toHaveLength(1);
    expect(duplicateEncounterIds).toEqual(["enc-once"]);

    const census = buildHospitalCensusV1({
      facilityId: FACILITY,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [row, { ...row }, { ...row }],
      bedSummary: { total: 5, available: 4, occupied: 1, cleaning: 0, blocked: 0 },
    });
    expect(census.inpatientPatients).toHaveLength(1);
    expect(census.summary.activeInpatient).toBe(1);
    expect(
      census.diagnostics.some((d) => d.code === "DUPLICATE_ENCOUNTER_ID_IN_CENSUS_SOURCE")
    ).toBe(true);
  });

  it("keeps legitimate distinct patients (no name/MRN dedupe)", () => {
    const a = enc({
      id: "enc-a",
      roomLabel: "MS-1",
      patient: { id: "pat-a", firstName: "Ada", lastName: "A", mrn: "MS-2026-AAAA" },
    });
    const b = enc({
      id: "enc-b",
      roomLabel: "MS-2",
      patient: { id: "pat-b", firstName: "Bea", lastName: "B", mrn: "MS-2026-BBBB" },
    });
    const census = buildHospitalCensusV1({
      facilityId: FACILITY,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [a, b],
      bedSummary: { total: 10, available: 8, occupied: 2, cleaning: 0, blocked: 0 },
    });
    expect(census.inpatientPatients).toHaveLength(2);
    expect(census.summary.activeInpatient).toBe(2);
    expect(
      census.diagnostics.some((d) => d.code === "DUPLICATE_OPEN_INPATIENT_ON_CENSUS")
    ).toBe(false);
  });

  it("preserves historical closed encounters out of open census", () => {
    const open = enc({ id: "enc-open", roomLabel: "MS-1" });
    const closed = enc({
      id: "enc-closed",
      status: "CLOSED",
      roomLabel: "MS-2",
    });
    const census = buildHospitalCensusV1({
      facilityId: FACILITY,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [open, closed],
    });
    expect(census.inpatientPatients.map((p) => p.encounterId)).toEqual(["enc-open"]);
  });

  it("does not collapse OBS and IP lanes for different clinical contexts of same patient", () => {
    const obs = enc({
      id: "enc-obs",
      roomLabel: "OBS-1",
      billingClassification: "OBSERVATION",
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
    });
    const ip = enc({
      id: "enc-ip",
      roomLabel: "MS-1",
      billingClassification: "INPATIENT",
      admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
    });
    const census = buildHospitalCensusV1({
      facilityId: FACILITY,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [obs, ip],
    });
    expect(census.observationPatients.map((p) => p.encounterId)).toEqual(["enc-obs"]);
    expect(census.inpatientPatients.map((p) => p.encounterId)).toEqual(["enc-ip"]);
    expect(census.allHospitalPatients).toHaveLength(2);
  });

  it("prefers governed MS-1 over bare room 3 in ranking", () => {
    const bare = enc({ id: "enc-bare", roomLabel: "3" });
    const governed = enc({ id: "enc-gov", roomLabel: "MS-1" });
    expect(scoreCanonicalInpatientCensusEncounter(governed)).toBeGreaterThan(
      scoreCanonicalInpatientCensusEncounter(bare)
    );
    expect(pickCanonicalInpatientCensusEncounter([bare, governed]).id).toBe("enc-gov");
  });

  it("frontend defensive dedupe is encounter-keyed only", () => {
    const rows = [
      {
        encounterId: "enc-1",
        clinicalContext: "INPATIENT" as const,
        patientName: "A",
        mrn: MRN,
        ageSex: null,
        unitRoomBed: "MS-1",
        chiefComplaint: null,
        attendingName: null,
        nurseName: null,
        admittedAt: null,
        losHours: null,
        alerts: [],
      },
      {
        encounterId: "enc-1",
        clinicalContext: "INPATIENT" as const,
        patientName: "A",
        mrn: MRN,
        ageSex: null,
        unitRoomBed: "3",
        chiefComplaint: null,
        attendingName: null,
        nurseName: null,
        admittedAt: null,
        losHours: null,
        alerts: [],
      },
      {
        encounterId: "enc-2",
        clinicalContext: "INPATIENT" as const,
        patientName: "A",
        mrn: MRN,
        ageSex: null,
        unitRoomBed: "MS-2",
        chiefComplaint: null,
        attendingName: null,
        nurseName: null,
        admittedAt: null,
        losHours: null,
        alerts: [],
      },
    ];
    const deduped = dedupeCensusRowsByEncounterId(rows);
    // Same encounterId collapsed; different encounterIds for same MRN preserved
    // (backend canonical projection is the primary fix for patient-level dupes).
    expect(deduped).toHaveLength(2);
    expect(deduped.map((r) => r.encounterId).sort()).toEqual(["enc-1", "enc-2"]);
  });

  it("API-shaped refresh with duplicate payloads stays encounter-stable", () => {
    const a = enc({ id: "enc-a", roomLabel: "MS-4" });
    const projection = projectCanonicalCensusEncounterIds({
      encounters: [a, a, a],
      clinicalContextByEncounterId: new Map([["enc-a", "INPATIENT"]]),
    });
    expect(projection.retainedEncounterIds.has("enc-a")).toBe(true);
    expect(projection.diagnostics.some((d) => d.code === "DUPLICATE_ENCOUNTER_ID_IN_CENSUS_SOURCE")).toBe(
      true
    );
  });

  it("reconciles active patient count with occupied beds from same canonical set", () => {
    const census = buildHospitalCensusV1({
      facilityId: FACILITY,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        enc({ id: "enc-stale", roomLabel: "3" }),
        enc({
          id: "enc-live",
          roomLabel: "MS-1",
          admissionSummaryJson: {
            hospitalAdmissionCorrelation: {
              admissionCorrelationId: "c",
              status: "ARRIVED",
              receivingEncounterId: "enc-live",
            },
          },
        }),
      ],
      bedSummary: { total: 8, available: 7, occupied: 1, cleaning: 0, blocked: 0 },
    });
    expect(census.summary.activeInpatient).toBe(census.inpatientPatients.length);
    expect(census.summary.activeInpatient).toBe(census.summary.bedsOccupied);
  });
});
