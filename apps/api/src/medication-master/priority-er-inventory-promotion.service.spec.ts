import { ConflictException } from "@nestjs/common";
import { PriorityErInventoryPromotionService } from "./priority-er-inventory-promotion.service";
import { medicationFormularyImportStagingPromotionFixture } from "./medication-formulary-import-staging.types";
import { parsePriorityErSourceTrace } from "./priority-er-inventory-staging-source.util";

const stagingRow = medicationFormularyImportStagingPromotionFixture({
  id: "st-pri-1",
  batchId: "pri-er-inv-test",
  sourceRowId: "PRI_ER_Inventory_1",
  sourceInventorySku: null,
  sourceInventoryDescription: "Acetaminophen 100mg/100ml Injection",
  rawJson: {
    medication: "Acetaminophen",
    dose: "100mg/100ml",
    form: "Injection",
    exact_source_text: "Acetaminophen 100mg/100ml Injection",
    __preservation: { phase: "19E.1", rule: "priority_er_inventory_exact_source" },
    __sourceTrace: {
      exactSourceText: "Acetaminophen 100mg/100ml Injection",
      sourceNameExact: "Acetaminophen",
      sourceStrengthExact: "100mg/100ml",
      sourceRouteExact: "Injection",
      sourcePackageExact: "Injection",
      sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
    },
    __reconciliation: {
      category: "NEW_CANDIDATE",
      duplicateWarnings: [],
      matchedConceptIds: [],
      matchedProductIds: [],
      matchedCatalogMedicationIds: [],
    },
  },
  importedByUserId: "user-1",
});

function makePrismaMock() {
  const tx = {
    medicationConcept: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "concept-1",
          code: data.code,
          genericName: data.genericName,
          displayName: data.displayName,
          isActive: data.isActive,
        })
      ),
    },
    medicationProduct: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "product-1",
          code: data.code,
          conceptId: data.conceptId,
          strengthDisplay: data.strengthDisplay,
          dosageForm: data.dosageForm,
          isActive: data.isActive,
          governanceStatus: data.governanceStatus,
          baselineAvailable: data.baselineAvailable,
          baselineSource: data.baselineSource,
          baselineSourceRowId: data.baselineSourceRowId,
        })
      ),
      update: jest.fn().mockResolvedValue({ id: "product-1" }),
    },
    medicationPackage: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "package-1",
          code: data.code,
          isActive: data.isActive,
        })
      ),
    },
    medicationConcentration: { create: jest.fn().mockResolvedValue({ id: "conc-1" }) },
    medicationRoute: {
      upsert: jest.fn().mockResolvedValue({ id: "route-1", code: "OTHER" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "route-1", code: "OTHER" }),
    },
    medicationSafetyProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "safety-1" }),
    },
    medicationAdministrationProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "admin-1" }),
    },
    medicationBillingProfile: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    facilityFormularyItem: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "ffi-1",
          isOnFormulary: data.isOnFormulary,
          isEDFormulary: data.isEDFormulary,
        })
      ),
    },
    medicationSearchAlias: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "alias-1" }),
    },
    medicationFormularyImportStaging: {
      update: jest.fn().mockResolvedValue({}),
    },
  };

  return {
    medicationFormularyImportStaging: {
      findUnique: jest.fn().mockResolvedValue(stagingRow),
      update: jest.fn().mockResolvedValue({}),
    },
    medicationConcept: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    medicationProduct: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    medicationPackage: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    medicationSearchAlias: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    tx,
  };
}

describe("PriorityErInventoryPromotionService", () => {
  it("preserves exact source text on canonical concept and product", async () => {
    const prisma = makePrismaMock();
    const audit = { log: jest.fn() };
    const service = new PriorityErInventoryPromotionService(prisma as never, audit as never);

    const out = await service.promoteStagingRow("st-pri-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("promoted");
    if (out.status !== "promoted") return;

    expect(out.result.sourceNameExact).toBe("Acetaminophen");
    expect(out.result.sourceStrengthExact).toBe("100mg/100ml");
    expect(out.result.sourceRouteExact).toBe("Injection");
    expect(out.result.runtimeOrderable).toBe(false);

    const conceptCreate = prisma.tx.medicationConcept.create.mock.calls[0][0];
    expect(conceptCreate.data.genericName).toBe("Acetaminophen");
    expect(conceptCreate.data.displayName).toBe("Acetaminophen");
    expect(conceptCreate.data.isActive).toBe(false);

    const productCreate = prisma.tx.medicationProduct.create.mock.calls[0][0];
    expect(productCreate.data.strengthDisplay).toBe("100mg/100ml");
    expect(productCreate.data.dosageForm).toBe("Injection");
    expect(productCreate.data.isActive).toBe(false);
    expect(productCreate.data.governanceStatus).toBe("REVIEW_REQUIRED");
  });

  it("creates inactive facility formulary item (not runtime-enabled)", async () => {
    const prisma = makePrismaMock();
    const service = new PriorityErInventoryPromotionService(prisma as never, { log: jest.fn() } as never);
    await service.promoteStagingRow("st-pri-1", {}, "user-1", "fac-1");

    const ffiCreate = prisma.tx.facilityFormularyItem.create.mock.calls[0][0];
    expect(ffiCreate.data.isOnFormulary).toBe(false);
    expect(ffiCreate.data.isEDFormulary).toBe(false);
  });

  it("blocks promotion when POSSIBLE_DUPLICATE unresolved", async () => {
    const prisma = makePrismaMock();
    prisma.medicationFormularyImportStaging.findUnique.mockResolvedValue({
      ...stagingRow,
      reconciliationStatus: "POSSIBLE_DUPLICATE",
      reviewFlags: ["POSSIBLE_DUPLICATE"],
    });
    const service = new PriorityErInventoryPromotionService(prisma as never, { log: jest.fn() } as never);
    const out = await service.promoteStagingRow("st-pri-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("blocked");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents duplicate canonical product when same exact source exists", async () => {
    const prisma = makePrismaMock();
    prisma.medicationConcept.findFirst.mockResolvedValue({
      id: "existing-concept",
      code: "EXISTING",
      genericName: "Acetaminophen",
    });
    prisma.medicationProduct.findMany = jest.fn().mockResolvedValue([
      {
        id: "existing-product",
        strengthDisplay: "100mg/100ml",
        dosageForm: "Injection",
      },
    ]);
    const service = new PriorityErInventoryPromotionService(prisma as never, { log: jest.fn() } as never);

    await expect(service.promoteStagingRow("st-pri-1", {}, "user-1", "fac-1")).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("does not translate medication names in source trace", () => {
    const trace = parsePriorityErSourceTrace(stagingRow.rawJson);
    expect(trace.sourceNameExact).toBe("Acetaminophen");
    expect(trace.sourceNameExact).not.toMatch(/Acétaminophène|Paracetamol/i);
  });

  it("global baseline promote hydrates existing facility promotion without re-create (19J.3E)", async () => {
    const prisma = makePrismaMock();
    prisma.medicationFormularyImportStaging.findUnique.mockResolvedValue({
      ...stagingRow,
      promotionResultJson: {
        stagingRowId: "st-pri-1",
        sourceRowId: "PRI_ER_Inventory_1",
        productId: "product-1",
        packageId: "package-1",
        conceptId: "concept-1",
        runtimeOrderable: false,
      },
    });
    const service = new PriorityErInventoryPromotionService(prisma as never, { log: jest.fn() } as never);
    const out = await service.promoteStagingRowAsGlobalBaseline("st-pri-1", {}, "user-1");
    expect(out.status).toBe("promoted");
    if (out.status !== "promoted") return;
    expect(out.result.globalBaseline).toBe(true);
    expect(prisma.tx.medicationProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product-1" },
        data: expect.objectContaining({
          baselineAvailable: true,
          baselineSource: "PRIORITY_ER_INVENTORY",
          baselineSourceRowId: "PRI_ER_Inventory_1",
          isActive: false,
        }),
      })
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.tx.medicationConcept.create).not.toHaveBeenCalled();
    expect(prisma.medicationFormularyImportStaging.update).toHaveBeenCalled();
  });

  it("staging facility promote hydrates global baseline flags (19J.3E)", async () => {
    const prisma = makePrismaMock();
    const service = new PriorityErInventoryPromotionService(prisma as never, { log: jest.fn() } as never);
    const out = await service.promoteStagingRow("st-pri-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("promoted");
    if (out.status !== "promoted") return;

    expect(out.result.globalBaseline).toBe(true);
    expect(out.result.baselineSource).toBe("PRIORITY_ER_INVENTORY");

    const productCreate = prisma.tx.medicationProduct.create.mock.calls[0][0];
    expect(productCreate.data.baselineAvailable).toBe(true);
    expect(productCreate.data.baselineSource).toBe("PRIORITY_ER_INVENTORY");
    expect(productCreate.data.baselineSourceRowId).toBe("PRI_ER_Inventory_1");
    expect(productCreate.data.isActive).toBe(false);

    expect(prisma.tx.medicationProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baselineAvailable: true,
          baselineSource: "PRIORITY_ER_INVENTORY",
          baselineSourceRowId: "PRI_ER_Inventory_1",
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
        }),
      })
    );
  });

  it("manual single-row promotion stays non-orderable with inactive package (19E.3)", async () => {
    const prisma = makePrismaMock();
    const service = new PriorityErInventoryPromotionService(prisma as never, { log: jest.fn() } as never);
    const out = await service.promoteStagingRow("st-pri-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("promoted");
    if (out.status !== "promoted") return;

    expect(out.result.runtimeOrderable).toBe(false);
    const packageCreate = prisma.tx.medicationPackage.create.mock.calls[0][0];
    expect(packageCreate.data.isActive).toBe(false);
    expect(prisma.tx.medicationBillingProfile.create).not.toHaveBeenCalled();
  });
});
