import { ControlledCatalogImportMedicationService } from "./controlled-catalog-import-medication.service";
import { HighRiskMedicationReviewService } from "./high-risk-medication-review.service";
import { HIGH_RISK_PENDING_GOVERNANCE_STATUS } from "./medication-product-governance.constants";
import {
  defaultHighRiskImportMeta,
  mergeHighRiskImportMeta,
} from "./medication-high-risk-import-meta.util";
import { mergeProductRuntimeActivation } from "./medication-product-runtime-activation.util";

const FACILITY_ID = "00000000-0000-4000-8000-000000000001";

describe("HighRiskMedicationReviewService", () => {
  const productId = "prod-hr-1";

  function buildReviewService(overrides?: {
    activateProvider?: jest.Mock;
    product?: Record<string, unknown>;
  }) {
    const governanceNotes = mergeHighRiskImportMeta(
      mergeProductRuntimeActivation(null, {}),
      defaultHighRiskImportMeta({
        sourceFilename: "meds.csv",
        sourceFingerprint: "fp1",
        sourceRowNumber: 3,
        sourceRowKey: "row-3",
        classificationReasonCodes: ["MORPHINE"],
        importedAt: "2026-05-18T12:00:00.000Z",
      })
    );

    const prisma = {
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: productId,
            code: "CTL_PROD_1",
            strengthDisplay: "4 mg/mL",
            dosageForm: "Injection",
            governanceStatus: HIGH_RISK_PENDING_GOVERNANCE_STATUS,
            governanceNotes,
            concept: {
              displayName: "Morphine",
              genericName: "Morphine",
              safetyProfile: { isHighAlert: true, isControlled: true },
            },
            packages: [
              {
                facilityFormularyItems: [{ facilityId: FACILITY_ID }],
              },
            ],
          },
        ]),
        findFirst: jest.fn().mockResolvedValue({
          id: productId,
          code: "CTL_PROD_1",
          governanceStatus: HIGH_RISK_PENDING_GOVERNANCE_STATUS,
          governanceNotes,
        }),
        findUnique: jest.fn().mockImplementation(async () => ({
          governanceStatus: overrides?.product?.governanceStatus ?? "REVIEW_REQUIRED",
          governanceNotes:
            overrides?.product?.governanceNotes ??
            mergeProductRuntimeActivation(null, { orderSearchEnabled: false }),
        })),
        update: jest.fn(),
      },
      facility: {
        findUnique: jest.fn().mockResolvedValue({ name: "Clinic A" }),
      },
    };

    const controlledImport = {
      activateProviderOrderSearchForImport:
        overrides?.activateProvider ??
        jest.fn().mockResolvedValue(undefined),
    };

    const service = new HighRiskMedicationReviewService(
      prisma as never,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never,
      controlledImport as never
    );

    return { service, prisma, controlledImport };
  }

  it("lists pending high-risk rows for a facility", async () => {
    const { service } = buildReviewService();
    const result = await service.listQueue(FACILITY_ID, FACILITY_ID);
    expect(result.total).toBe(1);
    expect(result.rows[0]?.medicationName).toBe("Morphine");
    expect(result.rows[0]?.classificationReasonCodes).toContain("MORPHINE");
  });

  it("approve catalog only keeps provider search off", async () => {
    const { service, prisma } = buildReviewService();
    const out = await service.approveCatalogOnly(
      productId,
      { facilityId: FACILITY_ID, note: "Catalog review complete" },
      "user-1",
      FACILITY_ID
    );
    expect(out.orderSearchEnabled).toBe(false);
    expect(out.marEnabled).toBe(false);
    expect(out.billingEnabled).toBe(false);
    expect(prisma.medicationProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: productId },
        data: expect.objectContaining({ governanceStatus: "REVIEW_REQUIRED" }),
      })
    );
  });

  it("approve provider ordering enables search only via controlled import helper", async () => {
    const activateProvider = jest.fn().mockResolvedValue(undefined);
    const { service, controlledImport } = buildReviewService({
      activateProvider,
      product: {
        governanceStatus: "ACTIVATION_APPROVED",
        governanceNotes: mergeProductRuntimeActivation(null, {
          orderSearchEnabled: true,
          marEnabled: false,
          billingEnabled: false,
        }),
      },
    });

    const out = await service.approveProviderOrdering(
      productId,
      {
        facilityId: FACILITY_ID,
        note: "Pharmacy approved for ordering",
        confirmProviderOrderingOnly: true,
        confirmMarRemainsOff: true,
        confirmBillingRemainsOff: true,
        confirmInventoryRemainsOff: true,
      },
      "user-1",
      FACILITY_ID
    );

    expect(controlledImport.activateProviderOrderSearchForImport).toHaveBeenCalled();
    expect(out.orderSearchEnabled).toBe(true);
    expect(out.marEnabled).toBe(false);
    expect(out.billingEnabled).toBe(false);
  });

  it("reject removes row from pending queue state", async () => {
    const { service, prisma } = buildReviewService();
    await service.reject(
      productId,
      { facilityId: FACILITY_ID, note: "Not formulary approved" },
      "user-1",
      FACILITY_ID
    );
    expect(prisma.medicationProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ governanceStatus: "BLOCKED" }),
      })
    );
  });
});

describe("ControlledCatalogImportMedicationService high-risk queue", () => {
  it("queues high-risk rows on commit without enabling provider search", async () => {
    const createdProductId = "prod-insulin";
    const tx = {
      medicationConcept: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "concept-1" }),
      },
      medicationRoute: {
        upsert: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "route-1", code: "OTHER" }),
      },
      medicationConcentration: {
        create: jest.fn().mockResolvedValue({ id: "conc-1" }),
      },
      medicationProduct: {
        create: jest.fn().mockResolvedValue({ id: createdProductId }),
        update: jest.fn(),
      },
      medicationPackage: {
        create: jest.fn().mockResolvedValue({ id: "pkg-1" }),
      },
      medicationSafetyProfile: { create: jest.fn() },
      medicationAdministrationProfile: { create: jest.fn() },
      medicationBillingProfile: { create: jest.fn() },
      facilityFormularyItem: { create: jest.fn() },
      catalogMedication: { create: jest.fn().mockResolvedValue({ id: "cat-1" }) },
      medicationSearchAlias: { create: jest.fn() },
    };

    const prisma = {
      medicationConcept: { findUnique: jest.fn().mockResolvedValue(null) },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    };

    const service = new ControlledCatalogImportMedicationService(
      prisma as never,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never,
      {} as never,
      {} as never
    );

    const csv = Buffer.from(
      "medication,dose,form\nAcetaminophen,500 mg,Tablet\nInsulin Regular,100 units/mL,Injection\n",
      "utf-8"
    );
    const result = await service.commit(
      csv,
      "test.csv",
      {
        facilityId: FACILITY_ID,
        enableProviderOrderSearch: false,
        confirmOrderSearchEnablement: false,
        confirmMarRemainsOff: false,
        confirmBillingRemainsOff: false,
        note: "",
      },
      "user-1",
      FACILITY_ID
    );

    expect(result.committed).toBe(1);
    expect(result.highRiskQueued).toBe(1);
    expect(result.skipped).toBe(0);
    expect(tx.medicationProduct.create).toHaveBeenCalledTimes(2);
    expect(tx.medicationProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          governanceStatus: HIGH_RISK_PENDING_GOVERNANCE_STATUS,
        }),
      })
    );
    expect(tx.medicationSafetyProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isHighAlert: true }),
      })
    );
  });
});
