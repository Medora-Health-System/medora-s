import { OrderEventType } from "@prisma/client";
import { OrdersService } from "./orders.service";
import {
  ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT,
  ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT,
  ENCOUNTER_ORDER_EVENTS_LOOKBACK_DAYS,
} from "../common/encounter-clinical-read-limits";

function makeService() {
  const prisma = {
    orderEvent: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "ev-1",
          encounterId: "enc-1",
          orderId: "order-1",
          orderType: "MEDICATION",
          eventType: OrderEventType.COMPLETED,
          performedByUserId: "user-1",
          performedAt: new Date("2026-06-01T12:00:00.000Z"),
          roleSnapshot: "RN",
          note: null,
          metadata: { orderItemId: "item-1" },
          order: {
            id: "order-1",
            type: "MEDICATION",
            status: "COMPLETED",
            cancellationReason: null,
          },
          performedBy: { id: "user-1", firstName: "Marie", lastName: "Infirmière" },
        },
      ]),
    },
    orderItem: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "item-1",
          orderId: "order-1",
          catalogItemType: "MEDICATION",
          catalogItemId: null,
          manualLabel: "Paracétamol",
          manualSecondaryText: null,
          strength: "500 mg",
          notes: null,
        },
      ]),
    },
    catalogLabTest: { findMany: jest.fn().mockResolvedValue([]) },
    catalogImagingStudy: { findMany: jest.fn().mockResolvedValue([]) },
    catalogMedication: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const audit = { log: jest.fn() };
  const medicationAdministration = { create: jest.fn() };
  return {
    service: new OrdersService(prisma as any, audit as any, medicationAdministration as any),
    prisma,
  };
}

describe("OrdersService.findOrderEventsByEncounter", () => {
  it("applies lookback, limit, and batch-loads order items instead of nesting all lines", async () => {
    const { service, prisma } = makeService();
    await service.findOrderEventsByEncounter("enc-1", "facility-1");

    const eventQuery = prisma.orderEvent.findMany.mock.calls[0][0];
    expect(eventQuery.take).toBe(ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT);
    expect(eventQuery.where.performedAt.gte).toBeInstanceOf(Date);
    expect(eventQuery.include.order.select.items).toBeUndefined();

    expect(prisma.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ id: { in: ["item-1"] } }],
        },
      })
    );
  });

  it("returns line labels from batched order items", async () => {
    const { service } = makeService();
    const rows = await service.findOrderEventsByEncounter("enc-1", "facility-1");
    expect(rows[0]?.lineLabelFr).toContain("Paracétamol");
    expect(rows[0]?.order.displayName).toContain("Paracétamol");
  });

  it("honors explicit limit override up to max cap", async () => {
    const { service, prisma } = makeService();
    await service.findOrderEventsByEncounter("enc-1", "facility-1", {
      limit: ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT + 50,
    });
    expect(prisma.orderEvent.findMany.mock.calls[0][0].take).toBe(ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT);
  });
});

describe("encounter clinical read limits", () => {
  it("uses a 90-day default order-events lookback window", () => {
    expect(ENCOUNTER_ORDER_EVENTS_LOOKBACK_DAYS).toBeGreaterThanOrEqual(30);
  });

  it("defaults order-events list limit to 200", () => {
    expect(ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT).toBe(200);
  });
});
