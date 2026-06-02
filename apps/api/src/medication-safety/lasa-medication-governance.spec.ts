import type { PrismaClient } from "@prisma/client";
import { LASA_MEDICATION_GOVERNANCE_MANIFEST } from "@medora/shared";
import { seedLasaMedicationGovernance } from "../../prisma/helpers/seed-lasa-medication-governance";

describe("LASA medication governance seed (M1.3E)", () => {
  const applyHydromorphone = LASA_MEDICATION_GOVERNANCE_MANIFEST.find(
    (e) => e.catalogCode === "HYDROMORPHONE_2MG_ML_INJECTABLE" && e.governanceStatus === "APPLY"
  )!;

  it("is idempotent and does not create or delete catalog medications", async () => {
    const catalogCreate = jest.fn();
    const catalogDelete = jest.fn();
    const safetyUpdate = jest.fn().mockResolvedValue({});

    const hydroRow = {
      id: "cat-hydro-1",
      code: applyHydromorphone.catalogCode!,
      genericName: "Hydromorphone",
      strength: "2 mg/mL",
      dosageForm: "injectable",
      displayNameEn: "Hydromorphone",
    };

    const prisma = {
      catalogMedication: {
        findUnique: jest.fn(({ where }: { where: { code: string } }) =>
          Promise.resolve(where.code === applyHydromorphone.catalogCode ? hydroRow : null)
        ),
        findMany: jest.fn().mockResolvedValue([]),
        create: catalogCreate,
        delete: catalogDelete,
        update: jest.fn(),
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([{ conceptId: "concept-1" }]),
      },
      medicationSafetyProfile: {
        findUnique: jest.fn().mockResolvedValue({
          conceptId: "concept-1",
          lasaGroupId: null,
          highAlertCategories: null,
        }),
        update: safetyUpdate,
        create: jest.fn(),
      },
      orderItem: { update: jest.fn() },
    } as unknown as PrismaClient;

    const first = await seedLasaMedicationGovernance(prisma);
    expect(first.safetyProfileUpdated).toBeGreaterThanOrEqual(1);
    expect(catalogCreate).not.toHaveBeenCalled();
    expect(catalogDelete).not.toHaveBeenCalled();

    const compliantProfile = {
      conceptId: "concept-1",
      lasaGroupId: applyHydromorphone.lasaGroupCode,
      highAlertCategories: {
        lasa: {
          lasaGroupCode: applyHydromorphone.lasaGroupCode,
          lasaGroupLabel: applyHydromorphone.lasaGroupLabel,
          lasaSeverity: applyHydromorphone.lasaSeverity,
          sourcePhase: applyHydromorphone.sourcePhase,
        },
      },
    };

    const prismaCompliant = {
      ...prisma,
      medicationSafetyProfile: {
        findUnique: jest.fn().mockResolvedValue(compliantProfile),
        update: safetyUpdate,
        create: jest.fn(),
      },
    } as unknown as PrismaClient;

    const second = await seedLasaMedicationGovernance(prismaCompliant);
    expect(second.safetyProfileAlreadyCompliant).toBeGreaterThanOrEqual(1);
    expect(second.safetyProfileUpdated).toBe(0);
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

    const result = await seedLasaMedicationGovernance(prisma);
    expect(result.manualReviewSkipped).toBe(5);
    expect(result.missingCatalogSkipped).toBe(4);
    expect(prisma.medicationSafetyProfile.update).not.toHaveBeenCalled();
  });

  it("does not create safety profile when absent", async () => {
    const prisma = {
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({
          id: "cat-1",
          code: applyHydromorphone.catalogCode!,
          genericName: "Hydromorphone",
          strength: "2 mg/mL",
          dosageForm: "injectable",
          displayNameEn: "Hydromorphone",
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      medicationProduct: { findMany: jest.fn().mockResolvedValue([{ conceptId: "c1" }]) },
      medicationSafetyProfile: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as PrismaClient;

    const result = await seedLasaMedicationGovernance(prisma);
    expect(result.safetyProfileSkippedNoProfile).toBeGreaterThanOrEqual(1);
    expect(prisma.medicationSafetyProfile.create).not.toHaveBeenCalled();
  });
});
