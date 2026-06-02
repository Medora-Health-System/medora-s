import { BadRequestException } from "@nestjs/common";
import {
  AuditAction,
  MedicationMarAction,
  MedicationOverrideType,
  MedicationVerificationStatus,
  MedicationVerificationType,
  MedicationWasteStatus,
  PharmacyVerificationStatus,
} from "@prisma/client";
import { MedicationAdministrationService } from "./medication-administration.service";

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

function makeOrderItem() {
  return {
    id: "oi-1",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-morphine",
    status: "PENDING",
    lifecycleState: "ORDERED",
    quantity: 2,
    route: "IV",
    strength: "10 mg/mL",
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

function controlledCatalog() {
  return {
    id: "cat-morphine",
    displayNameEn: "Morphine",
    displayNameFr: "Morphine",
    name: "Morphine",
    code: "MORPHINE",
    strength: "10 mg/mL",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mL",
    isControlled: true,
    controlledSchedule: "II",
    requiresWitness: true,
    requiresDoubleSign: false,
  };
}

describe("MedicationAdministrationService controlled substance MAR (M1.3F.4)", () => {
  let auditLog: jest.Mock;
  let verificationCreate: jest.Mock;
  let wasteCreate: jest.Mock;
  let overrideCreate: jest.Mock;
  let marCreate: jest.Mock;

  beforeEach(() => {
    auditLog = jest.fn().mockResolvedValue(undefined);
    verificationCreate = jest.fn().mockResolvedValue({ id: "ver-1" });
    wasteCreate = jest.fn().mockResolvedValue({ id: "waste-1" });
    overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-1" });
    marCreate = jest.fn().mockResolvedValue({
    id: "mar-1",
    administeredAt: new Date(),
    medicationLabelSnapshot: "Morphine",
    orderItemId: "oi-1",
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
    });
  });

  function makeService(catalog = controlledCatalog()) {
    const encounter = makeEncounter();
    const orderItem = makeOrderItem();
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: { findFirst: jest.fn().mockResolvedValue(orderItem) },
      catalogMedication: { findUnique: jest.fn().mockResolvedValue(catalog) },
      medicationProduct: { findFirst: jest.fn().mockResolvedValue(null) },
      pharmacyVerification: {
        findFirst: jest.fn().mockResolvedValue({
          verificationStatus: PharmacyVerificationStatus.VERIFIED,
        }),
      },
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { administeredQuantity: 0 } }),
        create: marCreate,
      },
      billingEvent: { upsert: jest.fn().mockResolvedValue({}) },
      userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          medicationAdministrationVerification: { create: verificationCreate },
          medicationWasteDocumentation: { create: wasteCreate },
          medicationAdministrationOverride: { create: overrideCreate },
          orderItem: { update: jest.fn() },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        };
        return fn(tx);
      }),
    };
    const audit = { log: auditLog };
    const service = new MedicationAdministrationService(prisma as never, audit as never);
    return { service, verificationCreate, wasteCreate, overrideCreate, auditLog };
  }

  it("returns 400 when controlled witness is missing", async () => {
    const { service } = makeService();
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("creates witness verification when witness provided", async () => {
    const { service, verificationCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 2,
      witnessUserId: "witness-2",
    });
    expect(verificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationType: MedicationVerificationType.WITNESS,
          verificationStatus: MedicationVerificationStatus.COMPLETED,
          witnessedByUserId: "witness-2",
        }),
      })
    );
  });

  it("creates override row when override acknowledged", async () => {
    const { service, overrideCreate, verificationCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 2,
      controlledOverrideAcknowledged: true,
      overrideReason: "Emergency — witness unavailable",
    });
    expect(overrideCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overrideType: MedicationOverrideType.CONTROLLED_SUBSTANCE_OVERRIDE,
        }),
      })
    );
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("creates waste documentation for partial dose", async () => {
    const { service, wasteCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      witnessUserId: "witness-2",
      wasteAmount: 1,
      wasteUnit: "mL",
      wasteReason: "Partial dose discarded",
    });
    expect(wasteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MedicationWasteStatus.COMPLETED,
          wastedAmount: 1,
        }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.MEDICATION_WASTE_RECORDED,
      "MEDICATION_ADMINISTRATION",
      expect.objectContaining({ critical: true })
    );
  });

  it("does not require witness for non-controlled catalog", async () => {
    const { service, verificationCreate } = makeService({
      ...controlledCatalog(),
      isControlled: false,
      requiresWitness: false,
    });
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
    });
    expect(verificationCreate).not.toHaveBeenCalled();
  });
});
