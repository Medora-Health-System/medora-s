import { cascadeMedicationOrderCancelInTransaction } from "./medication-order-cancel-cascade.util";

describe("cascadeMedicationOrderCancelInTransaction (MEDUI.ED.MAR.H1B)", () => {
  const cancelledAt = new Date("2026-06-16T14:00:00.000Z");

  function makeTx(overrides: Record<string, unknown> = {}) {
    const scheduleUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const doseFindMany = jest.fn().mockResolvedValue([
      {
        id: "dose-future",
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-16T16:00:00.000Z"),
        terminalMedicationAdministrationId: null,
      },
      {
        id: "dose-past",
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-16T13:00:00.000Z"),
        terminalMedicationAdministrationId: null,
      },
      {
        id: "dose-admin",
        doseStatus: "COMPLETED",
        scheduledAt: new Date("2026-06-16T12:00:00.000Z"),
        terminalMedicationAdministrationId: "mar-1",
      },
    ]);
    const doseUpdate = jest.fn().mockResolvedValue({});
    const orderItemFindMany = jest.fn().mockResolvedValue([{ id: "oi-1" }]);

    const tx = {
      orderItem: { findMany: orderItemFindMany },
      medicationOrderSchedule: { updateMany: scheduleUpdateMany },
      medicationDoseInstance: {
        findMany: doseFindMany,
        update: doseUpdate,
      },
      ...overrides,
    };

    return { tx, scheduleUpdateMany, doseFindMany, doseUpdate, orderItemFindMany };
  }

  it("cascades schedules and only future open dose instances on whole-order cancel", async () => {
    const { tx, scheduleUpdateMany, doseUpdate } = makeTx();

    await cascadeMedicationOrderCancelInTransaction(tx as never, {
      facilityId: "fac-1",
      orderId: "order-1",
      cancelledAt,
      cancelReason: "PATIENT_DISCHARGED",
      cancelledByUserId: "md-1",
    });

    expect(scheduleUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orderItemId: { in: ["oi-1"] } }),
        data: expect.objectContaining({ scheduleStatus: "CANCELLED" }),
      })
    );
    expect(doseUpdate).toHaveBeenCalledTimes(1);
    expect(doseUpdate).toHaveBeenCalledWith({
      where: { id: "dose-future" },
      data: expect.objectContaining({ doseStatus: "CANCELLED" }),
    });
  });

  it("cascades line-item cancel by explicit orderItemIds", async () => {
    const { tx, orderItemFindMany, scheduleUpdateMany } = makeTx();

    await cascadeMedicationOrderCancelInTransaction(tx as never, {
      facilityId: "fac-1",
      orderItemIds: ["oi-line"],
      cancelledAt,
      cancelReason: "DUPLICATE_ORDER",
      cancelledByUserId: "md-1",
    });

    expect(orderItemFindMany).not.toHaveBeenCalled();
    expect(scheduleUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orderItemId: { in: ["oi-line"] } }),
      })
    );
  });
});
