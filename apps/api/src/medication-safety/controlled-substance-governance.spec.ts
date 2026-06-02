import type { PrismaClient } from "@prisma/client";
import { CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST } from "@medora/shared";
import { seedControlledSubstanceGovernance } from "../../prisma/helpers/seed-controlled-substance-governance";

describe("controlled substance governance seed (M1.3C)", () => {
  const applyMorphine = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.find(
    (e) => e.genericName === "Morphine" && e.governanceStatus === "APPLY"
  )!;

  it("is idempotent and does not create or delete catalog medications", async () => {
    const catalogCreate = jest.fn();
    const catalogDelete = jest.fn();
    const catalogUpdate = jest.fn().mockResolvedValue({});
    const orderUpdate = jest.fn();

    const morphineRow: {
      id: string;
      code: string;
      genericName: string;
      strength: string;
      dosageForm: string;
      displayNameEn: string;
      isControlled: boolean;
      controlledSchedule: string | null;
      requiresWitness: boolean;
      requiresDoubleSign: boolean;
    } = {
      id: "cat-morphine-1",
      code: "MORPHINE_TEST",
      genericName: "Morphine",
      strength: "10 mg/mL",
      dosageForm: "injectable",
      displayNameEn: "Morphine",
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
    };

    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([morphineRow]),
        create: catalogCreate,
        delete: catalogDelete,
        update: catalogUpdate,
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      medicationSafetyProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      orderItem: { update: orderUpdate },
    } as unknown as PrismaClient;

    const first = await seedControlledSubstanceGovernance(prisma);
    expect(first.catalogUpdated).toBeGreaterThanOrEqual(1);
    expect(catalogCreate).not.toHaveBeenCalled();
    expect(catalogDelete).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();

    morphineRow.isControlled = true;
    morphineRow.controlledSchedule = "II";
    morphineRow.requiresDoubleSign = true;

    const second = await seedControlledSubstanceGovernance(prisma);
    expect(second.catalogAlreadyCompliant).toBeGreaterThanOrEqual(1);
    expect(second.catalogUpdated).toBe(0);
  });

  it("skips MANUAL_REVIEW and MISSING_CATALOG entries", async () => {
    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        create: jest.fn(),
      },
      medicationProduct: { findMany: jest.fn() },
      medicationSafetyProfile: { findUnique: jest.fn(), update: jest.fn() },
    } as unknown as PrismaClient;

    const result = await seedControlledSubstanceGovernance(prisma);
    expect(result.manualReviewSkipped).toBe(2);
    expect(result.missingCatalogSkipped).toBe(5);
    expect(prisma.catalogMedication.update).not.toHaveBeenCalled();
  });

  it("updates existing safety profile when linked product exists", async () => {
    const catalogUpdate = jest.fn().mockResolvedValue({});
    const safetyUpdate = jest.fn().mockResolvedValue({});

    const morphineRow = {
      id: "cat-1",
      code: "MORPHINE_10MG_ML",
      genericName: "Morphine",
      strength: "10 mg/mL",
      dosageForm: "injectable",
      displayNameEn: "Morphine",
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
    };

    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([morphineRow]),
        update: catalogUpdate,
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([{ conceptId: "concept-1" }]),
      },
      medicationSafetyProfile: {
        findUnique: jest.fn().mockResolvedValue({
          conceptId: "concept-1",
          isControlled: false,
          controlledSchedule: null,
          requiresWitness: false,
          requiresDoubleSign: false,
        }),
        update: safetyUpdate,
        create: jest.fn(),
      },
    } as unknown as PrismaClient;

    const result = await seedControlledSubstanceGovernance(prisma);
    expect(result.safetyProfileUpdated).toBe(1);
    expect(prisma.medicationSafetyProfile.create).not.toHaveBeenCalled();
  });
});
