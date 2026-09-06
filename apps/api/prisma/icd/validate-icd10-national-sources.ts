/**
 * P3-F.3 read-only national source validator.
 * Exact-code intersection of operator-supplied CIE-10-ES / CIM-10-FR artifacts
 * against an official U.S. ICD-10-CM order/ZIP. No Prisma writes. No ingest.
 *
 *   pnpm --filter @medora/api run icd:validate-national-sources -- \
 *     --us=/path/icd10cm-order-2026.txt \
 *     --es=/path/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx \
 *     --fr=/path/cim10frfm2025syst_claml_20241216_0.zip \
 *     --release=FY2026
 *
 * Source files remain external. Do not copy them into git.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import * as XLSX from "xlsx";
import {
  ICD10_P3F3_ADVERSARIAL_CODES,
  inspectAdversarialCodes,
  intersectNationalSource,
  nationalNormalizedCode,
  sampleCodes,
  type NationalSourceRow,
  type UsCatalogRow,
} from "@medora/shared";
import { parseIcd10CmReleaseFile, parseIcd10CmReleaseText } from "./parse-icd10-cm-release";
import { resolveIcd10CmReleaseManifest } from "./icd10-cm-release-manifest";

const SAMPLE_LIMIT = 20;
const LABEL_PREVIEW = 80;

export type NationalSourceCliArgs = {
  us: string;
  es: string;
  fr: string;
  release: string;
  jsonOut: string;
  humanOut: string;
  includeLabels: boolean;
};

export function parseNationalSourceArgs(argv: string[]): NationalSourceCliArgs {
  let us = "";
  let es = "";
  let fr = "";
  let release = "";
  let jsonOut = "";
  let humanOut = "";
  let includeLabels = false;
  for (const arg of argv) {
    if (arg === "--include-labels") includeLabels = true;
    else if (arg.startsWith("--us=")) us = arg.slice("--us=".length).trim();
    else if (arg.startsWith("--es=")) es = arg.slice("--es=".length).trim();
    else if (arg.startsWith("--fr=")) fr = arg.slice("--fr=".length).trim();
    else if (arg.startsWith("--release=")) release = arg.slice("--release=".length).trim();
    else if (arg.startsWith("--json-out=")) jsonOut = arg.slice("--json-out=".length).trim();
    else if (arg.startsWith("--human-out=")) humanOut = arg.slice("--human-out=".length).trim();
  }
  return { us, es, fr, release, jsonOut, humanOut, includeLabels };
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function previewLabel(label: string | null | undefined): string {
  const text = (label ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length <= LABEL_PREVIEW ? text : `${text.slice(0, LABEL_PREVIEW - 1)}…`;
}

function sampleRows(
  codes: readonly string[],
  lookup: ReadonlyMap<string, { code: string; label: string }>,
  includeLabels: boolean,
) {
  return sampleCodes(codes, SAMPLE_LIMIT).map((normalized) => {
    const row = lookup.get(normalized);
    return includeLabels
      ? { normalized, code: row?.code ?? normalized, label: previewLabel(row?.label) }
      : { normalized, code: row?.code ?? normalized };
  });
}

export function listZipEntries(zipPath: string): Array<{ name: string; size: number }> {
  const listing = execFileSync("unzip", ["-l", zipPath], { encoding: "utf8" });
  const rows: Array<{ name: string; size: number }> = [];
  for (const line of listing.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+(.+?)\s*$/);
    if (!match) continue;
    const name = match[2]!.trim();
    if (name === "Name" || name.startsWith("----") || name === "") continue;
    rows.push({ name, size: Number(match[1]) });
  }
  return rows;
}

export function readZipEntry(zipPath: string, innerName: string): string {
  return execFileSync("unzip", ["-p", zipPath, innerName], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

export type ParsedSpanishWorkbook = {
  fileName: string;
  sha256: string;
  sheets: Array<{ name: string; rowCount: number; headers: string[] }>;
  introCells: string[];
  workbookProps: Record<string, string>;
  finales: NationalSourceRow[];
  completeFinalCount: number;
  completeNonFinalCount: number;
};

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseSpanishCie10EsXlsx(filePath: string): ParsedSpanishWorkbook {
  if (!existsSync(filePath)) throw new Error(`SPANISH_SOURCE_NOT_FOUND: ${filePath}`);
  if (extname(filePath).toLowerCase() !== ".xlsx") {
    throw new Error(`MALFORMED_XLSX: expected .xlsx, got ${basename(filePath)}`);
  }
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (error) {
    throw new Error(`MALFORMED_XLSX: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!workbook.SheetNames.includes("ES2026 Finales")) {
    throw new Error(`MALFORMED_XLSX_MISSING_SHEET: ES2026 Finales (found ${workbook.SheetNames.join(", ")})`);
  }
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]!;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    return { name, rowCount: rows.length, headers };
  });
  const finalesSheet = workbook.Sheets["ES2026 Finales"]!;
  const finalesRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(finalesSheet, {
    defval: "",
    raw: false,
  });
  const headerKeys = finalesRows[0] ? Object.keys(finalesRows[0]) : [];
  const codeKey = headerKeys.find((key) => /c[oó]digo/i.test(key));
  const labelKey = headerKeys.find((key) => /descripci[oó]n/i.test(key));
  const finalKey = headerKeys.find((key) => /nodo_final/i.test(key));
  if (!codeKey || !labelKey) {
    throw new Error(`MALFORMED_XLSX_HEADERS: need Código/Descripción, found ${headerKeys.join(", ")}`);
  }
  const finales: NationalSourceRow[] = finalesRows.map((row) => {
    const code = cellText(row[codeKey]);
    return {
      code,
      normalizedCode: nationalNormalizedCode(code),
      label: cellText(row[labelKey]),
      terminal: finalKey ? cellText(row[finalKey]) === "1" : true,
      kind: "final",
    };
  });
  let completeFinalCount = 0;
  let completeNonFinalCount = 0;
  if (workbook.SheetNames.includes("ES2026 Completa + Marcadores")) {
    const completeRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets["ES2026 Completa + Marcadores"]!,
      { defval: "", raw: false },
    );
    for (const row of completeRows) {
      if (cellText(row.Nodo_Final) === "1") completeFinalCount += 1;
      else completeNonFinalCount += 1;
    }
  }
  const introCells: string[] = [];
  if (workbook.Sheets.Introducción || workbook.Sheets.Introduccion) {
    const intro = workbook.Sheets.Introducción ?? workbook.Sheets.Introduccion!;
    const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(intro, { header: 1, raw: false });
    for (const row of matrix) {
      for (const cell of row ?? []) {
        const text = cellText(cell);
        if (text) introCells.push(text);
      }
    }
  }
  const props = (workbook.Props ?? {}) as Record<string, unknown>;
  const workbookProps: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === "") continue;
    workbookProps[key] = String(value);
  }
  return {
    fileName: basename(filePath),
    sha256: sha256File(filePath),
    sheets,
    introCells,
    workbookProps,
    finales,
    completeFinalCount,
    completeNonFinalCount,
  };
}

export type ParsedFrenchClaml = {
  fileName: string;
  sha256: string;
  zipEntries: Array<{ name: string; size: number }>;
  xmlFileName: string;
  title: string;
  version: string;
  date: string;
  authority: string;
  uid: string;
  copyright: string[];
  modifierCount: number;
  modifierClassCount: number;
  classKindCounts: Record<string, number>;
  classes: NationalSourceRow[];
};

export function parseClamlXml(xml: string): Omit<ParsedFrenchClaml, "fileName" | "sha256" | "zipEntries" | "xmlFileName"> {
  if (!xml.includes("<ClaML") || !xml.includes("<Class")) {
    throw new Error("MALFORMED_CLAML: missing ClaML/Class structure");
  }
  const titleMatch = xml.match(/<Title\b([^>]*)>([^<]*)<\/Title>/);
  const titleAttrs = titleMatch?.[1] ?? "";
  const identifierMatch = xml.match(/<Identifier\b([^>]*)\/?>/);
  const identifierAttrs = identifierMatch?.[1] ?? "";
  const copyright = [...xml.matchAll(/<Meta\b[^>]*name="copyright"[^>]*value="([^"]*)"/gi)].map((m) => m[1]!);
  const classes: NationalSourceRow[] = [];
  const classKindCounts: Record<string, number> = {};
  const classRe = /<Class\b([^>]*)>([\s\S]*?)<\/Class>/g;
  let match: RegExpExecArray | null;
  while ((match = classRe.exec(xml))) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const code = (attrs.match(/\bcode="([^"]+)"/)?.[1] ?? "").trim();
    const kind = (attrs.match(/\bkind="([^"]+)"/)?.[1] ?? "").trim();
    const subclassCount = (body.match(/<SubClass\b/g) ?? []).length;
    const preferred = body.match(/<Rubric\b[^>]*kind="preferred"[^>]*>[\s\S]*?<Label\b[^>]*>([\s\S]*?)<\/Label>/i);
    const label = (preferred?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    classKindCounts[kind] = (classKindCounts[kind] ?? 0) + 1;
    classes.push({
      code,
      normalizedCode: nationalNormalizedCode(code),
      label,
      terminal: kind === "category" && subclassCount === 0,
      kind,
    });
  }
  if (classes.length === 0) throw new Error("MALFORMED_CLAML: no Class elements parsed");
  return {
    title: (titleMatch?.[2] ?? "").trim(),
    version: (titleAttrs.match(/\bversion="([^"]+)"/)?.[1] ?? "").trim(),
    date: (titleAttrs.match(/\bdate="([^"]+)"/)?.[1] ?? "").trim(),
    authority: (identifierAttrs.match(/\bauthority="([^"]+)"/)?.[1] ?? "").trim(),
    uid: (identifierAttrs.match(/\buid="([^"]+)"/)?.[1] ?? "").trim(),
    copyright,
    modifierCount: (xml.match(/<Modifier\b/g) ?? []).length,
    modifierClassCount: (xml.match(/<ModifierClass\b/g) ?? []).length,
    classKindCounts,
    classes,
  };
}

export function parseFrenchCim10FrZip(filePath: string): ParsedFrenchClaml {
  if (!existsSync(filePath)) throw new Error(`FRENCH_SOURCE_NOT_FOUND: ${filePath}`);
  if (extname(filePath).toLowerCase() !== ".zip") {
    throw new Error(`MALFORMED_ZIP: expected .zip, got ${basename(filePath)}`);
  }
  let zipEntries: Array<{ name: string; size: number }>;
  try {
    zipEntries = listZipEntries(filePath);
  } catch (error) {
    throw new Error(`MALFORMED_ZIP: ${error instanceof Error ? error.message : String(error)}`);
  }
  const xmlEntry = zipEntries.find((entry) => entry.name.toLowerCase().endsWith(".xml"));
  if (!xmlEntry) {
    throw new Error(`MALFORMED_ZIP_NO_CLAML: no XML in ${basename(filePath)}`);
  }
  const xml = readZipEntry(filePath, xmlEntry.name);
  const parsed = parseClamlXml(xml);
  return {
    fileName: basename(filePath),
    sha256: sha256File(filePath),
    zipEntries,
    xmlFileName: xmlEntry.name,
    ...parsed,
  };
}

export function loadUsCatalog(usPath: string): {
  fileName: string;
  sha256: string;
  rows: UsCatalogRow[];
  total: number;
  selectable: number;
  category: number;
} {
  if (!existsSync(usPath)) throw new Error(`US_SOURCE_NOT_FOUND: ${usPath}`);
  const sha256 = sha256File(usPath);
  const lower = usPath.toLowerCase();
  let parsed;
  if (lower.endsWith(".zip")) {
    const listing = listZipEntries(usPath);
    const order = listing.find((entry) => /order.*\.txt$/i.test(entry.name));
    if (!order) throw new Error(`MALFORMED_US_ZIP: no order .txt in ${basename(usPath)}`);
    parsed = parseIcd10CmReleaseText(order.name, readZipEntry(usPath, order.name), { format: "order" });
  } else {
    parsed = parseIcd10CmReleaseFile(usPath, { format: "auto" });
  }
  const rows: UsCatalogRow[] = parsed.rows.map((row) => ({
    code: row.code,
    normalizedCode: row.normalizedCode,
    label: row.longDescription || row.shortDescription,
    selectable: row.isSelectable,
  }));
  return {
    fileName: basename(usPath),
    sha256,
    rows,
    total: rows.length,
    selectable: rows.filter((row) => row.selectable).length,
    category: rows.filter((row) => !row.selectable).length,
  };
}

function toLookup(rows: readonly NationalSourceRow[]) {
  const map = new Map<string, NationalSourceRow>();
  for (const row of rows) map.set(row.normalizedCode, row);
  return map;
}

export function buildNationalSourceValidationReport(input: {
  release: string;
  us: ReturnType<typeof loadUsCatalog>;
  es: ParsedSpanishWorkbook;
  fr: ParsedFrenchClaml;
  includeLabels: boolean;
}) {
  const manifest = resolveIcd10CmReleaseManifest(input.release);
  const usByNorm = new Map(input.us.rows.map((row) => [row.normalizedCode, row]));
  const esAll = toLookup(input.es.finales);
  const frAll = toLookup(input.fr.classes);
  const esStats = intersectNationalSource({
    usRows: input.us.rows,
    sourceRows: input.es.finales,
    terminalOnly: true,
  });
  const frTerminalStats = intersectNationalSource({
    usRows: input.us.rows,
    sourceRows: input.fr.classes,
    terminalOnly: true,
  });
  const frAnyStats = intersectNationalSource({
    usRows: input.us.rows,
    sourceRows: input.fr.classes,
    terminalOnly: false,
  });
  const usLookup = new Map(input.us.rows.map((row) => [row.normalizedCode, row]));
  return {
    databaseWrites: false,
    release: input.release,
    manifest: {
      releaseVersion: manifest.releaseVersion,
      effectiveFrom: manifest.effectiveFrom,
      effectiveTo: manifest.effectiveTo,
      artifactFileName: manifest.artifactFileName,
      artifactSha256: manifest.artifactSha256,
      sourceUrl: manifest.sourceUrl,
      expectedOrderRows: manifest.expectedOrderRows,
      expectedBillableRows: manifest.expectedBillableRows,
    },
    us: {
      fileName: input.us.fileName,
      sha256: input.us.sha256,
      total: input.us.total,
      selectable: input.us.selectable,
      category: input.us.category,
    },
    spanish: {
      fileName: input.es.fileName,
      sha256: input.es.sha256,
      sheets: input.es.sheets,
      workbookProps: input.es.workbookProps,
      introCells: input.es.introCells.slice(0, 40),
      finalRowCount: input.es.finales.length,
      completeFinalCount: input.es.completeFinalCount,
      completeNonFinalCount: input.es.completeNonFinalCount,
      stats: {
        usSelectableTotal: esStats.usSelectableTotal,
        sourceRowTotal: esStats.sourceRowTotal,
        sourceUniqueNormalized: esStats.sourceUniqueNormalized,
        exactCodeIntersection: esStats.exactCodeIntersection,
        usOnly: esStats.usOnly,
        sourceOnly: esStats.sourceOnly,
        categoryCollisions: esStats.categoryCollisions,
        invalidUnrecognized: esStats.invalidUnrecognized,
        duplicateNormalized: esStats.duplicateNormalized,
        blankLabels: esStats.blankLabels,
        exactCodeCoveragePercent: esStats.exactCodeCoveragePercent,
      },
      samples: {
        exact: sampleRows(esStats.intersectionCodes, esAll, input.includeLabels),
        usOnly: sampleRows(esStats.usOnlyCodes, usLookup, input.includeLabels),
        sourceOnly: sampleRows(esStats.sourceOnlyCodes, esAll, input.includeLabels),
        category: sampleRows(esStats.categoryCollisionCodes, esAll, input.includeLabels),
      },
      adversarial: inspectAdversarialCodes({
        queries: ICD10_P3F3_ADVERSARIAL_CODES,
        usByNormalized: usByNorm,
        sourceByNormalized: esAll,
      }),
    },
    french: {
      fileName: input.fr.fileName,
      sha256: input.fr.sha256,
      zipEntries: input.fr.zipEntries,
      xmlFileName: input.fr.xmlFileName,
      title: input.fr.title,
      version: input.fr.version,
      date: input.fr.date,
      authority: input.fr.authority,
      uid: input.fr.uid,
      copyright: input.fr.copyright,
      modifierCount: input.fr.modifierCount,
      modifierClassCount: input.fr.modifierClassCount,
      classKindCounts: input.fr.classKindCounts,
      classCount: input.fr.classes.length,
      terminalCount: input.fr.classes.filter((row) => row.terminal).length,
      statsTerminal: {
        usSelectableTotal: frTerminalStats.usSelectableTotal,
        sourceRowTotal: frTerminalStats.sourceRowTotal,
        sourceUniqueNormalized: frTerminalStats.sourceUniqueNormalized,
        exactCodeIntersection: frTerminalStats.exactCodeIntersection,
        usOnly: frTerminalStats.usOnly,
        sourceOnly: frTerminalStats.sourceOnly,
        categoryCollisions: frTerminalStats.categoryCollisions,
        invalidUnrecognized: frTerminalStats.invalidUnrecognized,
        duplicateNormalized: frTerminalStats.duplicateNormalized,
        blankLabels: frTerminalStats.blankLabels,
        exactCodeCoveragePercent: frTerminalStats.exactCodeCoveragePercent,
      },
      statsAnyClass: {
        exactCodeIntersection: frAnyStats.exactCodeIntersection,
        usOnly: frAnyStats.usOnly,
        sourceOnly: frAnyStats.sourceOnly,
        categoryCollisions: frAnyStats.categoryCollisions,
        exactCodeCoveragePercent: frAnyStats.exactCodeCoveragePercent,
      },
      samples: {
        exact: sampleRows(frTerminalStats.intersectionCodes, frAll, input.includeLabels),
        usOnly: sampleRows(frTerminalStats.usOnlyCodes, usLookup, input.includeLabels),
        sourceOnly: sampleRows(frTerminalStats.sourceOnlyCodes, frAll, input.includeLabels),
        category: sampleRows(frTerminalStats.categoryCollisionCodes, frAll, input.includeLabels),
      },
      adversarial: inspectAdversarialCodes({
        queries: ICD10_P3F3_ADVERSARIAL_CODES,
        usByNormalized: usByNorm,
        sourceByNormalized: frAll,
      }),
    },
  };
}

export function formatNationalSourceHumanReport(
  report: ReturnType<typeof buildNationalSourceValidationReport>,
): string {
  const es = report.spanish.stats;
  const fr = report.french.statsTerminal;
  const lines = [
    "P3-F.3 NATIONAL SOURCE VALIDATION (read-only)",
    `RELEASE=${report.release}`,
    `US file=${report.us.fileName} sha256=${report.us.sha256}`,
    `US total=${report.us.total} selectable=${report.us.selectable} category=${report.us.category}`,
    `ES file=${report.spanish.fileName} sha256=${report.spanish.sha256}`,
    `ES finales=${es.sourceRowTotal} intersection=${es.exactCodeIntersection} US-only=${es.usOnly} ES-only=${es.sourceOnly} coverage=${es.exactCodeCoveragePercent}% categoryCollisions=${es.categoryCollisions} dup=${es.duplicateNormalized} blank=${es.blankLabels} invalid=${es.invalidUnrecognized}`,
    `FR file=${report.french.fileName} sha256=${report.french.sha256}`,
    `FR title=${report.french.title} version=${report.french.version} authority=${report.french.authority}`,
    `FR classes=${report.french.classCount} terminal=${report.french.terminalCount} intersection=${fr.exactCodeIntersection} US-only=${fr.usOnly} FR-only=${fr.sourceOnly} coverage=${fr.exactCodeCoveragePercent}% categoryCollisions=${fr.categoryCollisions}`,
    `DATABASE_WRITES=${report.databaseWrites}`,
    "NO category inheritance. Matching code is not automatic semantic exactness.",
  ];
  return lines.join("\n");
}

function main(argv: string[]) {
  const args = parseNationalSourceArgs(argv);
  if (!args.release) {
    throw new Error("--release is required. Do not silently assume FY2026.");
  }
  if (!args.us || !args.es || !args.fr) {
    throw new Error("Required: --us= --es= --fr= --release=");
  }
  const us = loadUsCatalog(args.us);
  const es = parseSpanishCie10EsXlsx(args.es);
  const fr = parseFrenchCim10FrZip(args.fr);
  const report = buildNationalSourceValidationReport({
    release: args.release,
    us,
    es,
    fr,
    includeLabels: args.includeLabels,
  });
  const human = formatNationalSourceHumanReport(report);
  process.stdout.write(`${human}\n`);
  if (args.jsonOut) writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  if (args.humanOut) writeFileSync(args.humanOut, `${human}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
