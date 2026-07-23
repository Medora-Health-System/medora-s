/**
 * D4A.2.8-HF1 — workspace-bootstrap must not query hospitalEpisodeId when foundation OFF.
 */

import { EncounterType } from "@prisma/client";
import { InpatientOperationsService } from "./inpatient-operations.service";

describe("InpatientOperationsService workspace-bootstrap D4A.2.8-HF1", () => {
  const prev = process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    else process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = prev;
  });

  function build(compatFind: jest.Mock) {
    const prisma = {
      encounter: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      patient: { findFirst: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const admissionCorrelation = {} as never;
    const bedBoardService = {} as never;
    const clinicalSynthesis = {} as never;
    const compatibleEncounters = {
      isHospitalEpisodeFoundationEnabled: jest.fn().mockReturnValue(false),
      findFacilityEncounterForWorkspace: compatFind,
      findOpenHospitalEncountersForCensus: jest.fn(),
    };
    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      bedBoardService,
      clinicalSynthesis,
      compatibleEncounters as never
    );
    return { svc, audit, prisma, compatibleEncounters };
  }

  it("10: compat false — bootstrap succeeds for INPATIENT without hospitalEpisodeId", async () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    const compatFind = jest.fn().mockResolvedValue({
      id: "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced",
      facilityId: "fac-1",
      patientId: "pat-1",
      type: EncounterType.INPATIENT,
      status: "OPEN",
      admittedAt: new Date("2026-07-20T12:00:00Z"),
      createdAt: new Date("2026-07-20T12:00:00Z"),
      roomLabel: "MS-1-A",
      chiefComplaint: "Pneumonia",
      admissionSummaryJson: {},
      billingClassification: null,
      providerDocumentationStatus: null,
      physicianAssignedUserId: null,
      nurseAssignedUserId: null,
      workflowState: null,
      hospitalEpisodeId: null,
      physicianAssigned: null,
      nurseAssigned: null,
      patient: {
        id: "pat-1",
        firstName: "Ada",
        lastName: "Lovelace",
        middleName: null,
        mrn: "MRN1",
        dob: null,
        sexAtBirth: "F",
        language: "fr",
        clinicalHistoryProfileJson: null,
        latestVitalsJson: null,
        latestVitalsAt: null,
      },
      facility: { name: "Clinic" },
    });
    const { svc, prisma } = build(compatFind);
    const result = await svc.getWorkspaceBootstrap(
      "fac-1",
      "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced",
      "user-1",
      { role: "CHART" }
    );
    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(compatFind).toHaveBeenCalledWith(
      "fac-1",
      "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced"
    );
    expect(result.resolution.ok).toBe(true);
    if (result.resolution.ok) {
      expect(result.resolution.encounterType).toBe("INPATIENT");
      expect(result.resolution.hospitalEpisodeId).toBeNull();
      expect(result.writersEnabled).toBe(true);
    }
    expect(result.header?.encounterType).toBe("INPATIENT");
  });

  it("11: type mismatch returns WRONG/ED/OBS category with actualEncounterType (not 500)", async () => {
    const compatFind = jest.fn().mockResolvedValue({
      id: "enc-ed",
      facilityId: "fac-1",
      patientId: "pat-1",
      type: EncounterType.EMERGENCY,
      status: "OPEN",
      admittedAt: null,
      createdAt: new Date(),
      roomLabel: "ED-1",
      chiefComplaint: "Trauma",
      admissionSummaryJson: {},
      billingClassification: null,
      providerDocumentationStatus: null,
      physicianAssignedUserId: null,
      nurseAssignedUserId: null,
      workflowState: null,
      hospitalEpisodeId: null,
      physicianAssigned: null,
      nurseAssigned: null,
      patient: {
        id: "pat-1",
        firstName: "Ed",
        lastName: "Patient",
        mrn: "E1",
        dob: null,
        sexAtBirth: null,
        language: null,
        clinicalHistoryProfileJson: null,
        latestVitalsJson: null,
        latestVitalsAt: null,
      },
      facility: { name: "Clinic" },
    });
    const { svc } = build(compatFind);
    const result = await svc.getWorkspaceBootstrap("fac-1", "enc-ed", "user-1");
    expect(result.resolution.ok).toBe(false);
    if (!result.resolution.ok) {
      expect(result.resolution.category).toBe("ED_ENCOUNTER_REJECTED");
      expect(result.resolution.actualEncounterType).toBe("EMERGENCY");
      expect(result.writersEnabled).toBe(false);
    }
  });

  it("12: not found returns NOT_FOUND without querying forbidden column via prisma", async () => {
    const compatFind = jest.fn().mockResolvedValue(null);
    const { svc, prisma } = build(compatFind);
    const result = await svc.getWorkspaceBootstrap("fac-1", "missing-id", "user-1");
    expect(result.resolution.ok).toBe(false);
    if (!result.resolution.ok) {
      expect(result.resolution.category).toBe("NOT_FOUND");
    }
    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });
});
