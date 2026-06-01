import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import {
  HAITI_IMAGING_WAVE1_CATALOG,
  WAVE1_FORBIDDEN_CATALOG_CODES,
} from "../../prisma/data/haiti-imaging-wave1";
import {
  HAITI_IMAGING_WAVE2_CATALOG,
  WAVE2_FORBIDDEN_CATALOG_CODES,
  WAVE2_IMAGING_BATCH_COUNTS,
} from "../../prisma/data/haiti-imaging-wave2";
import { WAVE2_US_TUPLE_PASS, WAVE2_US_TUPLE_PASS_COUNT } from "../../prisma/data/wave2-us-tuple-pass";
import {
  assertWave2CatalogGovernance,
  seedHaitiImagingWave2,
} from "../../prisma/helpers/seed-haiti-imaging-wave2";
import {
  buildWave1ClassifierFkPayload,
  classifierIndexKey,
} from "../../prisma/helpers/wave1-imaging-classifier-fk.util";

function buildMockPrisma() {
  const classifierIds = new Map<string, string>();
  let classifierSeq = 0;
  const ensureClassifier = (domain: string, code: string) => {
    const key = classifierIndexKey(domain, code);
    if (!classifierIds.has(key)) {
      classifierSeq += 1;
      classifierIds.set(key, `cls-${classifierSeq}`);
    }
    return classifierIds.get(key)!;
  };

  for (const row of [...HAITI_IMAGING_WAVE2_CATALOG, ...HAITI_IMAGING_WAVE1_CATALOG]) {
    const c = row.classifiers;
    ensureClassifier("MODALITY", c.modality);
    ensureClassifier("BODY_REGION", c.bodyRegion);
    ensureClassifier("CONTRAST_TYPE", c.contrastType);
    ensureClassifier("LATERALITY", c.laterality);
    if (c.viewCount) ensureClassifier("VIEW_COUNT", c.viewCount);
    if (c.anatomicSubregion) ensureClassifier("ANATOMIC_SUBREGION", c.anatomicSubregion);
    if (c.protocol) ensureClassifier("PROTOCOL", c.protocol);
  }
  for (const mapping of WAVE2_US_TUPLE_PASS) {
    if (mapping.protocol) ensureClassifier("PROTOCOL", mapping.protocol);
  }

  const haitiUsCodes = ["US_ABDOMEN", "US_PELVIS", "US_SCROTUM_TESTICULAR", "US_SOFT", "US_OB_FIRST", "US_OB_GROWTH"];
  const studies = new Map<string, Record<string, unknown>>();
  for (const code of haitiUsCodes) {
    studies.set(code, {
      id: `study-${code}`,
      code,
      isActive: true,
      protocolClassifierId: null,
    });
  }

  const aliases = new Map<string, Set<string>>();

  const prisma = {
    termClassifier: {
      findMany: jest.fn(async () =>
        [...classifierIds.entries()].map(([key, id]) => {
          const [domain, code] = key.split(":");
          return { id, domain, code, isActive: true };
        })
      ),
    },
    catalogImagingStudy: {
      upsert: jest.fn(async ({ where, create, update }: { where: { code: string }; create: object; update: object }) => {
        const existing = studies.get(where.code);
        const next = {
          ...(existing ?? {}),
          ...(existing ? update : create),
          code: where.code,
          id: existing?.id ?? `study-${where.code}`,
        };
        studies.set(where.code, next);
        return next;
      }),
      findUnique: jest.fn(async ({ where }: { where: { code: string } }) => studies.get(where.code) ?? null),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { protocolClassifierId?: string } }) => {
        for (const [code, row] of studies.entries()) {
          if (row.id === where.id) {
            studies.set(code, { ...row, ...data });
            return studies.get(code);
          }
        }
        return null;
      }),
    },
    imagingStudyAlias: {
      findFirst: jest.fn(async ({ where }: { where: { catalogImagingStudyId: string; alias: string } }) => {
        const set = aliases.get(where.catalogImagingStudyId);
        return set?.has(where.alias) ? { id: "alias" } : null;
      }),
      create: jest.fn(async ({ data }: { data: { catalogImagingStudyId: string; alias: string } }) => {
        const set = aliases.get(data.catalogImagingStudyId) ?? new Set<string>();
        set.add(data.alias);
        aliases.set(data.catalogImagingStudyId, set);
        return { id: `alias-${set.size}` };
      }),
    },
    _studies: studies,
    _aliases: aliases,
  };

  return prisma;
}

describe("Wave 2 imaging catalog (2E.6B)", () => {
  it("manifest has 61 rows in XR-2 / CT-2 / US-1 batches", () => {
    expect(WAVE2_IMAGING_BATCH_COUNTS).toEqual({ xr: 53, ct: 4, us: 4, total: 61 });
    expect(HAITI_IMAGING_WAVE2_CATALOG).toHaveLength(61);
    assertWave2CatalogGovernance(HAITI_IMAGING_WAVE2_CATALOG);
  });

  it("does not collide with Wave 1, Haiti 44, or forbidden codes", () => {
    const wave2Codes = new Set(HAITI_IMAGING_WAVE2_CATALOG.map((r) => r.code));
    const wave1Codes = new Set(HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code));
    const haitiCodes = new Set(HAITI_IMAGING_CATALOG.map((r) => r.code));
    for (const forbidden of [...WAVE2_FORBIDDEN_CATALOG_CODES, ...WAVE1_FORBIDDEN_CATALOG_CODES]) {
      expect(wave2Codes.has(forbidden)).toBe(false);
    }
    for (const code of wave2Codes) {
      expect(wave1Codes.has(code)).toBe(false);
      expect(haitiCodes.has(code)).toBe(false);
    }
  });

  it("requires calcaneus aliases (2E.6A REQUIRED package)", () => {
    const left = HAITI_IMAGING_WAVE2_CATALOG.find((r) => r.code === "XR_CALCANEUS_LEFT_2V");
    const right = HAITI_IMAGING_WAVE2_CATALOG.find((r) => r.code === "XR_CALCANEUS_RIGHT_2V");
    expect(left?.aliases.length).toBeGreaterThanOrEqual(3);
    expect(right?.aliases.length).toBeGreaterThanOrEqual(3);
  });

  it("has no duplicate normalized aliases within Wave 2 manifest", () => {
    const seen = new Map<string, string>();
    for (const row of HAITI_IMAGING_WAVE2_CATALOG) {
      for (const alias of row.aliases) {
        const key = alias.trim().toLowerCase();
        const prior = seen.get(key);
        if (prior && prior !== row.code) {
          throw new Error(`duplicate alias "${alias}" on ${prior} and ${row.code}`);
        }
        seen.set(key, row.code);
      }
    }
  });

  it("defines 15 US tuple mappings", () => {
    expect(WAVE2_US_TUPLE_PASS).toHaveLength(15);
    expect(WAVE2_US_TUPLE_PASS_COUNT).toBe(15);
    expect(WAVE2_US_TUPLE_PASS.some((m) => m.catalogCode === "US_ABD")).toBe(false);
  });

  it("builds complete classifier FK payloads for every row", () => {
    const index = new Map<string, string>();
    let n = 0;
    const ensure = (domain: string, code: string) => {
      index.set(classifierIndexKey(domain, code), `id-${++n}`);
    };
    for (const row of HAITI_IMAGING_WAVE2_CATALOG) {
      const c = row.classifiers;
      ensure("MODALITY", c.modality);
      ensure("BODY_REGION", c.bodyRegion);
      ensure("CONTRAST_TYPE", c.contrastType);
      ensure("LATERALITY", c.laterality);
      if (c.viewCount) ensure("VIEW_COUNT", c.viewCount);
      if (c.anatomicSubregion) ensure("ANATOMIC_SUBREGION", c.anatomicSubregion);
      if (c.protocol) ensure("PROTOCOL", c.protocol);

      const payload = buildWave1ClassifierFkPayload(row as never, index);
      expect(payload.modalityClassifierId).toBeTruthy();
      expect(payload.bodyRegionClassifierId).toBeTruthy();
      expect(payload.contrastTypeClassifierId).toBeTruthy();
      expect(payload.lateralityClassifierId).toBeTruthy();
      if (row.implementationBatch === "XR-2" && c.viewCount) {
        expect(payload.viewCountClassifierId).toBeTruthy();
      }
      if (row.implementationBatch === "CT-2" || row.implementationBatch === "US-1") {
        expect(payload.viewCountClassifierId).toBeNull();
      }
    }
  });

  it("seed is idempotent and applies US tuple pass", async () => {
    const prisma = buildMockPrisma() as never;

    const first = await seedHaitiImagingWave2(prisma);
    expect(first.catalogUpserted).toBe(61);
    expect(first.aliasesCreated).toBeGreaterThan(0);
    expect(first.usTupleMappingsApplied).toBe(15);

    const second = await seedHaitiImagingWave2(prisma);
    expect(second.catalogUpserted).toBe(61);
    expect(second.aliasesCreated).toBe(0);
    expect(second.usTupleAliasesCreated).toBe(0);
    expect(second.usTupleProtocolsUpdated).toBe(0);

    for (const row of HAITI_IMAGING_WAVE2_CATALOG) {
      const study = (prisma as ReturnType<typeof buildMockPrisma>)._studies.get(row.code);
      expect(study).toBeDefined();
      expect(study?.modalityClassifierId).toBeTruthy();
      expect(study?.isActive).toBe(true);
    }

    const abdomen = (prisma as ReturnType<typeof buildMockPrisma>)._studies.get("US_ABDOMEN");
    expect(abdomen?.protocolClassifierId).toBeTruthy();
  });

  it("preserves governance codes in Haiti baseline manifest", () => {
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_HEAD")?.isActive).toBe(false);
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_ABD")?.isActive).toBe(true);
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "US_ABD")?.isActive).toBe(true);
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "DOPPLER_VEIN")?.isActive).toBe(true);
  });
});
