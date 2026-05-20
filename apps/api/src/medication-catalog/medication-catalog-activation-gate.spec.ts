import { MedicationCatalogService } from "./medication-catalog.service";

describe("MedicationCatalogService activation gate (19G)", () => {
  const prisma = {
    catalogMedication: { findMany: jest.fn() },
    medicationAlias: { findMany: jest.fn() },
    inventoryItem: { findMany: jest.fn() },
  };
  const canonicalRead = {
    findCatalogIdsViaCanonicalAlias: jest.fn().mockResolvedValue([]),
    getReadMetadataByCatalogIds: jest.fn().mockResolvedValue(new Map()),
  };
  const activationGovernance = {
    filterProviderSearchCatalogIds: jest.fn(),
  };

  const service = new MedicationCatalogService(
    prisma as never,
    canonicalRead as never,
    activationGovernance as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("excludes canonical-linked catalog rows failing order-search gate", async () => {
    prisma.catalogMedication.findMany.mockResolvedValue([
      {
        id: "cat-inactive",
        code: "A",
        name: "Acetaminophen",
        genericName: null,
        displayNameEn: null,
        displayNameFr: null,
        strength: "500mg",
        searchText: "acetaminophen",
        isEssential: false,
        sortPriority: 0,
        isActive: true,
      },
      {
        id: "cat-enabled",
        code: "B",
        name: "Ibuprofen",
        genericName: null,
        displayNameEn: null,
        displayNameFr: null,
        strength: "200mg",
        searchText: "ibuprofen",
        isEssential: false,
        sortPriority: 0,
        isActive: true,
      },
    ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(
      new Set(["cat-enabled"])
    );

    const res = await service.search("fac-1", { q: "fe", limit: 20 });
    expect(res.items.map((i) => i.id)).toEqual(["cat-enabled"]);
  });
});
