/**
 * ER-1 — Idempotent ICD-10-CM reference loader (Postgres).
 *
 * Expected CSV columns (header row required):
 *   code,short_description,long_description,is_billable,is_active,effective_year,code_set_version,chapter,category
 *
 * - `code` is the canonical display form (typically with dots).
 * - `is_billable` / `is_active`: true/false/1/0 (default true if empty).
 * - Other columns optional.
 *
 * **This importer does not ship production ICD-10 data.** Load your jurisdiction’s
 * official distribution (e.g. CMS FY NNNN) and run this script against a controlled environment first.
 *
 * Usage (repo root, DATABASE_URL set):
 *   pnpm --filter @medora/api run import:icd10-catalog -- --file=./apps/api/prisma/data/icd10-cm-sample-dev.csv
 *   pnpm --filter @medora/api run import:icd10-catalog -- --file=/path/to/icd10.csv --dry-run
 */
import "reflect-metadata";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { normalizeIcd10CodeForLookup } from "@medora/shared";

function parseBool(raw: string | undefined, defaultTrue: boolean): boolean {
  const t = raw?.trim().toLowerCase();
  if (!t) return defaultTrue;
  if (t === "0" || t === "false" || t === "no") return false;
  if (t === "1" || t === "true" || t === "yes") return true;
  return defaultTrue;
}

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

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.find((a) => a.startsWith("--file="))?.split("=", 2)[1]?.trim();
  if (!fileArg) {
    console.error("Missing --file=/path/to/icd10.csv");
    process.exit(1);
  }
  const filePath = resolve(process.cwd(), fileArg);
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error("CSV must include a header row and at least one data row.");
    process.exit(1);
  }
  const header = parseCsvLine(lines[0]!);
  const idx = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const iCode = idx("code");
  const iShort = idx("short_description");
  if (iCode < 0 || iShort < 0) {
    console.error("CSV must include columns: code, short_description");
    process.exit(1);
  }
  const iLong = idx("long_description");
  const iBill = idx("is_billable");
  const iAct = idx("is_active");
  const iYear = idx("effective_year");
  const iVer = idx("code_set_version");
  const iCh = idx("chapter");
  const iCat = idx("category");

  const prisma = new PrismaClient();
  let upserted = 0;
  try {
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]!);
      const code = cells[iCode]?.trim();
      if (!code) continue;
      const shortDescription = cells[iShort]?.trim() ?? "";
      if (!shortDescription) continue;
      const longDescription = iLong >= 0 ? cells[iLong]?.trim() || null : null;
      const isBillable = iBill >= 0 ? parseBool(cells[iBill], true) : true;
      const isActive = iAct >= 0 ? parseBool(cells[iAct], true) : true;
      const effectiveYear =
        iYear >= 0 && cells[iYear]?.trim() ? Number.parseInt(cells[iYear]!.trim(), 10) : null;
      const codeSetVersion = iVer >= 0 && cells[iVer]?.trim() ? cells[iVer]!.trim().slice(0, 32) : null;
      const chapter = iCh >= 0 && cells[iCh]?.trim() ? cells[iCh]!.trim() : null;
      const category = iCat >= 0 && cells[iCat]?.trim() ? cells[iCat]!.trim() : null;
      const normalizedCode = normalizeIcd10CodeForLookup(code);
      const searchText = [code, shortDescription, longDescription ?? ""].join(" ").toLowerCase();

      const row = {
        code,
        normalizedCode,
        shortDescription,
        longDescription,
        chapter,
        category,
        isBillable,
        isActive,
        effectiveYear: effectiveYear != null && Number.isFinite(effectiveYear) ? effectiveYear : null,
        codeSetVersion,
        searchText,
      };

      if (dryRun) {
        upserted++;
        continue;
      }

      await prisma.icd10DiagnosisCode.upsert({
        where: { code },
        create: { id: randomUUID(), ...row },
        update: {
          normalizedCode: row.normalizedCode,
          shortDescription: row.shortDescription,
          longDescription: row.longDescription,
          chapter: row.chapter,
          category: row.category,
          isBillable: row.isBillable,
          isActive: row.isActive,
          effectiveYear: row.effectiveYear,
          codeSetVersion: row.codeSetVersion,
          searchText: row.searchText,
        },
      });
      upserted++;
    }
    console.log(dryRun ? `[dry-run] Would process ${upserted} data rows.` : `Upserted ${upserted} ICD-10 rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
