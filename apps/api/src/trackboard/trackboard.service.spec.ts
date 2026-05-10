/**
 * Phase 10B — trackboard operational aggregates merged onto list rows.
 */

import { TrackboardService } from "./trackboard.service";

describe("TrackboardService — Phase 10B", () => {
  it("merges trackboardOps from parallel $queryRaw aggregates", async () => {
    const encounterRow = {
      id: "enc-1",
      facilityId: "fac-1",
      patientId: "pat-1",
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
      .mockResolvedValueOnce([{ encounterId: "enc-1", lastAt: new Date("2026-05-10T10:00:00.000Z") }])
      .mockResolvedValueOnce([{ encounterId: "enc-1", firstAt: new Date("2026-05-10T09:00:00.000Z") }]);

    const prisma = {
      encounter: { findMany },
      $queryRaw: queryRaw,
    } as never;

    const svc = new TrackboardService(prisma);
    const rows = await svc.getActiveEncounters("fac-1", "OPEN");

    expect(rows).toHaveLength(1);
    expect(rows[0].trackboardOps).toMatchObject({
      resultsPendingCount: 2,
      criticalResultUnacknowledged: true,
      lastNursingReassessmentAt: "2026-05-10T10:00:00.000Z",
      firstDispositionDocAt: "2026-05-10T09:00:00.000Z",
    });
    expect(queryRaw).toHaveBeenCalledTimes(3);
  });
});
