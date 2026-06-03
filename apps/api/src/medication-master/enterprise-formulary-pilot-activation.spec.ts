import type { PrismaClient } from "@prisma/client";
import {
  activateEnterpriseFormularyPilotTrancheA,
  EnterpriseFormularyPilotActivationError,
  rollbackEnterpriseFormularyPilotTrancheA,
  validateEnterprisePilotCatalogCodeRequest,
} from "../../prisma/helpers/seed-enterprise-formulary-pilot-activation";
import { ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_BY_CODE } from "@medora/shared";
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
const TRANCHE_CTX = { trancheByCode: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_BY_CODE };

describe("M1.6G.1 — fail-closed catalog code validation", () => {
  it("rejects undefined catalog codes", () => {
    expect(() => validateEnterprisePilotCatalogCodeRequest(undefined, TRANCHE_CTX)).toThrow(
      /fail-closed.*explicit catalog codes required/
    );
  });

  it("rejects empty catalog code array", () => {
    expect(() => validateEnterprisePilotCatalogCodeRequest([], TRANCHE_CTX)).toThrow(
      /catalog code list is empty/
    );
  });

  it("rejects whitespace-only catalog codes", () => {
    expect(() => validateEnterprisePilotCatalogCodeRequest(["   ", "\t"], TRANCHE_CTX)).toThrow(
      /fail-closed/
    );
  });

  it("rejects unknown catalog codes", () => {
    expect(() =>
      validateEnterprisePilotCatalogCodeRequest(["NOT_A_REAL_TRANCHE_A_CODE"], TRANCHE_CTX)
    ).toThrow(/fail-closed.*NOT_A_REAL_TRANCHE_A_CODE/);
  });

  it("rejects duplicate catalog codes", () => {
    expect(() =>
      validateEnterprisePilotCatalogCodeRequest([PILOT_CODE, PILOT_CODE], TRANCHE_CTX)
    ).toThrow(EnterpriseFormularyPilotActivationError);
    try {
      validateEnterprisePilotCatalogCodeRequest([PILOT_CODE, PILOT_CODE], TRANCHE_CTX);
    } catch (err) {
      expect(err).toBeInstanceOf(EnterpriseFormularyPilotActivationError);
      expect((err as EnterpriseFormularyPilotActivationError).failures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            catalogCode: PILOT_CODE,
            reason: "duplicate catalog code",
          }),
        ])
      );
    }
  });

  it("rejects more than 15 catalog codes", () => {
    const mockCtx = {
      trancheByCode: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [
          `MOCK_PILOT_CODE_${i}`,
          {
            catalogCode: `MOCK_PILOT_CODE_${i}`,
            pilotEligible: true,
            pilotRationale: "mock eligible",
          },
        ])
      ),
    };
    const codes = Array.from({ length: 16 }, (_, i) => `MOCK_PILOT_CODE_${i}`);
    expect(() => validateEnterprisePilotCatalogCodeRequest(codes, mockCtx)).toThrow(/bulk activation/);
  });

  it("accepts a single valid Tranche A code", () => {
    expect(validateEnterprisePilotCatalogCodeRequest([PILOT_CODE], TRANCHE_CTX)).toEqual([
      PILOT_CODE,
    ]);
  });

  it("dry-run activation fails without catalog codes before any DB access pattern", async () => {
    const prisma = {
      medicationProduct: {
        findUnique: jest.fn(),
      },
    } as unknown as PrismaClient;
    await expect(
      activateEnterpriseFormularyPilotTrancheA(prisma, {
        facilityId: "fac-1",
        dryRun: true,
        catalogCodes: undefined,
      })
    ).rejects.toMatchObject({ name: "EnterpriseFormularyPilotActivationError" });
    expect(prisma.medicationProduct.findUnique).not.toHaveBeenCalled();
  });
});

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
    const codes = Array.from({ length: 16 }, (_, i) => `MOCK_BULK_CODE_${i}`);
    await expect(
      activateEnterpriseFormularyPilotTrancheA(prisma, {
        facilityId: "fac-1",
        catalogCodes: codes,
      })
    ).rejects.toMatchObject({ name: "EnterpriseFormularyPilotActivationError" });
  });

  it("refuses activation when catalog codes omitted", async () => {
    const prisma = {} as PrismaClient;
    await expect(
      activateEnterpriseFormularyPilotTrancheA(prisma, {
        facilityId: "fac-1",
        catalogCodes: undefined,
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
