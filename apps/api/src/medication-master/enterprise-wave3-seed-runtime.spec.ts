import type { PrismaClient } from "@prisma/client";
import {
  seedEnterpriseWave3Formulary,
  withWave3FormularyEntryDefaults,
} from "../../prisma/helpers/seed-enterprise-wave3-formulary";
import { ENTERPRISE_M17B_WAVE3_LINKAGE_MARKER } from "./enterprise-wave3.constants";

jest.mock("../../prisma/helpers/enterprise-wave3-formulary-seed-modules", () => {
  const minimalEntry = {
    catalogCode: "WAVE3_SEED_RUNTIME_TEST_CREATE",
    genericName: "Seed Runtime Test",
    displayNameFr: "Test runtime seed",
    displayNameEn: "Seed Runtime Test",
    strength: "10 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Test",
    bucket: "PSYCHIATRY",
    mode: "CREATE" as const,
    billingClass: "DRUG_SUPPLY",
    isEssential: false,
    aliases: [
      { text: "Runtime Test Brand", language: "en", aliasType: "OTHER" },
      { text: "Test marque runtime", language: "fr", aliasType: "OTHER" },
    ],
    searchTerms: ["seed runtime test", "10 mg", "comprime", "orale"],
    governance: {
      isControlled: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      isHighAlert: false,
    },
  };
  const billing = {
    catalogCode: "WAVE3_SEED_RUNTIME_TEST_CREATE",
    hcpcs: "J3490",
    ndc11: "00099009901",
    description: "Wave3 seed runtime test",
    billingUnitType: "tablet",
  };
  return {
    loadEnterpriseWave3FormularySeedModules: async () => ({
      ENTERPRISE_WAVE3_FORMULARY_MANIFEST: [minimalEntry],
      ENTERPRISE_WAVE3_BILLING_BY_CODE: {
        WAVE3_SEED_RUNTIME_TEST_CREATE: billing,
      },
      assertEnterpriseWave3FormularyManifest: () => {},
      wave3ConceptCodeForGeneric: (name: string) =>
        `ENT_W3_${name.toUpperCase().replace(/\s+/g, "_")}`,
      countWave3GovernanceMarkers: () => ({
        highAlertCount: 0,
        controlledCount: 0,
        dmardCount: 0,
        biologicCount: 0,
        insulinCount: 0,
        byBucket: { PSYCHIATRY: 1 },
      }),
      wave3PackageCodeForProduct: (code: string) => `${code}_PKG_DEFAULT`,
      validateWave3MedicationBillingReadiness: () => ({
        billingPass: true,
        activationPass: true,
        governancePass: true,
        localizationPass: true,
        labelPass: true,
        pass: true,
        failures: [],
      }),
      validateWave3EntrySearchReady: () => ({ pass: true, failures: [] }),
      validateWave3SearchPair: () => ({ pass: true }),
      computeWave3SearchReadinessScore: () => 100,
      summarizeEnterpriseWave3Readiness: (
        perMedication: unknown[],
        counts: Record<string, unknown>,
        governance: Record<string, unknown>
      ) => ({
        ...counts,
        ...governance,
        perMedication,
        localizationCoveragePct: 100,
        billingReadinessPct: 100,
        labelIntegrityPct: 100,
        wave3ReadinessPct: 100,
      }),
    }),
  };
});

describe("M1.7B — Wave 3 seed runtime", () => {
  it("defaults missing aliases and searchTerms", () => {
    const normalized = withWave3FormularyEntryDefaults({
      catalogCode: "X",
    });
    expect(normalized.aliases).toEqual([]);
    expect(normalized.searchTerms).toEqual([]);
  });

  it("loads Wave 3 manifest and completes dry-run seed", async () => {
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

    const result = await seedEnterpriseWave3Formulary(prisma, { dryRun: true });
    expect(result.manifestEntries).toBe(1);
    expect(result.conflicts).toEqual([]);
    expect(result.readinessReport.wave3ReadinessPct).toBe(100);
  });

  it("CREATE path applies Wave 3 marker and stays inactive", async () => {
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

    await seedEnterpriseWave3Formulary(prisma, { dryRun: false });
    expect(products).toHaveLength(1);
    expect(products[0]!.isActive).toBe(false);
    expect(products[0]!.governanceStatus).toBe("REVIEW_REQUIRED");
    expect(products[0]!.governanceNotes).toContain(ENTERPRISE_M17B_WAVE3_LINKAGE_MARKER);
  });
});
