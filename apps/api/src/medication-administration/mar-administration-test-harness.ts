import { MedicationMarAction, OrderStatus, PharmacyVerificationStatus } from "@prisma/client";
import { MedicationAdministrationService } from "./medication-administration.service";

export function makeMarTestEncounter() {
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

type MarHarnessOptions = {
  catalog: Record<string, unknown>;
  orderItem: Record<string, unknown>;
  productProfile?: Record<string, unknown> | null;
  packageNdc?: { ndc11: string; ndcDisplay: string } | null;
  pharmacyStatus?: PharmacyVerificationStatus | null;
  marCreateResult?: Record<string, unknown>;
};

export function buildMarAdministrationTestHarness(options: MarHarnessOptions) {
  const marCreate = jest.fn().mockResolvedValue({
    id: "mar-row-1",
    administeredAt: new Date("2026-05-16T14:00:00Z"),
    medicationLabelSnapshot: `${options.catalog.displayNameEn ?? options.catalog.name} ${options.catalog.strength ?? ""}`.trim(),
    orderItemId: options.orderItem.id,
    marAction: MedicationMarAction.administered,
    ndc11Snapshot: null,
    ndcDisplaySnapshot: null,
    doseValue: null,
    doseUnit: null,
    administeredQuantity: 1,
    billingQuantity: 1,
    quantityUnit: "mL",
    route: "IV",
    administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
    ...options.marCreateResult,
  });

  const orderItemUpdate = jest.fn().mockImplementation(async ({ data }) => ({
    ...options.orderItem,
    ...data,
  }));
  const orderEventCreate = jest.fn().mockResolvedValue({ id: "ev-1" });
  const verificationCreate = jest.fn().mockResolvedValue({ id: "ver-1" });
  const overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-1" });
  const wasteCreate = jest.fn().mockResolvedValue({ id: "waste-1" });
  const auditLog = jest.fn().mockResolvedValue(undefined);

  const encounter = makeMarTestEncounter();
  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue(encounter),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    orderItem: {
      findFirst: jest.fn().mockResolvedValue(options.orderItem),
      update: orderItemUpdate,
    },
    catalogMedication: {
      findMany: jest.fn().mockResolvedValue([options.catalog]),
      findUnique: jest.fn().mockResolvedValue(options.catalog),
    },
    medicationProduct: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(options.productProfile ?? null),
    },
    medicationPackage: {
      findFirst: jest.fn().mockResolvedValue(options.packageNdc ?? null),
    },
    pharmacyVerification: {
      findFirst: jest.fn().mockResolvedValue(
        options.pharmacyStatus != null ? { verificationStatus: options.pharmacyStatus } : null
      ),
    },
    medicationAdministration: {
      findFirst: jest.fn().mockResolvedValue(null),
      findFirstOrThrow: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { administeredQuantity: 0 }, _count: { _all: 0 } }),
      create: marCreate,
    },
    medicationAdministrationVerification: { create: verificationCreate },
    medicationAdministrationOverride: { create: overrideCreate },
    medicationWasteDocumentation: { create: wasteCreate },
    billingEvent: { upsert: jest.fn().mockResolvedValue({}) },
    orderEvent: { create: orderEventCreate },
    userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        medicationAdministration: { create: marCreate },
        medicationAdministrationVerification: { create: verificationCreate },
        medicationAdministrationOverride: { create: overrideCreate },
        medicationWasteDocumentation: { create: wasteCreate },
        orderItem: { update: orderItemUpdate },
        orderEvent: { create: orderEventCreate, findFirst: jest.fn().mockResolvedValue(null) },
        userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
      };
      return fn(tx);
    }),
  };

  const service = new MedicationAdministrationService(prisma as never, { log: auditLog } as never);

  return {
    service,
    marCreate,
    orderItemUpdate,
    orderEventCreate,
    verificationCreate,
    overrideCreate,
    auditLog,
    prisma,
  };
}

export function expectOrderLineCompleted(orderItemUpdate: jest.Mock) {
  expect(orderItemUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: OrderStatus.COMPLETED }),
    })
  );
}

export function expectOrderLineNotCompleted(orderItemUpdate: jest.Mock) {
  expect(orderItemUpdate).not.toHaveBeenCalled();
}
