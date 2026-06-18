import { BadRequestException } from "@nestjs/common";
import {
  buildMarMissedDoseDocumentation,
  buildMarScheduleTimingDocumentation,
  MAR_PRN_REASON_NOTE_PREFIX,
} from "@medora/shared";
import { MedicationAdministrationService } from "./medication-administration.service";
import {
  MAR_EARLY_ADMIN_REASON_REQUIRED,
  MAR_LATE_ADMIN_REASON_REQUIRED,
  MAR_MISSED_REASON_REQUIRED,
} from "./mar-administration-safety-governance.util";

function makeEncounter() {
  return {
    id: "enc-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    status: "OPEN",
    providerDocumentationStatus: "DRAFT",
    version: 1,
    billingCaptureJson: null,
    createdAt: new Date("2026-05-16T08:00:00Z"),
    admittedAt: null,
    vitals: null,
    nursingAssessment: null,
    triage: { vitalsJson: null },
  };
}

function makeOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "oi-scheduled",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-zofran",
    status: "PENDING",
    lifecycleState: "ORDERED",
    quantity: 1,
    route: "PO",
    strength: "4 mg",
    frequencyCode: "BID",
    notes: "4 mg PO BID",
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
    ...overrides,
  };
}

function zofranCatalog() {
  return {
    id: "cat-zofran",
    displayNameEn: "Ondansetron",
    displayNameFr: "Ondansétron",
    name: "Zofran",
    genericName: "ondansetron",
    code: "ZOFRAN",
    strength: "4 mg",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mg",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
    dosageForm: null,
    therapeuticClass: "Antiemetic",
    route: "PO",
    administrationType: null,
  };
}

const SCHEDULED_AT = new Date("2026-06-12T13:00:00.000Z");
const DUE_WINDOW_END = new Date("2026-06-12T14:00:00.000Z");
const EARLY_ADMIN_AT = new Date("2026-06-12T09:00:00.000Z");
const LATE_ADMIN_AT = new Date("2026-06-12T15:30:00.000Z");
const ON_TIME_ADMIN_AT = new Date("2026-06-12T13:30:00.000Z");

function makeDoseInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: "dose-1",
    facilityId: "fac-1",
    encounterId: "enc-1",
    orderItemId: "oi-scheduled",
    scheduledAt: SCHEDULED_AT,
    dueWindowStartAt: SCHEDULED_AT,
    dueWindowEndAt: DUE_WINDOW_END,
    doseKind: "FIXED_ADMINISTRATION",
    doseStatus: "DUE",
    terminalMedicationAdministrationId: null,
    medicationOrderSchedule: {
      scheduleClassification: "RECURRING",
      scheduleStatus: "ACTIVE",
      frequencyCode: "BID",
    },
    medicationCatalogSnapshotJson: null,
    ...overrides,
  };
}

function expectMarGovernanceError(err: unknown, code: string) {
  expect(err).toBeInstanceOf(BadRequestException);
  expect((err as BadRequestException).getResponse()).toMatchObject({
    statusCode: 400,
    code,
    errorCode: code,
  });
}

async function expectMarGovernanceRejection(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(BadRequestException);
  try {
    await promise;
  } catch (err) {
    expectMarGovernanceError(err, code);
  }
}

describe("MedicationAdministrationService MAR safety governance (K.10B.9A)", () => {
  let marCreate: jest.Mock;

  function makeService(
    orderItemOverrides: Record<string, unknown> = {},
    options: { doseInstance?: ReturnType<typeof makeDoseInstance> | null } = {}
  ) {
    marCreate = jest.fn().mockImplementation(async ({ data }) => ({
      id: "mar-1",
      ...data,
      administeredBy: { id: "nurse-1", firstName: "Elizabeth", lastName: "Posada" },
    }));

    const orderItem = makeOrderItem(orderItemOverrides);
    const encounter = makeEncounter();
    const catalog = zofranCatalog();
    const doseInstance = options.doseInstance === undefined ? makeDoseInstance() : options.doseInstance;

    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      facility: {
        findFirst: jest.fn().mockResolvedValue({ timezone: "UTC" }),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
        update: jest.fn().mockResolvedValue(orderItem),
      },
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([catalog]),
        findUnique: jest.fn().mockResolvedValue(catalog),
      },
      medicationProduct: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
      medicationPackage: { findFirst: jest.fn().mockResolvedValue(null) },
      pharmacyVerification: { findFirst: jest.fn().mockResolvedValue(null) },
      medicationDoseInstance: {
        findFirst: jest.fn().mockImplementation(async ({ where }: { where: { id?: string } }) => {
          if (!doseInstance) return null;
          if (where.id === doseInstance.id) return doseInstance;
          return null;
        }),
        update: jest.fn(),
      },
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { administeredQuantity: 0 }, _count: { _all: 0 } }),
        create: marCreate,
      },
      orderEvent: { create: jest.fn().mockResolvedValue({ id: "ev-1" }) },
      userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          medicationDoseInstance: { update: jest.fn() },
          orderItem: { update: jest.fn().mockResolvedValue(orderItem) },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        };
        return fn(tx);
      }),
    };

    return new MedicationAdministrationService(prisma as never, { log: jest.fn() } as never);
  }

  const dosePayload = {
    orderItemId: "oi-scheduled",
    medicationDoseInstanceId: "dose-1",
    marAction: "administered" as const,
    route: "PO",
    doseUnit: "mg",
    administeredQuantity: 1,
  };

  it("accepts early administration without reason", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      ...dosePayload,
      administeredAt: EARLY_ADMIN_AT,
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts early administration with structured reason in notes", async () => {
    const service = makeService();
    const notes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "PAIN_CRISIS",
      minutesDelta: 240,
    });
    await service.create("enc-1", "fac-1", "nurse-1", {
      ...dosePayload,
      administeredAt: EARLY_ADMIN_AT,
      notes,
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts early administration with scheduleTimingReasonCode DTO field", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      ...dosePayload,
      administeredAt: EARLY_ADMIN_AT,
      scheduleTimingReasonCode: "PROCEDURE_SCHEDULED",
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts late administration without reason", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      ...dosePayload,
      administeredAt: LATE_ADMIN_AT,
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts late administration with structured reason in notes", async () => {
    const service = makeService();
    const notes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "PATIENT_UNAVAILABLE",
      minutesDelta: 90,
    });
    await service.create("enc-1", "fac-1", "nurse-1", {
      ...dosePayload,
      administeredAt: LATE_ADMIN_AT,
      notes,
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts on-time administration without schedule timing reason", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      ...dosePayload,
      administeredAt: ON_TIME_ADMIN_AT,
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("rejects missed dose without reason → MAR_MISSED_REASON_REQUIRED", async () => {
    const service = makeService();
    await expectMarGovernanceRejection(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-scheduled",
        medicationDoseInstanceId: "dose-1",
        marAction: "not_available",
        notes: "Missed:",
      }),
      MAR_MISSED_REASON_REQUIRED
    );
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("accepts missed dose with structured reason in notes", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-scheduled",
      medicationDoseInstanceId: "dose-1",
      marAction: "not_available",
      notes: buildMarMissedDoseDocumentation("TRANSFERRED"),
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts refused medication without missed-dose reason", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-scheduled",
      marAction: "refused",
      notes: "Refused: PATIENT_REFUSED",
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts held medication without missed-dose reason", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-scheduled",
      marAction: "md_changed",
      notes: "Held: NPO",
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("accepts PRN administration with PRN reason and no schedule timing reason", async () => {
    const service = makeService(
      {
        id: "oi-prn",
        notes: "4 mg IVP q6h PRN nausea/vomiting",
        frequencyCode: "Q6H",
        route: "IVP",
      },
      { doseInstance: null }
    );
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-prn",
      marAction: "administered",
      route: "IVP",
      prnReasonCode: "nausea",
      administeredAt: EARLY_ADMIN_AT,
    });
    expect(marCreate).toHaveBeenCalled();
    const notes = marCreate.mock.calls[0][0].data.notes as string;
    expect(notes).toContain(`${MAR_PRN_REASON_NOTE_PREFIX}nausea`);
  });

  it("skips schedule timing enforcement for IVPB infusion start lifecycle", async () => {
    const service = makeService();
    await service.create(
      "enc-1",
      "fac-1",
      "nurse-1",
      {
        ...dosePayload,
        administeredAt: EARLY_ADMIN_AT,
      },
      {
        allowAdministeredForInfusionStart: true,
        skipMedicationLineCompletion: true,
        skipDuplicateAdministeredWindowCheck: true,
        infusionMar: { infusionSessionKey: "sess-1", infusionPhase: "INFUSION_START" },
      }
    );
    expect(marCreate).toHaveBeenCalled();
  });

  it("does not require schedule timing reason for direct MAR without dose instance", async () => {
    const service = makeService({ notes: "Normal saline 1 L IV continuous" }, { doseInstance: null });
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-scheduled",
      marAction: "administered",
      route: "IV",
      administeredAt: EARLY_ADMIN_AT,
    });
    expect(marCreate).toHaveBeenCalled();
  });
});
