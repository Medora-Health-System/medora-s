import type { PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import {
  HaitiCanonicalLinkageBackfillError,
  seedHaitiCanonicalMedicationLinkage,
} from "../../prisma/helpers/seed-haiti-canonical-medication-linkage";
import { evaluateProviderOrderSearchGate } from "./medication-product-activation-gates.util";
import { defaultProductRuntimeActivationMeta } from "./medication-product-runtime-activation.util";
import { HAITI_M15E_LINKAGE_ONLY_MARKER } from "./haiti-canonical-linkage.constants";

jest.mock("../../prisma/helpers/haiti-canonical-linkage-seed-modules", () => {
  const manifest = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest"
  );
  const formulary = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiMedicationFormularyCatalog"
  );
  const validation = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationValidation"
  );
  const quarantine = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationQuarantine"
  );
  const matching = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationMatching"
  );
  const billingNdc = jest.requireActual(
    "../../../../packages/shared/src/medication/medicationBillingNdcByCatalogCode"
  );
  const billingManifest = jest.requireActual(
    "../../../../packages/shared/src/medication/medicationBillingMappingManifest"
  );
  const billingValidation = jest.requireActual(
    "../../../../packages/shared/src/medication/medicationBillingMappingValidation"
  );
  return {
    loadHaitiCanonicalLinkageSeedModules: async () => ({
      HAITI_CANONICAL_LINKAGE_MANIFEST: manifest.HAITI_CANONICAL_LINKAGE_MANIFEST,
      HAITI_MEDICATION_FORMULARY_CATALOG: formulary.HAITI_MEDICATION_FORMULARY_CATALOG,
      assertHaitiCanonicalLinkageManifest: validation.assertHaitiCanonicalLinkageManifest,
      validateManifest: validation.validateManifest,
      isQuarantinedCanonicalProduct: quarantine.isQuarantinedCanonicalProduct,
      classifyQuarantine: quarantine.classifyQuarantine,
      getQuarantineReason: quarantine.getQuarantineReason,
      productCodeLooksQuarantined: matching.productCodeLooksQuarantined,
      isQuarantinedMatchTarget: matching.isQuarantinedMatchTarget,
      MEDICATION_BILLING_NDC_BY_CATALOG_CODE: billingNdc.MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
      MEDICATION_BILLING_MAPPING_BY_CODE: billingManifest.MEDICATION_BILLING_MAPPING_BY_CODE,
      resolveMedicationHcpcsForCatalogRow: billingValidation.resolveMedicationHcpcsForCatalogRow,
    }),
  };
});

const ACYCLOVIR_CODE = "ACYCLOVIR_200_MG_COMPRIME_ORAL";
const MORPHINE_CODE = "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION";

type MockState = {
  concepts: Array<{ id: string; code: string; genericName: string; isActive: boolean }>;
  products: Array<{
    id: string;
    code: string;
    conceptId: string;
    legacyCatalogMedicationId: string | null;
    baselineAvailable: boolean;
    isActive: boolean;
    governanceStatus: string;
    governanceNotes: string | null;
  }>;
  packages: Array<{
    id: string;
    code: string;
    productId: string;
    ndc11: string | null;
    isActive: boolean;
  }>;
  catalogs: Array<{
    id: string;
    code: string;
    genericName: string | null;
    displayNameFr: string | null;
    displayNameEn: string | null;
    strength: string | null;
    dosageForm: string | null;
    route: string | null;
    administrationType: string | null;
    billingCodeDefault: string | null;
    ndc11: string | null;
    ndcDisplay: string | null;
    billingUnitType: string | null;
    billingClass: string | null;
    isControlled: boolean;
    controlledSchedule: string | null;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
    isActive: boolean;
  }>;
  safetyProfiles: Array<{ conceptId: string }>;
  billingProfiles: Array<{ packageId: string; hcpcsCodeSuggested: string | null }>;
  adminProfiles: Array<{ productId: string }>;
  routes: Array<{ id: string; code: string }>;
  concentrations: Array<{ id: string }>;
  writes: number;
};

function buildMockPrisma(catalogCodes: string[]): { prisma: PrismaClient; state: MockState } {
  const state: MockState = {
    concepts: [],
    products: [],
    packages: [],
    catalogs: catalogCodes.map((code, i) => ({
      id: `cat-${i}`,
      code,
      genericName: code.startsWith("MORPHINE") ? "Morphine" : "Acyclovir",
      displayNameFr: code,
      displayNameEn: code,
      strength: code.includes("200") ? "200 mg" : "10 mg",
      dosageForm: code.includes("COMPRIME") ? "comprimé" : "injectable",
      route: code.includes("COMPRIME") ? "orale" : "injectable",
      administrationType: code.includes("COMPRIME") ? "ORAL" : "PUSH",
      billingCodeDefault: null,
      ndc11: null,
      ndcDisplay: null,
      billingUnitType: null,
      billingClass: null,
      isControlled: code.startsWith("MORPHINE"),
      controlledSchedule: code.startsWith("MORPHINE") ? "II" : null,
      requiresWitness: false,
      requiresDoubleSign: false,
      isActive: true,
    })),
    safetyProfiles: [],
    billingProfiles: [],
    adminProfiles: [],
    routes: [{ id: "route-1", code: "INJECTION" }],
    concentrations: [],
    writes: 0,
  };

  const mapProducts = () =>
    state.products.map((p) => ({
      ...p,
      concept: state.concepts.find((c) => c.id === p.conceptId)!,
      packages: state.packages
        .filter((pkg) => pkg.productId === p.id)
        .map((pkg) => ({
          ...pkg,
          billingProfiles: state.billingProfiles.filter((b) => b.packageId === pkg.id),
        })),
    }));

  const prisma = {
    medicationConcept: {
      findMany: jest.fn(async () => state.concepts),
      findUnique: jest.fn(),
      create: jest.fn(async ({ data }: { data: { code: string; genericName: string; displayName: string } }) => {
        state.writes += 1;
        const row = { id: `concept-${state.concepts.length}`, code: data.code, genericName: data.genericName, isActive: false };
        state.concepts.push(row);
        return row;
      }),
    },
    catalogMedication: {
      findMany: jest.fn(async ({ where }: { where: { code: { in: string[] } } }) =>
        state.catalogs.filter((c) => where.code.in.includes(c.code))
      ),
    },
    medicationRoute: {
      upsert: jest.fn(async () => {
        state.writes += 1;
        return state.routes[0];
      }),
      findUniqueOrThrow: jest.fn(async () => state.routes[0]),
    },
    medicationConcentration: {
      create: jest.fn(async () => {
        state.writes += 1;
        const row = { id: `conc-${state.concentrations.length}` };
        state.concentrations.push(row);
        return row;
      }),
    },
    medicationProduct: {
      findMany: jest.fn(async ({ where }: { where?: { OR?: unknown[] } }) => {
        const productCodes = new Set<string>();
        const conceptCodes = new Set<string>();
        const or = where?.OR as Array<{
          code?: { in: string[] };
          concept?: { code: { in: string[] } };
        }>;
        for (const clause of or ?? []) {
          clause.code?.in?.forEach((c) => productCodes.add(c));
          clause.concept?.code.in?.forEach((c) => conceptCodes.add(c));
        }
        return mapProducts().filter(
          (p) =>
            (productCodes.size === 0 && conceptCodes.size === 0) ||
            productCodes.has(p.code) ||
            conceptCodes.has(state.concepts.find((c) => c.id === p.conceptId)?.code ?? "")
        );
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.writes += 1;
        const row = {
          id: `prod-${state.products.length}`,
          code: data.code as string,
          conceptId: data.conceptId as string,
          legacyCatalogMedicationId: (data.legacyCatalogMedicationId as string) ?? null,
          baselineAvailable: (data.baselineAvailable as boolean) ?? false,
          isActive: (data.isActive as boolean) ?? false,
          governanceStatus: (data.governanceStatus as string) ?? "REVIEW_REQUIRED",
          governanceNotes: (data.governanceNotes as string) ?? null,
        };
        state.products.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        state.writes += 1;
        const row = state.products.find((p) => p.id === where.id)!;
        if (data.legacyCatalogMedicationId) row.legacyCatalogMedicationId = data.legacyCatalogMedicationId as string;
        if (data.governanceNotes) row.governanceNotes = data.governanceNotes as string;
        return row;
      }),
    },
    medicationPackage: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.writes += 1;
        const row = {
          id: `pkg-${state.packages.length}`,
          code: data.code as string,
          productId: data.productId as string,
          ndc11: (data.ndc11 as string) ?? null,
          isActive: (data.isActive as boolean) ?? false,
        };
        state.packages.push(row);
        return row;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const pkg = state.packages.find((p) => p.id === where.id);
        if (!pkg) return null;
        return {
          ...pkg,
          billingProfiles: state.billingProfiles.filter((b) => b.packageId === pkg.id),
        };
      }),
      update: jest.fn(async () => {
        state.writes += 1;
      }),
    },
    medicationSafetyProfile: {
      findUnique: jest.fn(async ({ where }: { where: { conceptId: string } }) =>
        state.safetyProfiles.find((s) => s.conceptId === where.conceptId) ?? null
      ),
      create: jest.fn(async ({ data }: { data: { conceptId: string } }) => {
        state.writes += 1;
        state.safetyProfiles.push({ conceptId: data.conceptId });
      }),
    },
    medicationBillingProfile: {
      create: jest.fn(async ({ data }: { data: { packageId: string; hcpcsCodeSuggested: string } }) => {
        state.writes += 1;
        state.billingProfiles.push({
          packageId: data.packageId,
          hcpcsCodeSuggested: data.hcpcsCodeSuggested,
        });
      }),
    },
    medicationAdministrationProfile: {
      findUnique: jest.fn(async ({ where }: { where: { productId: string } }) =>
        state.adminProfiles.find((a) => a.productId === where.productId) ?? null
      ),
      create: jest.fn(async ({ data }: { data: { productId: string } }) => {
        state.writes += 1;
        state.adminProfiles.push({ productId: data.productId });
      }),
    },
  } as unknown as PrismaClient;

  return { prisma, state };
}

describe("seedHaitiCanonicalMedicationLinkage (M1.5E)", () => {
  it("dry run performs no writes", async () => {
    const { prisma, state } = buildMockPrisma([ACYCLOVIR_CODE]);
    const result = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: true });
    expect(state.writes).toBe(0);
    expect(result.dryRun).toBe(true);
    expect(result.createdProducts).toBeGreaterThan(0);
  });

  it("creates clean canonical chain for MISSING_CANONICAL_TARGET and links catalog", async () => {
    const { prisma, state } = buildMockPrisma([ACYCLOVIR_CODE]);
    const result = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false });
    expect(result.createdConcepts).toBeGreaterThan(0);
    expect(result.createdProducts).toBe(1);
    expect(result.createdPackages).toBe(1);
    expect(result.linkedCatalogMedications).toBe(1);
    const product = state.products.find((p) => p.code === ACYCLOVIR_CODE);
    expect(product?.legacyCatalogMedicationId).toBe(state.catalogs[0]?.id);
    expect(product?.isActive).toBe(false);
    expect(product?.governanceNotes).toContain(HAITI_M15E_LINKAGE_ONLY_MARKER);
  });

  it("skips MANUAL_REVIEW rows", async () => {
    const { prisma } = buildMockPrisma([MORPHINE_CODE]);
    const result = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false });
    expect(result.skippedManualReview).toBeGreaterThan(0);
    expect(result.createdProducts).toBe(0);
  });

  it("is idempotent on second run", async () => {
    const { prisma, state } = buildMockPrisma([ACYCLOVIR_CODE]);
    const first = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false });
    const writesAfterFirst = state.writes;
    const second = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false });
    expect(second.createdConcepts).toBe(0);
    expect(second.createdProducts).toBe(0);
    expect(second.createdPackages).toBe(0);
    expect(second.alreadyLinked).toBeGreaterThan(0);
    expect(state.writes).toBe(writesAfterFirst);
    expect(first.linkedCatalogMedications).toBe(1);
  });

  it("rejects quarantined existing target reuse", async () => {
    const { prisma, state } = buildMockPrisma([ACYCLOVIR_CODE]);
    state.concepts.push({
      id: "c-noise",
      code: "NOISE_ACET",
      genericName: "Acetaminophen",
      isActive: false,
    });
    state.products.push({
      id: "prod-quarantine",
      code: ACYCLOVIR_CODE,
      conceptId: "c-noise",
      legacyCatalogMedicationId: null,
      baselineAvailable: true,
      isActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      governanceNotes: null,
    });
    await expect(seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false })).rejects.toBeInstanceOf(
      HaitiCanonicalLinkageBackfillError
    );
  });

  it("does not activate noisy canonical products", async () => {
    const { prisma, state } = buildMockPrisma([ACYCLOVIR_CODE]);
    await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: false });
    expect(state.products.every((p) => !p.isActive)).toBe(true);
  });

  it("preserves provider search eligibility for M1.5E linkage-only inactive products", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      formularyOnFormulary: false,
      facilityId: "fac-1",
      formularyFacilityId: null,
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
      linkageOnlyHaitiM15e: true,
    });
    expect(gate.allowed).toBe(true);
  });

  it("still blocks inactive linked products without M1.5E marker (clone noise)", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      formularyOnFormulary: false,
      facilityId: "fac-1",
      formularyFacilityId: null,
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
      linkageOnlyHaitiM15e: false,
    });
    expect(gate.allowed).toBe(false);
  });
});
