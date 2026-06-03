import { BadRequestException } from "@nestjs/common";
import {
  AuditAction,
  MedicationMarAction,
  PharmacyVerificationStatus,
} from "@prisma/client";
import { MedicationAdministrationService } from "./medication-administration.service";

function hydroCatalog() {
  return {
    id: "cat-hydro",
    code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    name: "Hydromorphone",
    displayNameEn: "Hydromorphone",
    displayNameFr: "Hydromorphone",
    genericName: "Hydromorphone",
    strength: "2 mg/mL",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mL",
    isControlled: true,
    controlledSchedule: "II",
    requiresWitness: false,
    requiresDoubleSign: true,
  };
}

function hydroProductProfile() {
  return {
    legacyCatalogMedicationId: "cat-hydro",
    concept: {
      safetyProfile: {
        isHighAlert: true,
        highAlertCategories: {
          highAlertClass: "HIGH_ALERT_OPIOID",
          safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
          lasa: {
            lasaGroupCode: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
            lasaGroupLabel: "Morphine / hydromorphone",
            lasaSeverity: "LASA_HIGH",
          },
        },
        lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
        isControlled: true,
        controlledSchedule: "II",
        requiresWitness: false,
        requiresDoubleSign: true,
      },
    },
    administrationProfile: { allowsWasteDocumentation: true },
  };
}

describe("MedicationAdministrationService Hydromorphone MAR (M1.7A.9)", () => {
  let auditLog: jest.Mock;
  let marCreate: jest.Mock;
  let overrideCreate: jest.Mock;

  beforeEach(() => {
    auditLog = jest.fn().mockResolvedValue(undefined);
    overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-1" });
    marCreate = jest.fn().mockResolvedValue({
      id: "mar-hydro",
      administeredAt: new Date(),
      medicationLabelSnapshot: "Hydromorphone 2 mg/mL",
      orderItemId: "oi-hydro",
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

  function makeService(pharmacyStatus: PharmacyVerificationStatus | null) {
    const encounter = {
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
    const orderItem = {
      id: "oi-hydro",
      orderId: "ord-1",
      catalogItemType: "MEDICATION",
      catalogItemId: "cat-hydro",
      medicationProductId: null,
      status: "PENDING",
      lifecycleState: "ORDERED",
      quantity: 1,
      route: "IV",
      strength: "2 mg/mL",
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

    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
        update: jest.fn().mockResolvedValue(orderItem),
      },
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([hydroCatalog()]),
        findUnique: jest.fn().mockResolvedValue(hydroCatalog()),
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(hydroProductProfile()),
      },
      pharmacyVerification: {
        findFirst: jest.fn().mockResolvedValue(
          pharmacyStatus ? { verificationStatus: pharmacyStatus } : null
        ),
      },
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { administeredQuantity: 0 }, _count: { _all: 0 } }),
        create: marCreate,
      },
      medicationAdministrationOverride: { create: overrideCreate },
      medicationVerification: { create: jest.fn().mockResolvedValue({ id: "ver-1" }) },
      medicationWaste: { create: jest.fn().mockResolvedValue({ id: "w-1" }) },
      orderEvent: { create: jest.fn().mockResolvedValue({ id: "ev-1" }) },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          medicationAdministrationVerification: { create: jest.fn() },
          medicationWasteDocumentation: { create: jest.fn() },
          medicationAdministrationOverride: { create: overrideCreate },
          orderItem: { update: jest.fn().mockResolvedValue(orderItem) },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        };
        return fn(tx);
      }),
    };

    const service = new MedicationAdministrationService(prisma as never, { log: auditLog } as never);
    return { service };
  }

  it("creates Hydromorphone MAR without pharmacy verification or double-check (M1.7A.9)", async () => {
    const { service } = makeService(PharmacyVerificationStatus.PENDING);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-hydro",
      marAction: "administered",
      administeredQuantity: 1,
      route: "IV",
      lasaAcknowledged: true,
      lasaMedicationSelectionConfirmed: true,
    });

    expect(marCreate).toHaveBeenCalled();
    expect(overrideCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalledWith(
      AuditAction.PHARMACY_VERIFICATION_OVERRIDE,
      expect.anything(),
      expect.anything()
    );
  });

  it("creates Hydromorphone MAR when pharmacy still pending — no override required", async () => {
    const { service } = makeService(PharmacyVerificationStatus.PENDING);
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-hydro",
      marAction: "administered",
      administeredQuantity: 1,
      lasaAcknowledged: true,
      lasaMedicationSelectionConfirmed: true,
    });
    expect(marCreate).toHaveBeenCalled();
  });

  it("rejects Hydromorphone MAR without LASA acknowledgement (M1.7B.2)", async () => {
    const { service } = makeService(PharmacyVerificationStatus.PENDING);
    let caught: BadRequestException | null = null;
    try {
      await service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-hydro",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
      });
    } catch (err) {
      caught = err as BadRequestException;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect(caught!.getResponse()).toMatchObject({
      code: "LASA_ACKNOWLEDGEMENT_REQUIRED",
    });
    expect(marCreate).not.toHaveBeenCalled();
  });
});
