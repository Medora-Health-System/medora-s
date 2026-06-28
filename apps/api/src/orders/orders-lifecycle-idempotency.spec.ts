import {
  OrderEventType,
  OrderItemLifecycleState,
  OrderStatus,
  RoleCode,
} from "@prisma/client";
import { OrdersService } from "./orders.service";

function makeWorkflowOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    orderId: "order-1",
    catalogItemId: null,
    catalogItemType: "CARE",
    enterpriseProcedureId: "oxygen_therapy",
    manualLabel: "Oxygen Therapy — Nasal cannula 2 L/min STAT",
    manualSecondaryText: null,
    quantity: null,
    notes: "[O2_PARAMS:{\"deliveryDevice\":\"nasal_cannula\"}]",
    strength: null,
    route: null,
    refillCount: null,
    medicationFulfillmentIntent: null,
    intendedAdministrationAt: null,
    completedAt: null,
    completedByUserId: null,
    documentedCompletedAt: null,
    documentedReceivedAt: null,
    documentedCollectedAt: null,
    documentedPerformedAt: null,
    effectiveClinicalAt: null,
    effectiveClinicalAtSetAt: null,
    effectiveClinicalAtSetByUserId: null,
    effectiveClinicalAtReason: null,
    effectiveClinicalAtVersion: 0,
    status: OrderStatus.PLACED,
    lifecycleState: OrderItemLifecycleState.ORDERED,
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
    pharmacyDispenseRecord: null,
    order: {
      id: "order-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "CARE",
      status: OrderStatus.PENDING,
      createdAt: new Date("2026-06-01T10:00:00Z"),
      facility: { facilityType: "FREESTANDING_ER" },
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        providerDocumentationStatus: null,
        createdAt: new Date("2026-06-01T08:00:00Z"),
        admittedAt: null,
        patient: { id: "pat-1" },
      },
      orderEvents: [],
    },
    ...overrides,
  };
}

describe("MEDUI.ORDERS.UNIFIED_ORDER_ACTION_LIFECYCLE_FIX.1 — OrdersService lifecycle idempotency", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(orderItem: ReturnType<typeof makeWorkflowOrderItem>) {
    const orderItemUpdate = jest.fn().mockImplementation(async () => orderItem);
    const orderEventFindFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
        update: orderItemUpdate,
      },
      orderEvent: { findFirst: orderEventFindFirst },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          orderItem: {
            findFirst: jest.fn().mockResolvedValue(orderItem),
            update: orderItemUpdate,
          },
          orderEvent: { findFirst: orderEventFindFirst },
        })
      ),
    };
    const audit = { log: auditLog };
    const medicationAdministration = { create: jest.fn() };
    const service = new OrdersService(prisma as never, audit as never, medicationAdministration as never);
    return { service, orderItemUpdate, orderEventFindFirst, auditLog };
  }

  beforeEach(() => {
    auditLog.mockClear();
  });

  it("returns idempotent acknowledge for IN_PROGRESS oxygen care line without new event", async () => {
    const item = makeWorkflowOrderItem({
      status: OrderStatus.IN_PROGRESS,
      lifecycleState: OrderItemLifecycleState.IN_PROGRESS,
    });
    const { service, orderItemUpdate } = makeService(item);
    const out = await service.acknowledgeOrderItem("fac-1", "item-1", [RoleCode.RN], "user-rn");
    expect(out).toMatchObject({ idempotent: true, status: OrderStatus.IN_PROGRESS });
    expect(orderItemUpdate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("returns idempotent start for COMPLETED lab line", async () => {
    const item = makeWorkflowOrderItem({
      catalogItemType: "LAB_TEST",
      status: OrderStatus.COMPLETED,
      lifecycleState: OrderItemLifecycleState.COMPLETED,
      order: {
        ...makeWorkflowOrderItem().order,
        type: "LAB",
      },
    });
    const { service, orderItemUpdate } = makeService(item);
    const out = await service.startOrderItem("fac-1", "item-1", [RoleCode.LAB], "user-lab");
    expect(out).toMatchObject({ idempotent: true, status: OrderStatus.COMPLETED });
    expect(orderItemUpdate).not.toHaveBeenCalled();
  });

  it("returns idempotent complete for COMPLETED imaging line", async () => {
    const item = makeWorkflowOrderItem({
      catalogItemType: "IMAGING_STUDY",
      status: OrderStatus.COMPLETED,
      lifecycleState: OrderItemLifecycleState.COMPLETED,
      order: {
        ...makeWorkflowOrderItem().order,
        type: "IMAGING",
      },
    });
    const { service, orderItemUpdate } = makeService(item);
    const out = await service.completeOrderItem("fac-1", "item-1", [RoleCode.RADIOLOGY], "user-rad");
    expect(out).toMatchObject({ idempotent: true, status: OrderStatus.COMPLETED });
    expect(orderItemUpdate).not.toHaveBeenCalled();
  });

  it("dedupes COMPLETED events on repeat complete from IN_PROGRESS", async () => {
    const item = makeWorkflowOrderItem({
      catalogItemType: "LAB_TEST",
      status: OrderStatus.IN_PROGRESS,
      lifecycleState: OrderItemLifecycleState.IN_PROGRESS,
      order: {
        ...makeWorkflowOrderItem().order,
        type: "LAB",
      },
    });
    const { service, orderEventFindFirst, orderItemUpdate } = makeService(item);
    orderEventFindFirst.mockResolvedValueOnce({
      id: "evt-complete",
      eventType: OrderEventType.COMPLETED,
      metadata: { dedupeKey: "order-item-complete:item-1" },
    });
    const out = await service.completeOrderItem("fac-1", "item-1", [RoleCode.LAB], "user-lab");
    expect(out).toMatchObject({ status: OrderStatus.IN_PROGRESS });
    expect(orderItemUpdate).not.toHaveBeenCalled();
  });
});
