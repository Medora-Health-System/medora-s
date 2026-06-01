import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import {
  HAITI_IMAGING_WAVE1_CATALOG,
  WAVE1_FORBIDDEN_CATALOG_CODES,
} from "../../prisma/data/haiti-imaging-wave1";
import {
  HAITI_IMAGING_WAVE2_CATALOG,
  WAVE2_FORBIDDEN_CATALOG_CODES,
} from "../../prisma/data/haiti-imaging-wave2";
import {
  HAITI_IMAGING_WAVE3_CATALOG,
  WAVE3_FORBIDDEN_CATALOG_CODES,
  WAVE3_IMAGING_BATCH_COUNTS,
} from "../../prisma/data/haiti-imaging-wave3";
import {
  assertWave3CatalogGovernance,
  seedHaitiImagingWave3,
} from "../../prisma/helpers/seed-haiti-imaging-wave3";
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

  for (const row of HAITI_IMAGING_WAVE3_CATALOG) {
    const c = row.classifiers;
    ensureClassifier("MODALITY", c.modality);
    ensureClassifier("BODY_REGION", c.bodyRegion);
    ensureClassifier("CONTRAST_TYPE", c.contrastType);
    ensureClassifier("LATERALITY", c.laterality);
    if (c.anatomicSubregion) ensureClassifier("ANATOMIC_SUBREGION", c.anatomicSubregion);
    if (c.protocol) ensureClassifier("PROTOCOL", c.protocol);
  }

  const studies = new Map<string, Record<string, unknown>>();
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

describe("Wave 3 imaging catalog (2E.7B)", () => {
  it("manifest has 41 rows in MRI-2 / MRA-1 / US-2 / US-3 / FL-1 / NM-1 batches", () => {
    expect(WAVE3_IMAGING_BATCH_COUNTS).toEqual({
      mri2: 14,
      mra1: 5,
      us2: 10,
      us3: 3,
      fl1: 4,
      nm1: 5,
      total: 41,
    });
    expect(HAITI_IMAGING_WAVE3_CATALOG).toHaveLength(41);
    assertWave3CatalogGovernance(HAITI_IMAGING_WAVE3_CATALOG);
  });

  it("does not collide with Wave 1, Wave 2, Haiti 44, or forbidden codes", () => {
    const wave3Codes = new Set(HAITI_IMAGING_WAVE3_CATALOG.map((r) => r.code));
    const wave2Codes = new Set(HAITI_IMAGING_WAVE2_CATALOG.map((r) => r.code));
    const wave1Codes = new Set(HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code));
    const haitiCodes = new Set(HAITI_IMAGING_CATALOG.map((r) => r.code));
    for (const forbidden of [
      ...WAVE3_FORBIDDEN_CATALOG_CODES,
      ...WAVE2_FORBIDDEN_CATALOG_CODES,
      ...WAVE1_FORBIDDEN_CATALOG_CODES,
    ]) {
      expect(wave3Codes.has(forbidden)).toBe(false);
    }
    for (const code of wave3Codes) {
      expect(wave1Codes.has(code)).toBe(false);
      expect(wave2Codes.has(code)).toBe(false);
      expect(haitiCodes.has(code)).toBe(false);
    }
  });

  it("has no duplicate normalized aliases within Wave 3 manifest", () => {
    const seen = new Map<string, string>();
    for (const row of HAITI_IMAGING_WAVE3_CATALOG) {
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

  it("does not define forbidden LE venous splits or DOPPLER_VEIN", () => {
    const codes = HAITI_IMAGING_WAVE3_CATALOG.map((r) => r.code);
    expect(codes).not.toContain("DOPPLER_VEIN");
    expect(codes).not.toContain("US_ABD");
    expect(codes).not.toContain("US_VENOUS_DOPPLER_LE_LEFT");
    expect(codes).not.toContain("US_VENOUS_DOPPLER_LE_RIGHT");
  });

  it("builds complete classifier FK payloads for every row", () => {
    const index = new Map<string, string>();
    let n = 0;
    const ensure = (domain: string, code: string) => {
      index.set(classifierIndexKey(domain, code), `id-${++n}`);
    };
    for (const row of HAITI_IMAGING_WAVE3_CATALOG) {
      const c = row.classifiers;
      ensure("MODALITY", c.modality);
      ensure("BODY_REGION", c.bodyRegion);
      ensure("CONTRAST_TYPE", c.contrastType);
      ensure("LATERALITY", c.laterality);
      if (c.anatomicSubregion) ensure("ANATOMIC_SUBREGION", c.anatomicSubregion);
      if (c.protocol) ensure("PROTOCOL", c.protocol);

      const payload = buildWave1ClassifierFkPayload(row as never, index);
      expect(payload.modalityClassifierId).toBeTruthy();
      expect(payload.bodyRegionClassifierId).toBeTruthy();
      expect(payload.contrastTypeClassifierId).toBeTruthy();
      expect(payload.lateralityClassifierId).toBeTruthy();
      expect(payload.viewCountClassifierId).toBeNull();
      if (c.protocol) {
        expect(payload.protocolClassifierId).toBeTruthy();
      }
    }
  });

  it("seed is idempotent", async () => {
    const prisma = buildMockPrisma() as never;

    const first = await seedHaitiImagingWave3(prisma);
    expect(first.catalogUpserted).toBe(41);
    expect(first.aliasesCreated).toBeGreaterThan(0);

    const second = await seedHaitiImagingWave3(prisma);
    expect(second.catalogUpserted).toBe(41);
    expect(second.aliasesCreated).toBe(0);

    for (const row of HAITI_IMAGING_WAVE3_CATALOG) {
      const study = (prisma as ReturnType<typeof buildMockPrisma>)._studies.get(row.code);
      expect(study).toBeDefined();
      expect(study?.modalityClassifierId).toBeTruthy();
      expect(study?.isActive).toBe(true);
    }
  });

  it("preserves governance codes in Haiti baseline manifest", () => {
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_HEAD")?.isActive).toBe(false);
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_ABD")?.isActive).toBe(true);
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "US_ABD")?.isActive).toBe(true);
    expect(HAITI_IMAGING_CATALOG.find((r) => r.code === "DOPPLER_VEIN")?.isActive).toBe(true);
  });
});
