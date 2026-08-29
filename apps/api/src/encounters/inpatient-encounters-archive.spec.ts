/**
 * INP.HIST.1A — inpatient archive list service tests (lightweight metadata only).
 */

import { EncounterStatus, EncounterType } from "@prisma/client";
import { InpatientEncountersArchiveService } from "./inpatient-encounters-archive.service";

describe("InpatientEncountersArchiveService (INP.HIST.1A)", () => {
  function makePrisma(rows: unknown[], total = rows.length) {
    return {
      encounter: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
  }

  it("queries INPATIENT encounters newest-first with default status set", async () => {
    const prisma = makePrisma([]);
    const service = new InpatientEncountersArchiveService(prisma as never);
    await service.listArchiveEncounters({ facilityId: "fac-1" });
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId: "fac-1",
          type: EncounterType.INPATIENT,
          status: {
            in: [EncounterStatus.OPEN, EncounterStatus.CLOSED, EncounterStatus.CANCELLED],
          },
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: InpatientEncountersArchiveService.DEFAULT_LIMIT,
        skip: 0,
      })
    );
  });

  it("projects course summary + ED link from admission JSON without loading chart domains", async () => {
    const prisma = makePrisma([
      {
        id: "ip-1",
        status: EncounterStatus.CLOSED,
        type: EncounterType.INPATIENT,
        createdAt: new Date("2026-08-20T13:42:00.000Z"),
        dischargedAt: new Date("2026-08-25T15:36:00.000Z"),
        roomLabel: "MS-2",
        admissionSummaryJson: {
          originatingEdEncounterId: "ed-9",
          serviceUnit: "MED_SURG",
          admittedAt: "2026-08-20T13:42:00.000Z",
          inpatientLifecycleV1: {
            version: 1,
            bedTransfers: [
              {
                transferredAt: "2026-08-22T10:18:00.000Z",
                transferredByUserId: "u1",
                fromUnit: "ICU",
                fromBedKey: "ICU-1",
                toUnit: "MED_SURG",
                toBedKey: "MS-2",
                reason: "Step down",
                effectiveAt: "2026-08-22T10:18:00.000Z",
              },
            ],
            discharge: {
              dischargedAt: "2026-08-25T15:36:00.000Z",
              dischargedByUserId: "u1",
              disposition: "HOME",
              clinicalDispositionCode: "HOME",
            },
          },
        },
        dischargeSummaryJson: null,
        patient: {
          id: "p1",
          firstName: "Jesenia",
          lastName: "Rodriguez",
          dob: new Date("1990-01-01"),
          mrn: "0001842",
        },
      },
    ]);
    const service = new InpatientEncountersArchiveService(prisma as never);
    const result = await service.listArchiveEncounters({ facilityId: "fac-1" });
    expect(result.total).toBe(1);
    expect(result.rows[0]!.originatingEdEncounterId).toBe("ed-9");
    expect(result.rows[0]!.encounterTypeLabel).toBe("Hospitalization");
    expect(result.rows[0]!.courseSummary).toContain("ED");
    expect(result.rows[0]!.patient?.mrn).toBe("0001842");
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          admissionSummaryJson: true,
          patient: expect.any(Object),
        }),
      })
    );
  });

  it("caps limit at MAX_LIMIT", async () => {
    const prisma = makePrisma([]);
    const service = new InpatientEncountersArchiveService(prisma as never);
    const result = await service.listArchiveEncounters({
      facilityId: "fac-1",
      limit: 999,
    });
    expect(result.limit).toBe(InpatientEncountersArchiveService.MAX_LIMIT);
  });
});
