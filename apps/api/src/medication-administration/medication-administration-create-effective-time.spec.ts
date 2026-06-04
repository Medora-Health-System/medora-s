import { MedicationMarAction, RoleCode } from "@prisma/client";
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

function makeOrderItem() {
  return {
    id: "oi-1",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "med-1",
    status: "PLACED",
    lifecycleState: "ORDERED",
    quantity: 1,
    route: "PO",
    strength: "4 mg",
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

describe("MedicationAdministrationService.create effectiveAdministeredAt", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(marCreate: jest.Mock) {
    const encounter = makeEncounter();
    const orderItem = makeOrderItem();
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
        aggregate: jest.fn().mockResolvedValue({ _sum: { administeredQuantity: 0 }, _count: { _all: 0 } }),
        create: marCreate,
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          orderItem: { update: jest.fn() },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: {
            findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN } }]),
          },
        };
        return fn(tx);
      }),
    };
    return new MedicationAdministrationService(prisma as never, { log: auditLog } as never);
  }

  it("creates without effective time unchanged", async () => {
    const documented = new Date("2026-05-16T14:00:00Z");
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-1",
      administeredAt: documented,
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    await service.create("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredAt: documented,
    });
    expect(marCreate.mock.calls[0][0].data.effectiveAdministeredAt).toBeUndefined();
  });

  it("stores effectiveAdministeredAt at create when provided", async () => {
    const documented = new Date("2026-05-16T14:00:00Z");
    const effectiveIso = "2026-05-16T13:00:00.000Z";
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-2",
      administeredAt: documented,
      effectiveAdministeredAt: new Date(effectiveIso),
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    await service.create("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredAt: documented,
      effectiveAdministeredAt: effectiveIso,
      effectiveAdministeredAtReason: "Given at bedside before charting",
    });
    const data = marCreate.mock.calls[0][0].data;
    expect(data.administeredAt).toEqual(documented);
    expect(data.effectiveAdministeredAt).toEqual(new Date(effectiveIso));
    expect(data.effectiveAdministeredAtVersion).toBe(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: "MAR_CREATE_MODAL",
          effectiveAdministeredAtProvided: true,
        }),
      })
    );
  });

  it("rejects effective time on refused outcome", async () => {
    const service = makeService(jest.fn());
    await expect(
      service.create("enc-1", "fac-1", "user-rn", {
        orderItemId: "oi-1",
        marAction: "refused",
        effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("administr") });
  });

  it("rejects future effective time", async () => {
    const service = makeService(jest.fn());
    await expect(
      service.create("enc-1", "fac-1", "user-rn", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredAt: new Date("2026-05-16T14:00:00Z"),
        effectiveAdministeredAt: "2099-01-01T12:00:00.000Z",
        effectiveAdministeredAtReason: "test",
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("futur") });
  });
});
