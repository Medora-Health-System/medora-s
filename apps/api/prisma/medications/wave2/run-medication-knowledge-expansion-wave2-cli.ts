/**
 * Medication Knowledge Expansion Wave 2 — EM specialty pack enrichment.
 * Reuses CatalogMedication + MedicationAlias. Does not create a second master.
 *
 *   pnpm medication:wave2:enrich
 *   pnpm medication:wave2:enrich -- --dry-run
 *   pnpm medication:wave2:coverage
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  MK_EXPANSION_WAVE2_PROGRAM_KEY,
  MK_EXPANSION_WAVE2_SPECIALTY_PACKS,
  assertMkExpansionWave2SafetyDefaults,
  getMkExpansionWave2PackCoverageStats,
  listMkExpansionWave2FamilyNames,
  mkExpansionWave2PackMarker,
  normalizeMedicationFamilyName,
} from "@medora/shared";

const prisma = new PrismaClient();
const OUT = resolve(__dirname, "../audit-summaries");

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

async function enrich() {
  assertMkExpansionWave2SafetyDefaults();
  const dryRun = isDryRun();
  let tagged = 0;
  let aliasesUpserted = 0;
  const matchedFamilies = new Set<string>();

  for (const pack of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
    const marker = mkExpansionWave2PackMarker(pack.packKey);
    for (const family of pack.familyNames) {
      const rows = await prisma.catalogMedication.findMany({
        where: {
          OR: [
            { genericName: { contains: family, mode: "insensitive" } },
            { name: { contains: family, mode: "insensitive" } },
            { displayNameEn: { contains: family, mode: "insensitive" } },
            { searchText: { contains: family, mode: "insensitive" } },
          ],
        },
        take: 25,
      });
      if (rows.length === 0) continue;
      matchedFamilies.add(normalizeMedicationFamilyName(family));

      for (const row of rows) {
        const searchText = row.searchText ?? "";
        const needsMarker = !searchText.includes(marker);
        const tokens = [
          ...pack.searchTokens.filter((t) => t.length >= 2),
          family,
        ];
        let nextSearch = searchText;
        for (const tok of tokens) {
          if (!nextSearch.toLowerCase().includes(tok.toLowerCase())) {
            nextSearch = `${nextSearch} ${tok}`.trim();
          }
        }
        if (needsMarker) nextSearch = `${nextSearch} ${marker}`.trim();

        if (!dryRun && (needsMarker || nextSearch !== searchText)) {
          await prisma.catalogMedication.update({
            where: { id: row.id },
            data: { searchText: nextSearch.slice(0, 2000) },
          });
          tagged += 1;
        } else if (needsMarker || nextSearch !== searchText) {
          tagged += 1;
        }

        for (const tok of pack.searchTokens.slice(0, 8)) {
          if (tok.length < 2) continue;
          const existing = await prisma.medicationAlias.findFirst({
            where: {
              catalogMedicationId: row.id,
              alias: { equals: tok, mode: "insensitive" },
            },
          });
          if (existing) continue;
          if (!dryRun) {
            await prisma.medicationAlias.create({
              data: {
                catalogMedicationId: row.id,
                alias: tok,
                language: "en",
                isPrimary: false,
              },
            });
          }
          aliasesUpserted += 1;
        }
      }
    }
  }

  const coverage = getMkExpansionWave2PackCoverageStats({
    matchedFamilyNames: [...matchedFamilies],
  });

  const report = {
    programKey: MK_EXPANSION_WAVE2_PROGRAM_KEY,
    dryRun,
    taggedCatalogRows: tagged,
    aliasesUpserted,
    familyUniverse: listMkExpansionWave2FamilyNames().length,
    ...coverage,
    acetaminophenExcluded: true,
    clinicalActivationEnabled: false,
  };

  mkdirSync(OUT, { recursive: true });
  const path = resolve(OUT, "medication-knowledge-expansion-wave2-enrichment.json");
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ path, ...report }, null, 2));
  return report;
}

async function coverageOnly() {
  assertMkExpansionWave2SafetyDefaults();
  const matchedFamilies = new Set<string>();
  for (const family of listMkExpansionWave2FamilyNames()) {
    const count = await prisma.catalogMedication.count({
      where: {
        OR: [
          { genericName: { contains: family, mode: "insensitive" } },
          { name: { contains: family, mode: "insensitive" } },
          { displayNameEn: { contains: family, mode: "insensitive" } },
        ],
      },
    });
    if (count > 0) matchedFamilies.add(family);
  }
  const coverage = getMkExpansionWave2PackCoverageStats({
    matchedFamilyNames: [...matchedFamilies],
  });
  const path = resolve(OUT, "medication-knowledge-expansion-wave2-coverage.json");
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path, `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ path, ...coverage }, null, 2));
}

async function main() {
  const cmd = process.argv[2] ?? "enrich";
  if (cmd === "coverage") {
    await coverageOnly();
    return;
  }
  if (cmd === "enrich" || cmd === "--dry-run") {
    await enrich();
    return;
  }
  throw new Error(`Unknown Wave 2 command: ${cmd}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
