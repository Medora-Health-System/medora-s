import { MedicationMasterGovernanceService } from "./medication-master-governance.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";

describe("MedicationMasterGovernanceService", () => {
  const prisma = {
    medicationConcept: { findMany: jest.fn() },
    facilityFormularyItem: { findMany: jest.fn() },
    catalogMedication: { count: jest.fn(), findMany: jest.fn() },
    medicationProduct: { findMany: jest.fn() },
    medicationPackage: { groupBy: jest.fn(), findMany: jest.fn() },
    medicationFormularyImportStaging: {
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const explorer = {
    assertFacilityScope: jest.fn(),
  } as unknown as MedicationMasterExplorerService;

  const service = new MedicationMasterGovernanceService(prisma as never, explorer);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getUnmapped excludes catalog rows with legacy link", async () => {
    prisma.medicationProduct.findMany = jest.fn().mockResolvedValue([
      { legacyCatalogMedicationId: "cat-mapped" },
    ]);
    prisma.catalogMedication.count = jest.fn().mockResolvedValue(1);
    prisma.catalogMedication.findMany = jest.fn().mockResolvedValue([
      {
        id: "cat-unmapped",
        code: "LEG-99",
        name: "Drug X",
        genericName: "Drug X",
        strength: "10 mg",
        dosageForm: "TAB",
        route: "PO",
        ndc11: null,
      },
    ]);

    const result = await service.getUnmapped({ limit: 50, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].matchConfidence).toBe("UNMAPPED");
    expect(prisma.catalogMedication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          id: { notIn: ["cat-mapped"] },
        }),
      })
    );
  });

  it("getSummary returns readOnly with readiness percentages", async () => {
    prisma.medicationConcept.findMany = jest.fn().mockResolvedValue([]);
    prisma.facilityFormularyItem.findMany = jest.fn().mockResolvedValue([]);
    prisma.catalogMedication.count = jest.fn().mockResolvedValue(10);
    prisma.medicationProduct.findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.medicationPackage.groupBy = jest.fn().mockResolvedValue([]);
    prisma.medicationFormularyImportStaging.groupBy = jest.fn().mockResolvedValue([]);
    prisma.medicationFormularyImportStaging.findFirst = jest.fn().mockResolvedValue(null);
    prisma.medicationFormularyImportStaging.count = jest.fn().mockResolvedValue(0);

    const summary = await service.getSummary("fac-1");

    expect(summary.readOnly).toBe(true);
    expect(summary.readiness.legacyCatalogMappedPercent).toBe(0);
    expect(summary.counts.legacyCatalogActive).toBe(10);
  });
});
