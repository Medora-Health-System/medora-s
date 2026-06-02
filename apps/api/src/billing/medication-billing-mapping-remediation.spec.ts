import type { PrismaClient } from "@prisma/client";
import { seedMedicationBillingMappingRemediation } from "../../prisma/helpers/seed-medication-billing-mapping-remediation";

jest.mock("../../prisma/helpers/medication-billing-seed-modules", () => {
  const manifest = jest.requireActual(
    "../../../../packages/shared/src/medication/medicationBillingMappingManifest"
  );
  const ndc = jest.requireActual(
    "../../../../packages/shared/src/medication/medicationBillingNdcByCatalogCode"
  );
  const validation = jest.requireActual(
    "../../../../packages/shared/src/medication/medicationBillingMappingValidation"
  );
  return {
    loadMedicationBillingMappingSeedModules: async () => ({
      MEDICATION_BILLING_MAPPING_ENTRIES: manifest.MEDICATION_BILLING_MAPPING_ENTRIES,
      MEDICATION_BILLING_MAPPING_BY_CODE: manifest.MEDICATION_BILLING_MAPPING_BY_CODE,
      MEDICATION_BILLING_NDC_BY_CATALOG_CODE: ndc.MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
      assertMedicationBillingMappingManifest: validation.assertMedicationBillingMappingManifest,
      resolveMedicationHcpcsForCatalogRow: validation.resolveMedicationHcpcsForCatalogRow,
      computeMedicationBillingCoverageReport: validation.computeMedicationBillingCoverageReport,
    }),
  };
});

describe("seedMedicationBillingMappingRemediation", () => {
  const morphineCode = "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION";

  function buildPrismaMock() {
    const billingCatalog: Array<{
      id: string;
      triggerSource: string;
      externalCode: string;
      code: string;
    }> = [];
    const catalogMedications = [
      {
        id: "cat-1",
        code: morphineCode,
        billingCodeDefault: null as string | null,
        ndc11: null as string | null,
        ndcDisplay: null as string | null,
        dosageForm: "injectable",
        route: "injectable",
        administrationType: "PUSH",
      },
    ];

    const prisma = {
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue(catalogMedications),
        update: jest.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: object }) => {
          const row = catalogMedications.find((r) => r.id === where.id);
          if (row) Object.assign(row, data);
        }),
      },
      billingCatalog: {
        findFirst: jest.fn().mockImplementation(async ({ where }: { where: { externalCode: string } }) =>
          billingCatalog.find(
            (r) => r.triggerSource === "MEDICATION" && r.externalCode === where.externalCode
          ) ?? null
        ),
        create: jest.fn().mockImplementation(async ({ data }: { data: { externalCode: string; code: string } }) => {
          const row = { id: `bc-${billingCatalog.length + 1}`, triggerSource: "MEDICATION", ...data };
          billingCatalog.push(row);
          return row;
        }),
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    return { prisma: prisma as unknown as PrismaClient, catalogMedications, billingCatalog };
  }

  it("creates missing BillingCatalog and billingCodeDefault without overwriting existing values", async () => {
    const { prisma, catalogMedications, billingCatalog } = buildPrismaMock();

    const first = await seedMedicationBillingMappingRemediation(prisma);
    expect(first.billingCatalogCreated).toBeGreaterThan(0);
    expect(first.catalogBillingDefaultCreated).toBe(1);
    expect(catalogMedications[0]?.billingCodeDefault).toBe("J2270");
    expect(billingCatalog.some((r) => r.externalCode === morphineCode && r.code === "J2270")).toBe(true);

    catalogMedications[0]!.billingCodeDefault = "J9999";
    const second = await seedMedicationBillingMappingRemediation(prisma);
    expect(second.billingCatalogSkippedExisting).toBeGreaterThan(0);
    expect(second.catalogBillingDefaultSkippedExisting).toBeGreaterThan(0);
    expect(catalogMedications[0]?.billingCodeDefault).toBe("J9999");
  });
});
