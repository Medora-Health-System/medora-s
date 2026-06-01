import type { PrismaClient } from "@prisma/client";
import {
  HAITI_IMAGING_WAVE2_CATALOG,
  WAVE2_FORBIDDEN_CATALOG_CODES,
  WAVE2_IMAGING_BATCH_COUNTS,
  type Wave2ImagingCatalogSeed,
} from "../data/haiti-imaging-wave2";
import { WAVE2_US_TUPLE_PASS, WAVE2_US_TUPLE_PASS_COUNT } from "../data/wave2-us-tuple-pass";
import {
  buildWave1ClassifierFkPayload,
  classifierIndexKey,
  type ClassifierIndex,
} from "./wave1-imaging-classifier-fk.util";

const WAVE2_SORT_PRIORITY_BASE = 6000;

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

function imagingSearchTextStored(row: Wave2ImagingCatalogSeed): string {
  return normalizeSearchText(
    [row.searchText, row.legacyModality, row.legacyBodyRegion, row.code, row.displayNameFr, row.displayNameEn, row.aliases.join(" ")].join(
      " "
    )
  );
}

export function assertWave2CatalogGovernance(rows: Wave2ImagingCatalogSeed[]): void {
  if (rows.length !== WAVE2_IMAGING_BATCH_COUNTS.total) {
    throw new Error(
      `[wave2-seed] expected ${WAVE2_IMAGING_BATCH_COUNTS.total} rows, got ${rows.length}`
    );
  }
  const codes = new Set<string>();
  for (const row of rows) {
    if (codes.has(row.code)) {
      throw new Error(`[wave2-seed] duplicate catalog code ${row.code}`);
    }
    codes.add(row.code);
    if ((WAVE2_FORBIDDEN_CATALOG_CODES as readonly string[]).includes(row.code)) {
      throw new Error(`[wave2-seed] forbidden catalog code in manifest: ${row.code}`);
    }
    for (const alias of row.aliases) {
      const normalized = normalizeAlias(alias);
      if (RETIRED_ALIAS_NORMALIZED.has(normalized)) {
        throw new Error(`[wave2-seed] retired/predecessor alias on ${row.code}: ${alias}`);
      }
    }
    if (row.code === "XR_CALCANEUS_LEFT_2V" || row.code === "XR_CALCANEUS_RIGHT_2V") {
      if (row.aliases.length < 3) {
        throw new Error(`[wave2-seed] REQUIRED aliases missing on ${row.code}`);
      }
    }
  }
}

function assertWave2ClassifierFkComplete(
  payload: ReturnType<typeof buildWave1ClassifierFkPayload>,
  row: Wave2ImagingCatalogSeed
): void {
  const required = [
    payload.modalityClassifierId,
    payload.bodyRegionClassifierId,
    payload.contrastTypeClassifierId,
    payload.lateralityClassifierId,
  ];
  if (required.some((v) => !v)) {
    throw new Error(`[wave2-seed] incomplete required classifier FK on ${row.code}`);
  }
  if (row.implementationBatch === "XR-2" && row.classifiers.viewCount && !payload.viewCountClassifierId) {
    throw new Error(`[wave2-seed] missing viewCountClassifierId on ${row.code}`);
  }
  if ((row.implementationBatch === "CT-2" || row.implementationBatch === "US-1") && payload.viewCountClassifierId) {
    throw new Error(`[wave2-seed] unexpected viewCountClassifierId on ${row.code}`);
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

function resolveProtocolId(index: ClassifierIndex, protocolCode: string): string {
  const id = index.get(classifierIndexKey("PROTOCOL", protocolCode));
  if (!id) {
    throw new Error(`[wave2-seed] missing TermClassifier PROTOCOL/${protocolCode}`);
  }
  return id;
}

export type SeedHaitiImagingWave2Result = {
  catalogUpserted: number;
  aliasesCreated: number;
  usTupleMappingsApplied: number;
  usTupleAliasesCreated: number;
  usTupleProtocolsUpdated: number;
};

/**
 * Phase 2E.6B — idempotent Wave 2 catalog + classifier FK + aliases + US tuple pass.
 * Requires Haiti baseline, MRV classifiers, and Wave 1 seed to have run first.
 */
export async function seedHaitiImagingWave2(prisma: PrismaClient): Promise<SeedHaitiImagingWave2Result> {
  assertWave2CatalogGovernance(HAITI_IMAGING_WAVE2_CATALOG);

  const classifierIndex = await buildClassifierIndex(prisma);
  let catalogUpserted = 0;
  let aliasesCreated = 0;

  for (let i = 0; i < HAITI_IMAGING_WAVE2_CATALOG.length; i++) {
    const row = HAITI_IMAGING_WAVE2_CATALOG[i];
    const classifierFks = buildWave1ClassifierFkPayload(row as never, classifierIndex);
    assertWave2ClassifierFkComplete(classifierFks, row);

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
        sortPriority: WAVE2_SORT_PRIORITY_BASE + i * 10,
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
        sortPriority: WAVE2_SORT_PRIORITY_BASE + i * 10,
        isEssential: false,
        isActive: true,
        ...classifierFks,
      },
    });

    catalogUpserted += 1;
    aliasesCreated += await upsertImagingAliases(prisma, created.id, row.aliases);
  }

  let usTupleMappingsApplied = 0;
  let usTupleAliasesCreated = 0;
  let usTupleProtocolsUpdated = 0;
  const protocolSetPerCode = new Map<string, string>();

  if (WAVE2_US_TUPLE_PASS.length !== WAVE2_US_TUPLE_PASS_COUNT) {
    throw new Error(`[wave2-seed] US tuple pass count mismatch`);
  }

  for (const mapping of WAVE2_US_TUPLE_PASS) {
    const study = await prisma.catalogImagingStudy.findUnique({ where: { code: mapping.catalogCode } });
    if (!study) {
      throw new Error(`[wave2-seed] US tuple target missing: ${mapping.catalogCode}`);
    }
    if (mapping.catalogCode === "US_ABD") {
      throw new Error(`[wave2-seed] forbidden US tuple target US_ABD`);
    }

    usTupleMappingsApplied += 1;
    usTupleAliasesCreated += await upsertImagingAliases(prisma, study.id, mapping.aliases);

    if (mapping.applyProtocol && mapping.protocol) {
      const prior = protocolSetPerCode.get(mapping.catalogCode);
      if (prior && prior !== mapping.protocol) {
        throw new Error(
          `[wave2-seed] conflicting US tuple protocol on ${mapping.catalogCode}: ${prior} vs ${mapping.protocol}`
        );
      }
      protocolSetPerCode.set(mapping.catalogCode, mapping.protocol);
      const protocolClassifierId = resolveProtocolId(classifierIndex, mapping.protocol);
      if (study.protocolClassifierId !== protocolClassifierId) {
        await prisma.catalogImagingStudy.update({
          where: { id: study.id },
          data: { protocolClassifierId },
        });
        usTupleProtocolsUpdated += 1;
      }
    }
  }

  return {
    catalogUpserted,
    aliasesCreated,
    usTupleMappingsApplied,
    usTupleAliasesCreated,
    usTupleProtocolsUpdated,
  };
}
