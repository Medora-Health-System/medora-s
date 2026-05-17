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
    expect(res.items[0]?.titleFr).toBe("Signes vitaux enregistrés");
    expect(res.items[0]?.titleEn).toBe("Vital signs recorded");
    expect(res.capped).toBe(false);
  });

  it("returns bilingual order event titles with English acknowledgement label", async () => {
    const prisma = makePrisma();
    prisma.orderEvent.findMany.mockResolvedValue([
      {
        id: "oe-1",
        eventType: "STARTED",
        orderType: "CARE",
        performedAt: new Date("2026-05-16T11:00:00.000Z"),
        performedByUserId: "u2",
        orderId: "ord-1",
        roleSnapshot: "RN",
        metadata: {
          lifecycleOutcome: "ACKNOWLEDGED",
          source: "OBSERVATION_TEMPLATE_ORDER",
          templateItemId: "mon_pulse_ox_continuous",
          lineLabelFr: "Surveillance continue par oxymétrie de pouls",
          orderItemId: "item-1",
        },
        performedBy: { id: "u2", firstName: "E", lastName: "RN" },
        order: { id: "ord-1", type: "CARE" },
      },
    ]);
    const service = new UnifiedEncounterTimelineService(prisma as never);
    const res = await service.getUnifiedTimeline("fac-A", "enc-1", 10);
    expect(res.items[0]?.titleEn).toBe(
      "Order acknowledged — Continuous pulse oximetry monitoring"
    );
    expect(res.items[0]?.titleFr).toContain("accusé réception");
  });
});
