import { BadRequestException } from "@nestjs/common";
import { MedicationMarAction, RoleCode } from "@prisma/client";
import { validateMedicationAdministrationEffectiveTime } from "@medora/shared";
import { MedicationAdministrationService } from "./medication-administration.service";
import { badRequestExceptionCode } from "./mar-create-validation-log.util";

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

describe("marTimingReasonApiRemoval (MEDUI.ED.MAR.HOTFIX.TIME.2)", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(marCreate: jest.Mock) {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(makeEncounter()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      billingEvent: { upsert: jest.fn().mockResolvedValue({}) },
      orderItem: { findFirst: jest.fn().mockResolvedValue(makeOrderItem()) },
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

  it("shared validateMedicationAdministrationEffectiveTime accepts changed time without reason", () => {
    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: new Date("2026-05-16T13:00:00Z"),
      now: new Date("2026-05-16T18:00:00Z"),
      encounterAnchorAt: new Date("2026-05-16T08:00:00Z"),
      originalAdministeredAt: new Date("2026-05-16T14:00:00Z"),
      systemDocumentedAt: new Date("2026-05-18T14:30:00Z"),
      orderCreatedAt: new Date("2026-05-16T10:00:00Z"),
      orderItemCreatedAt: new Date("2026-05-16T10:05:00Z"),
      orderCancelledAt: null,
      adjustmentVersion: 1,
      reason: "",
      controlledMedication: true,
      marActionAdministered: true,
    });
    expect(result.ok).toBe(true);
  });

  it("POST create accepts adjusted effectiveAdministeredAt without reason", async () => {
    const documented = new Date("2026-05-16T14:00:00Z");
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-x",
      administeredAt: documented,
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    await service.create("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredAt: documented,
      effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("does not return MAR_EFFECTIVE_TIME_REASON_REQUIRED for timing variance", async () => {
    const documented = new Date("2026-05-16T14:00:00Z");
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-y",
      administeredAt: documented,
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "u1", firstName: "A", lastName: "B" },
    });
    const service = makeService(marCreate);
    await expect(
      service.create("enc-1", "fac-1", "user-rn", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredAt: documented,
        effectiveAdministeredAt: "2026-05-16T12:00:00.000Z",
      })
    ).resolves.toBeDefined();
  });

  it("future effective time returns structured English-neutral code", async () => {
    const service = makeService(jest.fn());
    try {
      await service.create("enc-1", "fac-1", "user-rn", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredAt: new Date("2026-05-16T14:00:00Z"),
        effectiveAdministeredAt: "2099-01-01T12:00:00.000Z",
      });
      throw new Error("expected rejection");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const code = badRequestExceptionCode(err as BadRequestException);
      expect(code).toBe("MAR_EFFECTIVE_TIME_FUTURE");
      expect(code).not.toBe("MAR_EFFECTIVE_TIME_REASON_REQUIRED");
    }
  });
});
