import type { PrismaClient } from "@prisma/client";
import {
  auditHaitiCanonicalStabilization,
  remediateHaitiCanonicalStabilization,
  rollbackHaitiCanonicalStabilizationCatalogRemediation,
} from "../../prisma/helpers/seed-haiti-canonical-stabilization-remediation";
import {
  HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER,
  HAITI_M15R_LINK_UNLINKED_MARKER,
} from "./haiti-canonical-stabilization-remediation.constants";

jest.mock("../../prisma/helpers/haiti-canonical-stabilization-remediation-seed-modules", () => {
  const remediation = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalStabilizationRemediation"
  );
  const validation = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalStabilizationRemediationValidation"
  );
  const manifest = jest.requireActual(
    "../../../../packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest"
  );
  return {
    loadHaitiCanonicalStabilizationRemediationSeedModules: async () => ({
      ...remediation,
      ...validation,
      HAITI_CANONICAL_LINKAGE_MANIFEST: manifest.HAITI_CANONICAL_LINKAGE_MANIFEST,
    }),
  };
});

type MockState = {
  catalogs: Array<{
    id: string;
    code: string;
    genericName: string | null;
    isActive: boolean;
    description: string | null;
  }>;
  products: Array<{
    id: string;
    code: string;
    conceptId: string;
    baselineAvailable: boolean;
    legacyCatalogMedicationId: string | null;
    governanceNotes: string | null;
    concept: { genericName: string };
  }>;
  writes: number;
};

function buildMockState(): MockState {
  return {
    catalogs: [
      {
        id: "cat-haiti",
        code: "PARACETAMOL_1_G_COMPRIME_ORAL",
        genericName: "Paracetamol",
        isActive: true,
        description: null,
      },
      {
        id: "cat-clone",
        code: "19G1-ACET-999",
        genericName: "Acetaminophen",
        isActive: true,
        description: null,
      },
    ],
    products: [
      {
        id: "prod-bad",
        code: "19G1-ACET-999",
        conceptId: "concept-acet",
        baselineAvailable: false,
        legacyCatalogMedicationId: "cat-haiti",
        governanceNotes: null,
        concept: { genericName: "Acetaminophen" },
      },
    ],
    writes: 0,
  };
}

function buildMockPrisma(state: MockState): PrismaClient {
  return {
    catalogMedication: {
      count: jest.fn(async (args?: { where?: { isActive?: boolean } }) => {
        if (args?.where?.isActive === true) return state.catalogs.filter((c) => c.isActive).length;
        return state.catalogs.length;
      }),
      findMany: jest.fn(
        async (args?: {
          where?: { isActive?: boolean; id?: { in: string[] }; description?: { contains: string } };
          select?: unknown;
        }) => {
          let rows = [...state.catalogs];
          if (args?.where?.isActive === true) rows = rows.filter((c) => c.isActive);
          if (args?.where?.id?.in) rows = rows.filter((c) => args.where!.id!.in.includes(c.id));
          if (args?.where?.description?.contains === HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER) {
            rows = rows.filter((c) =>
              c.description?.includes(HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER)
            );
          }
          return rows;
        }
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { isActive?: boolean; description?: string | null };
        }) => {
          state.writes += 1;
          const row = state.catalogs.find((c) => c.id === where.id)!;
          if (typeof data.isActive === "boolean") row.isActive = data.isActive;
          if (data.description !== undefined) row.description = data.description;
          return row;
        }
      ),
    },
    medicationProduct: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () =>
        state.products.map((p) => ({
          id: p.id,
          code: p.code,
          baselineAvailable: p.baselineAvailable,
          legacyCatalogMedicationId: p.legacyCatalogMedicationId,
          governanceNotes: p.governanceNotes,
          concept: p.concept,
        }))
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { legacyCatalogMedicationId: null; governanceNotes?: string };
        }) => {
          state.writes += 1;
          const row = state.products.find((p) => p.id === where.id)!;
          row.legacyCatalogMedicationId = data.legacyCatalogMedicationId;
          if (data.governanceNotes) row.governanceNotes = data.governanceNotes;
          return row;
        }
      ),
    },
  } as unknown as PrismaClient;
}

describe("seedHaitiCanonicalStabilizationRemediation (M1.5R)", () => {
  it("audit counts incorrect baseline acet link", async () => {
    const state = buildMockState();
    const prisma = buildMockPrisma(state);
    const audit = await auditHaitiCanonicalStabilization(prisma);
    expect(audit.linkAudit.incorrect + audit.linkAudit.quarantined).toBeGreaterThan(0);
    expect(audit.activePollutionCatalogs).toBe(1);
  });

  it("dry run remediation plans unlink + catalog deactivation", async () => {
    const state = buildMockState();
    const prisma = buildMockPrisma(state);
    const result = await remediateHaitiCanonicalStabilization(prisma, { dryRun: true });
    expect(result.unlinkedInvalidProducts).toBe(1);
    expect(result.deactivatedPollutionCatalogs).toBe(1);
    expect(state.writes).toBe(0);
  });

  it("applies remediation without deleting rows", async () => {
    const state = buildMockState();
    const prisma = buildMockPrisma(state);
    await remediateHaitiCanonicalStabilization(prisma, { dryRun: false });
    expect(state.products[0]?.legacyCatalogMedicationId).toBeNull();
    expect(state.products[0]?.governanceNotes).toContain(HAITI_M15R_LINK_UNLINKED_MARKER);
    expect(state.catalogs.find((c) => c.code.startsWith("19G"))?.isActive).toBe(false);
    expect(state.catalogs.find((c) => c.code.startsWith("19G"))?.description).toContain(
      HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER
    );
    expect(state.catalogs.find((c) => c.code.startsWith("PARACETAMOL"))?.isActive).toBe(true);
  });

  it("rollback reactivates remediated pollution catalogs", async () => {
    const state = buildMockState();
    const prisma = buildMockPrisma(state);
    await remediateHaitiCanonicalStabilization(prisma, { dryRun: false });
    const rolled = await rollbackHaitiCanonicalStabilizationCatalogRemediation(prisma, {
      dryRun: false,
    });
    expect(rolled.reactivatedCatalogs).toBe(1);
    expect(state.catalogs.find((c) => c.code.startsWith("19G"))?.isActive).toBe(true);
  });
});
