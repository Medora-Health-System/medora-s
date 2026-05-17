import { NotFoundException } from "@nestjs/common";
import { UnifiedEncounterTimelineService } from "./unified-encounter-timeline.service";

function makePrisma() {
  return {
    encounter: {
      findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }),
    },
    encounterClinicalEvent: { findMany: jest.fn().mockResolvedValue([]) },
    orderEvent: { findMany: jest.fn().mockResolvedValue([]) },
    medicationAdministration: { findMany: jest.fn().mockResolvedValue([]) },
    result: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe("UnifiedEncounterTimelineService", () => {
  it("throws NotFoundException when encounter is outside facility", async () => {
    const prisma = makePrisma();
    prisma.encounter.findFirst.mockResolvedValue(null);
    const service = new UnifiedEncounterTimelineService(prisma as never);
    await expect(service.getUnifiedTimeline("fac-A", "enc-missing")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("returns aggregated items newest-first with cap metadata", async () => {
    const prisma = makePrisma();
    prisma.encounterClinicalEvent.findMany.mockResolvedValue([
      {
        id: "ce-1",
        eventType: "VITALS_RECORDED",
        createdAt: new Date("2026-05-16T10:00:00.000Z"),
        createdByUserId: "u1",
        payloadJson: {},
        createdBy: { id: "u1", firstName: "A", lastName: "Nurse" },
      },
    ]);
    const service = new UnifiedEncounterTimelineService(prisma as never);
    const res = await service.getUnifiedTimeline("fac-A", "enc-1", 10);
    expect(res.encounterId).toBe("enc-1");
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.sourceKind).toBe("ENCOUNTER_CLINICAL_EVENT");
    expect(res.items[0]?.documentedAtIso).toBe("2026-05-16T10:00:00.000Z");
    expect(res.capped).toBe(false);
  });
});
