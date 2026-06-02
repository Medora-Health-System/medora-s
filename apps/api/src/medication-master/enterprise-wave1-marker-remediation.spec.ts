import type { PrismaClient } from "@prisma/client";
import { ENTERPRISE_WAVE1_BILLING_BY_CODE } from "@medora/shared";
import {
  ENTERPRISE_M16B_WAVE1_GOVERNANCE_NOTES_PREFIX,
  ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER,
  mergeEnterpriseWave1GovernanceNotes,
  productHasEnterpriseWave1GovernanceMarker,
} from "./enterprise-wave1.constants";
import {
  evaluateEnterpriseWave1ActivationBillingGate,
  productHasEnterpriseWave1LinkageMarker,
} from "./enterprise-wave1-billing-gate.util";
import { HAITI_M15E_LINKAGE_ONLY_MARKER } from "./haiti-canonical-linkage.constants";
import { seedEnterpriseWave1Formulary } from "../../prisma/helpers/seed-enterprise-wave1-formulary";

const AMLODIPINE_CODE = "AMLODIPINE_5_MG_COMPRIME_ORAL";

/** Nine M1.5E ENRICH rows missing Wave 1 marker before M1.6B.3 (M1.6B.2 audit). */
const ENRICH_MISSING_MARKER_CODES = [
  "AMLODIPINE_5_MG_COMPRIME_ORAL",
  "CARVEDILOL_6.25_MG_COMPRIME_ORAL",
  "HYDROCHLOROTHIAZIDE_25",
  "LEVOTHYROXINE_50_MCG_COMPRIME_ORAL",
  "LISINOPRIL_10",
  "LOSARTAN_50",
  "OMEPRAZOLE_20",
  "PANTOPRAZOLE_40_MG_COMPRIME_ORAL",
  "SIMVASTATIN_20_MG_COMPRIME_ORAL",
] as const;

jest.mock("../../prisma/helpers/enterprise-wave1-formulary-seed-modules", () => {
  const enrichCodes = new Set([
    "AMLODIPINE_5_MG_COMPRIME_ORAL",
    "CARVEDILOL_6.25_MG_COMPRIME_ORAL",
    "HYDROCHLOROTHIAZIDE_25",
    "LEVOTHYROXINE_50_MCG_COMPRIME_ORAL",
    "LISINOPRIL_10",
    "LOSARTAN_50",
    "OMEPRAZOLE_20",
    "PANTOPRAZOLE_40_MG_COMPRIME_ORAL",
    "SIMVASTATIN_20_MG_COMPRIME_ORAL",
  ]);
  const formulary = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseWave1FormularyManifest"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseWave1FormularyManifest");
  const billing = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseWave1BillingManifest"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseWave1BillingManifest");
  const validation = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseWave1FormularyValidation"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseWave1FormularyValidation");
  const billingValidation = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseWave1BillingValidation"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseWave1BillingValidation");
  const search = jest.requireActual(
    "../../../../packages/shared/src/medication/enterpriseWave1SearchValidation"
  ) as typeof import("../../../../packages/shared/src/medication/enterpriseWave1SearchValidation");
  const filteredManifest = formulary.ENTERPRISE_WAVE1_FORMULARY_MANIFEST.filter((e) =>
    enrichCodes.has(e.catalogCode)
  );
  return {
    loadEnterpriseWave1FormularySeedModules: async () => ({
      ...formulary,
      ...billing,
      ...validation,
      ...billingValidation,
      ...search,
      ENTERPRISE_WAVE1_FORMULARY_MANIFEST: filteredManifest,
      assertEnterpriseWave1FormularyManifest: () => {},
    }),
  };
});

describe("M1.6B.3 — Wave 1 governance marker merge", () => {
  const m15eNotes = `M1.5E Haiti canonical linkage — provider search unchanged until M1.5F cutover.\n${HAITI_M15E_LINKAGE_ONLY_MARKER}`;

  it("appends Wave 1 prefix and marker to M1.5E alreadyLinked notes", () => {
    const merged = mergeEnterpriseWave1GovernanceNotes(m15eNotes);
    expect(merged).toContain(HAITI_M15E_LINKAGE_ONLY_MARKER);
    expect(merged).toContain(ENTERPRISE_M16B_WAVE1_GOVERNANCE_NOTES_PREFIX);
    expect(merged).toContain(ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER);
    expect(productHasEnterpriseWave1GovernanceMarker(merged)).toBe(true);
  });

  it("does not duplicate marker or prefix on re-run", () => {
    const once = mergeEnterpriseWave1GovernanceNotes(m15eNotes);
    const twice = mergeEnterpriseWave1GovernanceNotes(once);
    expect(twice).toBe(once);
    expect(twice.match(/ENTERPRISE_M16B_WAVE1_FORMULARY/g)?.length).toBe(1);
    expect(twice.match(/M1\.6B Enterprise Wave 1 formulary/g)?.length).toBe(1);
  });

  it("CREATE path empty notes receive marker via merge(null)", () => {
    const merged = mergeEnterpriseWave1GovernanceNotes(null);
    expect(merged).toContain(ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER);
    expect(merged).toContain(ENTERPRISE_M16B_WAVE1_GOVERNANCE_NOTES_PREFIX);
  });

  it("applies Wave 1 billing gate when marker present after merge", () => {
    const billing = ENTERPRISE_WAVE1_BILLING_BY_CODE[AMLODIPINE_CODE]!;
    const merged = mergeEnterpriseWave1GovernanceNotes(m15eNotes);
    const gate = evaluateEnterpriseWave1ActivationBillingGate({
      governanceNotes: merged,
      snapshot: {
        catalogCode: AMLODIPINE_CODE,
        billingCodeDefault: billing.hcpcs,
        ndc11: billing.ndc11,
        packageNdc11: billing.ndc11,
        billingProfileHcpcs: billing.hcpcs,
        hasBillingProfile: true,
      },
    });
    expect(productHasEnterpriseWave1LinkageMarker(merged)).toBe(true);
    expect(gate.allowed).toBe(true);
    expect(gate.blockers).toEqual([]);
  });

  it("billing gate bypassed without marker (pre-M1.6B.3 behavior)", () => {
    const gate = evaluateEnterpriseWave1ActivationBillingGate({
      governanceNotes: m15eNotes,
      snapshot: {
        catalogCode: AMLODIPINE_CODE,
        hasBillingProfile: false,
      },
    });
    expect(productHasEnterpriseWave1LinkageMarker(m15eNotes)).toBe(false);
    expect(gate.allowed).toBe(true);
  });
});

describe("M1.6B.3 — seed ENRICH alreadyLinked marker remediation", () => {
  type MockState = {
    catalogs: Array<{ id: string; code: string; genericName: string | null }>;
    products: Array<{
      id: string;
      code: string;
      conceptId: string;
      legacyCatalogMedicationId: string | null;
      isActive: boolean;
      governanceStatus: string;
      governanceNotes: string | null;
    }>;
    packages: Array<{ id: string; code: string; productId: string; ndc11: string | null }>;
    billingProfiles: Array<{ id: string; packageId: string; hcpcsCodeSuggested: string | null }>;
  };

  function buildM15eEnrichPrisma(): { prisma: PrismaClient; state: MockState } {
    const state: MockState = {
      catalogs: ENRICH_MISSING_MARKER_CODES.map((code, i) => ({
        id: `cat-${i}`,
        code,
        genericName: code.split("_")[0] ?? code,
      })),
      products: ENRICH_MISSING_MARKER_CODES.map((code, i) => ({
        id: `prod-${i}`,
        code,
        conceptId: `concept-${i}`,
        legacyCatalogMedicationId: `cat-${i}`,
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: `M1.5E Haiti canonical linkage.\n${HAITI_M15E_LINKAGE_ONLY_MARKER}`,
      })),
      packages: ENRICH_MISSING_MARKER_CODES.map((code, i) => ({
        id: `pkg-${i}`,
        code: `${code}_PKG_DEFAULT`,
        productId: `prod-${i}`,
        ndc11: ENTERPRISE_WAVE1_BILLING_BY_CODE[code]?.ndc11 ?? "00037003701",
      })),
      billingProfiles: ENRICH_MISSING_MARKER_CODES.map((_, i) => ({
        id: `bp-${i}`,
        packageId: `pkg-${i}`,
        hcpcsCodeSuggested: "J3490",
      })),
    };

    const prisma = {
      catalogMedication: {
        findUnique: async ({ where }: { where: { code: string } }) => {
          const row = state.catalogs.find((c) => c.code === where.code);
          if (!row) return null;
          return {
            id: row.id,
            code: row.code,
            genericName: row.genericName,
            billingCodeDefault: "J3490",
            ndc11: "00037003701",
          };
        },
        upsert: async ({
          where,
          create,
        }: {
          where: { code: string };
          create: { code: string; genericName: string };
        }) => {
          let row = state.catalogs.find((c) => c.code === where.code);
          if (!row) {
            row = {
              id: `cat-new-${state.catalogs.length}`,
              code: create.code,
              genericName: create.genericName,
            };
            state.catalogs.push(row);
          }
          return { id: row.id, code: row.code };
        },
      },
      medicationProduct: {
        findUnique: async ({ where }: { where: { code: string } }) => {
          const p = state.products.find((x) => x.code === where.code);
          if (!p) return null;
          return {
            ...p,
            concept: { genericName: "Generic", isActive: false },
            packages: state.packages
              .filter((pk) => pk.productId === p.id)
              .map((pk) => ({
                ...pk,
                billingProfiles: state.billingProfiles.filter((b) => b.packageId === pk.id),
              })),
          };
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { governanceNotes?: string };
        }) => {
          const p = state.products.find((x) => x.id === where.id);
          if (!p) throw new Error("missing product");
          if (data.governanceNotes !== undefined) p.governanceNotes = data.governanceNotes;
          return p;
        },
      },
      medicationPackage: { update: async () => ({}) },
      medicationBillingProfile: { create: async () => ({ id: "new-bp" }) },
      medicationAlias: {
        findUnique: async () => null,
        findMany: async () => [],
        create: async () => ({}),
      },
      medicationSafetyProfile: {
        findUnique: async ({ where }: { where: { conceptId: string } }) => ({
          conceptId: where.conceptId,
          isHighAlert: false,
          isControlled: false,
          requiresWitness: false,
          requiresDoubleSign: false,
        }),
        update: async () => ({}),
      },
      billingCatalog: { findFirst: async () => ({ id: "bc" }), create: async () => ({}) },
      medicationRoute: { upsert: async () => ({}), findUniqueOrThrow: async () => ({ id: "route" }) },
      medicationConcept: { findUnique: async () => null, create: async () => ({ id: "c" }) },
      medicationConcentration: { create: async () => ({ id: "conc" }) },
      medicationAdministrationProfile: { upsert: async () => ({}) },
    } as unknown as PrismaClient;

    return { prisma, state };
  }

  it("updates 9 ENRICH alreadyLinked rows; second run is idempotent; products stay inactive", async () => {
    const { prisma, state } = buildM15eEnrichPrisma();
    const first = await seedEnterpriseWave1Formulary(prisma, { dryRun: false });
    expect(first.wave1GovernanceNotesUpdated).toBe(9);
    expect(first.alreadyLinked).toBe(9);
    expect(first.productsCreated).toBe(0);

    for (const code of ENRICH_MISSING_MARKER_CODES) {
      const p = state.products.find((x) => x.code === code)!;
      expect(p.isActive).toBe(false);
      expect(p.governanceStatus).toBe("REVIEW_REQUIRED");
      expect(p.governanceNotes).toContain(HAITI_M15E_LINKAGE_ONLY_MARKER);
      expect(productHasEnterpriseWave1GovernanceMarker(p.governanceNotes)).toBe(true);
      expect(state.billingProfiles.some((b) => b.packageId === state.packages.find((pk) => pk.productId === p.id)?.id)).toBe(
        true
      );
    }

    const second = await seedEnterpriseWave1Formulary(prisma, { dryRun: false });
    expect(second.wave1GovernanceNotesUpdated).toBe(0);
    for (const code of ENRICH_MISSING_MARKER_CODES) {
      const notes = state.products.find((x) => x.code === code)!.governanceNotes ?? "";
      expect((notes.match(/ENTERPRISE_M16B_WAVE1_FORMULARY/g) ?? []).length).toBe(1);
    }
  });
});
