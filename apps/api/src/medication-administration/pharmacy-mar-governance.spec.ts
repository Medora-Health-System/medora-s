import { BadRequestException } from "@nestjs/common";
import { MedicationMarAction, PharmacyVerificationStatus } from "@prisma/client";
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
    catalogItemId: "cat-insulin",
    status: "PENDING",
    lifecycleState: "ORDERED",
    quantity: 1,
    route: "SC",
    strength: "100 units/mL",
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

function insulinCatalog() {
  return {
    id: "cat-insulin",
    displayNameEn: "Insulin",
    displayNameFr: "Insuline",
    name: "Insulin",
    code: "INSULIN",
    strength: "100 units/mL",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mL",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
  };
}

function insulinProductProfile() {
  return {
    legacyCatalogMedicationId: "cat-insulin",
    concept: {
      safetyProfile: {
        isHighAlert: true,
        highAlertCategories: { highAlertClass: "HIGH_ALERT_INSULIN" },
        lasaGroupId: null,
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      },
    },
    administrationProfile: { allowsWasteDocumentation: false },
  };
}

describe("MedicationAdministrationService pharmacy MAR (M1.3F.7)", () => {
  let auditLog: jest.Mock;
  let overrideCreate: jest.Mock;
  let marCreate: jest.Mock;
  let pharmacyFindFirst: jest.Mock;

  beforeEach(() => {
    auditLog = jest.fn().mockResolvedValue(undefined);
    overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-pharm-1" });
    marCreate = jest.fn().mockResolvedValue({
      id: "mar-1",
      administeredAt: new Date(),
      medicationLabelSnapshot: "Insulin",
      orderItemId: "oi-1",
      marAction: MedicationMarAction.administered,
      ndc11Snapshot: null,
      ndcDisplaySnapshot: null,
      doseValue: null,
      doseUnit: null,
      administeredQuantity: 1,
      billingQuantity: 1,
      quantityUnit: "mL",
      route: "SC",
      administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
    });
    pharmacyFindFirst = jest.fn().mockResolvedValue(null);
  });

  function makeService(
    catalog = insulinCatalog(),
    product = insulinProductProfile(),
    pharmacyStatus: PharmacyVerificationStatus | null = null
  ) {
    pharmacyFindFirst.mockResolvedValue(
      pharmacyStatus ? { verificationStatus: pharmacyStatus } : null
    );
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(makeEncounter()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: { findFirst: jest.fn().mockResolvedValue(makeOrderItem()) },
      catalogMedication: { findUnique: jest.fn().mockResolvedValue(catalog) },
      medicationProduct: { findFirst: jest.fn().mockResolvedValue(product) },
      pharmacyVerification: { findFirst: pharmacyFindFirst },
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
          medicationAdministrationVerification: { create: jest.fn() },
          medicationWasteDocumentation: { create: jest.fn() },
          medicationAdministrationOverride: { create: overrideCreate },
          orderItem: { update: jest.fn() },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        };
        return fn(tx);
      }),
    };
    const service = new MedicationAdministrationService(prisma as never, { log: auditLog } as never);
    return { service, overrideCreate, auditLog, marCreate };
  }

  it("blocks insulin MAR without dual nurse witness (M1.7A.9 — not pharmacy)", async () => {
    const { service } = makeService(insulinCatalog(), insulinProductProfile(), null);
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("allows insulin MAR with dual witness regardless of pharmacy status (M1.7A.9)", async () => {
    const { service, overrideCreate } = makeService(
      insulinCatalog(),
      insulinProductProfile(),
      PharmacyVerificationStatus.PENDING
    );
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      highAlertVerifierUserId: "rn-2",
    });
    expect(overrideCreate).not.toHaveBeenCalled();
    expect(marCreate).toHaveBeenCalled();
  });

  it("does not create pharmacy override when pharmacy pending (M1.7A.9 informational only)", async () => {
    const { service, overrideCreate } = makeService(
      insulinCatalog(),
      insulinProductProfile(),
      PharmacyVerificationStatus.PENDING
    );
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      highAlertVerifierUserId: "rn-2",
      pharmacyVerificationOverrideAcknowledged: true,
      pharmacyVerificationOverrideReason: "Urgence — pharmacien en route",
    });
    expect(overrideCreate).not.toHaveBeenCalled();
  });

  it("allows insulin MAR with dual witness when pharmacy rejected (M1.7A.9)", async () => {
    const { service, marCreate: createMock } = makeService(
      insulinCatalog(),
      insulinProductProfile(),
      PharmacyVerificationStatus.REJECTED
    );
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      highAlertVerifierUserId: "rn-2",
    });
    expect(createMock).toHaveBeenCalled();
  });

  it("does not require pharmacy for normal medication", async () => {
    const normalCatalog = {
      ...insulinCatalog(),
      id: "cat-normal",
      code: "NORMAL",
    };
    const normalProduct = {
      ...insulinProductProfile(),
      legacyCatalogMedicationId: "cat-normal",
      concept: {
        safetyProfile: {
          isHighAlert: false,
          highAlertCategories: { highAlertClass: "HIGH_ALERT_NONE" },
          lasaGroupId: null,
          isControlled: false,
          controlledSchedule: null,
          requiresWitness: false,
          requiresDoubleSign: false,
        },
      },
    };
    const { service, overrideCreate } = makeService(normalCatalog, normalProduct, null);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
    });
    expect(overrideCreate).not.toHaveBeenCalled();
  });
});
