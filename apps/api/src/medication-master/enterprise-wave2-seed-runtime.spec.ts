import type { PrismaClient } from "@prisma/client";
import {
  seedEnterpriseWave2Formulary,
  withWave2FormularyEntryDefaults,
} from "../../prisma/helpers/seed-enterprise-wave2-formulary";
import { ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER } from "./enterprise-wave2.constants";

jest.mock("../../prisma/helpers/enterprise-wave2-formulary-seed-modules", () => {
  const minimalEntry = {
    catalogCode: "WAVE2_SEED_RUNTIME_TEST_CREATE",
    genericName: "Seed Runtime Test",
    displayNameFr: "Test runtime seed",
    displayNameEn: "Seed Runtime Test",
    strength: "10 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Test",
    bucket: "CHRONIC",
    mode: "CREATE" as const,
    billingClass: "DRUG_SUPPLY",
    isEssential: false,
    governance: {
      isControlled: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      isHighAlert: false,
    },
  };
  const billing = {
    catalogCode: "WAVE2_SEED_RUNTIME_TEST_CREATE",
    hcpcs: "J3490",
    ndc11: "00099009901",
    description: "Wave2 seed runtime test",
    billingUnitType: "tablet",
  };
  return {
    loadEnterpriseWave2FormularySeedModules: async () => ({
      ENTERPRISE_WAVE2_FORMULARY_MANIFEST: [minimalEntry],
      ENTERPRISE_WAVE2_BILLING_BY_CODE: {
        WAVE2_SEED_RUNTIME_TEST_CREATE: billing,
      },
      assertEnterpriseWave2FormularyManifest: () => {},
      wave2ConceptCodeForGeneric: (name: string) =>
        `ENT_W2_${name.toUpperCase().replace(/\s+/g, "_")}`,
      wave2PackageCodeForProduct: (code: string) => `${code}_PKG_DEFAULT`,
      validateWave2MedicationBillingReadiness: () => ({
        billingPass: true,
        activationPass: true,
        failures: [],
      }),
      validateWave2EntrySearchReady: () => ({ pass: true, failures: [] }),
      validateWave2SearchPair: () => ({ pass: true }),
      computeWave2SearchReadinessScore: () => 100,
      summarizeEnterpriseWave2Readiness: (
        perMedication: unknown[],
        counts: Record<string, unknown>
      ) => ({
        ...counts,
        perMedication,
        canonicalCoveragePct: 100,
        ndcCoveragePct: 100,
        hcpcsCoveragePct: 100,
        jCodeCoveragePct: 100,
        searchCoveragePct: 100,
        governanceCoveragePct: 100,
        billingReadinessPct: 100,
        activationReadinessPct: 100,
        wave2ReadinessPct: 100,
      }),
    }),
  };
});

describe("M1.6D.1 — Wave 2 seed runtime", () => {
  it("defaults missing aliases and searchTerms", () => {
    const normalized = withWave2FormularyEntryDefaults({
      catalogCode: "X",
    });
    expect(normalized.aliases).toEqual([]);
    expect(normalized.searchTerms).toEqual([]);
  });

  it("loads Wave 2 manifest (not Wave 1 keys) and completes dry-run seed", async () => {
    const prisma = {
      catalogMedication: {
        findUnique: async () => null,
        upsert: async () => ({ id: "cat-1" }),
      },
      medicationAlias: { findUnique: async () => null, findMany: async () => [], create: async () => ({}) },
      billingCatalog: { findFirst: async () => ({ id: "bc" }), create: async () => ({}) },
      medicationProduct: { findUnique: async () => null },
      medicationRoute: { upsert: async () => ({}), findUniqueOrThrow: async () => ({ id: "r" }) },
      medicationConcept: { findUnique: async () => null, create: async () => ({ id: "c" }) },
      medicationConcentration: { create: async () => ({ id: "conc" }) },
      medicationPackage: { create: async () => ({ id: "pkg" }) },
      medicationBillingProfile: { create: async () => ({ id: "bp" }) },
      medicationSafetyProfile: { findUnique: async () => null, create: async () => ({}) },
      medicationAdministrationProfile: { upsert: async () => ({}) },
    } as unknown as PrismaClient;

    const result = await seedEnterpriseWave2Formulary(prisma, { dryRun: true });
    expect(result.manifestEntries).toBe(1);
    expect(result.conflicts).toEqual([]);
    expect(result.readinessReport.wave2ReadinessPct).toBe(100);
  });

  it("CREATE path applies Wave 2 marker and stays inactive", async () => {
    const products: Array<{
      id: string;
      code: string;
      isActive: boolean;
      governanceStatus: string;
      governanceNotes: string | null;
    }> = [];

    const prisma = {
      catalogMedication: {
        findUnique: async () => null,
        upsert: async () => ({ id: "cat-create" }),
      },
      medicationAlias: { findUnique: async () => null, findMany: async () => [], create: async () => ({}) },
      billingCatalog: { findFirst: async () => null, create: async () => ({ id: "bc" }) },
      medicationProduct: {
        findUnique: async () => null,
        create: async ({
          data,
        }: {
          data: {
            code: string;
            isActive: boolean;
            governanceStatus: string;
            governanceNotes: string;
          };
        }) => {
          const row = {
            id: "prod-create",
            code: data.code,
            isActive: data.isActive,
            governanceStatus: data.governanceStatus,
            governanceNotes: data.governanceNotes,
          };
          products.push(row);
          return {
            ...row,
            conceptId: "concept-1",
            legacyCatalogMedicationId: "cat-create",
            concept: { genericName: "Seed Runtime Test", isActive: false },
            packages: [],
          };
        },
      },
      medicationRoute: { upsert: async () => ({}), findUniqueOrThrow: async () => ({ id: "r" }) },
      medicationConcept: { findUnique: async () => null, create: async () => ({ id: "c" }) },
      medicationConcentration: { create: async () => ({ id: "conc" }) },
      medicationPackage: { create: async () => ({ id: "pkg" }) },
      medicationBillingProfile: { create: async () => ({ id: "bp" }) },
      medicationSafetyProfile: { findUnique: async () => null, create: async () => ({}) },
      medicationAdministrationProfile: { upsert: async () => ({}) },
    } as unknown as PrismaClient;

    await seedEnterpriseWave2Formulary(prisma, { dryRun: false });
    expect(products).toHaveLength(1);
    expect(products[0]!.isActive).toBe(false);
    expect(products[0]!.governanceStatus).toBe("REVIEW_REQUIRED");
    expect(products[0]!.governanceNotes).toContain(ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER);
  });
});
