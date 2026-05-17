import { AuditAction, OrderStatus, RoleCode } from "@prisma/client";
import { OrdersLabRadiologyEffectiveTimeService } from "./orders-lab-radiology-effective-time.service";

function makeLabOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "oi-lab-1",
    facilityId: "fac-1",
    catalogItemType: "LAB_TEST",
    status: "IN_PROGRESS",
    createdAt: new Date("2026-05-16T10:05:00Z"),
    documentedCollectedAt: new Date("2026-05-16T14:00:00Z"),
    effectiveCollectedAt: null,
    effectiveCollectedAtVersion: 0,
    documentedReceivedAt: new Date("2026-05-16T13:30:00Z"),
    effectiveReceivedAt: null,
    effectiveReceivedAtVersion: 0,
    order: {
      id: "ord-lab-1",
      facilityId: "fac-1",
      encounterId: "enc-1",
      type: "LAB",
      status: OrderStatus.PENDING,
      createdAt: new Date("2026-05-16T10:00:00Z"),
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        createdAt: new Date("2026-05-16T08:00:00Z"),
        admittedAt: null,
        providerDocumentationStatus: null,
      },
    },
    result: null,
    ...overrides,
  };
}

describe("OrdersLabRadiologyEffectiveTimeService", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(row: ReturnType<typeof makeLabOrderItem>) {
    const orderItemUpdate = jest.fn().mockImplementation(async ({ data }) => ({
      ...row,
      ...data,
      effectiveCollectedAt: data.effectiveCollectedAt,
      effectiveCollectedAtVersion: (row.effectiveCollectedAtVersion ?? 0) + 1,
    }));
    const resultUpdate = jest.fn().mockImplementation(async ({ data }) => ({
      id: "res-1",
      orderItemId: row.id,
      verifiedAt: new Date("2026-05-16T15:00:00Z"),
      ...data,
    }));
    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(row),
        update: orderItemUpdate,
      },
      result: {
        update: resultUpdate,
      },
    };
    const audit = { log: auditLog };
    const service = new OrdersLabRadiologyEffectiveTimeService(prisma as never, audit as never);
    return { service, orderItemUpdate, resultUpdate, auditLog };
  }

  it("adjusts lab collected time without mutating documentedCollectedAt", async () => {
    const row = makeLabOrderItem();
    const { service, orderItemUpdate, auditLog: log } = makeService(row);
    await service.setLabCollectedEffectiveTime(
      "fac-1",
      "oi-lab-1",
      {
        effectiveClinicalTime: "2026-05-16T13:00:00.000Z",
        reason: "Specimen taken before charting",
      },
      "user-lab",
      [RoleCode.LAB],
    );
    const updateArg = orderItemUpdate.mock.calls[0][0];
    expect(updateArg.data.documentedCollectedAt).toBeUndefined();
    expect(updateArg.data.effectiveCollectedAt).toBeInstanceOf(Date);
    expect(log).toHaveBeenCalledWith(
      AuditAction.LAB_TIME_ADJUSTED,
      "ORDER_ITEM",
      expect.objectContaining({
        metadata: expect.objectContaining({
          milestone: "collected",
          domain: "LAB",
          source: "DEPT_WORKLIST",
          reasonProvided: true,
        }),
      })
    );
  });

  it("rejects lab adjustment from radiology role", async () => {
    const row = makeLabOrderItem();
    const { service } = makeService(row);
    await expect(
      service.setLabCollectedEffectiveTime(
        "fac-1",
        "oi-lab-1",
        { effectiveClinicalTime: "2026-05-16T13:00:00.000Z", reason: "x" },
        "user-rad",
        [RoleCode.RADIOLOGY]
      )
    ).rejects.toThrow(/laboratoire/i);
  });

  it("adjusts lab result time without mutating verifiedAt", async () => {
    const verifiedAt = new Date("2026-05-16T15:00:00Z");
    const row = makeLabOrderItem({
      result: {
        id: "res-1",
        verifiedAt,
        effectiveResultedAt: null,
        effectiveResultedAtVersion: 0,
        effectiveFinalizedAt: null,
        effectiveFinalizedAtVersion: 0,
      },
    });
    const { service, resultUpdate, auditLog: log } = makeService(row);
    await service.setLabResultedEffectiveTime(
      "fac-1",
      "oi-lab-1",
      {
        effectiveClinicalTime: "2026-05-16T14:30:00.000Z",
        reason: "Result entered after verification delay",
      },
      "user-lab",
      [RoleCode.LAB]
    );
    const updateArg = resultUpdate.mock.calls[0][0];
    expect(updateArg.data.verifiedAt).toBeUndefined();
    expect(updateArg.data.effectiveResultedAt).toBeInstanceOf(Date);
    expect(log).toHaveBeenCalledWith(
      AuditAction.LAB_TIME_ADJUSTED,
      "RESULT",
      expect.objectContaining({
        metadata: expect.objectContaining({ milestone: "resulted" }),
      })
    );
  });

  it("blocks adjustment when encounter is signed", async () => {
    const row = makeLabOrderItem({
      order: {
        ...makeLabOrderItem().order,
        encounter: {
          ...makeLabOrderItem().order.encounter,
          providerDocumentationStatus: "SIGNED",
        },
      },
    });
    const { service } = makeService(row);
    await expect(
      service.setLabCollectedEffectiveTime(
        "fac-1",
        "oi-lab-1",
        { effectiveClinicalTime: "2026-05-16T13:00:00.000Z", reason: "ok reason here" },
        "user-lab",
        [RoleCode.LAB]
      )
    ).rejects.toThrow();
  });
});
