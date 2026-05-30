import {
  AuditAction,
  MedicationMarAction,
  OrderItemLifecycleState,
  OrderStatus,
  RoleCode,
} from "@prisma/client";
import { ForbiddenException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { resolveOrderCancelPolicyActor } from "./order-cancel-policy.util";

function makeCancelableOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    orderId: "order-1",
    catalogItemType: "LAB_TEST",
    catalogItemId: "cat-1",
    lifecycleState: OrderItemLifecycleState.ORDERED,
    status: OrderStatus.PLACED,
    documentedCollectedAt: null,
    effectiveCollectedAt: null,
    documentedCompletedAt: null,
    effectiveClinicalAt: null,
    order: {
      id: "order-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "LAB",
      status: OrderStatus.PLACED,
      orderedBy: "user-md",
      source: "PROVIDER_ORDER",
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        providerDocumentationStatus: "DRAFT",
        physicianAssignedUserId: "user-md",
        nurseAssignedUserId: "user-rn",
        patient: { id: "pat-1" },
      },
    },
    ...overrides,
  };
}

function makeCancelService(orderItem: ReturnType<typeof makeCancelableOrderItem>) {
  const orderItemUpdate = jest.fn().mockResolvedValue({ ...orderItem, lifecycleState: OrderItemLifecycleState.CANCELLED });
  const orderUpdate = jest.fn();
  const orderItemFindMany = jest.fn().mockResolvedValue([orderItem]);
  const orderFindFirst = jest.fn().mockResolvedValue(orderItem.order);
  const orderItemFindFirstOrThrow = jest
    .fn()
    .mockResolvedValue({ ...orderItem, lifecycleState: OrderItemLifecycleState.CANCELLED, status: OrderStatus.CANCELLED });
  const writeOrderEvent = jest.fn();
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const medicationAdministrationCount = jest.fn().mockResolvedValue(0);

  const prisma = {
    orderItem: {
      findFirst: jest.fn().mockResolvedValue(orderItem),
      update: orderItemUpdate,
      findMany: orderItemFindMany,
      findFirstOrThrow: orderItemFindFirstOrThrow,
    },
    order: {
      findFirst: orderFindFirst,
      update: orderUpdate,
    },
    medicationAdministration: {
      count: medicationAdministrationCount,
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        orderItem: { update: orderItemUpdate, findMany: orderItemFindMany },
        order: { findFirst: orderFindFirst, update: orderUpdate },
      })
    ),
  };

  const audit = { log: auditLog };
  const service = new OrdersService(prisma as never, audit as never, {} as never);
  (service as unknown as { writeOrderEvent: typeof writeOrderEvent }).writeOrderEvent = writeOrderEvent;

  return {
    service,
    auditLog,
    writeOrderEvent,
    orderItemUpdate,
    medicationAdministrationCount,
    prisma,
  };
}

describe("resolveOrderCancelPolicyActor", () => {
  const encounter = { physicianAssignedUserId: "md-assigned", nurseAssignedUserId: "rn-charge" };

  it("allows assigned provider to cancel another provider's lab order", () => {
    expect(
      resolveOrderCancelPolicyActor(
        {
          order: { type: "LAB", orderedBy: "other-md", source: "PROVIDER_ORDER" },
          catalogItemType: "LAB_TEST",
          lifecycleState: OrderItemLifecycleState.ORDERED,
          encounter,
        },
        [RoleCode.PROVIDER],
        "md-assigned"
      )
    ).toBe("PROVIDER");
  });

  it("allows RN creator to cancel own ORDERED line regardless of source", () => {
    expect(
      resolveOrderCancelPolicyActor(
        {
          order: { type: "LAB", orderedBy: "user-rn", source: "PROVIDER_ORDER" },
          catalogItemType: "LAB_TEST",
          lifecycleState: OrderItemLifecycleState.ORDERED,
          encounter,
        },
        [RoleCode.RN],
        "user-rn"
      )
    ).toBe("RN");
  });

  it("denies RN canceling provider order they did not create", () => {
    expect(() =>
      resolveOrderCancelPolicyActor(
        {
          order: { type: "LAB", orderedBy: "user-md", source: "PROVIDER_ORDER" },
          catalogItemType: "LAB_TEST",
          lifecycleState: OrderItemLifecycleState.ORDERED,
          encounter,
        },
        [RoleCode.RN],
        "user-rn"
      )
    ).toThrow(ForbiddenException);
  });

  it("allows assigned nurse to cancel verbal nursing order", () => {
    expect(
      resolveOrderCancelPolicyActor(
        {
          order: { type: "CARE", orderedBy: "other-rn", source: "VERBAL_ORDER" },
          catalogItemType: "CARE",
          lifecycleState: OrderItemLifecycleState.ACKNOWLEDGED,
          encounter,
        },
        [RoleCode.RN],
        "rn-charge"
      )
    ).toBe("RN");
  });
});

describe("OrdersService.cancelOrderItem", () => {
  const cancelDto = { cancellationReason: "Erreur de saisie" as const };

  it("authorized provider cancels ORDERED lab line", async () => {
    const item = makeCancelableOrderItem();
    const { service, writeOrderEvent, auditLog } = makeCancelService(item);
    const result = await service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md");
    expect(result.lifecycleState).toBe(OrderItemLifecycleState.CANCELLED);
    expect(writeOrderEvent).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.ORDER_CANCEL,
      "ORDER_ITEM",
      expect.objectContaining({
        metadata: expect.objectContaining({
          reasonCode: "Erreur de saisie",
          orderItemId: "item-1",
          nextStatus: OrderStatus.CANCELLED,
        }),
      })
    );
    expect(auditLog.mock.calls[0]?.[2]?.metadata).not.toHaveProperty("cancellationDetails");
  });

  it("creator RN cancels own ORDERED line", async () => {
    const item = makeCancelableOrderItem({
      order: {
        ...makeCancelableOrderItem().order,
        orderedBy: "user-rn",
        source: "PROVIDER_ORDER",
      },
    });
    const { service } = makeCancelService(item);
    await expect(
      service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.RN], "user-rn")
    ).resolves.toMatchObject({ lifecycleState: OrderItemLifecycleState.CANCELLED });
  });

  it("returns 403 for unauthorized RN on provider order", async () => {
    const item = makeCancelableOrderItem();
    const { service } = makeCancelService(item);
    await expect(
      service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.RN], "user-rn")
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns 400 when cancellation reason missing", async () => {
    const item = makeCancelableOrderItem();
    const { service } = makeCancelService(item);
    await expect(
      service.cancelOrderItem(
        "fac-1",
        "item-1",
        { cancellationReason: "   " } as never,
        [RoleCode.PROVIDER],
        "user-md"
      )
    ).rejects.toMatchObject({ message: "Le motif d'annulation est requis." });
  });

  it("returns 409 for completed line", async () => {
    const item = makeCancelableOrderItem({
      lifecycleState: OrderItemLifecycleState.COMPLETED,
      status: OrderStatus.COMPLETED,
    });
    const { service } = makeCancelService(item);
    await expect(
      service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md")
    ).rejects.toMatchObject({
      message: expect.stringContaining("déjà réalisée"),
    });
  });

  it("returns idempotent success for already cancelled line", async () => {
    const item = makeCancelableOrderItem({
      lifecycleState: OrderItemLifecycleState.CANCELLED,
      status: OrderStatus.CANCELLED,
    });
    const { service, writeOrderEvent } = makeCancelService(item);
    const result = await service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md");
    expect(result.lifecycleState).toBe(OrderItemLifecycleState.CANCELLED);
    expect(writeOrderEvent).not.toHaveBeenCalled();
  });

  it("returns 404 when order item not in facility", async () => {
    const item = makeCancelableOrderItem();
    const { service, prisma } = makeCancelService(item);
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.cancelOrderItem("fac-other", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md")
    ).rejects.toMatchObject({ message: "Order item not found" });
  });

  it("blocks lab line after specimen collection", async () => {
    const item = makeCancelableOrderItem({
      documentedCollectedAt: new Date("2026-05-16T12:00:00Z"),
    });
    const { service } = makeCancelService(item);
    await expect(
      service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md")
    ).rejects.toMatchObject({
      message: expect.stringContaining("prélèvement"),
    });
  });

  it("blocks medication line after MAR administration", async () => {
    const item = makeCancelableOrderItem({
      catalogItemType: "MEDICATION",
      order: {
        ...makeCancelableOrderItem().order,
        type: "MEDICATION",
      },
    });
    const { service, medicationAdministrationCount } = makeCancelService(item);
    medicationAdministrationCount.mockResolvedValue(1);
    await expect(
      service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md")
    ).rejects.toMatchObject({
      message: expect.stringContaining("administration"),
    });
  });

  it("does not hard-delete order item on cancel", async () => {
    const item = makeCancelableOrderItem();
    const { service, orderItemUpdate, prisma } = makeCancelService(item);
    await service.cancelOrderItem("fac-1", "item-1", cancelDto, [RoleCode.PROVIDER], "user-md");
    expect(prisma.orderItem.findFirst).toHaveBeenCalled();
    expect(orderItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({ lifecycleState: OrderItemLifecycleState.CANCELLED }),
      })
    );
  });
});
