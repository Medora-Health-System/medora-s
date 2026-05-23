import { BadRequestException } from "@nestjs/common";
import { ControlledCatalogImportMedicationService } from "./controlled-catalog-import-medication.service";
import { classifyControlledMedicationRow } from "./controlled-catalog-import-risk.util";

const FACILITY_ID = "00000000-0000-4000-8000-000000000001";

const SAFE_CSV = Buffer.from(
  "medication,dose,form\nAcetaminophen,500 mg,Tablet\n",
  "utf-8"
);

function buildService(overrides?: {
  activationThrows?: Error;
  existingProducts?: Array<{
    id: string;
    code: string;
    conceptId: string;
    strengthDisplay: string;
    dosageForm: string;
    concept: { genericName: string; displayName: string };
  }>;
}) {
  const createdProductId = "prod-controlled-1";
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
      findUnique: jest.fn().mockResolvedValue({ governanceNotes: null, legacyCatalogMedicationId: "cat-1" }),
    },
    medicationPackage: {
      create: jest.fn().mockResolvedValue({ id: "pkg-1" }),
      update: jest.fn(),
    },
    medicationSafetyProfile: { create: jest.fn() },
    medicationAdministrationProfile: { create: jest.fn() },
    medicationBillingProfile: { create: jest.fn() },
    facilityFormularyItem: { create: jest.fn() },
    catalogMedication: { create: jest.fn().mockResolvedValue({ id: "cat-1" }) },
    medicationSearchAlias: { create: jest.fn() },
  };

  const prisma = {
    medicationConcept: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    medicationProduct: {
      findMany: jest.fn().mockResolvedValue(overrides?.existingProducts ?? []),
      findUnique: jest.fn().mockImplementation(async () => ({
        id: createdProductId,
        governanceNotes: null,
        legacyCatalogMedicationId: "cat-1",
        concept: { safetyProfile: {} },
        administrationProfile: { requiresInfusionSession: false },
        packages: [
          {
            id: "pkg-1",
            ndc11: "00000000001",
            billingProfiles: [{}],
            facilityFormularyItems: [{ facilityId: FACILITY_ID }],
          },
        ],
      })),
      update: jest.fn(),
    },
    medicationPackage: { update: jest.fn() },
    medicationBillingProfile: { create: jest.fn() },
    facilityFormularyItem: { create: jest.fn() },
    catalogMedication: { update: jest.fn() },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };

  const productGovernance = {
    approveActivation: jest.fn().mockResolvedValue({}),
  };
  const activationGovernance = {
    enableOrderSearch: overrides?.activationThrows
      ? jest.fn().mockRejectedValue(overrides.activationThrows)
      : jest.fn().mockResolvedValue({}),
  };

  const service = new ControlledCatalogImportMedicationService(
    prisma as never,
    { log: jest.fn() } as never,
    { assertFacilityScope: jest.fn() } as never,
    productGovernance as never,
    activationGovernance as never
  );

  return { service, prisma, productGovernance, activationGovernance, createdProductId };
}

describe("ControlledCatalogImportMedicationService", () => {
  it("blocks order search commit without confirmations", async () => {
    const { service } = buildService();
    await expect(
      service.commit(
        SAFE_CSV,
        "test.csv",
        {
          facilityId: FACILITY_ID,
          enableProviderOrderSearch: true,
          confirmOrderSearchEnablement: false,
          confirmMarRemainsOff: true,
          confirmBillingRemainsOff: true,
          note: "test",
        },
        "user-1",
        FACILITY_ID
      )
    ).rejects.toThrow(/Confirmation requise/);
  });

  it("commits safe rows with provider order search off (catalog only)", async () => {
    const { service, activationGovernance } = buildService();
    const result = await service.commit(
      SAFE_CSV,
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
    expect(result.highRiskQueued).toBe(0);
    expect(result.orderSearchEnabled).toBe(0);
    expect(result.orderSearchBlocked).toEqual([]);
    expect(activationGovernance.enableOrderSearch).not.toHaveBeenCalled();
  });

  it("commits catalog and records order-search blocks without failing commit", async () => {
    const { service, activationGovernance } = buildService({
      activationThrows: new BadRequestException({
        message: "Activation bloquée.",
        blockers: ["FORMULARY_NOT_APPROVED"],
      }),
    });
    const result = await service.commit(
      SAFE_CSV,
      "test.csv",
      {
        facilityId: FACILITY_ID,
        enableProviderOrderSearch: true,
        confirmOrderSearchEnablement: true,
        confirmMarRemainsOff: true,
        confirmBillingRemainsOff: true,
        note: "Approved",
      },
      "user-1",
      FACILITY_ID
    );
    expect(result.committed).toBe(1);
    expect(result.orderSearchEnabled).toBe(0);
    expect(result.orderSearchBlocked).toHaveLength(1);
    expect(result.orderSearchBlocked[0]?.blockers).toContain("FORMULARY_NOT_APPROVED");
    expect(activationGovernance.enableOrderSearch).toHaveBeenCalled();
  });

  it("excludes duplicate rows and queues high-risk instead of skipping", async () => {
    const { service, prisma } = buildService({
      existingProducts: [
        {
          id: "existing-1",
          code: "P1",
          conceptId: "c1",
          strengthDisplay: "500 mg",
          dosageForm: "Tablet",
          concept: { genericName: "Acetaminophen", displayName: "Acetaminophen" },
        },
      ],
    });
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
    expect(result.committed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.highRiskQueued).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("controlled catalog import — high risk never safe", () => {
  it("insulin is not SAFE_LOW_RISK", () => {
    expect(
      classifyControlledMedicationRow(
        { medication: "Insulin Regular", dose: "100 units/mL", form: "Injection" },
        null
      )
    ).toBe("HIGH_RISK_MANUAL_REVIEW");
  });
});
