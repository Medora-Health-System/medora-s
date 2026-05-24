import { MedicationMarAction } from "@prisma/client";
import { IM_INJECTION_SITE_NOTE_PREFIX, IM_INJECTION_SITE_REQUIRED_MESSAGE } from "@medora/shared";
import { MedicationAdministrationService } from "./medication-administration.service";

function makeEncounter() {
  return {
    id: "enc-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    status: "OPEN",
    version: 1,
    billingCaptureJson: null,
    createdAt: new Date("2026-05-16T08:00:00Z"),
    admittedAt: null,
    vitals: null,
    nursingAssessment: null,
    triage: { vitalsJson: null },
  };
}

function makeOrderItem(route = "IM") {
  return {
    id: "oi-1",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "med-1",
    status: "PLACED",
    lifecycleState: "ORDERED",
    quantity: null,
    route,
    strength: "1 mg",
    notes: null,
    createdAt: new Date("2026-05-16T10:00:00Z"),
    order: {
      id: "ord-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: "PENDING",
      createdAt: new Date("2026-05-16T10:00:00Z"),
      cancelledAt: null,
    },
  };
}

describe("MedicationAdministrationService.create IM injection site", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(marCreate: jest.Mock) {
    const encounter = makeEncounter();
    const orderItem = makeOrderItem("IM");
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      billingEvent: { upsert: jest.fn().mockResolvedValue({}) },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
      },
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({ isControlled: false }),
      },
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn(),
        create: marCreate,
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          orderItem: { update: jest.fn() },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return fn(tx);
      }),
    };
    return new MedicationAdministrationService(prisma as never, { log: auditLog } as never);
  }

  it("rejects IM administered without injection site", async () => {
    const service = makeService(jest.fn());
    await expect(
      service.create("enc-1", "fac-1", "user-rn", {
        orderItemId: "oi-1",
        marAction: "administered",
        route: "IM",
        notes: "Action : Administré\nVoie : IM",
      })
    ).rejects.toMatchObject({ message: IM_INJECTION_SITE_REQUIRED_MESSAGE });
  });

  it("accepts IM administered with injection site and persists site in notes", async () => {
    const documented = new Date("2026-05-16T14:00:00Z");
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-im-1",
      administeredAt: documented,
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    await service.create("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-1",
      marAction: "administered",
      route: "IM",
      injectionSite: "right_deltoid",
      notes: "Action : Administré\nVoie : IM",
      administeredAt: documented,
    });
    const notes = marCreate.mock.calls[0][0].data.notes as string;
    expect(notes).toContain(`${IM_INJECTION_SITE_NOTE_PREFIX}right_deltoid`);
    expect(notes).toContain("Site d'injection : Deltoïde droit");
    expect(auditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({ injectionSite: "right_deltoid" }),
      })
    );
  });

  it("does not require injection site for IM refused", async () => {
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-refused",
      administeredAt: new Date(),
      marAction: MedicationMarAction.refused,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    await service.create("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-1",
      marAction: "refused",
      route: "IM",
      notes: "Action : Patient refusé\nVoie : IM",
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("does not require injection site for PO administered", async () => {
    const orderItem = makeOrderItem("PO");
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-po",
      administeredAt: new Date(),
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    (service as unknown as { prisma: { orderItem: { findFirst: jest.Mock } } }).prisma.orderItem.findFirst.mockResolvedValue(
      orderItem
    );
    await service.create("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-1",
      marAction: "administered",
      route: "PO",
      notes: "Action : Administré\nVoie : PO",
    });
    expect(marCreate).toHaveBeenCalled();
  });
});
