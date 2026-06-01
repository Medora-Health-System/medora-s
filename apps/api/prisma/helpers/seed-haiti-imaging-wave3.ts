import type { PrismaClient } from "@prisma/client";
import { HAITI_IMAGING_WAVE1_CATALOG } from "../data/haiti-imaging-wave1";
import { HAITI_IMAGING_WAVE2_CATALOG } from "../data/haiti-imaging-wave2";
import {
  HAITI_IMAGING_WAVE3_CATALOG,
  WAVE3_FORBIDDEN_CATALOG_CODES,
  WAVE3_IMAGING_BATCH_COUNTS,
  type Wave3ImagingCatalogSeed,
} from "../data/haiti-imaging-wave3";
import {
  buildWave1ClassifierFkPayload,
  classifierIndexKey,
  type ClassifierIndex,
} from "./wave1-imaging-classifier-fk.util";

const WAVE3_SORT_PRIORITY_BASE = 7000;

const WAVE1_CODES = new Set(HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code));
const WAVE2_CODES = new Set(HAITI_IMAGING_WAVE2_CATALOG.map((r) => r.code));

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

function imagingSearchTextStored(row: Wave3ImagingCatalogSeed): string {
  return normalizeSearchText(
    [row.searchText, row.legacyModality, row.legacyBodyRegion, row.code, row.displayNameFr, row.displayNameEn, row.aliases.join(" ")].join(
      " "
    )
  );
}

export function assertWave3CatalogGovernance(rows: Wave3ImagingCatalogSeed[]): void {
  if (rows.length !== WAVE3_IMAGING_BATCH_COUNTS.total) {
    throw new Error(
      `[wave3-seed] expected ${WAVE3_IMAGING_BATCH_COUNTS.total} rows, got ${rows.length}`
    );
  }
  const codes = new Set<string>();
  const aliasToCode = new Map<string, string>();
  for (const row of rows) {
    if (codes.has(row.code)) {
      throw new Error(`[wave3-seed] duplicate catalog code ${row.code}`);
    }
    codes.add(row.code);
    if ((WAVE3_FORBIDDEN_CATALOG_CODES as readonly string[]).includes(row.code)) {
      throw new Error(`[wave3-seed] forbidden catalog code in manifest: ${row.code}`);
    }
    if (WAVE1_CODES.has(row.code) || WAVE2_CODES.has(row.code)) {
      throw new Error(`[wave3-seed] collision with prior wave code: ${row.code}`);
    }
    for (const alias of row.aliases) {
      const normalized = normalizeAlias(alias);
      if (RETIRED_ALIAS_NORMALIZED.has(normalized)) {
        throw new Error(`[wave3-seed] retired/predecessor alias on ${row.code}: ${alias}`);
      }
      const prior = aliasToCode.get(normalized);
      if (prior && prior !== row.code) {
        throw new Error(`[wave3-seed] duplicate alias "${alias}" on ${prior} and ${row.code}`);
      }
      aliasToCode.set(normalized, row.code);
    }
  }
  const batchCounts = {
    mri2: rows.filter((r) => r.implementationBatch === "MRI-2").length,
    mra1: rows.filter((r) => r.implementationBatch === "MRA-1").length,
    us2: rows.filter((r) => r.implementationBatch === "US-2").length,
    us3: rows.filter((r) => r.implementationBatch === "US-3").length,
    fl1: rows.filter((r) => r.implementationBatch === "FL-1").length,
    nm1: rows.filter((r) => r.implementationBatch === "NM-1").length,
  };
  if (batchCounts.mri2 !== WAVE3_IMAGING_BATCH_COUNTS.mri2) {
    throw new Error(`[wave3-seed] MRI-2 count ${batchCounts.mri2}`);
  }
  if (batchCounts.mra1 !== WAVE3_IMAGING_BATCH_COUNTS.mra1) {
    throw new Error(`[wave3-seed] MRA-1 count ${batchCounts.mra1}`);
  }
  if (batchCounts.us2 !== WAVE3_IMAGING_BATCH_COUNTS.us2) {
    throw new Error(`[wave3-seed] US-2 count ${batchCounts.us2}`);
  }
  if (batchCounts.us3 !== WAVE3_IMAGING_BATCH_COUNTS.us3) {
    throw new Error(`[wave3-seed] US-3 count ${batchCounts.us3}`);
  }
  if (batchCounts.fl1 !== WAVE3_IMAGING_BATCH_COUNTS.fl1) {
    throw new Error(`[wave3-seed] FL-1 count ${batchCounts.fl1}`);
  }
  if (batchCounts.nm1 !== WAVE3_IMAGING_BATCH_COUNTS.nm1) {
    throw new Error(`[wave3-seed] NM-1 count ${batchCounts.nm1}`);
  }
}

function assertWave3ClassifierFkComplete(
  payload: ReturnType<typeof buildWave1ClassifierFkPayload>,
  row: Wave3ImagingCatalogSeed
): void {
  const required = [
    payload.modalityClassifierId,
    payload.bodyRegionClassifierId,
    payload.contrastTypeClassifierId,
    payload.lateralityClassifierId,
  ];
  if (required.some((v) => !v)) {
    throw new Error(`[wave3-seed] incomplete required classifier FK on ${row.code}`);
  }
  if (payload.viewCountClassifierId) {
    throw new Error(`[wave3-seed] unexpected viewCountClassifierId on ${row.code}`);
  }
  if (row.classifiers.protocol && !payload.protocolClassifierId) {
    throw new Error(`[wave3-seed] missing protocolClassifierId on ${row.code}`);
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

export type SeedHaitiImagingWave3Result = {
  catalogUpserted: number;
  aliasesCreated: number;
};

/**
 * Phase 2E.7B — idempotent Wave 3 catalog + classifier FK + aliases.
 * Requires Haiti baseline, MRV classifiers, Wave 1, and Wave 2 seed to have run first.
 */
export async function seedHaitiImagingWave3(prisma: PrismaClient): Promise<SeedHaitiImagingWave3Result> {
  assertWave3CatalogGovernance(HAITI_IMAGING_WAVE3_CATALOG);

  const classifierIndex = await buildClassifierIndex(prisma);
  let catalogUpserted = 0;
  let aliasesCreated = 0;

  for (let i = 0; i < HAITI_IMAGING_WAVE3_CATALOG.length; i++) {
    const row = HAITI_IMAGING_WAVE3_CATALOG[i];
    const classifierFks = buildWave1ClassifierFkPayload(row as never, classifierIndex);
    assertWave3ClassifierFkComplete(classifierFks, row);

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
        sortPriority: WAVE3_SORT_PRIORITY_BASE + i * 10,
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
        sortPriority: WAVE3_SORT_PRIORITY_BASE + i * 10,
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
