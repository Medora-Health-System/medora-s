import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF } from "@medora/shared";
import {
  buildMarAdministrationTestHarness,
  expectOrderLineCompleted,
  expectOrderLineNotCompleted,
  makeMarTestCatalog,
  makeMarTestOrderItem,
  submitTerminalMarAdministered,
} from "./mar-administration-test-harness";
import { resolveLoadedDoseGatedMarContext } from "./medication-dose-gated-mar.util";

const flagsOn = {
  ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
  MEDICATION_SCHEDULING_V1: true,
  MEDICATION_DOSE_INSTANCES: true,
  MEDICATION_DOSE_GATED_MAR: true,
};

function makeDoseInstance(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-06-10T10:00:00.000Z");
  return {
    id: "dose-1",
    facilityId: "fac-1",
    encounterId: "enc-1",
    orderId: "ord-1",
    orderItemId: "oi-1",
    medicationOrderScheduleId: "sched-1",
    doseSequenceNumber: 1,
    doseKind: "FIXED_ADMINISTRATION",
    scheduledAt: now,
    dueWindowStartAt: new Date("2026-06-10T09:00:00.000Z"),
    dueWindowEndAt: new Date("2026-06-10T11:00:00.000Z"),
    overdueAt: null,
    doseStatus: "DUE",
    scheduleClassificationSnapshot: "RECURRING",
    frequencySnapshotJson: {},
    medicationCatalogSnapshotJson: {
      catalogCode: "GENERIC_MED",
      route: "IVP",
      administrationType: "PUSH",
    },
    orderedDoseSnapshotJson: {},
    infusionSessionId: null,
    responseDueAt: null,
    terminalMedicationAdministrationId: null,
    missedReason: null,
    cancelledAt: null,
    cancelReason: null,
    supersededAt: null,
    createdAt: now,
    updatedAt: now,
    medicationOrderSchedule: {
      id: "sched-1",
      facilityId: "fac-1",
      encounterId: "enc-1",
      orderId: "ord-1",
      orderItemId: "oi-1",
      frequencyCode: "BID",
      catalogVersion: 1,
      frequencySnapshotJson: {},
      medicationCatalogSnapshotJson: {},
      scheduleClassification: "RECURRING",
      scheduleStatus: "ACTIVE",
      version: 1,
      supersededByScheduleId: null,
      supersededAt: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: now,
      updatedAt: now,
    },
    ...overrides,
  };
}

describe("medication-dose-gated-mar.util (M1.8B.7I.2)", () => {
  it("resolveLoadedDoseGatedMarContext returns COMPLETED and skip completion", () => {
    const ctx = resolveLoadedDoseGatedMarContext({
      doseInstance: makeDoseInstance() as never,
      featureFlags: flagsOn,
      requestOrderItemId: "oi-1",
      requestEncounterId: "enc-1",
      requestFacilityId: "fac-1",
      orderRoute: "IVP",
      marAction: "administered",
    });
    expect(ctx.nextDoseStatus).toBe("COMPLETED");
    expect(ctx.skipOrderLineCompletion).toBe(true);
  });

  it("rejects terminal dose", () => {
    expect(() =>
      resolveLoadedDoseGatedMarContext({
        doseInstance: makeDoseInstance({ doseStatus: "COMPLETED" }) as never,
        featureFlags: flagsOn,
        requestOrderItemId: "oi-1",
        requestEncounterId: "enc-1",
        requestFacilityId: "fac-1",
        orderRoute: "IVP",
        marAction: "administered",
      })
    ).toThrow(BadRequestException);
  });
});

describe("MedicationAdministrationService dose-gated MAR harness (M1.8B.7I.2)", () => {
  function buildDoseGatedHarness() {
    const catalog = makeMarTestCatalog();
    const orderItem = makeMarTestOrderItem({ catalogItemId: catalog.id, notes: "frequency:BID" });
    const doseInstance = makeDoseInstance();
    const doseUpdate = jest.fn().mockResolvedValue({ ...doseInstance, doseStatus: "COMPLETED" });

    const base = buildMarAdministrationTestHarness({ catalog, orderItem });

    process.env.MEDICATION_SCHEDULING_V1 = "true";
    process.env.MEDICATION_DOSE_INSTANCES = "true";
    process.env.MEDICATION_DOSE_GATED_MAR = "true";

    const prisma = base.prisma as Record<string, unknown>;
    prisma.medicationDoseInstance = {
      findFirst: jest.fn().mockResolvedValue(doseInstance),
      update: doseUpdate,
    };

    base.prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        medicationAdministration: {
          create: base.marCreate,
          findFirst: base.medicationAdministrationFindFirst,
        },
        medicationAdministrationVerification: { create: base.verificationCreate },
        medicationAdministrationOverride: { create: base.overrideCreate },
        medicationWasteDocumentation: { create: base.wasteCreate },
        orderItem: { update: base.orderItemUpdate },
        orderEvent: { create: base.orderEventCreate, findFirst: jest.fn().mockResolvedValue(null) },
        userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        medicationDoseInstance: { update: doseUpdate },
      };
      return fn(tx);
    });

    return { ...base, doseUpdate, doseInstance, orderItem };
  }

  afterEach(() => {
    delete process.env.MEDICATION_DOSE_GATED_MAR;
  });

  it("creates MAR with medicationDoseInstanceId and updates dose atomically", async () => {
    const { service, marCreate, doseUpdate, doseInstance, orderItem } = buildDoseGatedHarness();

    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      medicationDoseInstanceId: doseInstance.id,
      marAction: "administered",
      administeredQuantity: 1,
    });

    expect(marCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          medicationDoseInstanceId: doseInstance.id,
        }),
      })
    );
    expect(doseUpdate).toHaveBeenCalledWith({
      where: { id: doseInstance.id },
      data: {
        doseStatus: "COMPLETED",
        terminalMedicationAdministrationId: "mar-row-1",
      },
    });
  });

  it("does not complete order line for dose-gated BID", async () => {
    const { service, orderItemUpdate, doseInstance, orderItem } = buildDoseGatedHarness();

    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: String(orderItem.id),
      medicationDoseInstanceId: doseInstance.id,
      marAction: "administered",
      administeredQuantity: 1,
    });

    expectOrderLineNotCompleted(orderItemUpdate);
  });

  it("legacy NOW path still completes line when flags OFF", async () => {
    delete process.env.MEDICATION_DOSE_GATED_MAR;
    process.env.MEDICATION_SCHEDULING_V1 = "false";
    process.env.MEDICATION_DOSE_INSTANCES = "false";

    const catalog = makeMarTestCatalog();
    const orderItem = makeMarTestOrderItem({ catalogItemId: catalog.id, notes: "frequency:NOW" });
    const { service, orderItemUpdate } = buildMarAdministrationTestHarness({ catalog, orderItem });

    await submitTerminalMarAdministered(service, String(orderItem.id));

    expectOrderLineCompleted(orderItemUpdate);
    expect(orderItemUpdate.mock.calls[0]?.[0]?.data?.status).toBe(OrderStatus.COMPLETED);
  });
});
