import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import {
  HAITI_IMAGING_WAVE1_CATALOG,
  WAVE1_FORBIDDEN_CATALOG_CODES,
  WAVE1_IMAGING_BATCH_COUNTS,
  WAVE1_XR_CHEST_TUPLE_ALIASES,
} from "../../prisma/data/haiti-imaging-wave1";
import {
  assertWave1CatalogGovernance,
  seedHaitiImagingWave1,
} from "../../prisma/helpers/seed-haiti-imaging-wave1";
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

  for (const row of HAITI_IMAGING_WAVE1_CATALOG) {
    const c = row.classifiers;
    ensureClassifier("MODALITY", c.modality);
    ensureClassifier("BODY_REGION", c.bodyRegion);
    ensureClassifier("CONTRAST_TYPE", c.contrastType);
    ensureClassifier("LATERALITY", c.laterality);
    if (c.viewCount) ensureClassifier("VIEW_COUNT", c.viewCount);
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
        const next = { ...(existing ?? {}), ...(existing ? update : create), code: where.code, id: existing?.id ?? `study-${where.code}` };
        studies.set(where.code, next);
        return next;
      }),
      findUnique: jest.fn(async ({ where }: { where: { code: string } }) => {
        if (where.code === "XR_CHEST") {
          return { id: "study-xr-chest", code: "XR_CHEST", isActive: true };
        }
        return studies.get(where.code) ?? null;
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

describe("Wave 1 imaging catalog (2E.4A)", () => {
  it("manifest has 37 rows in XR-1 / CT-1 / MRI-1 batches", () => {
    expect(WAVE1_IMAGING_BATCH_COUNTS).toEqual({ xr: 19, ct: 7, mri: 11, total: 37 });
    expect(HAITI_IMAGING_WAVE1_CATALOG).toHaveLength(37);
    assertWave1CatalogGovernance(HAITI_IMAGING_WAVE1_CATALOG);
  });

  it("does not include forbidden or retired catalog codes", () => {
    const waveCodes = new Set(HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code));
    for (const forbidden of WAVE1_FORBIDDEN_CATALOG_CODES) {
      expect(waveCodes.has(forbidden)).toBe(false);
    }
    const haitiCodes = new Set(HAITI_IMAGING_CATALOG.map((r) => r.code));
    for (const row of HAITI_IMAGING_WAVE1_CATALOG) {
      expect(haitiCodes.has(row.code)).toBe(false);
    }
  });

  it("applies rib subregion correction on standalone rib codes", () => {
    const left = HAITI_IMAGING_WAVE1_CATALOG.find((r) => r.code === "XR_RIBS_LEFT");
    const right = HAITI_IMAGING_WAVE1_CATALOG.find((r) => r.code === "XR_RIBS_RIGHT");
    expect(left?.classifiers.anatomicSubregion).toBe("ANATOMIC_SUBREGION_RIBS");
    expect(right?.classifiers.anatomicSubregion).toBe("ANATOMIC_SUBREGION_RIBS");
  });

  it("requires sacrum/coccyx aliases (W2.2 REQUIRED package)", () => {
    const sacrum = HAITI_IMAGING_WAVE1_CATALOG.find((r) => r.code === "XR_SACRUM_COCCYX_2V");
    expect(sacrum?.aliases.length).toBeGreaterThanOrEqual(3);
  });

  it("builds complete classifier FK payloads for every row", () => {
    const index = new Map<string, string>();
    let n = 0;
    const ensure = (domain: string, code: string) => {
      index.set(classifierIndexKey(domain, code), `id-${++n}`);
    };
    for (const row of HAITI_IMAGING_WAVE1_CATALOG) {
      const c = row.classifiers;
      ensure("MODALITY", c.modality);
      ensure("BODY_REGION", c.bodyRegion);
      ensure("CONTRAST_TYPE", c.contrastType);
      ensure("LATERALITY", c.laterality);
      if (c.viewCount) ensure("VIEW_COUNT", c.viewCount);
      if (c.anatomicSubregion) ensure("ANATOMIC_SUBREGION", c.anatomicSubregion);
      if (c.protocol) ensure("PROTOCOL", c.protocol);

      const payload = buildWave1ClassifierFkPayload(row, index);
      expect(payload.modalityClassifierId).toBeTruthy();
      expect(payload.bodyRegionClassifierId).toBeTruthy();
      expect(payload.contrastTypeClassifierId).toBeTruthy();
      expect(payload.lateralityClassifierId).toBeTruthy();
      if (c.viewCount) expect(payload.viewCountClassifierId).toBeTruthy();
      if (c.anatomicSubregion) expect(payload.anatomicSubregionClassifierId).toBeTruthy();
      if (c.protocol) expect(payload.protocolClassifierId).toBeTruthy();
    }
  });

  it("seed is idempotent and populates classifier FKs and aliases", async () => {
    const prisma = buildMockPrisma() as never;

    const first = await seedHaitiImagingWave1(prisma);
    expect(first.catalogUpserted).toBe(37);
    expect(first.aliasesCreated).toBeGreaterThan(0);
    expect(first.xrChestTupleAliasesCreated).toBe(2);

    const second = await seedHaitiImagingWave1(prisma);
    expect(second.catalogUpserted).toBe(37);
    expect(second.aliasesCreated).toBe(0);
    expect(second.xrChestTupleAliasesCreated).toBe(0);

    for (const row of HAITI_IMAGING_WAVE1_CATALOG) {
      const study = (prisma as ReturnType<typeof buildMockPrisma>)._studies.get(row.code);
      expect(study).toBeDefined();
      expect(study?.modalityClassifierId).toBeTruthy();
      expect(study?.bodyRegionClassifierId).toBeTruthy();
      expect(study?.contrastTypeClassifierId).toBeTruthy();
      expect(study?.lateralityClassifierId).toBeTruthy();
      expect(study?.isActive).toBe(true);
    }

    const xrChestAliases = (prisma as ReturnType<typeof buildMockPrisma>)._aliases.get("study-xr-chest");
    for (const label of WAVE1_XR_CHEST_TUPLE_ALIASES) {
      expect(xrChestAliases?.has(label.toLowerCase())).toBe(true);
    }
  });

  it("preserves CT_HEAD retirement and CT_ABD governance in Haiti baseline seed", () => {
    const ctHead = HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_HEAD");
    const ctAbd = HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_ABD");
    expect(ctHead?.isActive).toBe(false);
    expect(ctAbd?.isActive).toBe(true);
    expect(HAITI_IMAGING_WAVE1_CATALOG.some((r) => r.code === "CT_HEAD")).toBe(false);
    expect(HAITI_IMAGING_WAVE1_CATALOG.some((r) => r.code === "CT_ABD")).toBe(false);
  });
});
