import type { PrismaClient } from "@prisma/client";
import {
  HaitiCanonicalActivationPilotError,
  rollbackHaitiCanonicalActivationPilot,
  seedHaitiCanonicalActivationPilot,
} from "../../prisma/helpers/seed-haiti-canonical-activation-pilot";
import { evaluateProviderOrderSearchGate } from "./medication-product-activation-gates.util";
import {
  defaultProductRuntimeActivationMeta,
  parseProductRuntimeActivation,
} from "./medication-product-runtime-activation.util";
import {
  HAITI_M15E_LINKAGE_ONLY_MARKER,
  HAITI_M15G_PILOT_ACTIVATED_MARKER,
} from "./haiti-canonical-linkage.constants";
import { HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE } from "../../../../packages/shared/src/medication/haitiCanonicalActivationPilotManifest";

jest.mock("../../prisma/helpers/haiti-canonical-activation-pilot-seed-modules", () => {
  const manifest = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalActivationPilotManifest"
  );
  const validation = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalActivationPilotValidation"
  );
  const quarantine = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationQuarantine"
  );
  const matching = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationMatching"
  );
  return {
    loadHaitiCanonicalActivationPilotSeedModules: async () => ({
      HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST,
      HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE,
      HAITI_CANONICAL_ACTIVATION_PILOT_STATS: manifest.HAITI_CANONICAL_ACTIVATION_PILOT_STATS,
      assertPilotManifestReady: validation.assertPilotManifestReady,
      validatePilotActivationCandidate: validation.validatePilotActivationCandidate,
      validatePilotBillingPreservation: validation.validatePilotBillingPreservation,
      validateProviderSearchNonRegression: validation.validateProviderSearchNonRegression,
      computePilotReadinessScores: validation.computePilotReadinessScores,
      getPilotEligibleCatalogCodes: validation.getPilotEligibleCatalogCodes,
      isQuarantinedCanonicalProduct: quarantine.isQuarantinedCanonicalProduct,
      productCodeLooksQuarantined: matching.productCodeLooksQuarantined,
    }),
  };
});

const FACILITY_ID = "fac-pilot-1";
const PILOT_ENTRY = HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE[0]!;

type MockState = {
  writes: number;
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
    administrationType: string | null;
  }>;
  packages: Array<{
    id: string;
    code: string;
    productId: string;
    ndc11: string | null;
    isActive: boolean;
    isDefaultForProduct: boolean;
  }>;
  catalogs: Array<{
    id: string;
    code: string;
    genericName: string | null;
    billingCodeDefault: string | null;
    ndc11: string | null;
    isControlled: boolean;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  }>;
  safetyProfiles: Array<{
    conceptId: string;
    isControlled: boolean;
    isHighAlert: boolean;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
    lasaGroupId: string | null;
  }>;
  billingProfiles: Array<{ packageId: string; hcpcsCodeSuggested: string | null }>;
  formulary: Array<{ id: string; facilityId: string; packageId: string; isOnFormulary: boolean }>;
  adminProfiles: Array<{ productId: string }>;
};

function buildLinkedM15eState(): MockState {
  const catalog = {
    id: "cat-acyclovir",
    code: PILOT_ENTRY.catalogMedicationCode,
    genericName: PILOT_ENTRY.genericName,
    billingCodeDefault: null,
    ndc11: null,
    isControlled: false,
    requiresWitness: false,
    requiresDoubleSign: false,
  };
  const conceptId = "concept-acyclovir";
  const productId = "prod-acyclovir";
  const packageId = "pkg-acyclovir";
  return {
    writes: 0,
    concepts: [
      {
        id: conceptId,
        code: PILOT_ENTRY.proposedConceptCode,
        genericName: PILOT_ENTRY.genericName,
        isActive: false,
      },
    ],
    products: [
      {
        id: productId,
        code: PILOT_ENTRY.proposedProductCode,
        conceptId,
        legacyCatalogMedicationId: catalog.id,
        baselineAvailable: false,
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: `M1.5E\n${HAITI_M15E_LINKAGE_ONLY_MARKER}`,
        administrationType: "ORAL",
      },
    ],
    packages: [
      {
        id: packageId,
        code: PILOT_ENTRY.proposedPackageCode,
        productId,
        ndc11: null,
        isActive: false,
        isDefaultForProduct: true,
      },
    ],
    catalogs: [catalog],
    safetyProfiles: [
      {
        conceptId,
        isControlled: false,
        isHighAlert: false,
        requiresWitness: false,
        requiresDoubleSign: false,
        lasaGroupId: null,
      },
    ],
    billingProfiles: [],
    formulary: [],
    adminProfiles: [],
  };
}

function buildMockPrisma(state: MockState): PrismaClient {
  const mapProductFindFirst = () => {
    const p = state.products[0];
    if (!p) return null;
    const concept = state.concepts.find((c) => c.id === p.conceptId)!;
    const safety = state.safetyProfiles.find((s) => s.conceptId === p.conceptId);
    return {
      ...p,
      concept: { ...concept, safetyProfile: safety ?? null },
      packages: state.packages
        .filter((pk) => pk.productId === p.id)
        .map((pk) => ({
          ...pk,
          billingProfiles: state.billingProfiles
            .filter((b) => b.packageId === pk.id)
            .map((b) => ({ hcpcsCodeSuggested: b.hcpcsCodeSuggested })),
          facilityFormularyItems: state.formulary
            .filter((f) => f.packageId === pk.id)
            .map((f) => ({ id: f.id, isOnFormulary: f.isOnFormulary })),
        })),
    };
  };

  const prisma = {
    medicationProduct: {
      count: jest.fn(async ({ where }: { where?: { code?: { in: string[] }; legacyCatalogMedicationId?: { not: null } } }) => {
        let rows = state.products;
        if (where?.code?.in) rows = rows.filter((p) => where.code!.in.includes(p.code));
        if (where?.legacyCatalogMedicationId?.not === null) {
          rows = rows.filter((p) => p.legacyCatalogMedicationId != null);
        }
        return rows.length;
      }),
      findMany: jest.fn(async (args?: { where?: { code?: { in: string[] }; governanceNotes?: { contains: string } } }) => {
        if (args?.where?.governanceNotes?.contains === HAITI_M15G_PILOT_ACTIVATED_MARKER) {
          return state.products
            .filter((p) => p.governanceNotes?.includes(HAITI_M15G_PILOT_ACTIVATED_MARKER))
            .map((p) => ({
              ...p,
              packages: state.packages
                .filter((pk) => pk.productId === p.id)
                .slice(0, 1)
                .map((pk) => ({
                  ...pk,
                  facilityFormularyItems: state.formulary.filter(
                    (f) => f.packageId === pk.id && f.facilityId === FACILITY_ID
                  ),
                })),
            }));
        }
        const codes = args?.where?.code?.in;
        return state.products
          .filter((p) => !codes || codes.includes(p.code))
          .map((p) => ({
            id: p.id,
            code: p.code,
            legacyCatalogMedicationId: p.legacyCatalogMedicationId,
            baselineAvailable: p.baselineAvailable,
            isActive: p.isActive,
            governanceNotes: p.governanceNotes,
            concept: {
              genericName: state.concepts.find((c) => c.id === p.conceptId)!.genericName,
            },
            packages: state.packages
              .filter((pk) => pk.productId === p.id)
              .slice(0, 1)
              .map((pk) => ({ code: pk.code, ndc11: pk.ndc11 })),
          }));
      }),
      findFirst: jest.fn(async () => mapProductFindFirst()),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        state.writes += 1;
        const row = state.products.find((p) => p.id === where.id)!;
        if (typeof data.isActive === "boolean") row.isActive = data.isActive;
        if (typeof data.governanceStatus === "string") row.governanceStatus = data.governanceStatus;
        if (typeof data.governanceNotes === "string") row.governanceNotes = data.governanceNotes;
        return row;
      }),
    },
    catalogMedication: {
      findUnique: jest.fn(async ({ where }: { where: { code: string } }) =>
        state.catalogs.find((c) => c.code === where.code) ?? null
      ),
    },
    medicationConcept: {
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => {
        state.writes += 1;
        const c = state.concepts.find((x) => x.id === where.id);
        if (c) c.isActive = data.isActive;
      }),
    },
    medicationPackage: {
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => {
        state.writes += 1;
        const pk = state.packages.find((x) => x.id === where.id);
        if (pk) pk.isActive = data.isActive;
      }),
    },
    facilityFormularyItem: {
      create: jest.fn(async ({ data }: { data: { facilityId: string; packageId: string } }) => {
        state.writes += 1;
        const row = {
          id: `ffi-${state.formulary.length}`,
          facilityId: data.facilityId,
          packageId: data.packageId,
          isOnFormulary: true,
        };
        state.formulary.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { isOnFormulary: boolean } }) => {
        state.writes += 1;
        const row = state.formulary.find((f) => f.id === where.id);
        if (row) row.isOnFormulary = data.isOnFormulary;
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
    $transaction: jest.fn(async (fn: (tx: PrismaClient) => Promise<void>) => fn(prisma)),
  } as unknown as PrismaClient;

  return prisma;
}

describe("seedHaitiCanonicalActivationPilot (M1.5G)", () => {
  it("dry run counts activations without writes", async () => {
    const state = buildLinkedM15eState();
    const prisma = buildMockPrisma(state);
    const result = await seedHaitiCanonicalActivationPilot(prisma, {
      facilityId: FACILITY_ID,
      dryRun: true,
      maxActivations: 1,
    });
    expect(result.dryRun).toBe(true);
    expect(result.activatedProducts).toBe(1);
    expect(state.writes).toBe(0);
  });

  it("activates linked pilot product and sets M1.5G marker", async () => {
    const state = buildLinkedM15eState();
    const prisma = buildMockPrisma(state);
    const result = await seedHaitiCanonicalActivationPilot(prisma, {
      facilityId: FACILITY_ID,
      dryRun: false,
      maxActivations: 1,
    });
    expect(result.activatedProducts).toBe(1);
    const product = state.products[0];
    expect(product?.isActive).toBe(true);
    expect(product?.governanceNotes).toContain(HAITI_M15G_PILOT_ACTIVATED_MARKER);
    expect(product?.governanceNotes).not.toContain(HAITI_M15E_LINKAGE_ONLY_MARKER);
    const runtime = parseProductRuntimeActivation(product?.governanceNotes ?? null);
    expect(runtime.orderSearchEnabled).toBe(true);
  });

  it("rollback deactivates pilot products and restores M1.5E marker", async () => {
    const state = buildLinkedM15eState();
    const prisma = buildMockPrisma(state);
    await seedHaitiCanonicalActivationPilot(prisma, {
      facilityId: FACILITY_ID,
      dryRun: false,
      maxActivations: 1,
    });
    const rolled = await rollbackHaitiCanonicalActivationPilot(prisma, {
      facilityId: FACILITY_ID,
      dryRun: false,
    });
    expect(rolled.rolledBack).toBe(1);
    const product = state.products[0];
    expect(product?.isActive).toBe(false);
    expect(product?.governanceNotes).toContain(HAITI_M15E_LINKAGE_ONLY_MARKER);
    expect(product?.governanceNotes).not.toContain(HAITI_M15G_PILOT_ACTIVATED_MARKER);
  });

  it("blocks activation when linkage integrity is below threshold", async () => {
    const state = buildLinkedM15eState();
    state.products[0]!.legacyCatalogMedicationId = null;
    const prisma = buildMockPrisma(state);
    await expect(
      seedHaitiCanonicalActivationPilot(prisma, {
        facilityId: FACILITY_ID,
        dryRun: false,
        maxActivations: 1,
      })
    ).rejects.toBeInstanceOf(HaitiCanonicalActivationPilotError);
  });

  it("pilot activation keeps legacy catalog search path eligible", () => {
    const gateLinkageOnly = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      formularyOnFormulary: false,
      facilityId: FACILITY_ID,
      formularyFacilityId: null,
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
      linkageOnlyHaitiM15e: true,
    });
    expect(gateLinkageOnly.allowed).toBe(true);

    const gateActivated = evaluateProviderOrderSearchGate({
      productIsActive: true,
      conceptIsActive: true,
      governanceStatus: "ACTIVATION_APPROVED",
      formularyOnFormulary: true,
      facilityId: FACILITY_ID,
      formularyFacilityId: FACILITY_ID,
      runtime: {
        ...defaultProductRuntimeActivationMeta(),
        orderSearchEnabled: true,
        formularyApprovedInactive: true,
      },
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
      linkageOnlyHaitiM15e: false,
    });
    expect(gateActivated.allowed).toBe(true);
  });
});
