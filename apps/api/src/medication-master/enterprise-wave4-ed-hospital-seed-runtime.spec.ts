import type { PrismaClient } from "@prisma/client";
import {
  seedEnterpriseWave4EdHospitalFormulary,
  withWave4FormularyEntryDefaults,
} from "../../prisma/helpers/seed-enterprise-wave4-ed-hospital-formulary";
import { ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER } from "./enterprise-wave4-ed-hospital.constants";

jest.mock("../../prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules", () => {
  const minimalEntry = {
    catalogCode: "WAVE4_SEED_RUNTIME_TEST_CREATE",
    genericName: "Seed Runtime Test",
    displayNameFr: "Test runtime seed",
    displayNameEn: "Seed Runtime Test",
    strength: "10 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Test",
    bucket: "RSI",
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
    catalogCode: "WAVE4_SEED_RUNTIME_TEST_CREATE",
    hcpcs: "J3490",
    ndc11: "00099009901",
    description: "Wave4 seed runtime test",
    billingUnitType: "tablet",
  };
  return {
    loadEnterpriseWave4EdHospitalFormularySeedModules: async () => ({
      ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST: [minimalEntry],
      ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: {
        WAVE4_SEED_RUNTIME_TEST_CREATE: billing,
      },
      assertEnterpriseWave4EdHospitalFormularyManifest: () => {},
      wave4ConceptCodeForGeneric: (name: string) =>
        `ENT_W4_${name.toUpperCase().replace(/\s+/g, "_")}`,
      countWave4GovernanceMarkers: () => ({
        highAlertCount: 0,
        controlledCount: 0,
        doubleSignCount: 0,
        rsiParalyticCount: 1,
        thrombolyticCount: 0,
        vasopressorCount: 0,
        antidoteCount: 0,
        insulinCount: 0,
        byBucket: { RSI: 1 },
      }),
      wave4PackageCodeForProduct: (code: string) => `${code}_PKG_DEFAULT`,
      validateWave4MedicationBillingReadiness: () => ({
        billingPass: true,
        activationPass: true,
        governancePass: true,
        localizationPass: true,
        labelPass: true,
        pass: true,
        failures: [],
      }),
      validateWave4EntrySearchReady: () => ({ pass: true, failures: [] }),
      validateWave4SearchPair: () => ({ pass: true }),
      computeWave4SearchReadinessScore: () => 100,
      summarizeEnterpriseWave4EdHospitalReadiness: (
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
        wave4ReadinessPct: 100,
      }),
    }),
  };
});

describe("M1.7C — Wave 4 ED/Hospital seed runtime", () => {
  it("defaults missing aliases and searchTerms", () => {
    const normalized = withWave4FormularyEntryDefaults({
      catalogCode: "X",
    });
    expect(normalized.aliases).toEqual([]);
    expect(normalized.searchTerms).toEqual([]);
  });

  it("loads Wave 4 manifest and completes dry-run seed", async () => {
    const prisma = {
      catalogMedication: {
        findUnique: async () => null,
        upsert: async () => ({ id: "cat-1" }),
      },
      medicationAlias: { findUnique: async () => null, findMany: async () => [], create: async () => ({}) },
      billingCatalog: { findFirst: async () => ({ id: "bc" }), create: async () => ({}) },
      medicationProduct: { findUnique: async () => null, findFirst: async () => null },
      medicationRoute: { upsert: async () => ({}), findUniqueOrThrow: async () => ({ id: "r" }) },
      medicationConcept: { findUnique: async () => null, create: async () => ({ id: "c" }) },
      medicationConcentration: { create: async () => ({ id: "conc" }) },
      medicationPackage: { create: async () => ({ id: "pkg" }) },
      medicationBillingProfile: { create: async () => ({ id: "bp" }) },
      medicationSafetyProfile: { findUnique: async () => null, create: async () => ({}) },
      medicationAdministrationProfile: { upsert: async () => ({}) },
    } as unknown as PrismaClient;

    const result = await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: true });
    expect(result.manifestEntries).toBe(1);
    expect(result.conflicts).toEqual([]);
    expect(result.readinessReport.wave4ReadinessPct).toBe(100);
  });

  it("CREATE path applies Wave 4 marker and stays inactive", async () => {
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
        findFirst: async () => null,
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

    await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: false });
    expect(products).toHaveLength(1);
    expect(products[0]!.isActive).toBe(false);
    expect(products[0]!.governanceStatus).toBe("REVIEW_REQUIRED");
    expect(products[0]!.governanceNotes).toContain(ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER);
  });
});
