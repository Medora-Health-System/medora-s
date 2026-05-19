import { CatalogCanonicalReadService } from "./catalog-canonical-read.service";

describe("CatalogCanonicalReadService", () => {
  const prisma = {
    medicationProduct: { findMany: jest.fn() },
    medicationSearchAlias: { findMany: jest.fn() },
  };

  const service = new CatalogCanonicalReadService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns metadata only for legacyCatalogMedicationId matches", async () => {
    prisma.medicationProduct.findMany.mockResolvedValue([
      {
        legacyCatalogMedicationId: "cat-1",
        administrationType: "INFUSION",
        infusionProfile: { id: "inf" },
        administrationProfile: { requiresInfusionSession: true },
        concept: {
          isActive: true,
          safetyProfile: { isControlled: true, isHighAlert: true },
          searchAliases: [{ alias: "Epi" }],
        },
        searchAliases: [{ alias: "Adrenaline" }],
        packages: [
          {
            ndc11: "12345678901",
            billingProfiles: [{ requiresManualReview: true }],
            facilityFormularyItems: [
              { isEDFormulary: true, favoriteTier: "RSI", isOnFormulary: true },
            ],
          },
        ],
      },
    ]);

    const map = await service.getReadMetadataByCatalogIds("fac-1", ["cat-1", "cat-missing"]);

    expect(map.size).toBe(1);
    const meta = map.get("cat-1");
    expect(meta?.matchConfidence).toBe("LEGACY_LINK");
    expect(meta?.badges.infusion).toBe(true);
    expect(meta?.badges.controlled).toBe(true);
    expect(meta?.badges.rsi).toBe(true);
    expect(meta?.badges.ndcPresent).toBe(true);
    expect(meta?.canonicalAliases).toEqual(expect.arrayContaining(["Epi", "Adrenaline"]));
  });

  it("findCatalogIdsViaCanonicalAlias returns legacy-linked ids only", async () => {
    prisma.medicationSearchAlias.findMany.mockResolvedValue([
      {
        productId: "p1",
        conceptId: null,
        product: { legacyCatalogMedicationId: "cat-a", isActive: true },
      },
      {
        productId: null,
        conceptId: "c1",
        product: null,
      },
    ]);
    prisma.medicationProduct.findMany.mockResolvedValue([
      { conceptId: "c1", legacyCatalogMedicationId: "cat-b" },
    ]);

    const ids = await service.findCatalogIdsViaCanonicalAlias("adrenal");
    expect(ids).toEqual(expect.arrayContaining(["cat-a", "cat-b"]));
  });

  it("excludes ambiguous concept alias when multiple legacy products", async () => {
    prisma.medicationSearchAlias.findMany.mockResolvedValue([
      { productId: null, conceptId: "c1", product: null },
    ]);
    prisma.medicationProduct.findMany.mockResolvedValue([
      { conceptId: "c1", legacyCatalogMedicationId: "cat-1" },
      { conceptId: "c1", legacyCatalogMedicationId: "cat-2" },
    ]);

    const ids = await service.findCatalogIdsViaCanonicalAlias("foo");
    expect(ids).toEqual([]);
  });
});
