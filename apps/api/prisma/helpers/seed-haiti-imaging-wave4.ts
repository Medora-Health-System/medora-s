import type { PrismaClient } from "@prisma/client";
import { HAITI_IMAGING_WAVE1_CATALOG } from "../data/haiti-imaging-wave1";
import { HAITI_IMAGING_WAVE2_CATALOG } from "../data/haiti-imaging-wave2";
import { HAITI_IMAGING_WAVE3_CATALOG } from "../data/haiti-imaging-wave3";
import {
  HAITI_IMAGING_WAVE4_CATALOG,
  WAVE4_FORBIDDEN_CATALOG_CODES,
  WAVE4_IMAGING_BATCH_COUNTS,
  type Wave4ImagingCatalogSeed,
} from "../data/haiti-imaging-wave4";
import {
  buildWave1ClassifierFkPayload,
  classifierIndexKey,
  type ClassifierIndex,
} from "./wave1-imaging-classifier-fk.util";

const WAVE4_SORT_PRIORITY_BASE = 8000;

const WAVE1_CODES = new Set(HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code));
const WAVE2_CODES = new Set(HAITI_IMAGING_WAVE2_CATALOG.map((r) => r.code));
const WAVE3_CODES = new Set(HAITI_IMAGING_WAVE3_CATALOG.map((r) => r.code));

const RETIRED_ALIAS_NORMALIZED = new Set(
  ["ct head wo", "ct head wo iv contrast", "ct abdomen", "doppler vein", "cta chest legacy", "us abdomen complete"].map(
    (s) => s.toLowerCase()
  )
);

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

function normalizeSearchText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

function imagingSearchTextStored(row: Wave4ImagingCatalogSeed): string {
  return normalizeSearchText(
    [row.searchText, row.legacyModality, row.legacyBodyRegion, row.code, row.displayNameFr, row.displayNameEn, row.aliases.join(" ")].join(
      " "
    )
  );
}

export function assertWave4CatalogGovernance(rows: Wave4ImagingCatalogSeed[]): void {
  if (rows.length !== WAVE4_IMAGING_BATCH_COUNTS.total) {
    throw new Error(
      `[wave4-seed] expected ${WAVE4_IMAGING_BATCH_COUNTS.total} rows, got ${rows.length}`
    );
  }
  const codes = new Set<string>();
  const aliasToCode = new Map<string, string>();
  for (const row of rows) {
    if (codes.has(row.code)) {
      throw new Error(`[wave4-seed] duplicate catalog code ${row.code}`);
    }
    codes.add(row.code);
    if ((WAVE4_FORBIDDEN_CATALOG_CODES as readonly string[]).includes(row.code)) {
      throw new Error(`[wave4-seed] forbidden catalog code in manifest: ${row.code}`);
    }
    if (WAVE1_CODES.has(row.code) || WAVE2_CODES.has(row.code) || WAVE3_CODES.has(row.code)) {
      throw new Error(`[wave4-seed] collision with prior wave code: ${row.code}`);
    }
    for (const alias of row.aliases) {
      const normalized = normalizeAlias(alias);
      if (RETIRED_ALIAS_NORMALIZED.has(normalized)) {
        throw new Error(`[wave4-seed] retired/predecessor alias on ${row.code}: ${alias}`);
      }
      const prior = aliasToCode.get(normalized);
      if (prior && prior !== row.code) {
        throw new Error(`[wave4-seed] duplicate alias "${alias}" on ${prior} and ${row.code}`);
      }
      aliasToCode.set(normalized, row.code);
    }
  }
  const batchCounts = {
    xr3: rows.filter((r) => r.implementationBatch === "XR-3").length,
    ct3: rows.filter((r) => r.implementationBatch === "CT-3").length,
  };
  if (batchCounts.xr3 !== WAVE4_IMAGING_BATCH_COUNTS.xr3) {
    throw new Error(`[wave4-seed] XR-3 count ${batchCounts.xr3}`);
  }
  if (batchCounts.ct3 !== WAVE4_IMAGING_BATCH_COUNTS.ct3) {
    throw new Error(`[wave4-seed] CT-3 count ${batchCounts.ct3}`);
  }
}

function assertWave4ClassifierFkComplete(
  payload: ReturnType<typeof buildWave1ClassifierFkPayload>,
  row: Wave4ImagingCatalogSeed
): void {
  const required = [
    payload.modalityClassifierId,
    payload.bodyRegionClassifierId,
    payload.contrastTypeClassifierId,
    payload.lateralityClassifierId,
  ];
  if (required.some((v) => !v)) {
    throw new Error(`[wave4-seed] incomplete required classifier FK on ${row.code}`);
  }
  if (row.implementationBatch === "XR-3" && row.classifiers.viewCount && !payload.viewCountClassifierId) {
    throw new Error(`[wave4-seed] missing viewCountClassifierId on ${row.code}`);
  }
  if (row.implementationBatch === "CT-3" && payload.viewCountClassifierId) {
    throw new Error(`[wave4-seed] unexpected viewCountClassifierId on ${row.code}`);
  }
  if (row.classifiers.protocol && !payload.protocolClassifierId) {
    throw new Error(`[wave4-seed] missing protocolClassifierId on ${row.code}`);
  }
  if (row.classifiers.anatomicSubregion && !payload.anatomicSubregionClassifierId) {
    throw new Error(`[wave4-seed] missing anatomicSubregionClassifierId on ${row.code}`);
  }
}

async function buildClassifierIndex(prisma: PrismaClient): Promise<ClassifierIndex> {
  const classifiers = await prisma.termClassifier.findMany({
    where: { isActive: true },
    select: { id: true, domain: true, code: true },
  });
  const index: ClassifierIndex = new Map();
  for (const row of classifiers) {
    index.set(classifierIndexKey(row.domain, row.code), row.id);
  }
  return index;
}

async function upsertImagingAliases(
  prisma: PrismaClient,
  catalogImagingStudyId: string,
  aliases: readonly string[]
): Promise<number> {
  let created = 0;
  for (const alias of aliases) {
    const normalized = normalizeAlias(alias);
    if (!normalized) continue;
    const exists = await prisma.imagingStudyAlias.findFirst({
      where: { catalogImagingStudyId, alias: normalized },
    });
    if (!exists) {
      await prisma.imagingStudyAlias.create({
        data: { catalogImagingStudyId, alias: normalized, language: "fr" },
      });
      created += 1;
    }
  }
  return created;
}

export type SeedHaitiImagingWave4Result = {
  catalogUpserted: number;
  aliasesCreated: number;
};

/**
 * Phase 2E.8B — idempotent Wave 4 catalog + classifier FK + aliases.
 * Requires Haiti baseline, MRV classifiers, Waves 1–3 seed to have run first.
 */
export async function seedHaitiImagingWave4(prisma: PrismaClient): Promise<SeedHaitiImagingWave4Result> {
  assertWave4CatalogGovernance(HAITI_IMAGING_WAVE4_CATALOG);

  const classifierIndex = await buildClassifierIndex(prisma);
  let catalogUpserted = 0;
  let aliasesCreated = 0;

  for (let i = 0; i < HAITI_IMAGING_WAVE4_CATALOG.length; i++) {
    const row = HAITI_IMAGING_WAVE4_CATALOG[i];
    const classifierFks = buildWave1ClassifierFkPayload(row as never, classifierIndex);
    assertWave4ClassifierFkComplete(classifierFks, row);

    const searchText = imagingSearchTextStored(row);
    const description = `${row.legacyModality} · ${row.legacyBodyRegion}`;

    const created = await prisma.catalogImagingStudy.upsert({
      where: { code: row.code },
      update: {
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        displayNameEn: row.displayNameEn,
        description,
        modality: row.legacyModality,
        bodyRegion: row.legacyBodyRegion,
        searchText,
        sortPriority: WAVE4_SORT_PRIORITY_BASE + i * 10,
        isEssential: false,
        isActive: true,
        ...classifierFks,
      },
      create: {
        code: row.code,
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        displayNameEn: row.displayNameEn,
        description,
        modality: row.legacyModality,
        bodyRegion: row.legacyBodyRegion,
        searchText,
        sortPriority: WAVE4_SORT_PRIORITY_BASE + i * 10,
        isEssential: false,
        isActive: true,
        ...classifierFks,
      },
    });

    catalogUpserted += 1;
    aliasesCreated += await upsertImagingAliases(prisma, created.id, row.aliases);
  }

  return { catalogUpserted, aliasesCreated };
}
