import { MedicationMarAction } from "@prisma/client";
import { MedicationAdministrationService } from "./medication-administration.service";

jest.mock("../billing/billing-capture.append.util", () => ({
  appendBillingCaptureCandidate: jest.fn().mockRejectedValue(new Error("billing capture failed")),
}));

import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";

function ondansetronCatalog() {
  return {
    id: "cat-ondansetron",
    code: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
    name: "Ondansetron",
    displayNameEn: "Ondansetron",
    displayNameFr: "Ondansétron",
    genericName: "Ondansetron",
    strength: "4 mg/2 mL",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mg",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
  };
}

describe("MedicationAdministrationService Ondansetron MAR (M1.7B.7)", () => {
  let marCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    marCreate = jest.fn().mockResolvedValue({
      id: "mar-ondansetron",
      administeredAt: new Date(),
      medicationLabelSnapshot: "Ondansetron 4 mg/2 mL",
      orderItemId: "oi-ondansetron",
      marAction: MedicationMarAction.administered,
      ndc11Snapshot: "55150011801",
      ndcDisplaySnapshot: "55150-0118-01",
      doseValue: null,
      doseUnit: "mg",
      administeredQuantity: 1,
      billingQuantity: 1,
      quantityUnit: "mg",
      route: "IV",
      administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
    });
  });

  function makeService(
    overrides: {
      encounter?: Record<string, unknown>;
      packageNdc?: { ndc11: string; ndcDisplay: string } | null;
      orderItem?: Record<string, unknown>;
    } = {}
  ) {
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
      ...overrides.encounter,
    };
    const orderItem = {
      id: "oi-ondansetron",
      orderId: "ord-1",
      catalogItemType: "MEDICATION",
      catalogItemId: "cat-ondansetron",
      medicationProductId: null,
      medicationPackageId: "pkg-ondansetron",
      status: "PENDING",
      lifecycleState: "ORDERED",
      quantity: 1,
      route: "IV",
      strength: "4 mg/2 mL",
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
      ...overrides.orderItem,
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
        findMany: jest.fn().mockResolvedValue([ondansetronCatalog()]),
        findUnique: jest.fn().mockResolvedValue(ondansetronCatalog()),
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      medicationPackage: {
        findFirst: jest.fn().mockResolvedValue(
          overrides.packageNdc === undefined
            ? {
                ndc11: "55150011801",
                ndcDisplay: "55150-0118-01",
              }
            : overrides.packageNdc
        ),
      },
      pharmacyVerification: { findFirst: jest.fn().mockResolvedValue(null) },
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
          orderItem: { update: jest.fn().mockResolvedValue(orderItem) },
          orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        };
        return fn(tx);
      }),
    };

    return new MedicationAdministrationService(prisma as never, { log: jest.fn() } as never);
  }

  it("creates Ondansetron MAR without visible NDC in DTO and enriches NDC from package", async () => {
    const service = makeService();
    await service.create("enc-1", "fac-1", "nurse-1", {
      orderItemId: "oi-ondansetron",
      marAction: "administered",
      administeredQuantity: 1,
      route: "IV",
      doseUnit: "mg",
    });

    expect(marCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ndc11Snapshot: "55150011801",
          ndcDisplaySnapshot: "55150-0118-01",
        }),
      })
    );
  });

  it("defaults administered quantity from ordered quantity when DTO omits it (M1.7B.7E)", async () => {
    const service = makeService();
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        route: "IVP",
        doseUnit: "mg",
      })
    ).resolves.toBeDefined();

    expect(marCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          administeredQuantity: 1,
          billingQuantity: 1,
        }),
      })
    );
  });

  it("rejects administered MAR when quantity missing and order has no quantity (M1.7B.7E)", async () => {
    const service = makeService({ orderItem: { quantity: null } });

    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        route: "IV",
      })
    ).rejects.toThrow(/quantité administrée/i);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("does not fail MAR when billing capture append throws", async () => {
    const service = makeService();
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
      })
    ).resolves.toBeDefined();
    expect(appendBillingCaptureCandidate).toHaveBeenCalled();
    expect(marCreate).toHaveBeenCalled();
  });

  it("succeeds when malformed NDC is submitted and enriches from package (M1.7B.7D Case C)", async () => {
    const service = makeService();
    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
        ndc: "J2405",
      })
    ).resolves.toBeDefined();

    expect(marCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ndc11Snapshot: "55150011801",
          ndcDisplaySnapshot: "55150-0118-01",
        }),
      })
    );
  });

  it("succeeds with null NDC snapshot when package has no NDC (M1.7B.7D Case B)", async () => {
    marCreate.mockResolvedValue({
      id: "mar-ondansetron-null-ndc",
      administeredAt: new Date(),
      medicationLabelSnapshot: "Ondansetron 4 mg/2 mL",
      orderItemId: "oi-ondansetron",
      marAction: MedicationMarAction.administered,
      ndc11Snapshot: null,
      ndcDisplaySnapshot: null,
      doseValue: null,
      doseUnit: "mg",
      administeredQuantity: 1,
      billingQuantity: 1,
      quantityUnit: "mg",
      route: "IV",
      administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
    });

    const service = makeService({ packageNdc: null });

    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
      })
    ).resolves.toBeDefined();

    expect(marCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ndc11Snapshot: null,
          ndcDisplaySnapshot: null,
        }),
      })
    );
  });

  it("blocks administration when allergies documented without acknowledgement", async () => {
    const service = makeService({
      encounter: { vitals: { allergyNote: "Pénicilline" } },
    });

    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
      })
    ).rejects.toThrow(/allergies/i);
    expect(marCreate).not.toHaveBeenCalled();
  });

  it("allows administration when allergies documented and acknowledgement provided", async () => {
    const service = makeService({
      encounter: { vitals: { allergyNote: "Pénicilline" } },
    });

    await expect(
      service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ondansetron",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
        safetyAcknowledgedMedicationAllergies: true,
      })
    ).resolves.toBeDefined();
    expect(marCreate).toHaveBeenCalled();
  });
});
