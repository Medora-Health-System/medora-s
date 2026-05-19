import { MedicationCatalogBackfillAnalysisService } from "./medication-catalog-backfill-analysis.service";

describe("MedicationCatalogBackfillAnalysisService", () => {
  it("returns read-only analysis without master table writes", async () => {
    const prisma = {
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "cm-1",
            code: "NOREPINEPHRINE_4MG_4ML_IV",
            genericName: "Norepinephrine",
            strength: "4 mg/4 mL",
            dosageForm: "injectable",
            route: "intraveineuse",
            ndc11: null,
            isActive: true,
          },
        ]),
      },
      medicationConcept: { create: jest.fn() },
      medicationProduct: { create: jest.fn() },
      medicationPackage: { create: jest.fn() },
    };

    const service = new MedicationCatalogBackfillAnalysisService(prisma as never);
    const result = await service.analyzeCatalogBackfill();

    expect(result.dryRun).toBe(true);
    expect(result.summary.totalCatalogRows).toBe(1);
    expect(result.rows[0]?.category).toBe("NDC_PACKAGE_REVIEW");
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
    expect(prisma.medicationProduct.create).not.toHaveBeenCalled();
    expect(prisma.medicationPackage.create).not.toHaveBeenCalled();
  });
});
