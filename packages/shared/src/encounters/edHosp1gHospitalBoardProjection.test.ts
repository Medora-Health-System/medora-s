import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyEdHospHospitalBoardSurface,
  countEdHospBoardSurfaces,
  hasCanonicalAssignedBed,
  isEdHospAdmissionsReceivingRow,
  isEdHospHospitalDestination,
  isEdHospObservationReceivingRow,
  isEdHospPlacementQueueRow,
} from "./edHosp1gHospitalBoardProjection.js";
import { buildHospitalCareDashboardSummary } from "./hospitalCareDashboardSummaryV1.js";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "edHosp1gHospitalBoardProjection.ts"),
  "utf8"
);

const caps = {
  emergencyDepartment: true,
  observation: true,
  inpatient: true,
  directAdmission: true,
  bedManagement: true,
  transfers: false,
  placementWorkflow: true,
  receivingEncounters: true,
};

describe("ED.HOSP.1G existing hospital board projection", () => {
  it("classifies from durable placement fields only", () => {
    expect(src).toContain("requestedEncounterType");
    expect(src).toContain("assignedBedKey");
    expect(src).toContain("receivingEncounterId");
    expect(src).not.toContain("patient.mrn");
  });

  it("Observation/Admission without bed go to Placement queue", () => {
    expect(
      isEdHospPlacementQueueRow({
        requestedEncounterType: "OBSERVATION",
        status: "REQUESTED",
        assignedBedKey: null,
      })
    ).toBe(true);
    expect(
      isEdHospPlacementQueueRow({
        requestedEncounterType: "INPATIENT",
        status: "ACCEPTED",
        assignedBedKey: "  ",
      })
    ).toBe(true);
  });

  it("Observation with canonical bed goes to Observation receiving, not queue", () => {
    const row = {
      requestedEncounterType: "OBSERVATION",
      status: "BED_ASSIGNED",
      assignedBedKey: "OBS-1",
    };
    expect(isEdHospObservationReceivingRow(row)).toBe(true);
    expect(isEdHospPlacementQueueRow(row)).toBe(false);
    expect(isEdHospAdmissionsReceivingRow(row)).toBe(false);
  });

  it("Admission with canonical bed goes to Admissions receiving, not Inpatient census overlay", () => {
    const row = {
      requestedEncounterType: "INPATIENT",
      status: "BED_ASSIGNED",
      assignedBedKey: "MS:2",
    };
    expect(isEdHospAdmissionsReceivingRow(row)).toBe(true);
    expect(isEdHospPlacementQueueRow(row)).toBe(false);
    expect(classifyEdHospHospitalBoardSurface(row)).toBe("ADMISSIONS_RECEIVING");
  });

  it("receiving/arrival leaves incoming surfaces (Start Nursing Admission / ARRIVED)", () => {
    const started = {
      requestedEncounterType: "OBSERVATION",
      status: "ARRIVED_DESTINATION",
      assignedBedKey: "OBS-1",
      receivingEncounterId: "recv-1",
    };
    expect(classifyEdHospHospitalBoardSurface(started)).toBe("ACTIVE_HOSPITAL");
    expect(isEdHospObservationReceivingRow(started)).toBe(false);
    expect(isEdHospPlacementQueueRow(started)).toBe(false);
  });

  it("excludes Transfer, Home, AMA, LWBS, Elopement, Deceased, and blank dest", () => {
    for (const dest of [null, "TRANSFER", "HOME", "AMA", "LWBS", "ELOPEMENT", "DECEASED"]) {
      expect(isEdHospHospitalDestination(dest)).toBe(false);
      expect(
        classifyEdHospHospitalBoardSurface({
          requestedEncounterType: dest,
          status: "REQUESTED",
        })
      ).toBe("EXCLUDED");
    }
  });

  it("does not treat whitespace as an assigned bed", () => {
    expect(hasCanonicalAssignedBed(null)).toBe(false);
    expect(hasCanonicalAssignedBed("")).toBe(false);
    expect(hasCanonicalAssignedBed("BED-4")).toBe(true);
  });

  it("counts exclusive surfaces without duplicate actionable rows", () => {
    const counts = countEdHospBoardSurfaces([
      { requestedEncounterType: "OBSERVATION", status: "REQUESTED", assignedBedKey: null },
      { requestedEncounterType: "OBSERVATION", status: "BED_ASSIGNED", assignedBedKey: "O1" },
      { requestedEncounterType: "INPATIENT", status: "BED_ASSIGNED", assignedBedKey: "I1" },
      {
        requestedEncounterType: "INPATIENT",
        status: "ARRIVED_DESTINATION",
        assignedBedKey: "I2",
        receivingEncounterId: "recv",
      },
      { requestedEncounterType: "HOME", status: "REQUESTED" },
    ]);
    expect(counts).toEqual({
      placementQueue: 1,
      observationReceiving: 1,
      admissionsReceiving: 1,
    });
  });

  it("no-bed Observation increments awaitingBed, not Observation census", () => {
    const s = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [
        {
          id: "p1",
          status: "REQUESTED",
          requestedEncounterType: "OBSERVATION",
          assignedBedKey: null,
        },
      ],
      capabilities: caps,
      clinicalCensus: { activeObservation: 0, activeInpatient: 0, admissionsToday: 0 },
    });
    expect(s.counts.awaitingBed).toBe(1);
    expect(s.counts.activeObservation).toBe(0);
  });

  it("bed-assigned Observation increments Observation metric and leaves awaitingBed", () => {
    const s = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [
        {
          id: "p2",
          status: "BED_ASSIGNED",
          requestedEncounterType: "OBSERVATION",
          assignedBedKey: "OBS-1",
        },
      ],
      capabilities: caps,
      clinicalCensus: { activeObservation: 2, activeInpatient: 4, admissionsToday: 1 },
    });
    expect(s.counts.awaitingBed).toBe(0);
    expect(s.counts.activeObservation).toBe(3);
    expect(s.counts.activeInpatient).toBe(4);
    expect(s.counts.incomingAdmissions).toBe(0);
  });

  it("bed-assigned Admission increments incomingAdmissions, not activeInpatient", () => {
    const s = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [
        {
          id: "p3",
          status: "BED_ASSIGNED",
          requestedEncounterType: "INPATIENT",
          assignedBedKey: "MS:1",
        },
      ],
      capabilities: caps,
      clinicalCensus: { activeObservation: 0, activeInpatient: 5, admissionsToday: 2 },
    });
    expect(s.counts.incomingAdmissions).toBe(1);
    expect(s.counts.activeInpatient).toBe(5);
    expect(s.counts.awaitingBed).toBe(0);
  });
});
