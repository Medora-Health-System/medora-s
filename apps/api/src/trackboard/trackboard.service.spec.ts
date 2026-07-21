/**
 * Phase 10B — trackboard operational aggregates merged onto list rows.
 * MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20 — explicit select contract.
 */

import { TrackboardService } from "./trackboard.service";
import { TRACKBOARD_ACTIVE_ENCOUNTER_SELECT } from "./trackboard-encounter-select";

describe("TrackboardService — Phase 10B", () => {
  it("merges trackboardOps from parallel $queryRaw aggregates", async () => {
    const encounterRow = {
      id: "enc-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      type: "EMERGENCY",
      status: "OPEN",
      workflowState: "ARRIVED",
      patient: { id: "pat-1", firstName: "A", lastName: "B", dob: null, sexAtBirth: null, mrn: "1" },
      physicianAssigned: null,
      nurseAssigned: null,
      triage: null,
    };

    const findMany = jest.fn().mockResolvedValue([encounterRow]);
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        { encounterId: "enc-1", resultsPendingCount: BigInt(2), criticalResultUnacknowledged: true },
      ])
      .mockResolvedValueOnce([
        {
          encounterId: "enc-1",
          lastNursingAt: new Date("2026-05-10T10:00:00.000Z"),
          lastProviderObsAt: null,
          lastRnObservationAt: new Date("2026-05-10T09:30:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([{ encounterId: "enc-1", firstAt: new Date("2026-05-10T09:00:00.000Z") }])
      .mockResolvedValueOnce([{ encounterId: "enc-1", lastAt: new Date("2026-05-10T08:00:00.000Z") }])
      .mockResolvedValueOnce([{ encounterId: "enc-1", openOrderCount: BigInt(3) }]);

    const prisma = {
      encounter: { findMany },
      $queryRaw: queryRaw,
    } as never;

    const svc = new TrackboardService(prisma);
    const rows = await svc.getActiveEncounters("fac-1", "OPEN");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "fac-1" }),
        select: TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    );
    expect(findMany.mock.calls[0][0]).not.toHaveProperty("include");
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty("hospitalEpisodeId");
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty("hospitalEpisode");

    expect(rows).toHaveLength(1);
    expect(rows[0].trackboardOps).toMatchObject({
      resultsPendingCount: 2,
      criticalResultUnacknowledged: true,
      openOrderCount: 3,
      lastNursingReassessmentAt: "2026-05-10T10:00:00.000Z",
      lastProviderObservationReassessmentAt: null,
      lastRnObservationReassessmentAt: "2026-05-10T09:30:00.000Z",
      firstDispositionDocAt: "2026-05-10T09:00:00.000Z",
    });
    expect(queryRaw).toHaveBeenCalledTimes(5);
  });

  it("does not treat empty list as success fallback when prisma fails", async () => {
    const findMany = jest.fn().mockRejectedValue(
      Object.assign(new Error("column does not exist"), {
        name: "PrismaClientKnownRequestError",
        code: "P2022",
        meta: { column: "hospitalEpisodeId", modelName: "Encounter" },
      })
    );
    const prisma = { encounter: { findMany }, $queryRaw: jest.fn() } as never;
    const svc = new TrackboardService(prisma);
    await expect(svc.getActiveEncounters("fac-1", "OPEN")).rejects.toMatchObject({
      code: "P2022",
    });
  });
});
