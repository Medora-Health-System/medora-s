import type { PrismaClient } from "@prisma/client";
import {
  activateEnterpriseFormularyPilotTrancheA,
  rollbackEnterpriseFormularyPilotTrancheA,
} from "../../prisma/helpers/seed-enterprise-formulary-pilot-activation";
import {
  ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER,
  mergeEnterpriseFormularyPilotGovernanceNotes,
  productHasEnterpriseFormularyPilotMarker,
} from "./enterprise-formulary-pilot.constants";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";

jest.mock("../../prisma/helpers/enterprise-formulary-pilot-seed-modules", () => {
  const tranche = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseFormularyPilotTrancheAManifest"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseFormularyPilotTrancheAManifest");
  const validation = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseFormularyPilotValidation"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseFormularyPilotValidation");
  const billing = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseWave1BillingValidation"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseWave1BillingValidation");
  return {
    loadEnterpriseFormularyPilotSeedModules: async () => ({
      ...tranche,
      ...validation,
      ...billing,
    }),
  };
});

const PILOT_CODE = "AMLODIPINE_5_MG_COMPRIME_ORAL";

describe("M1.6F — enterprise formulary pilot Tranche A", () => {
  it("merge helper appends pilot marker idempotently", () => {
    const once = mergeEnterpriseFormularyPilotGovernanceNotes(
      "ENTERPRISE_M16B_WAVE1_FORMULARY",
      "test pilot"
    );
    expect(once).toContain(ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER);
    const twice = mergeEnterpriseFormularyPilotGovernanceNotes(once, "test pilot");
    expect(twice).toBe(once);
    expect(productHasEnterpriseFormularyPilotMarker(once)).toBe(true);
  });

  it("activates single medication without orderSearchEnabled", async () => {
    const products: Array<{
      id: string;
      code: string;
      conceptId: string;
      isActive: boolean;
      governanceStatus: string;
      governanceNotes: string | null;
      administrationType: string;
    }> = [];

    const prisma = {
      medicationProduct: {
        findUnique: async ({ where }: { where: { code: string } }) => {
          if (where.code !== PILOT_CODE) return null;
          const p = products[0];
          if (!p) return null;
          return {
            ...p,
            legacyCatalogMedicationId: "cat-1",
            baselineAvailable: false,
            concept: {
              id: "concept-1",
              isActive: p.isActive,
              genericName: "Amlodipine",
              safetyProfile: {
                isControlled: false,
                isHighAlert: false,
                lasaGroupId: null,
                requiresWitness: false,
              },
            },
            packages: [
              {
                id: "pkg-1",
                isActive: false,
                ndc11: "00002000201",
                billingProfiles: [{ hcpcsCodeSuggested: "J3490", requiresManualReview: true }],
                facilityFormularyItems: [],
              },
            ],
          };
        },
        findMany: async () => [],
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { isActive?: boolean; governanceStatus?: string; governanceNotes?: string };
        }) => {
          const p = products.find((x) => x.id === where.id)!;
          Object.assign(p, data);
          return p;
        },
        create: async ({
          data,
        }: {
          data: {
            id?: string;
            code: string;
            conceptId: string;
            isActive: boolean;
            governanceStatus: string;
            governanceNotes: string;
            administrationType: string;
          };
        }) => {
          const row = {
            id: "prod-1",
            code: data.code,
            conceptId: data.conceptId,
            isActive: data.isActive,
            governanceStatus: data.governanceStatus,
            governanceNotes: data.governanceNotes,
            administrationType: data.administrationType,
          };
          products.push(row);
          return row;
        },
      },
      catalogMedication: {
        findUnique: async () => ({
          id: "cat-1",
          code: PILOT_CODE,
          genericName: "Amlodipine",
          ndc11: "00002000201",
          billingCodeDefault: "J3490",
        }),
      },
      medicationAlias: { count: async () => 2 },
      medicationConcept: {
        update: async ({ data }: { data: { isActive: boolean } }) => ({ isActive: data.isActive }),
      },
      medicationPackage: {
        update: async ({ data }: { data: { isActive: boolean } }) => ({ isActive: data.isActive }),
      },
      facilityFormularyItem: {
        create: async () => ({ id: "ffi-1" }),
        update: async () => ({}),
      },
      medicationAdministrationProfile: {
        findUnique: async () => ({ id: "admin-1" }),
      },
      $transaction: async (fn: (tx: unknown) => Promise<void>) => {
        await fn(prisma);
      },
    } as unknown as PrismaClient;

    products.push({
      id: "prod-1",
      code: PILOT_CODE,
      conceptId: "concept-1",
      isActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      governanceNotes: "ENTERPRISE_M16B_WAVE1_FORMULARY",
      administrationType: "ORAL",
    });

    const result = await activateEnterpriseFormularyPilotTrancheA(prisma, {
      facilityId: "fac-1",
      catalogCodes: [PILOT_CODE],
      dryRun: false,
      pilotNote: "unit test",
    });

    expect(result.activatedProducts).toBe(1);
    expect(products[0]!.isActive).toBe(true);
    expect(products[0]!.governanceStatus).toBe("ACTIVATION_APPROVED");
    const runtime = parseProductRuntimeActivation(products[0]!.governanceNotes);
    expect(runtime.orderSearchEnabled).toBe(false);
    expect(runtime.formularyApprovedInactive).toBe(true);
    expect(runtime.billingEnabled).toBe(false);
  });

  it("refuses bulk activation over 15 catalog codes", async () => {
    const prisma = {} as PrismaClient;
    await expect(
      activateEnterpriseFormularyPilotTrancheA(prisma, {
        facilityId: "fac-1",
        catalogCodes: Array.from({ length: 16 }, (_, i) => `CODE_${i}`),
      })
    ).rejects.toMatchObject({ name: "EnterpriseFormularyPilotActivationError" });
  });

  it("rollback restores REVIEW_REQUIRED and clears pilot marker", async () => {
    const state = {
      isActive: true,
      governanceStatus: "ACTIVATION_APPROVED",
      governanceNotes: mergeEnterpriseFormularyPilotGovernanceNotes(
        "ENTERPRISE_M16B_WAVE1_FORMULARY",
        "rollback test"
      ),
    };

    const prisma = {
      medicationProduct: {
        findMany: async () => [
          {
            id: "prod-1",
            conceptId: "concept-1",
            governanceNotes: state.governanceNotes,
            packages: [
              {
                id: "pkg-1",
                facilityFormularyItems: [{ id: "ffi-1", isOnFormulary: true }],
              },
            ],
          },
        ],
        update: async ({ data }: { data: { isActive: boolean; governanceStatus: string; governanceNotes: string } }) => {
          state.isActive = data.isActive;
          state.governanceStatus = data.governanceStatus;
          state.governanceNotes = data.governanceNotes;
          return state;
        },
      },
      medicationConcept: {
        update: async () => ({}),
      },
      medicationPackage: {
        update: async () => ({}),
      },
      facilityFormularyItem: {
        update: async () => ({}),
      },
      $transaction: async (fn: (tx: unknown) => Promise<void>) => {
        await fn(prisma);
      },
    } as unknown as PrismaClient;

    const rolled = await rollbackEnterpriseFormularyPilotTrancheA(prisma, {
      facilityId: "fac-1",
      dryRun: false,
    });
    expect(rolled.rolledBack).toBe(1);
    expect(state.isActive).toBe(false);
    expect(state.governanceStatus).toBe("REVIEW_REQUIRED");
    expect(productHasEnterpriseFormularyPilotMarker(state.governanceNotes)).toBe(false);
  });
});
