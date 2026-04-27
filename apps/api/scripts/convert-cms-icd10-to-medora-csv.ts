/**
 * Convert official CMS/NCHS ICD-10-CM text files into Medora's importer CSV shape.
 *
 * Supported inputs:
 * - CMS order file: order number, code, valid/header flag, short description, long description.
 * - CMS code descriptions file: code and long description only.
 *
 * This script never touches the database.
 *
 * Usage:
 *   pnpm --filter @medora/api exec ts-node --transpile-only scripts/convert-cms-icd10-to-medora-csv.ts -- --file=/path/ICD10cm_order_2026.txt --format=order --output=/tmp/icd10-medora.csv
 *   pnpm --filter @medora/api exec ts-node --transpile-only scripts/convert-cms-icd10-to-medora-csv.ts -- --file=/path/icd10cm_code_2026.txt --format=code --dry-run --limit=100
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type SourceFormat = "auto" | "order" | "code";

type ConvertedRow = {
  code: string;
  short_description: string;
  long_description: string;
  is_billable: boolean;
  is_active: boolean;
  effective_year: string;
  code_set_version: string;
  chapter: string;
  category: string;
};

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseLimit(): number | null {
  const raw = getArg("limit");
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || String(n) !== raw) {
    console.error("--limit must be a positive integer.");
    process.exit(1);
  }
  return n;
}

function parseFormat(): SourceFormat {
  const raw = getArg("format") ?? "auto";
  if (raw === "auto" || raw === "order" || raw === "code") return raw;
  console.error("--format must be one of: auto, order, code.");
  process.exit(1);
}

function csvCell(value: string | boolean): string {
  const s = String(value);
  if (!/[",\n\r]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: ConvertedRow[]): string {
  const header = [
    "code",
    "short_description",
    "long_description",
    "is_billable",
    "is_active",
    "effective_year",
    "code_set_version",
    "chapter",
    "category",
  ];
  const lines = rows.map((row) =>
    header.map((key) => csvCell(row[key as keyof ConvertedRow])).join(",")
  );
  return [header.join(","), ...lines].join("\n") + "\n";
}

function withDot(code: string): string {
  const raw = code.trim().toUpperCase();
  if (raw.includes(".") || raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}.${raw.slice(3)}`;
}

function parseOrderLine(line: string): ConvertedRow | null {
  const orderNo = line.slice(0, 5).trim();
  const codeRaw = line.slice(6, 13).trim();
  const headerFlag = line.slice(14, 15).trim();
  const shortDescription = line.slice(16, 76).trim();
  const longDescription = line.slice(77).trim();

  if (!/^\d+$/.test(orderNo)) return null;
  if (!/^[A-Z][A-Z0-9]{2,6}$/.test(codeRaw)) return null;
  if (headerFlag !== "0" && headerFlag !== "1") return null;
  if (!shortDescription || !longDescription) return null;

  return {
    code: withDot(codeRaw),
    short_description: shortDescription,
    long_description: longDescription,
    is_billable: headerFlag === "1",
    is_active: true,
    effective_year: "",
    code_set_version: "",
    chapter: "",
    category: codeRaw.slice(0, 3),
  };
}

function parseCodeLine(line: string): ConvertedRow | null {
  const codeRaw = line.slice(0, 7).trim();
  const longDescription = line.slice(8).trim();

  if (!/^[A-Z][A-Z0-9]{2,6}$/.test(codeRaw)) return null;
  if (!longDescription) return null;

  return {
    code: withDot(codeRaw),
    short_description: longDescription,
    long_description: longDescription,
    is_billable: true,
    is_active: true,
    effective_year: "",
    code_set_version: "",
    chapter: "",
    category: codeRaw.slice(0, 3),
  };
}

function parseLine(line: string, format: SourceFormat): { row: ConvertedRow | null; detected: Exclude<SourceFormat, "auto"> | null } {
  if (format === "order") return { row: parseOrderLine(line), detected: "order" };
  if (format === "code") return { row: parseCodeLine(line), detected: "code" };

  const order = parseOrderLine(line);
  if (order) return { row: order, detected: "order" };
  const code = parseCodeLine(line);
  if (code) return { row: code, detected: "code" };
  return { row: null, detected: null };
}

function main() {
  const fileArg = getArg("file");
  if (!fileArg) {
    console.error("Missing --file=/path/to/cms-icd10.txt");
    process.exit(1);
  }
  const outputArg = getArg("output");
  const dryRun = hasFlag("dry-run");
  const format = parseFormat();
  const limit = parseLimit();

  if (!dryRun && !outputArg) {
    console.error("Missing --output=/path/to/medora-icd10.csv. Use --dry-run for validation only.");
    process.exit(1);
  }

  const sourcePath = resolve(process.cwd(), fileArg);
  const raw = readFileSync(sourcePath, "utf8");
  const sourceRows = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const limitedRows = limit != null ? sourceRows.slice(0, limit) : sourceRows;
  const rows: ConvertedRow[] = [];
  const seenCodes = new Set<string>();
  const duplicateCodes = new Set<string>();
  const parseFailures: Array<{ lineNumber: number; value: string }> = [];
  const detectedFormats = new Set<string>();

  for (let i = 0; i < limitedRows.length; i++) {
    const line = limitedRows[i]!;
    const parsed = parseLine(line, format);
    if (!parsed.row) {
      parseFailures.push({ lineNumber: i + 1, value: line.slice(0, 120) });
      continue;
    }
    if (parsed.detected) detectedFormats.add(parsed.detected);
    if (seenCodes.has(parsed.row.code)) duplicateCodes.add(parsed.row.code);
    seenCodes.add(parsed.row.code);
    rows.push(parsed.row);
  }

  console.log("=== CMS ICD-10-CM to Medora CSV conversion ===");
  console.log(`Source file:        ${sourcePath}`);
  console.log(`Requested format:   ${format}`);
  console.log(`Detected format(s): ${Array.from(detectedFormats).join(", ") || "(none)"}`);
  console.log(`Source rows:        ${sourceRows.length}`);
  if (limit != null) console.log(`Limit applied:      ${limit}`);
  console.log(`Rows inspected:     ${limitedRows.length}`);
  console.log(`Rows converted:     ${rows.length}`);
  console.log(`Parse failures:     ${parseFailures.length}`);
  console.log(`Duplicate codes:    ${duplicateCodes.size}`);
  if (duplicateCodes.size > 0) {
    console.log(`Duplicate sample:   ${Array.from(duplicateCodes).slice(0, 25).join(", ")}`);
  }
  console.log("First converted rows (max 5):");
  for (const row of rows.slice(0, 5)) {
    console.log(`  ${JSON.stringify(row)}`);
  }
  if (rows.length === 0) {
    console.log("  (none)");
  }

  if (parseFailures.length > 0) {
    console.error("Parse failure sample (max 5):");
    for (const failure of parseFailures.slice(0, 5)) {
      console.error(`  line ${failure.lineNumber}: ${JSON.stringify(failure.value)}`);
    }
    process.exitCode = 1;
    return;
  }
  if (duplicateCodes.size > 0) {
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log("[dry-run] No output file written.");
    return;
  }

  const outputPath = resolve(process.cwd(), outputArg!);
  writeFileSync(outputPath, toCsv(rows), "utf8");
  console.log(`Wrote Medora CSV:   ${outputPath}`);
}

main();
