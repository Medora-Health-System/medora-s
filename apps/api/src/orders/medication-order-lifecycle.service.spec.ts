import { ConflictException } from "@nestjs/common";
import { MedicationOrderLifecycleService } from "./medication-order-lifecycle.service";

describe("MedicationOrderLifecycleService", () => {
  const prisma = {
    orderItem: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    medicationDoseInstance: { findFirst: jest.fn() },
    medicationAdministration: { count: jest.fn() },
    catalogMedication: { findFirst: jest.fn() },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        orderItem: {
          update: jest.fn(),
          findFirstOrThrow: jest.fn(),
          create: jest.fn(),
        },
        order: { create: jest.fn() },
        orderEvent: { create: jest.fn() },
        medicationOrderSchedule: { updateMany: jest.fn() },
        medicationDoseInstance: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      })
    ),
  };

  const audit = { log: jest.fn() };

  const baseItem = {
    id: "item-1",
    orderId: "order-1",
    catalogItemId: "med-1",
    catalogItemType: "MEDICATION",
    manualLabel: "Keppra",
    quantity: 1,
    notes: "Q12H",
    strength: "500 mg",
    route: "IV",
    frequencyCode: "Q12H",
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    intendedAdministrationAt: null,
    medicationLifecycleStatus: "ACTIVE",
    medicationLifecycleAt: null,
    lifecycleState: "ORDERED",
    status: "PLACED",
    order: {
      id: "order-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: "PLACED",
      priority: "ROUTINE",
      encounter: {
        id: "enc-1",
        status: "OPEN",
        providerDocumentationStatus: null,
        patientId: "pat-1",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.orderItem.findFirst.mockResolvedValue(baseItem);
    prisma.orderItem.findFirstOrThrow.mockResolvedValue(baseItem);
    prisma.medicationAdministration.count.mockResolvedValue(0);
    prisma.medicationDoseInstance.findFirst.mockResolvedValue(null);
  });

  it("discontinues active Q6H order and cascades future doses", async () => {
    const service = new MedicationOrderLifecycleService(prisma as never, audit as never);
    await service.discontinueOrderItem(
      "fac-1",
      "item-1",
      { reason: "Changement clinique" },
      ["PROVIDER"],
      "user-1"
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalled();
  });

  it("blocks discontinue when active infusion is running", async () => {
    prisma.medicationDoseInstance.findFirst.mockResolvedValue({ id: "dose-1" });
    const service = new MedicationOrderLifecycleService(prisma as never, audit as never);
    await expect(
      service.discontinueOrderItem(
        "fac-1",
        "item-1",
        { reason: "Changement clinique" },
        ["PROVIDER"],
        "user-1"
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("routes administered edit to supersede path", async () => {
    prisma.medicationAdministration.count.mockResolvedValue(2);
    const service = new MedicationOrderLifecycleService(prisma as never, audit as never);
    jest.spyOn(service, "discontinueAndReorder").mockResolvedValue({
      previousOrderItemId: "item-1",
      replacementOrderItem: { id: "item-2" },
    } as never);
    await service.editOrderItem(
      "fac-1",
      "item-1",
      { reason: "Changement clinique", frequencyCode: "Q8H" },
      ["PROVIDER"],
      "user-1"
    );
    expect(service.discontinueAndReorder).toHaveBeenCalled();
  });
});
