import { OrderItemLifecycleState, OrderStatus, RoleCode } from "@prisma/client";
import { OrdersService } from "./orders.service";

function makeIvpbOrderItem(status: OrderStatus = OrderStatus.IN_PROGRESS) {
  return {
    id: "item-ivpb-1",
    orderId: "order-med-1",
    catalogItemId: "cat-azithro-1",
    catalogItemType: "MEDICATION",
    manualLabel: null,
    manualSecondaryText: null,
    quantity: null,
    notes: null,
    strength: "500 mg",
    route: "IVPB",
    refillCount: null,
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    intendedAdministrationAt: null,
    completedAt: null,
    completedByUserId: null,
    status,
    lifecycleState: OrderItemLifecycleState.IN_PROGRESS,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: "order-med-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: OrderStatus.PENDING,
      patientId: "pat-1",
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        providerDocumentationStatus: null,
      },
    },
  };
}

function makeStopServiceMocks(input: {
  activeSessionKey?: string;
  startedAtIso?: string;
  infusionSessionOnly?: boolean;
}) {
  const sessionKey = input.activeSessionKey ?? "session-key-1";
  const startedAtIso = input.startedAtIso ?? "2026-06-11T18:00:00.000Z";
  const row = makeIvpbOrderItem();

  const infusionSessionUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const orderEventCreate = jest.fn().mockResolvedValue({});
  const createMar = jest.fn().mockResolvedValue({
    id: "mar-stop-1",
    administeredAt: new Date("2026-06-11T19:00:00.000Z"),
  });

  const orderEventFindMany = jest.fn().mockResolvedValue(
    input.infusionSessionOnly
      ? []
      : [
          {
            eventType: "STARTED",
            metadata: {
              infusionScope: "MEDICATION_INFUSION",
              infusionAction: "START",
              orderItemId: "item-ivpb-1",
              infusionSessionKey: sessionKey,
              infusionStartedAt: startedAtIso,
              route: "IVPB",
            },
          },
        ]
  );

  const prisma = {
    orderItem: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce({ ...row, status: OrderStatus.COMPLETED, order: { facilityId: "fac-1" } }),
    },
    catalogMedication: {
      findUnique: jest.fn().mockResolvedValue({
        code: "AZITHRO",
        name: "Azithromycin",
        displayNameEn: "Azithromycin",
        genericName: "azithromycin",
        route: "IVPB",
        strength: "500 mg",
      }),
    },
    orderEvent: {
      findMany: orderEventFindMany,
      findFirst: jest.fn().mockResolvedValue(null),
      create: orderEventCreate,
    },
    infusionSession: {
      findFirst: jest.fn().mockResolvedValue(
        input.infusionSessionOnly
          ? {
              legacyInfusionSessionKey: sessionKey,
              startedAt: new Date(startedAtIso),
            }
          : null
      ),
      updateMany: infusionSessionUpdateMany,
    },
    medicationAdministration: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ firstName: "Elizabeth", lastName: "Posada" }),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN, name: "RN" } }]),
    },
    medicationOrderSchedule: { findFirst: jest.fn().mockResolvedValue(null) },
    medicationDoseInstance: { findFirst: jest.fn().mockResolvedValue(null) },
  };

  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const medicationAdministration = { create: createMar };
  const service = new OrdersService(prisma as any, audit as any, medicationAdministration as any);

  return {
    service,
    prisma,
    createMar,
    infusionSessionUpdateMany,
    orderEventCreate,
  };
}

describe("OrdersService.stopMedicationInfusion (M1.8B.7K.10)", () => {
  it("stops recurring-style IVPB when infusion START OrderEvent exists", async () => {
    const { service, createMar } = makeStopServiceMocks({});
    const stoppedAt = new Date("2026-06-11T19:00:00.000Z");

    const result = await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalled();
    expect(result.medicationAdministration.id).toBe("mar-stop-1");
  });

  it("stops fallback IVPB when only InfusionSession is in progress (no START OrderEvent)", async () => {
    const { service, createMar, infusionSessionUpdateMany } = makeStopServiceMocks({
      infusionSessionOnly: true,
    });
    const stoppedAt = new Date("2026-06-11T19:00:00.000Z");

    await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalled();
    expect(infusionSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderItemId: "item-ivpb-1",
          legacyInfusionSessionKey: "session-key-1",
          status: "IN_PROGRESS",
        }),
        data: expect.objectContaining({ status: "STOPPED" }),
      })
    );
  });

  it("rejects stop time before infusion start", async () => {
    const { service, createMar } = makeStopServiceMocks({
      startedAtIso: "2026-06-11T20:00:00.000Z",
    });

    await expect(
      service.stopMedicationInfusion(
        "fac-1",
        "item-ivpb-1",
        { stoppedAt: new Date("2026-06-11T19:00:00.000Z") },
        [RoleCode.RN],
        "user-rn-1"
      )
    ).rejects.toMatchObject({
      response: { message: "L’heure d’arrêt ne peut pas précéder le début de perfusion." },
    });
    expect(createMar).not.toHaveBeenCalled();
  });

  it("accepts editable stoppedAt after start", async () => {
    const { service, createMar } = makeStopServiceMocks({
      startedAtIso: "2026-06-11T18:00:00.000Z",
    });
    const stoppedAt = new Date("2026-06-11T18:45:00.000Z");

    await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalledWith(
      expect.any(String),
      "fac-1",
      "user-rn-1",
      expect.objectContaining({ administeredAt: stoppedAt }),
      expect.any(Object)
    );
  });
});
