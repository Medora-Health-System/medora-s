/**
 * Parse official CMS/NCHS ICD-10-CM order/code text files into Medora catalog rows.
 * Does not invent codes or truncate seventh characters.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { Icd10CmReleaseManifest } from "./icd10-cm-release-manifest";

export type ParsedIcd10CmRow = {
  code: string;
  normalizedCode: string;
  shortDescription: string;
  longDescription: string;
  isBillable: boolean;
  isSelectable: boolean;
  isActive: boolean;
  chapter: string | null;
  category: string;
  requiresSeventhCharacter: boolean;
  validSeventhCharacters: string | null;
};

export type ParseIcd10CmReleaseResult = {
  rows: ParsedIcd10CmRow[];
  sourcePath: string;
  sourceBasename: string;
  sourceSha256: string;
  format: "order" | "code" | "medora_csv";
  billableCount: number;
  headerCount: number;
  duplicateCodes: string[];
  parseFailures: Array<{ lineNumber: number; value: string }>;
};

function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function withDot(code: string): string {
  const raw = code.trim().toUpperCase();
  if (raw.includes(".") || raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}.${raw.slice(3)}`;
}

export function normalizeIcd10CodeDotless(code: string): string {
  return code.trim().toUpperCase().replace(/\./g, "");
}

function parseOrderLine(line: string): Omit<ParsedIcd10CmRow, "requiresSeventhCharacter" | "validSeventhCharacters"> | null {
  const orderNo = line.slice(0, 5).trim();
  const codeRaw = line.slice(6, 13).trim();
  const headerFlag = line.slice(14, 15).trim();
  const shortDescription = line.slice(16, 76).trim();
  const longDescription = line.slice(77).trim();

  if (!/^\d+$/.test(orderNo)) return null;
  if (!/^[A-Z][A-Z0-9]{2,6}$/.test(codeRaw)) return null;
  if (headerFlag !== "0" && headerFlag !== "1") return null;
  if (!shortDescription || !longDescription) return null;

  const billable = headerFlag === "1";
  return {
    code: withDot(codeRaw),
    normalizedCode: codeRaw.toUpperCase(),
    shortDescription,
    longDescription,
    isBillable: billable,
    isSelectable: billable,
    isActive: true,
    chapter: null,
    category: codeRaw.slice(0, 3),
  };
}

function parseCodeLine(line: string): Omit<ParsedIcd10CmRow, "requiresSeventhCharacter" | "validSeventhCharacters"> | null {
  const codeRaw = line.slice(0, 7).trim();
  const longDescription = line.slice(8).trim();
  if (!/^[A-Z][A-Z0-9]{2,6}$/.test(codeRaw)) return null;
  if (!longDescription) return null;
  return {
    code: withDot(codeRaw),
    normalizedCode: codeRaw.toUpperCase(),
    shortDescription: longDescription,
    longDescription,
    isBillable: true,
    isSelectable: true,
    isActive: true,
    chapter: null,
    category: codeRaw.slice(0, 3),
  };
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

function attachSeventhCharacterMetadata(rows: ParsedIcd10CmRow[]): ParsedIcd10CmRow[] {
  const byStem = new Map<string, Set<string>>();
  for (const row of rows) {
    const n = row.normalizedCode;
    if (n.length < 4) continue;
    const last = n[n.length - 1]!;
    if (!/[ADSX]/.test(last)) continue;
    const stem = n.slice(0, -1);
    if (!byStem.has(stem)) byStem.set(stem, new Set());
    byStem.get(stem)!.add(last);
  }
  return rows.map((row) => {
    const n = row.normalizedCode;
    const last = n[n.length - 1]!;
    const stem = n.slice(0, -1);
    const chars = byStem.get(stem);
    if (chars && chars.size >= 2 && /[ADSX]/.test(last)) {
      return {
        ...row,
        requiresSeventhCharacter: true,
        validSeventhCharacters: [...chars].sort().join(","),
      };
    }
    return { ...row, requiresSeventhCharacter: false, validSeventhCharacters: null };
  });
}

export function parseIcd10CmReleaseText(
  sourcePath: string,
  content: string,
  opts?: { format?: "auto" | "order" | "code" | "medora_csv"; limit?: number },
): ParseIcd10CmReleaseResult {
  const format = opts?.format ?? "auto";
  const sourceSha256 = sha256Hex(content);
  const sourceBasename = basename(sourcePath);
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const limited = opts?.limit != null ? lines.slice(0, opts.limit) : lines;

  const draft: Array<Omit<ParsedIcd10CmRow, "requiresSeventhCharacter" | "validSeventhCharacters">> = [];
  const seen = new Set<string>();
  const duplicateCodes = new Set<string>();
  const parseFailures: Array<{ lineNumber: number; value: string }> = [];
  let detected: ParseIcd10CmReleaseResult["format"] | null = null;

  const looksLikeCsv = limited[0]?.toLowerCase().includes("short_description");

  if (format === "medora_csv" || (format === "auto" && looksLikeCsv)) {
    detected = "medora_csv";
    const header = parseCsvLine(limited[0]!);
    const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name);
    const iCode = idx("code");
    const iShort = idx("short_description");
    const iLong = idx("long_description");
    const iBill = idx("is_billable");
    if (iCode < 0 || iShort < 0) {
      throw new Error("Medora CSV must include code and short_description columns.");
    }
    for (let i = 1; i < limited.length; i++) {
      const cells = parseCsvLine(limited[i]!);
      const code = cells[iCode]?.trim();
      const shortDescription = cells[iShort]?.trim();
      if (!code || !shortDescription) {
        parseFailures.push({ lineNumber: i + 1, value: limited[i]!.slice(0, 120) });
        continue;
      }
      const billable =
        iBill >= 0 ? !["0", "false", "no"].includes((cells[iBill] ?? "true").toLowerCase()) : true;
      if (seen.has(code)) duplicateCodes.add(code);
      seen.add(code);
      draft.push({
        code,
        normalizedCode: normalizeIcd10CodeDotless(code),
        shortDescription,
        longDescription: (iLong >= 0 ? cells[iLong]?.trim() : "") || shortDescription,
        isBillable: billable,
        isSelectable: billable,
        isActive: true,
        chapter: null,
        category: normalizeIcd10CodeDotless(code).slice(0, 3),
      });
    }
  } else {
    for (let i = 0; i < limited.length; i++) {
      const line = limited[i]!;
      let row =
        format === "code"
          ? parseCodeLine(line)
          : format === "order"
            ? parseOrderLine(line)
            : parseOrderLine(line) ?? parseCodeLine(line);
      if (!row) {
        parseFailures.push({ lineNumber: i + 1, value: line.slice(0, 120) });
        continue;
      }
      if (!detected) detected = parseOrderLine(line) ? "order" : "code";
      if (seen.has(row.code)) duplicateCodes.add(row.code);
      seen.add(row.code);
      draft.push(row);
    }
  }

  const rows = attachSeventhCharacterMetadata(
    draft.map((r) => ({ ...r, requiresSeventhCharacter: false, validSeventhCharacters: null })),
  );
  return {
    rows,
    sourcePath,
    sourceBasename,
    sourceSha256,
    format: detected ?? "order",
    billableCount: rows.filter((r) => r.isBillable).length,
    headerCount: rows.filter((r) => !r.isBillable).length,
    duplicateCodes: [...duplicateCodes],
    parseFailures,
  };
}

export function parseIcd10CmReleaseFile(
  sourcePath: string,
  opts?: { format?: "auto" | "order" | "code" | "medora_csv"; limit?: number },
): ParseIcd10CmReleaseResult {
  const content = readFileSync(sourcePath, "utf8");
  return parseIcd10CmReleaseText(sourcePath, content, opts);
}

export function applyManifestMetadata(
  rows: ParsedIcd10CmRow[],
  manifest: Icd10CmReleaseManifest,
  sourceChecksum: string,
): Array<
  ParsedIcd10CmRow & {
    codeSystem: string;
    releaseVersion: string;
    releaseYear: number;
    codeSetVersion: string;
    effectiveYear: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    sourceChecksum: string;
    importedAt: Date;
    searchText: string;
  }
> {
  const effectiveFrom = new Date(`${manifest.effectiveFrom}T00:00:00.000Z`);
  const effectiveTo = manifest.effectiveTo ? new Date(`${manifest.effectiveTo}T23:59:59.999Z`) : null;
  const importedAt = new Date();
  return rows.map((row) => ({
    ...row,
    codeSystem: manifest.codeSystem,
    releaseVersion: manifest.releaseVersion,
    releaseYear: manifest.releaseYear,
    codeSetVersion: manifest.releaseVersion,
    effectiveYear: manifest.releaseYear,
    effectiveFrom,
    effectiveTo,
    sourceChecksum,
    importedAt,
    searchText: [row.code, row.shortDescription, row.longDescription].join(" ").toLowerCase(),
  }));
}
