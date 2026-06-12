import { BadRequestException } from "@nestjs/common";
import { OrdersContinuousFluidService } from "./orders-continuous-fluid.service";

function makeOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "oi-ns",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-ns",
    status: "PENDING",
    lifecycleState: "ORDERED",
    route: "IV",
    notes: "NS 0.9% at 100 mL/hr",
    manualLabel: null,
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    order: {
      id: "ord-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: "PENDING",
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        providerDocumentationStatus: "DRAFT",
        patient: { id: "pat-1" },
      },
    },
    ...overrides,
  };
}

function nsCatalog() {
  return {
    id: "cat-ns",
    displayNameFr: "Chlorure de sodium 0,9 %",
    name: "Normal Saline 0.9%",
    genericName: "sodium chloride",
    code: "NS",
    therapeuticClass: "Soluté",
  };
}

describe("OrdersContinuousFluidService (K.10B.8)", () => {
  let infusionSessionCreate: jest.Mock;
  let orderEventCreate: jest.Mock;

  function makeService(orderItemOverrides: Record<string, unknown> = {}) {
    infusionSessionCreate = jest.fn().mockResolvedValue({ id: "sess-1" });
    orderEventCreate = jest.fn().mockResolvedValue({ id: "ev-1" });
    const orderItem = makeOrderItem(orderItemOverrides);

    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
        update: jest.fn().mockResolvedValue(orderItem),
      },
      orderEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        create: orderEventCreate,
      },
      infusionSession: {
        create: infusionSessionCreate,
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([nsCatalog()]),
        findUnique: jest.fn().mockResolvedValue(nsCatalog()),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          orderItem: { update: jest.fn().mockResolvedValue(orderItem) },
          infusionSession: { create: infusionSessionCreate },
          orderEvent: { create: orderEventCreate },
          userRole: {
            findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]),
          },
        };
        return fn(tx);
      }),
    };

    const medicationAdministration = {
      createInfusionStartMar: jest.fn().mockResolvedValue({ id: "mar-start" }),
      create: jest.fn().mockResolvedValue({ id: "mar-stop" }),
    };

    return new OrdersContinuousFluidService(
      prisma as never,
      { log: jest.fn() } as never,
      medicationAdministration as never
    );
  }

  it("starts continuous fluid and creates session + event", async () => {
    const service = makeService();
    const prisma = (service as unknown as { prisma: { orderEvent: { findMany: jest.Mock } } }).prisma;
    prisma.orderEvent.findMany.mockImplementation(async () => {
      const calls = orderEventCreate.mock.calls;
      if (calls.length === 0) return [];
      const last = calls[calls.length - 1]?.[0]?.data?.metadata as Record<string, unknown> | undefined;
      return last ? [{ metadata: last }] : [];
    });
    const result = await service.startContinuousFluid(
      "fac-1",
      "oi-ns",
      {},
      ["RN" as never],
      "nurse-1"
    );
    expect(result.status).toBe("RUNNING");
    expect(infusionSessionCreate).toHaveBeenCalled();
    expect(orderEventCreate).toHaveBeenCalled();
  });

  it("rejects duplicate start when already running", async () => {
    const service = makeService();
    const prisma = (service as unknown as { prisma: { orderEvent: { findMany: jest.Mock } } }).prisma;
    prisma.orderEvent.findMany.mockResolvedValue([
      {
        metadata: {
          infusionScope: "CONTINUOUS_FLUID",
          fluidAction: "START",
          fluidSessionKey: "k1",
          fluidActionAt: "2026-06-12T08:00:00.000Z",
          orderItemId: "oi-ns",
        },
      },
    ]);
    await expect(
      service.startContinuousFluid("fac-1", "oi-ns", {}, ["RN" as never], "nurse-1")
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("stops fluid and returns volume infused", async () => {
    const service = makeService({ status: "IN_PROGRESS" });
    const prisma = (service as unknown as { prisma: { orderEvent: { findMany: jest.Mock } } }).prisma;
    prisma.orderEvent.findMany.mockResolvedValue([
      {
        metadata: {
          infusionScope: "CONTINUOUS_FLUID",
          fluidAction: "START",
          fluidSessionKey: "k1",
          fluidActionAt: "2026-06-12T08:00:00.000Z",
          orderItemId: "oi-ns",
        },
      },
    ]);
    const result = await service.stopContinuousFluid(
      "fac-1",
      "oi-ns",
      { stoppedAt: new Date("2026-06-12T12:00:00.000Z") },
      ["RN" as never],
      "nurse-1"
    );
    expect(result.status).toBe("COMPLETED");
    expect(result.volumeInfusedMl).toBe(400);
  });
});
