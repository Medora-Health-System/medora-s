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
    catalogItemId: "cat-morphine",
    status: "PENDING",
    lifecycleState: "ORDERED",
    quantity: 1,
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

function lasaCatalog() {
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
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
  };
}

function lasaHighProductProfile() {
  return {
    legacyCatalogMedicationId: "cat-morphine",
    concept: {
      safetyProfile: {
        isHighAlert: false,
        highAlertCategories: {
          lasa: {
            lasaGroupCode: "GROUP_LASA_OPIOID",
            lasaGroupLabel: "Opioid LASA",
            lasaSeverity: "LASA_HIGH",
            sourcePhase: "M1.3E",
          },
        },
        lasaGroupId: "GROUP_LASA_OPIOID",
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      },
    },
    administrationProfile: { allowsWasteDocumentation: false },
  };
}

describe("MedicationAdministrationService LASA MAR (M1.3F.6)", () => {
  let auditLog: jest.Mock;
  let verificationCreate: jest.Mock;
  let overrideCreate: jest.Mock;
  let marCreate: jest.Mock;

  beforeEach(() => {
    auditLog = jest.fn().mockResolvedValue(undefined);
    verificationCreate = jest.fn().mockResolvedValue({ id: "ver-lasa-1" });
    overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-lasa-1" });
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

  function makeService(catalog = lasaCatalog(), product = lasaHighProductProfile()) {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(makeEncounter()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: { findFirst: jest.fn().mockResolvedValue(makeOrderItem()) },
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
    return { service, verificationCreate, overrideCreate, auditLog };
  }

  it("returns 400 when LASA_HIGH acknowledgement is missing", async () => {
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

  it("creates LASA_ACKNOWLEDGMENT verification when acknowledged", async () => {
    const { service, verificationCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      lasaAcknowledged: true,
      lasaMedicationSelectionConfirmed: true,
      lasaSecondReadUserId: "rn-2",
    });
    expect(verificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationType: MedicationVerificationType.LASA_ACKNOWLEDGMENT,
          verificationStatus: MedicationVerificationStatus.COMPLETED,
          verifierUserId: "nurse-1",
          witnessedByUserId: "rn-2",
        }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.LASA_WARNING_ACKNOWLEDGED,
      "MEDICATION_ADMINISTRATION",
      expect.objectContaining({ critical: true })
    );
  });

  it("creates LASA_OVERRIDE when override acknowledged", async () => {
    const { service, overrideCreate, verificationCreate } = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      lasaOverrideAcknowledged: true,
      lasaOverrideReason: "Emergency — verbal LASA check completed",
    });
    expect(overrideCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overrideType: MedicationOverrideType.LASA_OVERRIDE,
        }),
      })
    );
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("does not require acknowledgement for LASA_LOW", async () => {
    const lowProduct = {
      ...lasaHighProductProfile(),
      concept: {
        safetyProfile: {
          ...lasaHighProductProfile().concept.safetyProfile,
          highAlertCategories: {
            lasa: {
              lasaGroupCode: "GROUP_LASA_X",
              lasaGroupLabel: "Low LASA",
              lasaSeverity: "LASA_LOW",
              sourcePhase: "M1.3E",
            },
          },
        },
      },
    };
    const { service, verificationCreate } = makeService(lasaCatalog(), lowProduct);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
    });
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("LASA_MEDIUM requires acknowledgement", async () => {
    const mediumProduct = {
      ...lasaHighProductProfile(),
      concept: {
        safetyProfile: {
          ...lasaHighProductProfile().concept.safetyProfile,
          highAlertCategories: {
            lasa: {
              lasaGroupCode: "GROUP_LASA_CEF",
              lasaGroupLabel: "Cephalosporin LASA",
              lasaSeverity: "LASA_MEDIUM",
              sourcePhase: "M1.3E",
            },
          },
        },
      },
    };
    const { service } = makeService(lasaCatalog(), mediumProduct);
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-1",
        marAction: "administered",
        administeredQuantity: 1,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("combined controlled + high-alert + LASA creates all verifications", async () => {
    const combinedCatalog = {
      ...lasaCatalog(),
      isControlled: true,
      requiresWitness: true,
      requiresDoubleSign: true,
    };
    const combinedProduct = {
      ...lasaHighProductProfile(),
      concept: {
        safetyProfile: {
          ...lasaHighProductProfile().concept.safetyProfile,
          isControlled: true,
          requiresWitness: true,
          requiresDoubleSign: true,
          isHighAlert: true,
          highAlertCategories: {
            highAlertClass: "HIGH_ALERT_OPIOID",
            safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
            lasa: {
              lasaGroupCode: "GROUP_LASA_OPIOID",
              lasaGroupLabel: "Opioid LASA",
              lasaSeverity: "LASA_HIGH",
              sourcePhase: "M1.3E",
            },
          },
        },
      },
    };
    const { service, verificationCreate } = makeService(combinedCatalog, combinedProduct);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-1",
      marAction: "administered",
      administeredQuantity: 1,
      witnessUserId: "witness-2",
      highAlertVerifierUserId: "rn-3",
      lasaAcknowledged: true,
      lasaMedicationSelectionConfirmed: true,
    });
    expect(verificationCreate).toHaveBeenCalledTimes(3);
    const types = verificationCreate.mock.calls.map(
      (c) => (c[0] as { data: { verificationType: string } }).data.verificationType
    );
    expect(types).toContain(MedicationVerificationType.WITNESS);
    expect(types).toContain(MedicationVerificationType.INDEPENDENT_DOUBLE_CHECK);
    expect(types).toContain(MedicationVerificationType.LASA_ACKNOWLEDGMENT);
  });
});
