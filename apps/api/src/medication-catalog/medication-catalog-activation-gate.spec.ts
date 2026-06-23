import { MedicationCatalogService } from "./medication-catalog.service";
import {
  listActiveTranche1PilotCatalogCodes,
  listActiveTranche2ProviderOrderingCatalogCodes,
} from "@medora/shared";

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
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(
      new Set(["cat-enabled"])
    );

    const res = await service.search("fac-1", { q: "fe", limit: 20 });
    expect(res.items.map((i) => i.id)).toEqual(["cat-enabled"]);
  });

  it("skips order-search activation gate when purpose is documentation", async () => {
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
    ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "fe", limit: 20, purpose: "documentation" });
    expect(res.items.map((i) => i.id)).toEqual(["cat-inactive"]);
    expect(activationGovernance.filterProviderSearchCatalogIds).not.toHaveBeenCalled();
  });

  it("appends certified pilot rows only inside Tranche 1 pilot scope", async () => {
    const pilotCode = listActiveTranche1PilotCatalogCodes()[0] ?? "PILOT_LOW_RISK_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-pilot",
          code: pilotCode,
          name: "Acetaminophen",
          genericName: "Acetaminophen",
          displayNameEn: "Acetaminophen",
          displayNameFr: "Acétaminophène",
          strength: "500 mg",
          searchText: "acetaminophen acetaminophene",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("pilot-facility-1", {
      q: "acetaminophen",
      limit: 20,
      pilotScope: {
        facilityId: "pilot-facility-1",
        providerGroupId: "pilot-provider-group-1",
        roleCodes: ["PROVIDER"],
      },
    });

    expect(res.items.map((i) => i.id)).toEqual(["cat-pilot"]);
    expect(res.items[0]?.code).toBe(pilotCode);
  });

  it("appends certified Tranche 2 provider-ordering rows after activation gate", async () => {
    const tranche2Code = listActiveTranche2ProviderOrderingCatalogCodes()[0] ?? "TRANCHE2_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-tranche2",
          code: tranche2Code,
          name: "Lisinopril",
          genericName: "Lisinopril",
          displayNameEn: "Lisinopril",
          displayNameFr: "Lisinopril",
          strength: "10 mg",
          searchText: "lisinopril",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "lisinopril", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-tranche2"]);
    expect(res.items[0]?.code).toBe(tranche2Code);
  });

  it("does not append certified pilot rows outside pilot scope", async () => {
    prisma.catalogMedication.findMany.mockResolvedValue([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("other-facility", {
      q: "acetaminophen",
      limit: 20,
      pilotScope: {
        facilityId: "other-facility",
        providerGroupId: "pilot-provider-group-1",
        roleCodes: ["PROVIDER"],
      },
    });

    expect(res.items).toEqual([]);
    expect(prisma.catalogMedication.findMany).toHaveBeenCalledTimes(2);
  });
});
