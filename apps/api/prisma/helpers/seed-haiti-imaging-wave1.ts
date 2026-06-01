import type { PrismaClient } from "@prisma/client";
import {
  HAITI_IMAGING_WAVE1_CATALOG,
  WAVE1_FORBIDDEN_CATALOG_CODES,
  WAVE1_IMAGING_BATCH_COUNTS,
  WAVE1_XR_CHEST_TUPLE_ALIASES,
  type Wave1ImagingCatalogSeed,
} from "../data/haiti-imaging-wave1";
import {
  assertWave1ClassifierFkComplete,
  buildWave1ClassifierFkPayload,
  classifierIndexKey,
  type ClassifierIndex,
} from "./wave1-imaging-classifier-fk.util";

const WAVE1_SORT_PRIORITY_BASE = 5000;

const RETIRED_ALIAS_NORMALIZED = new Set(
  ["ct head wo", "ct head wo iv contrast", "ct abdomen", "doppler vein", "cta chest legacy"].map((s) =>
    s.toLowerCase()
  )
);

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

function normalizeSearchText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

function imagingSearchTextStored(row: Wave1ImagingCatalogSeed): string {
  return normalizeSearchText(
    [row.searchText, row.legacyModality, row.legacyBodyRegion, row.code, row.displayNameFr, row.displayNameEn, row.aliases.join(" ")].join(
      " "
    )
  );
}

export function assertWave1CatalogGovernance(rows: Wave1ImagingCatalogSeed[]): void {
  if (rows.length !== WAVE1_IMAGING_BATCH_COUNTS.total) {
    throw new Error(
      `[wave1-seed] expected ${WAVE1_IMAGING_BATCH_COUNTS.total} rows, got ${rows.length}`
    );
  }
  const codes = new Set<string>();
  for (const row of rows) {
    if (codes.has(row.code)) {
      throw new Error(`[wave1-seed] duplicate catalog code ${row.code}`);
    }
    codes.add(row.code);
    if ((WAVE1_FORBIDDEN_CATALOG_CODES as readonly string[]).includes(row.code)) {
      throw new Error(`[wave1-seed] forbidden catalog code in manifest: ${row.code}`);
    }
    for (const alias of row.aliases) {
      const normalized = normalizeAlias(alias);
      if (RETIRED_ALIAS_NORMALIZED.has(normalized)) {
        throw new Error(`[wave1-seed] retired/predecessor alias on ${row.code}: ${alias}`);
      }
    }
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

export type SeedHaitiImagingWave1Result = {
  catalogUpserted: number;
  aliasesCreated: number;
  xrChestTupleAliasesCreated: number;
};

/**
 * Phase 2E.4A — idempotent Wave 1 catalog + classifier FK + approved aliases.
 * Requires `seedMrvClassifiers` to have run first.
 */
export async function seedHaitiImagingWave1(prisma: PrismaClient): Promise<SeedHaitiImagingWave1Result> {
  assertWave1CatalogGovernance(HAITI_IMAGING_WAVE1_CATALOG);

  const classifierIndex = await buildClassifierIndex(prisma);
  let catalogUpserted = 0;
  let aliasesCreated = 0;

  for (let i = 0; i < HAITI_IMAGING_WAVE1_CATALOG.length; i++) {
    const row = HAITI_IMAGING_WAVE1_CATALOG[i];
    const classifierFks = buildWave1ClassifierFkPayload(row, classifierIndex);
    assertWave1ClassifierFkComplete(classifierFks, row.code);

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
        sortPriority: WAVE1_SORT_PRIORITY_BASE + i * 10,
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
        sortPriority: WAVE1_SORT_PRIORITY_BASE + i * 10,
        isEssential: false,
        isActive: true,
        ...classifierFks,
      },
    });

    catalogUpserted += 1;
    aliasesCreated += await upsertImagingAliases(prisma, created.id, row.aliases);
  }

  let xrChestTupleAliasesCreated = 0;
  const xrChest = await prisma.catalogImagingStudy.findUnique({ where: { code: "XR_CHEST" } });
  if (xrChest) {
    xrChestTupleAliasesCreated = await upsertImagingAliases(prisma, xrChest.id, WAVE1_XR_CHEST_TUPLE_ALIASES);
  }

  return { catalogUpserted, aliasesCreated, xrChestTupleAliasesCreated };
}
