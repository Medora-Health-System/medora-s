/**
 * Production ICD-10-CM importer (explicit operator command — not demo seed).
 *
 * Usage:
 *   pnpm --filter @medora/api icd:import -- --file=/path/to/icd10cm-Code-Descriptions-2026.zip --release=2026
 *   pnpm --filter @medora/api icd:dry-run -- --file=/path/to/icd10cm-order-2026.txt --release=2026
 *   pnpm --filter @medora/api icd:validate -- --file=/path/to/zip --release=2026
 */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { applyManifestMetadata } from "./parse-icd10-cm-release";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseLimit(): number | undefined {
  const raw = getArg("limit");
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error("--limit must be a positive integer");
    process.exit(1);
  }
  return n;
}

async function main() {
  const file = getArg("file");
  const releaseArg = getArg("release");
  const dryRun = hasFlag("dry-run") || getArg("mode") === "dry-run" || getArg("mode") === "validate";
  if (!file) {
    console.error("Missing --file=/path/to/official-release.(zip|txt|csv)");
    process.exit(1);
  }
  if (!releaseArg) {
    console.error("Missing --release=<FY2026|FY2027|2026|2027>. Do not silently assume FY2026.");
    process.exit(1);
  }
  const release = releaseArg;

  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: hasFlag("allow-dev-sample"),
    skipChecksum: hasFlag("skip-checksum"),
    limit: parseLimit(),
  });

  console.log("=== ICD-10-CM release validation ===");
  console.log(`Release:        ${validation.manifest.releaseVersion}`);
  console.log(`Source:         ${validation.resolvedSourcePath}`);
  console.log(`Artifact SHA:   ${validation.artifactSha256 ?? "(n/a)"}`);
  if (validation.parse) {
    console.log(`Parsed rows:    ${validation.parse.rows.length}`);
    console.log(`Billable:       ${validation.parse.billableCount}`);
    console.log(`Headers:        ${validation.parse.headerCount}`);
    console.log(`Format:         ${validation.parse.format}`);
    console.log(`Source SHA:     ${validation.parse.sourceSha256}`);
  }
  for (const w of validation.warnings) console.warn(`WARN: ${w}`);
  if (!validation.ok || !validation.parse) {
    console.error("=== VALIDATION FAILED — no database writes ===");
    for (const e of validation.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log("=== DRY RUN / VALIDATE OK — no database writes ===");
    process.exit(0);
  }

  const enriched = applyManifestMetadata(
    validation.parse.rows,
    validation.manifest,
    validation.artifactSha256 ?? validation.parse.sourceSha256,
  );

  const prisma = new PrismaClient();
  const batchSize = Number.parseInt(getArg("batch-size") ?? "1000", 10);
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    const existing = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: validation.manifest.codeSystem,
        releaseVersion: validation.manifest.releaseVersion,
      },
      select: {
        id: true,
        code: true,
        shortDescription: true,
        longDescription: true,
        isBillable: true,
        isSelectable: true,
        isActive: true,
        sourceChecksum: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
    });
    const byCode = new Map(existing.map((r) => [r.code, r]));

    const toCreate: typeof enriched = [];
    const toUpdate: Array<{ id: string; row: (typeof enriched)[number] }> = [];

    for (const row of enriched) {
      const prev = byCode.get(row.code);
      if (!prev) {
        toCreate.push(row);
        continue;
      }
      const same =
        prev.shortDescription === row.shortDescription &&
        (prev.longDescription ?? "") === row.longDescription &&
        prev.isBillable === row.isBillable &&
        prev.isSelectable === row.isSelectable &&
        prev.isActive === row.isActive &&
        prev.sourceChecksum === row.sourceChecksum &&
        prev.effectiveFrom?.toISOString() === row.effectiveFrom.toISOString() &&
        (prev.effectiveTo?.toISOString() ?? null) === (row.effectiveTo?.toISOString() ?? null);
      if (same) unchanged++;
      else toUpdate.push({ id: prev.id, row });
    }

    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      await prisma.icd10DiagnosisCode.createMany({
        data: batch.map((row) => ({
          id: randomUUID(),
          code: row.code,
          normalizedCode: row.normalizedCode,
          shortDescription: row.shortDescription,
          longDescription: row.longDescription,
          chapter: row.chapter,
          category: row.category,
          isBillable: row.isBillable,
          isSelectable: row.isSelectable,
          isActive: row.isActive,
          codeSystem: row.codeSystem,
          releaseVersion: row.releaseVersion,
          releaseYear: row.releaseYear,
          codeSetVersion: row.codeSetVersion,
          effectiveYear: row.effectiveYear,
          effectiveFrom: row.effectiveFrom,
          effectiveTo: row.effectiveTo,
          requiresSeventhCharacter: row.requiresSeventhCharacter,
          validSeventhCharacters: row.validSeventhCharacters,
          sourceChecksum: row.sourceChecksum,
          importedAt: row.importedAt,
          searchText: row.searchText,
        })),
        skipDuplicates: true,
      });
      inserted += batch.length;
      console.log(`Inserted progress: ${inserted} / ${toCreate.length}`);
    }

    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      await prisma.$transaction(
        batch.map(({ id, row }) =>
          prisma.icd10DiagnosisCode.update({
            where: { id },
            data: {
              normalizedCode: row.normalizedCode,
              shortDescription: row.shortDescription,
              longDescription: row.longDescription,
              chapter: row.chapter,
              category: row.category,
              isBillable: row.isBillable,
              isSelectable: row.isSelectable,
              isActive: row.isActive,
              releaseYear: row.releaseYear,
              codeSetVersion: row.codeSetVersion,
              effectiveYear: row.effectiveYear,
              effectiveFrom: row.effectiveFrom,
              effectiveTo: row.effectiveTo,
              requiresSeventhCharacter: row.requiresSeventhCharacter,
              validSeventhCharacters: row.validSeventhCharacters,
              sourceChecksum: row.sourceChecksum,
              importedAt: row.importedAt,
              searchText: row.searchText,
            },
          }),
        ),
      );
      updated += batch.length;
      console.log(`Updated progress: ${updated} / ${toUpdate.length}`);
    }

    console.log("=== ICD-10-CM import complete ===");
    console.log(`Inserted:    ${inserted}`);
    console.log(`Updated:     ${updated}`);
    console.log(`Unchanged:   ${unchanged}`);
    console.log(`Inactivated: 0 (importer never deletes/inactivates historic rows)`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
