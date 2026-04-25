import { OrdersService } from "./orders.service";

function makeService(options?: { resultFindMany?: jest.Mock }) {
  const prisma = {
    order: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "order-1",
          encounterId: "encounter-1",
          facilityId: "facility-1",
          type: "LAB",
          status: "PLACED",
          priority: "ROUTINE",
          notes: null,
          orderedBy: null,
          source: null,
          pathwaySessionId: null,
          prescriberName: null,
          prescriberLicense: null,
          prescriberContact: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cancelledAt: null,
          cancelledByUserId: null,
          cancellationReason: null,
          patientId: "patient-1",
          items: [
            {
              id: "item-1",
              orderId: "order-1",
              catalogItemId: null,
              catalogItemType: "LAB_TEST",
              manualLabel: "NFS manuelle",
              manualSecondaryText: null,
              quantity: null,
              notes: null,
              strength: null,
              refillCount: null,
              medicationFulfillmentIntent: null,
              intendedAdministrationAt: null,
              completedAt: null,
              completedByUserId: null,
              status: "PLACED",
              lifecycleState: "ORDERED",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              updatedAt: new Date("2026-01-01T00:00:00.000Z"),
              completedByNurse: null,
              pharmacyDispenseRecord: null,
              medicationAdministrations: [],
            },
          ],
        },
      ]),
    },
    result: {
      findMany: options?.resultFindMany ?? jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  return {
    service: new OrdersService(prisma as any, audit as any),
    prisma,
    audit,
  };
}

describe("OrdersService.findByEncounter", () => {
  it("does not include result in the base order query", async () => {
    const { service, prisma } = makeService();

    await service.findByEncounter("encounter-1", "facility-1");

    const query = prisma.order.findMany.mock.calls[0][0];
    expect(query.include.items.include.result).toBeUndefined();
    expect(prisma.result.findMany).toHaveBeenCalledWith({
      where: {
        facilityId: "facility-1",
        orderItemId: { in: ["item-1"] },
      },
      select: expect.objectContaining({
        id: true,
        orderItemId: true,
        acknowledgedByUserId: true,
      }),
    });
  });

  it("attaches controlled result rows when result enrichment succeeds", async () => {
    const resultFindMany = jest.fn().mockResolvedValue([
      {
        id: "result-1",
        orderItemId: "item-1",
        facilityId: "facility-1",
        resultData: null,
        resultText: "Normal",
        criticalValue: false,
        verifiedByUserId: null,
        verifiedAt: null,
        acknowledgedByProviderAt: null,
        acknowledgedByUserId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const { service } = makeService({ resultFindMany });

    const orders = await service.findByEncounter("encounter-1", "facility-1");

    expect(orders[0].items[0].result?.id).toBe("result-1");
    expect(orders[0].items[0].result?.resultText).toBe("Normal");
  });

  it("returns base orders with null results when result enrichment fails", async () => {
    const resultFindMany = jest.fn().mockRejectedValue(
      Object.assign(new Error("The column `Result.acknowledgedByUserId` does not exist"), {
        code: "P2022",
      })
    );
    const { service } = makeService({ resultFindMany });

    await expect(service.findByEncounter("encounter-1", "facility-1")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "order-1",
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "item-1",
              result: null,
              displayLabelFr: expect.any(String),
            }),
          ]),
        }),
      ])
    );
  });
});
