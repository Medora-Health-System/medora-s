import { maybeCreateMedicationOrderScheduleForOrderItem } from "./medication-order-schedule.persistence";

describe("maybeCreateMedicationOrderScheduleForOrderItem (INP.2E.2 intent gate)", () => {
  const flagsOn = { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true };

  function mockTx() {
    return {
      medicationOrderSchedule: {
        create: jest.fn(),
      },
    };
  }

  const baseInput = {
    facilityId: "fac-1",
    encounterId: "enc-1",
    orderId: "ord-1",
    orderItemId: "oi-1",
    frequencyCode: "BID" as const,
    featureFlags: flagsOn,
  };

  it("ADMINISTER_CHART BID creates a schedule", async () => {
    const tx = mockTx();
    tx.medicationOrderSchedule.create.mockResolvedValue({ id: "sch-1" });
    const result = await maybeCreateMedicationOrderScheduleForOrderItem(tx as never, {
      ...baseInput,
      medicationFulfillmentIntent: "ADMINISTER_CHART",
    });
    expect(result.created).toBe(true);
    expect(result.scheduleId).toBe("sch-1");
    expect(tx.medicationOrderSchedule.create).toHaveBeenCalledTimes(1);
  });

  it("PHARMACY_DISPENSE BID never creates a facility MAR schedule", async () => {
    const tx = mockTx();
    const result = await maybeCreateMedicationOrderScheduleForOrderItem(tx as never, {
      ...baseInput,
      medicationFulfillmentIntent: "PHARMACY_DISPENSE",
    });
    expect(result.created).toBe(false);
    expect(result.reason).toBe("NOT_FACILITY_ADMIN_INTENT");
    expect(tx.medicationOrderSchedule.create).not.toHaveBeenCalled();
  });
});
