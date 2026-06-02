import type { PrismaClient } from "@prisma/client";
import { HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST } from "@medora/shared";
import { seedHighAlertMedicationGovernance } from "../../prisma/helpers/seed-high-alert-medication-governance";

describe("high-alert medication governance seed (M1.3D)", () => {
  const applyHeparin = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.find(
    (e) => e.catalogCode === "HEPARIN_5000UI_ML_INJECTABLE"
  )!;

  it("is idempotent and does not create or delete catalog medications", async () => {
    const catalogCreate = jest.fn();
    const catalogDelete = jest.fn();
    const catalogUpdate = jest.fn().mockResolvedValue({});
    const orderUpdate = jest.fn();

    const heparinRow = {
      id: "cat-heparin-1",
      code: applyHeparin.catalogCode!,
      genericName: "Heparin",
      strength: "5,000 UI/mL",
      dosageForm: "injectable",
      displayNameEn: "Heparin",
      requiresWitness: false,
      requiresDoubleSign: false,
    };

    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue(heparinRow),
        findMany: jest.fn().mockResolvedValue([]),
        create: catalogCreate,
        delete: catalogDelete,
        update: catalogUpdate,
      },
      medicationProduct: { findMany: jest.fn().mockResolvedValue([]) },
      medicationSafetyProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      orderItem: { update: orderUpdate },
    } as unknown as PrismaClient;

    const first = await seedHighAlertMedicationGovernance(prisma);
    expect(first.catalogWitnessFlagsUpdated).toBeGreaterThanOrEqual(1);
    expect(catalogCreate).not.toHaveBeenCalled();
    expect(catalogDelete).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();

    heparinRow.requiresDoubleSign = true;

    const second = await seedHighAlertMedicationGovernance(prisma);
    expect(second.catalogWitnessFlagsAlreadyCompliant).toBeGreaterThanOrEqual(1);
    expect(second.catalogWitnessFlagsUpdated).toBe(0);
  });

  it("skips MANUAL_REVIEW and MISSING_CATALOG entries", async () => {
    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        create: jest.fn(),
      },
      medicationProduct: { findMany: jest.fn().mockResolvedValue([]) },
      medicationSafetyProfile: { findUnique: jest.fn(), update: jest.fn() },
    } as unknown as PrismaClient;

    const result = await seedHighAlertMedicationGovernance(prisma);
    expect(result.manualReviewSkipped).toBe(2);
    expect(result.missingCatalogSkipped).toBe(8);
    expect(prisma.catalogMedication.update).not.toHaveBeenCalled();
  });

  it("updates existing safety profile when linked product exists", async () => {
    const catalogUpdate = jest.fn().mockResolvedValue({});
    const safetyUpdate = jest.fn().mockResolvedValue({});

    const heparinRow = {
      id: "cat-1",
      code: applyHeparin.catalogCode!,
      genericName: "Heparin",
      strength: "5,000 UI/mL",
      dosageForm: "injectable",
      displayNameEn: "Heparin",
      requiresWitness: false,
      requiresDoubleSign: false,
    };

    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue(heparinRow),
        findMany: jest.fn().mockResolvedValue([]),
        update: catalogUpdate,
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([{ conceptId: "concept-1" }]),
      },
      medicationSafetyProfile: {
        findUnique: jest.fn().mockResolvedValue({
          conceptId: "concept-1",
          isHighAlert: false,
          highAlertCategories: null,
          requiresWitness: false,
          requiresDoubleSign: false,
          isControlled: false,
          controlledSchedule: null,
        }),
        update: safetyUpdate,
        create: jest.fn(),
      },
    } as unknown as PrismaClient;

    await seedHighAlertMedicationGovernance(prisma);

    expect(safetyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conceptId: "concept-1" },
        data: expect.objectContaining({
          isHighAlert: true,
          highAlertCategories: expect.objectContaining({
            highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
          }),
        }),
      })
    );
    expect(prisma.medicationSafetyProfile.create).not.toHaveBeenCalled();
  });
});
