import { BadRequestException } from "@nestjs/common";
import {
  AuditAction,
  MedicationMarAction,
  MedicationOverrideType,
  MedicationVerificationStatus,
  MedicationVerificationType,
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
    catalogItemId: "cat-heparin",
    status: "PENDING",
    lifecycleState: "ORDERED",
    quantity: 1,
    route: "IV",
    strength: "5000 units/mL",
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

function highAlertCatalog() {
  return {
    id: "cat-heparin",
    displayNameEn: "Heparin",
    displayNameFr: "Héparine",
    name: "Heparin",
    code: "HEPARIN",
    strength: "5000 units/mL",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mL",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: true,
  };
}

function highAlertProductProfile() {
  return {
    legacyCatalogMedicationId: "cat-heparin",
    concept: {
      safetyProfile: {
        isHighAlert: true,
        highAlertCategories: {
          highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
          safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
        },
        lasaGroupId: null,
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: true,
      },
    },
    administrationProfile: { allowsWasteDocumentation: false },
  };
}

describe("MedicationAdministrationService high-alert MAR (M1.3F.5)", () => {
  let auditLog: jest.Mock;
  let verificationCreate: jest.Mock;
  let overrideCreate: jest.Mock;
  let marCreate: jest.Mock;

  beforeEach(() => {
    auditLog = jest.fn().mockResolvedValue(undefined);
    verificationCreate = jest.fn().mockResolvedValue({ id: "ver-ha-1" });
    overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-ha-1" });
    marCreate = jest.fn().mockResolvedValue({
      id: "mar-1",
      administeredAt: new Date(),
      medicationLabelSnapshot: "Heparin",
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

  function makeService(catalog = highAlertCatalog(), product = highAlertProductProfile()) {
    const encounter = makeEncounter();
    const orderItem = makeOrderItem();
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: { findFirst: jest.fn().mockResolvedValue(orderItem) },
      catalogMedication: { findUnique: jest.fn().mockResolvedValue(catalog) },
      medicationProduct: { findFirst: jest.fn().mockResolvedValue(product) },
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
      user: { findFirst: jest.fn().mockResolvedValue({ id: "rn-2" }) },
      userRole: { findMany: jest.fn().mockResolvedValue([{ id: "ur-1", role: { code: "RN" } }]) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          medicationAdministrationVerification: { create: verificationCreate },
          medicationWasteDocumentation: { create: jest.fn() },
          medicationAdministrationOverride: { create: overrideCreate },
          orderItem: { update: jest.fn() },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: { findMany: jest.fn().mockResolvedValue([{ id: "ur-1", role: { code: "RN" } }]) },
        };
        return fn(tx);
      }),
    };
    const audit = { log: auditLog };
    const service = new MedicationAdministrationService(prisma as never, audit as never);
    return { service, verificationCreate, overrideCreate, auditLog, prisma };
  }

  it("returns 400 when high-alert verifier is missing for IV heparin", async () => {
    const { service } = makeService();
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IVP",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("allows heparin SQ administration without high-alert verifier (M1.8B.4A)", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(makeEncounter()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue({ ...makeOrderItem(), route: "SQ" }),
      },
      catalogMedication: { findUnique: jest.fn().mockResolvedValue(highAlertCatalog()) },
      medicationProduct: { findFirst: jest.fn().mockResolvedValue(highAlertProductProfile()) },
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

    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      route: "SQ",
    });

    expect(marCreate).toHaveBeenCalled();
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("requires insulin SQ verifier when safety profile lacks HIGH_ALERT_INSULIN (M1.8B.4A.2)", async () => {
    const insulinCatalog = {
      id: "cat-insulin",
      displayNameEn: "Insulin (regular)",
      displayNameFr: "Insuline régulière",
      name: "Regular Insulin",
      code: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
      genericName: "Regular Insulin",
      strength: "100 UI/mL",
      dosageForm: "injectable",
      ndc11: null,
      ndcDisplay: null,
      billingUnitType: "mL",
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
    };
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(makeEncounter()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeOrderItem(),
          route: "SQ",
          catalogItemId: "cat-insulin",
          strength: "100 UI/mL",
        }),
      },
      catalogMedication: { findUnique: jest.fn().mockResolvedValue(insulinCatalog) },
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

    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
        route: "SQ",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("rejects display-name-only high-alert verifier without user id (M1.8B.4A.5)", async () => {
    const { service } = makeService();
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IVP",
        highAlertVerifierDisplayName: "Jane Doe",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("rejects high-alert verifier without active RN role at facility (M1.8B.4A.5)", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: "rn-9" });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([]);
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IVP",
        highAlertVerifierUserId: "rn-9",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("creates double-check verification when verifier provided", async () => {
    const { service, verificationCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      highAlertVerifierUserId: "rn-2",
    });
    expect(verificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationType: MedicationVerificationType.INDEPENDENT_DOUBLE_CHECK,
          verificationStatus: MedicationVerificationStatus.COMPLETED,
          witnessedByUserId: "rn-2",
        }),
      })
    );
  });

  it("creates HIGH_ALERT_OVERRIDE when override acknowledged", async () => {
    const { service, overrideCreate, verificationCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      highAlertOverrideAcknowledged: true,
      highAlertOverrideReason: "Emergency — sole nurse on unit",
    });
    expect(overrideCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overrideType: MedicationOverrideType.HIGH_ALERT_OVERRIDE,
        }),
      })
    );
    expect(verificationCreate).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.HIGH_ALERT_OVERRIDE,
      "MEDICATION_ADMINISTRATION",
      expect.objectContaining({ critical: true })
    );
  });

  it("does not require double-check for informational high-alert only", async () => {
    const informationalCatalog = {
      ...highAlertCatalog(),
      requiresDoubleSign: false,
    };
    const informationalProduct = {
      ...highAlertProductProfile(),
      concept: {
        safetyProfile: {
          ...highAlertProductProfile().concept.safetyProfile,
          requiresDoubleSign: false,
          highAlertCategories: {
            highAlertClass: "HIGH_ALERT_OPIOID",
            safetyRequirements: [],
          },
        },
      },
    };
    const { service, verificationCreate } = makeService(informationalCatalog, informationalProduct);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
    });
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("preserves controlled-substance witness when both workflows apply", async () => {
    const controlledHighAlertCatalog = {
      ...highAlertCatalog(),
      isControlled: true,
      requiresWitness: true,
    };
    const controlledProduct = {
      ...highAlertProductProfile(),
      concept: {
        safetyProfile: {
          ...highAlertProductProfile().concept.safetyProfile,
          isControlled: true,
          requiresWitness: true,
        },
      },
    };
    const { service, verificationCreate } = makeService(controlledHighAlertCatalog, controlledProduct);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      witnessUserId: "witness-2",
      highAlertVerifierUserId: "rn-3",
    });
    expect(verificationCreate).toHaveBeenCalledTimes(2);
    expect(verificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationType: MedicationVerificationType.WITNESS,
          witnessedByUserId: "witness-2",
        }),
      })
    );
    expect(verificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationType: MedicationVerificationType.INDEPENDENT_DOUBLE_CHECK,
          witnessedByUserId: "rn-3",
        }),
      })
    );
  });
});
