import { ConflictException } from "@nestjs/common";
import { MedicationFormularyPromotionService } from "./medication-formulary-promotion.service";

const eligibleStagingRow = {
  id: "st-1",
  facilityId: "fac-1",
  batchId: "batch-1",
  sourceRowId: "PRI_001",
  sourceInventorySku: null,
  sourceInventoryDescription: "Norepinephrine",
  rawJson: {
    generic_name: "Norepinephrine",
    display_name_fr: "Norépinéphrine",
    concentration_display: "4 mg/4 mL",
    route: "IV",
    dosage_form: "injectable",
    administration_type: "PUSH",
    package_type: "VIAL",
    package_description: "4 mL vial",
    mar_workflow: "SINGLE_DOSE",
    bedside_administer: "yes",
    pharmacy_dispense: "no",
    default_fulfillment_intent: "ADMINISTER_CHART",
    formulary_category: "VASOPRESSOR",
    ed_formulary: "yes",
    wastage_billable: "no",
    controlled_substance: "no",
    high_alert: "yes",
    lasa_risk: "none",
    infusion_capable: "no",
    aliases: "levophed",
  },
  proposedConceptCode: "CONCEPT_NOREPINEPHRINE_TEST",
  proposedProductCode: "NOREPINEPHRINE_IV_TEST",
  proposedPackageCode: "NOREPINEPHRINE_IV_TEST_PKG",
  reconciliationStatus: "NEW_PRODUCT_REQUIRED",
  importGateStatus: "READY",
  overallStatus: "approved",
  reviewFlags: null,
  ndc11: null,
  hcpcsCodeSuggested: null,
  billingReviewStatus: "approved",
  safetyReviewStatus: "approved",
  infusionReviewStatus: null,
  pharmacySignoff: "Pharmacy Lead",
  nursingSignoff: null,
  edMdSignoff: null,
  complianceSignoff: null,
  validationErrors: null,
  importedAt: null,
  importedByUserId: null,
  promotionResultJson: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  const tx = {
    medicationConcept: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "concept-1" }),
    },
    medicationProduct: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "product-1", conceptId: "concept-1" }),
    },
    medicationPackage: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "package-1" }),
    },
    medicationConcentration: { create: jest.fn().mockResolvedValue({ id: "conc-1" }) },
    medicationRoute: {
      upsert: jest.fn().mockResolvedValue({ id: "route-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "route-1" }),
    },
    catalogMedication: { findUnique: jest.fn().mockResolvedValue(null) },
    medicationSafetyProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "safety-1" }),
    },
    medicationAdministrationProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "admin-1" }),
    },
    infusionProfile: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    medicationBillingProfile: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "bill-1" }),
    },
    facilityFormularyItem: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "ffi-1" }),
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
      findUnique: jest.fn().mockResolvedValue(eligibleStagingRow),
    },
    medicationConcept: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    medicationProduct: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    medicationPackage: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn() },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    tx,
  };
}

describe("MedicationFormularyPromotionService", () => {
  it("blocks promotion when gates incomplete", async () => {
    const prisma = makePrismaMock();
    prisma.medicationFormularyImportStaging.findUnique.mockResolvedValue({
      ...eligibleStagingRow,
      importGateStatus: "BLOCKED",
    });
    const audit = { log: jest.fn() };
    const service = new MedicationFormularyPromotionService(prisma as never, audit as never);
    const out = await service.promoteStagingRow("st-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("blocked");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("promotes and creates canonical entities", async () => {
    const prisma = makePrismaMock();
    const audit = { log: jest.fn() };
    const service = new MedicationFormularyPromotionService(prisma as never, audit as never);
    const out = await service.promoteStagingRow("st-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("promoted");
    if (out.status === "promoted") {
      expect(out.result.conceptId).toBe("concept-1");
      expect(out.result.packageId).toBe("package-1");
    }
    expect(prisma.tx.medicationConcept.create).toHaveBeenCalled();
    expect(prisma.tx.medicationProduct.create).toHaveBeenCalled();
    expect(prisma.tx.medicationPackage.create).toHaveBeenCalled();
    expect(prisma.tx.facilityFormularyItem.create).toHaveBeenCalled();
    expect(prisma.tx.medicationBillingProfile.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalled();
  });

  it("is idempotent when already promoted", async () => {
    const prisma = makePrismaMock();
    const prior = {
      stagingRowId: "st-1",
      sourceRowId: "PRI_001",
      duplicateResolution: "CREATE_NEW",
      conceptId: "c-existing",
      productId: "p-existing",
      packageId: "pkg-existing",
      facilityFormularyItemId: null,
      createdConcept: true,
      createdProduct: true,
      createdPackage: true,
      duplicateCandidates: [],
      promotedAt: new Date().toISOString(),
    };
    prisma.medicationFormularyImportStaging.findUnique.mockResolvedValue({
      ...eligibleStagingRow,
      importedAt: new Date(),
      promotionResultJson: prior,
    });
    const service = new MedicationFormularyPromotionService(prisma as never, { log: jest.fn() } as never);
    const out = await service.promoteStagingRow("st-1", {}, "user-1", "fac-1");
    expect(out.status).toBe("promoted");
    if (out.status === "promoted") {
      expect(out.result.conceptId).toBe("c-existing");
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires resolution when duplicate detected", async () => {
    const prisma = makePrismaMock();
    prisma.medicationConcept.findUnique.mockResolvedValue({ id: "dup", code: "CONCEPT_X" });
    const service = new MedicationFormularyPromotionService(prisma as never, { log: jest.fn() } as never);
    await expect(service.promoteStagingRow("st-1", {}, "user-1", "fac-1")).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});
