import type { PrismaClient } from "@prisma/client";
import {
  seedEnterpriseWave4EdHospitalFormulary,
} from "../../prisma/helpers/seed-enterprise-wave4-ed-hospital-formulary";
import { ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER } from "./enterprise-wave4-ed-hospital.constants";

const BUDESONIDE_MANIFEST =
  "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE";
const BUDESONIDE_CANONICAL =
  "BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE";

function enrichEntry(catalogCode: string, administrationType: string) {
  return {
    catalogCode,
    genericName: "Test",
    displayNameFr: "Test FR",
    displayNameEn: "Test EN",
    strength: "1 mg",
    dosageForm: "injectable",
    route: "intraveineuse",
    therapeuticClass: "Test",
    bucket: "RSI",
    mode: "ENRICH" as const,
    billingClass: "DRUG_SUPPLY",
    isEssential: false,
    aliases: [],
    searchTerms: ["test"],
    governance: {
      isControlled: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      isHighAlert: false,
    },
    administrationType,
  };
}

function billingFor(code: string) {
  return {
    catalogCode: code,
    hcpcs: "J3490",
    ndc11: "00099009901",
    description: "test",
    billingUnitType: "mg",
  };
}

jest.mock("../../prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules", () => ({
  loadEnterpriseWave4EdHospitalFormularySeedModules: async () => ({
    assertEnterpriseWave4EdHospitalFormularyManifest: () => {},
    wave4ConceptCodeForGeneric: (name: string) => `ENT_${name}`,
    wave4PackageCodeForProduct: (code: string) => `${code}_PKG_DEFAULT`,
    countWave4GovernanceMarkers: () => ({
      highAlertCount: 0,
      controlledCount: 0,
      doubleSignCount: 0,
      rsiParalyticCount: 0,
      thrombolyticCount: 0,
      vasopressorCount: 0,
      antidoteCount: 0,
      insulinCount: 0,
      byBucket: {},
    }),
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
    summarizeEnterpriseWave4EdHospitalReadiness: (
      perMedication: unknown[],
      counts: Record<string, unknown>
    ) => ({
      ...counts,
      perMedication,
      wave4ReadinessPct: 100,
    }),
  }),
}));

describe("Wave 4 ENRICH seed sync (M1.7C.8)", () => {
  it("resolves Budesonide manifest code to Wave 3 canonical catalog without conflict", async () => {
    const catalogs = new Map([
      [
        BUDESONIDE_CANONICAL,
        {
          id: "cat-budesonide",
          administrationType: "INHALATION",
          code: BUDESONIDE_CANONICAL,
          genericName: "Budesonide",
        },
      ],
    ]);
    const products = new Map([
      [
        BUDESONIDE_CANONICAL,
        {
          id: "prod-budesonide",
          code: BUDESONIDE_CANONICAL,
          conceptId: "concept-1",
          legacyCatalogMedicationId: "cat-budesonide",
          administrationType: "INHALATION",
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          governanceNotes: "ENTERPRISE_M17B_WAVE3_FORMULARY",
          concept: { genericName: "Budesonide", isActive: false },
          packages: [
            {
              id: "pkg-1",
              code: `${BUDESONIDE_CANONICAL}_PKG_DEFAULT`,
              ndc11: "",
              billingProfiles: [{ hcpcsCodeSuggested: "J3490" }],
            },
          ],
        },
      ],
    ]);

    const prisma = buildMockPrisma(catalogs, products);
    const modules = await import("../../prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules");
    jest.spyOn(modules, "loadEnterpriseWave4EdHospitalFormularySeedModules").mockResolvedValue({
      ...(await modules.loadEnterpriseWave4EdHospitalFormularySeedModules()),
      ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST: [
        enrichEntry(BUDESONIDE_MANIFEST, "INHALATION"),
      ],
      ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: {
        [BUDESONIDE_MANIFEST]: billingFor(BUDESONIDE_MANIFEST),
      },
    } as never);

    const result = await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: false });
    expect(result.conflicts).toEqual([]);
    expect(result.catalogEnriched).toBe(1);
    expect(result.catalogCreated).toBe(0);
    expect(products.get(BUDESONIDE_CANONICAL)?.governanceNotes).toContain(
      ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER
    );
    expect(catalogs.has(BUDESONIDE_MANIFEST)).toBe(false);
  });

  it("synchronizes product administrationType from remediated catalog on ENRICH", async () => {
    const code = "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION";
    const catalogs = new Map([
      [code, { id: "cat-enox", administrationType: "SQ", code, genericName: "Enoxaparin" }],
    ]);
    const products = new Map([
      [
        code,
        {
          id: "prod-enox",
          code,
          conceptId: "concept-enox",
          legacyCatalogMedicationId: "cat-enox",
          administrationType: "INJECTION",
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          governanceNotes: null,
          concept: { genericName: "Enoxaparin", isActive: false },
          packages: [
            {
              id: "pkg-enox",
              code: `${code}_PKG_DEFAULT`,
              ndc11: "00099009901",
              billingProfiles: [{ hcpcsCodeSuggested: "J3490" }],
            },
          ],
        },
      ],
    ]);

    const prisma = buildMockPrisma(catalogs, products);
    const modules = await import("../../prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules");
    jest.spyOn(modules, "loadEnterpriseWave4EdHospitalFormularySeedModules").mockResolvedValue({
      ...(await modules.loadEnterpriseWave4EdHospitalFormularySeedModules()),
      ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST: [enrichEntry(code, "SQ")],
      ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: { [code]: billingFor(code) },
    } as never);

    const result = await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: false });
    expect(result.conflicts).toEqual([]);
    expect(result.productAdministrationTypeSynced).toBe(1);
    expect(products.get(code)?.administrationType).toBe("SQ");
  });

  it("preserves active Haiti legacy catalog isActive on ENRICH (M1.7C.12B)", async () => {
    const code = "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS";
    const catalogs = new Map([
      [
        code,
        {
          id: "cat-ins",
          administrationType: "SQ",
          code,
          genericName: "Regular insulin",
          isActive: true,
        },
      ],
    ]);
    const products = new Map([
      [
        code,
        {
          id: "prod-ins",
          code,
          conceptId: "concept-ins",
          legacyCatalogMedicationId: "cat-ins",
          administrationType: "SQ",
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          governanceNotes: "ENTERPRISE_M16D_WAVE2_FORMULARY",
          concept: { genericName: "Insulin", isActive: false },
          packages: [
            {
              id: "pkg-ins",
              code: `${code}_PKG_DEFAULT`,
              ndc11: "00099009901",
              billingProfiles: [{ hcpcsCodeSuggested: "J3490" }],
            },
          ],
        },
      ],
    ]);

    const prisma = buildMockPrisma(catalogs, products);
    const modules = await import("../../prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules");
    jest.spyOn(modules, "loadEnterpriseWave4EdHospitalFormularySeedModules").mockResolvedValue({
      ...(await modules.loadEnterpriseWave4EdHospitalFormularySeedModules()),
      ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST: [enrichEntry(code, "SQ")],
      ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: { [code]: billingFor(code) },
    } as never);

    await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: false });
    expect(catalogs.get(code)?.isActive).toBe(true);
  });

  it("second seed run is idempotent (no duplicate products, no conflicts)", async () => {
    const code = "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS";
    const catalogs = new Map([
      [code, { id: "cat-ins", administrationType: "SQ", code, genericName: "Insulin" }],
    ]);
    const products = new Map([
      [
        code,
        {
          id: "prod-ins",
          code,
          conceptId: "concept-ins",
          legacyCatalogMedicationId: "cat-ins",
          administrationType: "SQ",
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          governanceNotes: ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER,
          concept: { genericName: "Insulin", isActive: false },
          packages: [
            {
              id: "pkg-ins",
              code: `${code}_PKG_DEFAULT`,
              ndc11: "00099009901",
              billingProfiles: [{ hcpcsCodeSuggested: "J3490" }],
            },
          ],
        },
      ],
    ]);

    const prisma = buildMockPrisma(catalogs, products);
    const modules = await import("../../prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules");
    const manifest = [enrichEntry(code, "SQ")];
    const billing = { [code]: billingFor(code) };
    jest.spyOn(modules, "loadEnterpriseWave4EdHospitalFormularySeedModules").mockResolvedValue({
      ...(await modules.loadEnterpriseWave4EdHospitalFormularySeedModules()),
      ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST: manifest,
      ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: billing,
    } as never);

    const first = await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: false });
    const second = await seedEnterpriseWave4EdHospitalFormulary(prisma, { dryRun: false });
    expect(first.conflicts).toEqual([]);
    expect(second.conflicts).toEqual([]);
    expect(second.productsCreated).toBe(0);
    expect(second.productAdministrationTypeSynced).toBe(0);
    expect(products.size).toBe(1);
  });
});

function buildMockPrisma(
  catalogs: Map<
    string,
    {
      id: string;
      administrationType: string;
      code: string;
      genericName: string;
      isActive?: boolean;
    }
  >,
  products: Map<
    string,
    {
      id: string;
      code: string;
      conceptId: string;
      legacyCatalogMedicationId: string | null;
      administrationType: string;
      isActive: boolean;
      governanceStatus: string;
      governanceNotes: string | null;
      concept: { genericName: string; isActive: boolean };
      packages: Array<{
        id: string;
        code: string;
        ndc11: string;
        billingProfiles: Array<{ hcpcsCodeSuggested: string }>;
      }>;
    }
  >
): PrismaClient {
  return {
    catalogMedication: {
      findUnique: async ({ where }: { where: { code: string } }) => {
        const row = catalogs.get(where.code);
        if (!row) return null;
        return {
          id: row.id,
          administrationType: row.administrationType,
          isActive: row.isActive ?? true,
        };
      },
      upsert: async ({
        where,
        update,
      }: {
        where: { code: string };
        update: { administrationType?: string; isActive?: boolean };
      }) => {
        const existing = catalogs.get(where.code);
        if (existing) {
          if (update.administrationType) existing.administrationType = update.administrationType;
          if (typeof update.isActive === "boolean") existing.isActive = update.isActive;
        }
        return (
          existing ?? {
            id: "new-cat",
            administrationType: update.administrationType ?? null,
            isActive: update.isActive ?? false,
          }
        );
      },
    },
    medicationAlias: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => ({}),
    },
    billingCatalog: {
      findFirst: async () => ({ id: "bc-1" }),
      create: async () => ({}),
    },
    medicationProduct: {
      findUnique: async ({ where }: { where: { code: string } }) => products.get(where.code) ?? null,
      findFirst: async ({
        where,
      }: {
        where: { legacyCatalogMedicationId: string };
      }) => {
        for (const product of products.values()) {
          if (product.legacyCatalogMedicationId === where.legacyCatalogMedicationId) {
            return product;
          }
        }
        return null;
      },
      create: async () => {
        throw new Error("unexpected product create in ENRICH test");
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<{
          governanceNotes: string;
          administrationType: string;
          legacyCatalogMedicationId: string;
        }>;
      }) => {
        for (const product of products.values()) {
          if (product.id === where.id) {
            Object.assign(product, data);
            return product;
          }
        }
        return null;
      },
    },
    medicationRoute: { upsert: async () => ({}), findUniqueOrThrow: async () => ({ id: "r" }) },
    medicationConcept: { findUnique: async () => null, create: async () => ({ id: "c" }) },
    medicationConcentration: { create: async () => ({ id: "conc" }) },
    medicationPackage: { create: async () => ({ id: "pkg" }), update: async () => ({}) },
    medicationBillingProfile: { create: async () => ({ id: "bp" }) },
    medicationSafetyProfile: {
      findUnique: async () => ({ isHighAlert: false, requiresWitness: false, requiresDoubleSign: false }),
      create: async () => ({}),
      update: async () => ({}),
    },
    medicationAdministrationProfile: { upsert: async () => ({}) },
  } as unknown as PrismaClient;
}
