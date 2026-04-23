/**
 * Idempotent CSV importer for curated English catalog labels (`displayNameEn` only by default).
 *
 * Rules:
 * - Match rows by stable `code` (unique per catalog table).
 * - Update only `displayNameEn` unless optional columns request additive changes.
 * - Never writes `name`, `displayNameFr`, or billing fields.
 * - Skips rows where `displayNameEn` is already set unless `--overwrite`.
 *
 * Usage:
 *   pnpm --filter @medora/api catalog:import-display-en -- --type=lab --file=prisma/data/samples/er-display-name-en.dev-sample.csv --dry-run
 *   pnpm --filter @medora/api catalog:import-display-en -- --type=medication --file=./my.csv
 *
 * CSV columns (header row required):
 *   code, display_name_en
 * Optional:
 *   search_text_en  — merged into existing `searchText` (token union, lowercased) unless --no-merge-search
 *   aliases_en      — semicolon-separated English aliases (lab/imaging/medication alias tables, language "en")
 *   overwrite       — true/1/yes to replace existing displayNameEn
 */
import "reflect-metadata";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const API_ROOT = resolve(__dirname, "..");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normWs(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function mergeSearchText(existing: string | null | undefined, append: string | undefined): string {
  const a = normWs(existing ?? "");
  const b = normWs(append ?? "");
  const tokens = new Set<string>();
  for (const t of a.split(" ").filter(Boolean)) tokens.add(t);
  for (const t of b.split(" ").filter(Boolean)) tokens.add(t);
  return [...tokens].join(" ");
}

function parseBool(raw: string | undefined, defaultFalse: boolean): boolean {
  const t = raw?.trim().toLowerCase();
  if (!t) return defaultFalse;
  return t === "1" || t === "true" || t === "yes";
}

function resolveFilePath(fileArg: string): string | null {
  const rel = fileArg.trim();
  const candidates = [resolve(process.cwd(), rel), resolve(API_ROOT, rel)];
  if (rel.startsWith("apps/api/")) {
    const stripped = rel.slice("apps/api/".length);
    candidates.push(resolve(process.cwd(), stripped), resolve(API_ROOT, stripped));
  }
  return candidates.find((p) => existsSync(p)) ?? null;
}

type CatalogType = "lab" | "imaging" | "medication";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const noMergeSearch = process.argv.includes("--no-merge-search");
  const typeArg = process.argv.find((a) => a.startsWith("--type="))?.split("=", 2)[1]?.trim().toLowerCase();
  const fileArg = process.argv.find((a) => a.startsWith("--file="))?.split("=", 2)[1]?.trim();

  if (!typeArg || !["lab", "imaging", "medication"].includes(typeArg)) {
    console.error('Missing or invalid --type=lab|imaging|medication');
    process.exit(1);
  }
  if (!fileArg) {
    console.error("Missing --file=/path/to/file.csv");
    process.exit(1);
  }
  const filePath = resolveFilePath(fileArg);
  if (!filePath) {
    console.error(`File not found for --file=${fileArg}`);
    process.exit(1);
  }

  const overwriteGlobal = process.argv.includes("--overwrite");
  const prisma = new PrismaClient();
  const type = typeArg as CatalogType;

  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => {
    const t = l.trim();
    if (!t) return false;
    if (t.startsWith("#")) return false;
    const firstCell = parseCsvLine(t)[0]?.trim() ?? "";
    if (firstCell.startsWith("#")) return false;
    return true;
  });
  if (lines.length < 2) {
    console.error("CSV must include a header row and at least one data row.");
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]!);
  const idx = (name: string) =>
    header.findIndex((h) => h.trim().toLowerCase().replace(/-/g, "_") === name.toLowerCase());
  const iCode = idx("code");
  const iEn = idx("display_name_en");
  const iSearch = idx("search_text_en");
  const iAliases = idx("aliases_en");
  const iOverwrite = idx("overwrite");
  if (iCode < 0 || iEn < 0) {
    console.error("CSV must include columns: code, display_name_en");
    process.exit(1);
  }

  let processed = 0;
  let updated = 0;
  let wouldUpdate = 0;
  let skippedExisting = 0;
  let missingCode = 0;
  let notFound = 0;
  let invalid = 0;

  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]!);
    processed++;
    const code = (cells[iCode] ?? "").trim();
    const displayEn = (cells[iEn] ?? "").trim();
    const searchEn = iSearch >= 0 ? (cells[iSearch] ?? "").trim() : "";
    const aliasesRaw = iAliases >= 0 ? (cells[iAliases] ?? "").trim() : "";
    const rowOverwrite = iOverwrite >= 0 ? parseBool(cells[iOverwrite], false) : false;
    const overwrite = overwriteGlobal || rowOverwrite;

    if (!code) {
      missingCode++;
      continue;
    }
    if (!displayEn) {
      invalid++;
      continue;
    }

    if (type === "lab") {
      const row = await prisma.catalogLabTest.findUnique({ where: { code } });
      if (!row) {
        notFound++;
        continue;
      }
      const hasEn = !!(row.displayNameEn && row.displayNameEn.trim());
      if (hasEn && !overwrite) {
        skippedExisting++;
        continue;
      }
      const nextSearch =
        noMergeSearch || !searchEn ? undefined : mergeSearchText(row.searchText, searchEn);
      if (dryRun) {
        wouldUpdate++;
        continue;
      }
      await prisma.catalogLabTest.update({
        where: { code },
        data: {
          displayNameEn: displayEn,
          ...(nextSearch !== undefined ? { searchText: nextSearch } : {}),
        },
      });
      updated++;
      if (aliasesRaw) {
        for (const a of aliasesRaw.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
          const exists = await prisma.labTestAlias.findFirst({
            where: { catalogLabTestId: row.id, alias: a },
          });
          if (!exists) {
            await prisma.labTestAlias.create({
              data: { catalogLabTestId: row.id, alias: a, language: "en" },
            });
          }
        }
      }
    } else if (type === "imaging") {
      const row = await prisma.catalogImagingStudy.findUnique({ where: { code } });
      if (!row) {
        notFound++;
        continue;
      }
      const hasEn = !!(row.displayNameEn && row.displayNameEn.trim());
      if (hasEn && !overwrite) {
        skippedExisting++;
        continue;
      }
      const nextSearch =
        noMergeSearch || !searchEn ? undefined : mergeSearchText(row.searchText, searchEn);
      if (dryRun) {
        wouldUpdate++;
        continue;
      }
      await prisma.catalogImagingStudy.update({
        where: { code },
        data: {
          displayNameEn: displayEn,
          ...(nextSearch !== undefined ? { searchText: nextSearch } : {}),
        },
      });
      updated++;
      if (aliasesRaw) {
        for (const a of aliasesRaw.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
          const exists = await prisma.imagingStudyAlias.findFirst({
            where: { catalogImagingStudyId: row.id, alias: a },
          });
          if (!exists) {
            await prisma.imagingStudyAlias.create({
              data: { catalogImagingStudyId: row.id, alias: a, language: "en" },
            });
          }
        }
      }
    } else {
      const row = await prisma.catalogMedication.findUnique({ where: { code } });
      if (!row) {
        notFound++;
        continue;
      }
      const hasEn = !!(row.displayNameEn && row.displayNameEn.trim());
      if (hasEn && !overwrite) {
        skippedExisting++;
        continue;
      }
      const nextSearch =
        noMergeSearch || !searchEn ? undefined : mergeSearchText(row.searchText, searchEn);
      if (dryRun) {
        wouldUpdate++;
        continue;
      }
      await prisma.catalogMedication.update({
        where: { code },
        data: {
          displayNameEn: displayEn,
          ...(nextSearch !== undefined ? { searchText: nextSearch } : {}),
        },
      });
      updated++;
      if (aliasesRaw) {
        for (const a of aliasesRaw.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
          await prisma.medicationAlias.upsert({
            where: {
              catalogMedicationId_alias: { catalogMedicationId: row.id, alias: a },
            },
            update: {},
            create: { catalogMedicationId: row.id, alias: a, language: "en" },
          });
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        type,
        file: filePath,
        processed,
        updated: dryRun ? 0 : updated,
        wouldUpdate: dryRun ? wouldUpdate : 0,
        skippedExisting,
        missingCode,
        notFound,
        invalid,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
