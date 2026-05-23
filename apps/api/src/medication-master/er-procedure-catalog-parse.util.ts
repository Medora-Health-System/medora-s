import * as XLSX from "xlsx";
import { BadRequestException } from "@nestjs/common";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";

export type ErProcedureParsedRow = {
  rowKey: string;
  rowNumber: number;
  code: string;
  codeSystem: "CPT" | "HCPCS";
  shortDescription: string;
  longDescription: string | null;
};

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

function headerIndex(headers: string[], names: string[]): number {
  const norm = (h: string) => h.trim().toLowerCase().replace(/[\s-/]+/g, "_");
  const keys = headers.map(norm);
  for (const name of names) {
    const i = keys.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

function inferCodeSystem(code: string): "CPT" | "HCPCS" | null {
  const t = code.trim().toUpperCase();
  if (/^\d{5}$/.test(t)) return "CPT";
  if (/^[A-V]\d{4}$/.test(t)) return "HCPCS";
  if (/^[A-Z]\d{3,4}$/.test(t)) return "HCPCS";
  return null;
}

function buildRow(
  rowNumber: number,
  code: string,
  codeSystem: "CPT" | "HCPCS",
  shortDescription: string,
  longDescription: string | null
): ErProcedureParsedRow | null {
  if (!code.trim() && !shortDescription.trim()) return null;
  const short = shortDescription.trim() || (longDescription?.trim().slice(0, 512) ?? "");
  if (!code.trim() || !short) return null;
  return {
    rowKey: `ER_PROC_${rowNumber}`,
    rowNumber,
    code: code.trim(),
    codeSystem,
    shortDescription: short,
    longDescription: longDescription?.trim() || null,
  };
}

function parseMatrix(matrix: string[][]): ErProcedureParsedRow[] {
  if (matrix.length < 2) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Fichier vide ou sans données.",
    });
  }

  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, matrix.length); i++) {
    const headers = (matrix[i] ?? []).map((c) => String(c ?? ""));
    const iCode = headerIndex(headers, [
      "code",
      "hcpcs",
      "hcpc",
      "cpt",
      "hcpcs_code",
      "procedure_code",
    ]);
    if (iCode >= 0) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = (matrix[headerRowIdx] ?? []).map((c) => String(c ?? ""));
  const iCode = headerIndex(headers, [
    "code",
    "hcpcs",
    "hcpc",
    "cpt",
    "hcpcs_code",
    "procedure_code",
  ]);
  const iSys = headerIndex(headers, ["code_system", "system", "codesystem"]);
  const iShort = headerIndex(headers, [
    "short_description",
    "short_desc",
    "description",
  ]);
  const iLong = headerIndex(headers, [
    "long_description",
    "long_desc",
    "procedure_description",
    "desc",
  ]);

  if (iCode < 0) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Colonne code HCPCS/CPT introuvable.",
    });
  }

  const rows: ErProcedureParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const code = String(line[iCode] ?? "").trim();
    if (!code || code.toLowerCase() === "hcpcs" || code.toLowerCase() === "code") continue;

    let codeSystem: "CPT" | "HCPCS" | null = null;
    if (iSys >= 0) {
      const sysRaw = String(line[iSys] ?? "").trim().toUpperCase();
      if (sysRaw === "CPT" || sysRaw === "HCPCS") codeSystem = sysRaw;
    }
    if (!codeSystem) codeSystem = inferCodeSystem(code);
    if (!codeSystem) continue;

    const longDescription = iLong >= 0 ? String(line[iLong] ?? "").trim() || null : null;
    const shortDescription =
      iShort >= 0 ? String(line[iShort] ?? "").trim() : longDescription?.slice(0, 512) ?? "";

    const built = buildRow(r + 1, code, codeSystem, shortDescription, longDescription);
    if (built) rows.push(built);
  }

  if (rows.length === 0) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Aucune ligne de procédure valide détectée.",
    });
  }

  return rows;
}

export function parseErProcedureCatalogCsv(buffer: Buffer): ErProcedureParsedRow[] {
  const raw = buffer.toString("utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const matrix = lines.map((l) => parseCsvLine(l));
  return parseMatrix(matrix);
}

export function parseErProcedureCatalogXlsx(buffer: Buffer): ErProcedureParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new BadRequestException("Classeur vide.");
  const sheet = wb.Sheets[sheetName]!;
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
  return parseMatrix(matrix);
}

export function parseErProcedureCatalogUpload(buffer: Buffer, filename: string): ErProcedureParsedRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return parseErProcedureCatalogCsv(buffer);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseErProcedureCatalogXlsx(buffer);
  throw new BadRequestException("Format accepté : .csv, .xlsx, .xls");
}
