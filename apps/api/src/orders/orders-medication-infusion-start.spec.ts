import { OrderItemLifecycleState, OrderStatus, RoleCode } from "@prisma/client";
import { OrdersService } from "./orders.service";

function makeVancomycinIvpbOrderItem(status: OrderStatus = OrderStatus.PLACED) {
  return {
    id: "item-vanco-1",
    orderId: "order-med-1",
    catalogItemId: "cat-vanco-1",
    catalogItemType: "MEDICATION",
    manualLabel: null,
    manualSecondaryText: null,
    quantity: null,
    notes: null,
    strength: "1 g",
    route: "IVPB",
    refillCount: null,
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    intendedAdministrationAt: null,
    completedAt: null,
    completedByUserId: null,
    status,
    lifecycleState: OrderItemLifecycleState.ORDERED,
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

/** Regression: IVPB start used to 500 when line was PLACED (assertCanTransition threw plain Error). */
describe("OrdersService.startMedicationInfusion", () => {
  it("completes start for Vancomycin IVPB when line is PLACED (no 500 from status guard)", async () => {
    const row = makeVancomycinIvpbOrderItem(OrderStatus.PLACED);
    const orderItemUpdate = jest.fn().mockResolvedValue({});
    let capturedSessionKey = "";
    let orderEventFindManyCall = 0;
    const orderEventCreate = jest.fn().mockImplementation(async (args: { data: { metadata: Record<string, unknown> } }) => {
      capturedSessionKey = String(args.data.metadata.infusionSessionKey ?? "");
    });
    const orderEventUpdate = jest.fn().mockResolvedValue({});
    const orderEventFindMany = jest.fn().mockImplementation(async () => {
      orderEventFindManyCall += 1;
      if (orderEventFindManyCall === 1) {
        return [];
      }
      return [
        {
          id: "oe-start-1",
          metadata: {
            infusionScope: "MEDICATION_INFUSION",
            infusionAction: "START",
            infusionSessionKey: capturedSessionKey,
          },
        },
      ];
    });
    const tx = {
      orderItem: { update: orderItemUpdate },
      orderEvent: { create: orderEventCreate },
    };
    const prisma = {
      orderItem: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(row)
          .mockResolvedValueOnce({
            ...row,
            status: OrderStatus.IN_PROGRESS,
            lifecycleState: OrderItemLifecycleState.IN_PROGRESS,
            order: { facilityId: "fac-1" },
          }),
      },
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({
          code: "VANCO",
          name: "Vancomycin",
          displayNameEn: "Vancomycin",
          genericName: "vancomycin",
          route: "IVPB",
          strength: "1 g",
        }),
      },
      orderEvent: {
        findMany: orderEventFindMany,
        update: orderEventUpdate,
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Marie", lastName: "Infirmier" }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN, name: "Infirmier(ère)" } }]),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) => {
        await fn(tx);
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const createInfusionStartMar = jest.fn().mockResolvedValue({ id: "mar-infusion-start-1" });
    const medicationAdministration = { createInfusionStartMar };
    const service = new OrdersService(prisma as any, audit as any, medicationAdministration as any);

    await service.startMedicationInfusion("fac-1", "item-vanco-1", [RoleCode.RN], "user-1");

    expect(orderItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-vanco-1" },
        data: expect.objectContaining({
          status: OrderStatus.IN_PROGRESS,
          lifecycleState: OrderItemLifecycleState.IN_PROGRESS,
        }),
      })
    );
    expect(orderEventCreate).toHaveBeenCalled();
    const createData = orderEventCreate.mock.calls[0][0].data;
    expect(createData.eventType).toBe("STARTED");
    expect(createData.metadata).toMatchObject({
      infusionAction: "START",
      infusionScope: "MEDICATION_INFUSION",
      route: "IVPB",
      orderItemId: "item-vanco-1",
    });
    expect(createData.metadata).toMatchObject({
      performedByUserId: "user-1",
      performedByRoleSnapshot: expect.any(String),
      actionRecordedAt: expect.any(String),
    });
    expect(createInfusionStartMar).toHaveBeenCalledWith(
      "enc-1",
      "fac-1",
      "user-1",
      expect.objectContaining({
        orderItemId: "item-vanco-1",
        startedAt: expect.any(Date),
        route: expect.any(String),
        infusionSessionKey: expect.any(String),
      })
    );
    expect(orderEventUpdate).toHaveBeenCalled();
  });
});
