/**
 * D4A.2.8-HF1/HF2 — workspace-bootstrap must not query hospitalEpisodeId when foundation OFF.
 * HF2: FACILITY_MISMATCH ≠ NOT_FOUND; authority mediates resolution.
 */

import { EncounterType } from "@prisma/client";
import { InpatientOperationsService } from "./inpatient-operations.service";

describe("InpatientOperationsService workspace-bootstrap D4A.2.8-HF1/HF2", () => {
  const prev = process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    else process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = prev;
  });

  function inpatientRow(overrides: Record<string, unknown> = {}) {
    return {
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
      ...overrides,
    };
  }

  function build(opts: {
    authorityResolve: jest.Mock;
    compatFind?: jest.Mock;
  }) {
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
      findFacilityEncounterForWorkspace: opts.compatFind ?? jest.fn(),
      findOpenHospitalEncountersForCensus: jest.fn(),
      findEncounterByIdForAuthority: jest.fn(),
    };
    const encounterAuthority = {
      resolveRequestedEncounter: opts.authorityResolve,
      certification: jest
        .fn()
        .mockReturnValue("MEDUI.AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY.D4A2_8_HF2"),
    };
    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      bedBoardService,
      clinicalSynthesis,
      compatibleEncounters as never,
      encounterAuthority as never
    );
    return { svc, audit, prisma, compatibleEncounters, encounterAuthority };
  }

  it("10: compat false — bootstrap succeeds for INPATIENT without hospitalEpisodeId", async () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    const row = inpatientRow();
    const authorityResolve = jest.fn().mockResolvedValue({
      ok: true,
      requestedEncounterId: row.id,
      resolvedEncounterId: row.id,
      redirected: false,
      redirectReason: null,
      facilityId: row.facilityId,
      patientId: row.patientId,
      encounterType: "INPATIENT",
      clinicalContext: "INPATIENT",
      status: "OPEN",
      hospitalEpisodeId: null,
      census: { eligible: true, clinicalContext: "INPATIENT", reasons: [], countsTowardHospitalCensus: true },
      lineage: {},
      canonicalBedKey: "MS:1",
    });
    const compatFind = jest.fn().mockResolvedValue(row);
    const { svc, prisma } = build({ authorityResolve, compatFind });
    const result = await svc.getWorkspaceBootstrap(
      "fac-1",
      "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced",
      "user-1",
      { role: "CHART" }
    );
    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(authorityResolve).toHaveBeenCalledWith("fac-1", row.id, {
      workspace: "INPATIENT",
      allowLineageRedirect: true,
    });
    expect(result.resolution.ok).toBe(true);
    if (result.resolution.ok) {
      expect(result.resolution.encounterType).toBe("INPATIENT");
      expect(result.resolution.hospitalEpisodeId).toBeNull();
      expect(result.writersEnabled).toBe(true);
    }
    expect(result.header?.encounterType).toBe("INPATIENT");
  });

  it("11: type mismatch returns WRONG/ED/OBS category with actualEncounterType (not 500)", async () => {
    const authorityResolve = jest.fn().mockResolvedValue({
      ok: false,
      requestedEncounterId: "enc-ed",
      category: "ED_ENCOUNTER_REJECTED",
      actualEncounterType: "EMERGENCY",
      patientId: "pat-1",
      census: {
        eligible: false,
        clinicalContext: "EMERGENCY",
        reasons: ["SOURCE_ED_ENCOUNTER"],
        countsTowardHospitalCensus: false,
      },
      lineage: null,
      messageCode: "inpatientWorkspaceRecovery.errors.ED_ENCOUNTER_REJECTED",
    });
    const { svc } = build({ authorityResolve });
    const result = await svc.getWorkspaceBootstrap("fac-1", "enc-ed", "user-1");
    expect(result.resolution.ok).toBe(false);
    if (!result.resolution.ok) {
      expect(result.resolution.category).toBe("ED_ENCOUNTER_REJECTED");
      expect(result.resolution.actualEncounterType).toBe("EMERGENCY");
      expect(result.writersEnabled).toBe(false);
    }
  });

  it("12: not found returns NOT_FOUND without querying forbidden column via prisma", async () => {
    const authorityResolve = jest.fn().mockResolvedValue({
      ok: false,
      requestedEncounterId: "missing-id",
      category: "NOT_FOUND",
      census: {
        eligible: false,
        clinicalContext: null,
        reasons: ["ENCOUNTER_NOT_FOUND"],
        countsTowardHospitalCensus: false,
      },
      lineage: null,
      messageCode: "inpatientWorkspaceRecovery.errors.NOT_FOUND",
    });
    const { svc, prisma } = build({ authorityResolve });
    const result = await svc.getWorkspaceBootstrap("fac-1", "missing-id", "user-1");
    expect(result.resolution.ok).toBe(false);
    if (!result.resolution.ok) {
      expect(result.resolution.category).toBe("NOT_FOUND");
    }
    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it("HF2: FACILITY_MISMATCH is distinct from NOT_FOUND", async () => {
    const authorityResolve = jest.fn().mockResolvedValue({
      ok: false,
      requestedEncounterId: "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced",
      category: "FACILITY_MISMATCH",
      actualFacilityId: "other-fac",
      actualEncounterType: "INPATIENT",
      patientId: "pat-1",
      census: {
        eligible: false,
        clinicalContext: "INPATIENT",
        reasons: ["FACILITY_MISMATCH"],
        countsTowardHospitalCensus: false,
      },
      lineage: null,
      messageCode: "inpatientWorkspaceRecovery.errors.FACILITY_MISMATCH",
    });
    const { svc, audit } = build({ authorityResolve });
    const result = await svc.getWorkspaceBootstrap(
      "fac-1",
      "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced",
      "user-1"
    );
    expect(result.resolution.ok).toBe(false);
    if (!result.resolution.ok) {
      expect(result.resolution.category).toBe("FACILITY_MISMATCH");
      expect(result.resolution.category).not.toBe("NOT_FOUND");
      expect(result.resolution.actualFacilityId).toBe("other-fac");
    }
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "InpatientWorkspace",
      expect.objectContaining({
        metadata: expect.objectContaining({
          category: "FACILITY_MISMATCH",
          event: "INPATIENT_WORKSPACE_BOOTSTRAP_FACILITY_MISMATCH",
        }),
      })
    );
  });
});
