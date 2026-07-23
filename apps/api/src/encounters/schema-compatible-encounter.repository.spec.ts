/**
 * D4A.2.8-HF1 — Compatibility-aware Encounter projection contracts.
 */

import {
  assertSelectExcludesHospitalEpisodeIdWhenDisabled,
  buildHospitalCensusEncounterSelect,
  buildWorkspaceBootstrapEncounterSelect,
  hospitalEpisodeSelectAllowed,
  SchemaCompatibleEncounterRepository,
} from "./schema-compatible-encounter.repository";

describe("SchemaCompatibleEncounterRepository D4A.2.8-HF1", () => {
  const prev = process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
  const prevPublic = process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    else process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = prev;
    if (prevPublic === undefined) {
      delete process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED = prevPublic;
    }
  });

  it("1: foundation OFF — bootstrap select omits hospitalEpisodeId", () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    delete process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    expect(hospitalEpisodeSelectAllowed(false)).toBe(false);
    const select = buildWorkspaceBootstrapEncounterSelect(false);
    expect(select).not.toHaveProperty("hospitalEpisodeId");
    expect(select.type).toBe(true);
    expect(select.status).toBe(true);
    expect(select.patient).toBeTruthy();
    assertSelectExcludesHospitalEpisodeIdWhenDisabled(
      select as Record<string, unknown>,
      false
    );
  });

  it("2: foundation OFF — census select omits hospitalEpisodeId", () => {
    const select = buildHospitalCensusEncounterSelect(false);
    expect(select).not.toHaveProperty("hospitalEpisodeId");
    expect(select.billingClassification).toBe(true);
    expect(select.admissionSummaryJson).toBe(true);
  });

  it("3: foundation ON — selects may include hospitalEpisodeId", () => {
    process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = "true";
    const bootstrap = buildWorkspaceBootstrapEncounterSelect(true);
    const census = buildHospitalCensusEncounterSelect(true);
    expect(bootstrap.hospitalEpisodeId).toBe(true);
    expect(census.hospitalEpisodeId).toBe(true);
  });

  it("4: findFacilityEncounterForWorkspace projects hospitalEpisodeId null when foundation OFF", async () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    const findFirst = jest.fn().mockResolvedValue({
      id: "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced",
      facilityId: "fac-1",
      patientId: "pat-1",
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: new Date("2026-07-20T12:00:00Z"),
      createdAt: new Date("2026-07-20T12:00:00Z"),
      roomLabel: "MS-1-A",
      chiefComplaint: "Pneumonia",
      admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      billingClassification: "INPATIENT",
      providerDocumentationStatus: null,
      physicianAssignedUserId: null,
      nurseAssignedUserId: null,
      workflowState: null,
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
    const prisma = { encounter: { findFirst, findMany: jest.fn() } };
    const repo = new SchemaCompatibleEncounterRepository(prisma as never);
    const row = await repo.findFacilityEncounterForWorkspace(
      "fac-1",
      "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced"
    );
    expect(findFirst).toHaveBeenCalled();
    const args = findFirst.mock.calls[0][0];
    expect(args.select).not.toHaveProperty("hospitalEpisodeId");
    expect(row?.type).toBe("INPATIENT");
    expect(row?.hospitalEpisodeId).toBeNull();
    expect(row?.roomLabel).toBe("MS-1-A");
  });

  it("5: findOpenHospitalEncountersForCensus never selects hospitalEpisodeId when OFF", async () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    const findMany = jest.fn().mockImplementation(async (args: { select?: Record<string, unknown> }) => {
      if (args?.select && "hospitalEpisodeId" in args.select) {
        throw Object.assign(new Error("P2022"), {
          code: "P2022",
          meta: { column: "Encounter.hospitalEpisodeId" },
        });
      }
      return [
        {
          id: "enc-ip-1",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "INPATIENT",
          status: "OPEN",
          admittedAt: new Date(),
          createdAt: new Date(),
          roomLabel: "MS-2-B",
          chiefComplaint: "Cellulitis",
          admissionSummaryJson: {},
          billingClassification: null,
          providerDocumentationStatus: null,
          physicianAssignedUserId: null,
          nurseAssignedUserId: null,
          workflowState: null,
          physicianAssigned: null,
          nurseAssigned: null,
          patient: {
            id: "pat-1",
            firstName: "Pat",
            lastName: "One",
            mrn: "1",
            dob: null,
            sexAtBirth: null,
          },
        },
      ];
    });
    const prisma = { encounter: { findFirst: jest.fn(), findMany } };
    const repo = new SchemaCompatibleEncounterRepository(prisma as never);
    const rows = await repo.findOpenHospitalEncountersForCensus("fac-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.hospitalEpisodeId).toBeNull();
    expect(rows[0]!.type).toBe("INPATIENT");
  });

  it("6: assert rejects leaking hospitalEpisodeId when foundation OFF", () => {
    expect(() =>
      assertSelectExcludesHospitalEpisodeIdWhenDisabled({ hospitalEpisodeId: true }, false)
    ).toThrow(/hospitalEpisodeId/);
  });
});
