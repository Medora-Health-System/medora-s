import { AuditAction, OrderItemLifecycleState, OrderStatus, RoleCode } from "@prisma/client";
import { OrdersService } from "./orders.service";

function makeCareOrderItem(overrides: Record<string, unknown> = {}) {
  const systemDoc = new Date("2026-05-16T14:00:00Z");
  return {
    id: "item-care-1",
    orderId: "order-care-1",
    catalogItemId: null,
    catalogItemType: "CARE",
    manualLabel: "Peripheral IV",
    manualSecondaryText: null,
    quantity: null,
    notes: null,
    strength: null,
    route: null,
    refillCount: null,
    medicationFulfillmentIntent: null,
    intendedAdministrationAt: null,
    completedAt: systemDoc,
    completedByUserId: null,
    documentedCompletedAt: systemDoc,
    effectiveClinicalAt: systemDoc,
    effectiveClinicalAtSetAt: systemDoc,
    effectiveClinicalAtSetByUserId: "user-rn",
    effectiveClinicalAtReason: null,
    effectiveClinicalAtVersion: 0,
    status: OrderStatus.COMPLETED,
    lifecycleState: OrderItemLifecycleState.COMPLETED,
    createdAt: new Date("2026-05-16T10:00:00Z"),
    updatedAt: systemDoc,
    order: {
      id: "order-care-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "CARE",
      status: OrderStatus.PENDING,
      createdAt: new Date("2026-05-16T10:00:00Z"),
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        providerDocumentationStatus: null,
        createdAt: new Date("2026-05-16T08:00:00Z"),
        admittedAt: null,
        patient: { id: "pat-1" },
      },
    },
    ...overrides,
  };
}

describe("OrdersService.setCareProcedureEffectiveClinicalTime", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(orderItem: ReturnType<typeof makeCareOrderItem>) {
    const orderItemUpdate = jest.fn().mockResolvedValue(orderItem);
    const orderEventUpdate = jest.fn();
    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
        update: orderItemUpdate,
      },
      orderEvent: { update: orderEventUpdate },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ orderItem: { update: orderItemUpdate } })
      ),
    };
    const audit = { log: auditLog };
    const medicationAdministration = { create: jest.fn() };
    const service = new OrdersService(prisma as never, audit as never, medicationAdministration as never);
    return { service, orderItemUpdate, orderEventUpdate, auditLog, documentedAt: orderItem.documentedCompletedAt };
  }

  it("rejects medication lines", async () => {
    const med = makeCareOrderItem({
      catalogItemType: "MEDICATION",
      order: { ...makeCareOrderItem().order, type: "MEDICATION" },
    });
    const { service } = makeService(med);
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2026-05-16T13:00:00.000Z", reason: "late doc" },
        [RoleCode.PROVIDER],
        "user-md"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("soins / procédures") });
  });

  it("rejects lab lines", async () => {
    const lab = makeCareOrderItem({
      catalogItemType: "LAB_TEST",
      order: { ...makeCareOrderItem().order, type: "LAB" },
    });
    const { service } = makeService(lab);
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2026-05-16T13:00:00.000Z", reason: "late doc" },
        [RoleCode.PROVIDER],
        "user-md"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("soins / procédures") });
  });

  it("rejects imaging lines", async () => {
    const img = makeCareOrderItem({
      catalogItemType: "IMAGING_STUDY",
      order: { ...makeCareOrderItem().order, type: "IMAGING" },
    });
    const { service } = makeService(img);
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2026-05-16T13:00:00.000Z", reason: "late doc" },
        [RoleCode.PROVIDER],
        "user-md"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("soins / procédures") });
  });

  it("allows PROVIDER on CARE line", async () => {
    const { service } = makeService(makeCareOrderItem());
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        {
          effectiveClinicalTime: "2026-05-16T13:30:00.000Z",
          reason: "Documented after the procedure was performed",
        },
        [RoleCode.PROVIDER],
        "user-md"
      )
    ).resolves.toBeDefined();
  });

  it("allows RN and ADMIN on CARE line", async () => {
    const item = makeCareOrderItem();
    const { service: svcRn } = makeService(item);
    await svcRn.setCareProcedureEffectiveClinicalTime(
      "fac-1",
      "item-care-1",
      undefined,
      { effectiveClinicalTime: "2026-05-16T13:30:00.000Z", reason: "RN correction note" },
      [RoleCode.RN],
      "user-rn"
    );
    const { service: svcAdmin } = makeService(item);
    await svcAdmin.setCareProcedureEffectiveClinicalTime(
      "fac-1",
      "item-care-1",
      undefined,
      { effectiveClinicalTime: "2026-05-16T13:25:00.000Z", reason: "Admin correction note" },
      [RoleCode.ADMIN],
      "user-admin"
    );
  });

  it("rejects future effective time", async () => {
    const { service } = makeService(makeCareOrderItem());
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2099-01-01T12:00:00.000Z" },
        [RoleCode.RN],
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("futur") });
  });

  it("requires reason for large delta (>60 min)", async () => {
    const { service } = makeService(makeCareOrderItem());
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2026-05-16T12:00:00.000Z" },
        [RoleCode.RN],
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("motif") });
  });

  it("rejects >24h backdate without reason", async () => {
    const { service } = makeService(
      makeCareOrderItem({
        order: {
          ...makeCareOrderItem().order,
          createdAt: new Date("2026-05-15T09:00:00Z"),
          encounter: {
            ...makeCareOrderItem().order.encounter,
            createdAt: new Date("2026-05-15T08:00:00Z"),
          },
        },
      })
    );
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2026-05-15T10:00:00.000Z" },
        [RoleCode.RN],
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("motif") });
  });

  it("rejects >24h backdate with short reason", async () => {
    const { service } = makeService(
      makeCareOrderItem({
        order: {
          ...makeCareOrderItem().order,
          createdAt: new Date("2026-05-15T09:00:00Z"),
          encounter: {
            ...makeCareOrderItem().order.encounter,
            createdAt: new Date("2026-05-15T08:00:00Z"),
          },
        },
      })
    );
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        { effectiveClinicalTime: "2026-05-15T10:00:00.000Z", reason: "too short" },
        [RoleCode.RN],
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("15 caractères") });
  });

  it("accepts >24h backdate with meaningful reason", async () => {
    const { service } = makeService(
      makeCareOrderItem({
        order: {
          ...makeCareOrderItem().order,
          createdAt: new Date("2026-05-15T09:00:00Z"),
          encounter: {
            ...makeCareOrderItem().order.encounter,
            createdAt: new Date("2026-05-15T08:00:00Z"),
          },
        },
      })
    );
    await expect(
      service.setCareProcedureEffectiveClinicalTime(
        "fac-1",
        "item-care-1",
        undefined,
        {
          effectiveClinicalTime: "2026-05-15T10:00:00.000Z",
          reason: "Procedure done Friday; chart completed Monday after weekend.",
        },
        [RoleCode.RN],
        "user-rn"
      )
    ).resolves.toBeDefined();
  });

  it("does not change documentedCompletedAt on adjustment", async () => {
    const documented = new Date("2026-05-16T14:00:00Z");
    const item = makeCareOrderItem({ documentedCompletedAt: documented });
    const { service, orderItemUpdate } = makeService(item);
    await service.setCareProcedureEffectiveClinicalTime(
      "fac-1",
      "item-care-1",
      undefined,
      {
        effectiveClinicalTime: "2026-05-16T13:30:00.000Z",
        reason: "Corrected to actual bedside time",
      },
      [RoleCode.RN],
      "user-rn"
    );
    const updateArg = orderItemUpdate.mock.calls[0][0];
    expect(updateArg.data.documentedCompletedAt).toBeUndefined();
  });

  it("does not update OrderEvent rows", async () => {
    const { service, orderEventUpdate } = makeService(makeCareOrderItem());
    await service.setCareProcedureEffectiveClinicalTime(
      "fac-1",
      "item-care-1",
      undefined,
      {
        effectiveClinicalTime: "2026-05-16T13:30:00.000Z",
        reason: "Corrected to actual bedside time",
      },
      [RoleCode.RN],
      "user-rn"
    );
    expect(orderEventUpdate).not.toHaveBeenCalled();
  });

  it("writes PHI-safe audit metadata with ISO UTC timestamps", async () => {
    const item = makeCareOrderItem();
    const { service, auditLog: audit } = makeService(item);
    await service.setCareProcedureEffectiveClinicalTime(
      "fac-1",
      "item-care-1",
      "order-care-1",
      {
        effectiveClinicalTime: "2026-05-16T13:30:00.000Z",
        reason: "Documenté après le soin",
      },
      [RoleCode.RN],
      "user-rn"
    );
    expect(audit).toHaveBeenCalledWith(
      AuditAction.CARE_PROCEDURE_EFFECTIVE_TIME_ADJUSTED,
      "ORDER_ITEM",
      expect.objectContaining({
        metadata: expect.objectContaining({
          orderId: "order-care-1",
          orderItemId: "item-care-1",
          reasonProvided: true,
          source: "ORDERS_TAB",
          newEffectiveClinicalTime: "2026-05-16T13:30:00.000Z",
          originalSystemTime: "2026-05-16T14:00:00.000Z",
        }),
      })
    );
    const meta = audit.mock.calls[0][2].metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("manualLabel");
    expect(meta).not.toHaveProperty("patientName");
  });
});
