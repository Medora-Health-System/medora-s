import * as XLSX from "xlsx";
import {
  detectColumnIndexes,
  parsePriorityErInventoryWorkbook,
  type PriorityErInventoryWorkbookRow,
} from "./priority-er-inventory-workbook.util";
import { BadRequestException } from "@nestjs/common";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";

export type ControlledCatalogMedicationParsedRow = {
  rowKey: string;
  rowNumber: number;
  medication: string;
  dose: string;
  form: string;
  ndc11: string | null;
  price: string | null;
  exactSourceText: string;
};

export type ControlledCatalogProcedureParsedRow = {
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
  const norm = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const keys = headers.map(norm);
  for (const name of names) {
    const i = keys.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

function normalizeNdc11(raw: string | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 11) return digits;
  if (digits.length === 10) return `0${digits}`;
  return null;
}

export function parseControlledMedicationCsv(buffer: Buffer): ControlledCatalogMedicationParsedRow[] {
  const raw = buffer.toString("utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Le fichier CSV doit contenir une ligne d’en-tête et au moins une ligne de données.",
    });
  }
  const header = parseCsvLine(lines[0]!);
  const iMed = headerIndex(header, ["medication", "med", "drug", "name"]);
  const iDose = headerIndex(header, ["dose", "strength", "concentration"]);
  const iForm = headerIndex(header, ["form", "route", "dosage_form"]);
  const iNdc = headerIndex(header, ["ndc", "ndc11"]);
  const iPrice = headerIndex(header, ["price", "unit_price", "cost"]);
  if (iMed < 0 || iDose < 0 || iForm < 0) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Colonnes requises : Medication, Dose, Form (ou équivalents).",
    });
  }

  const rows: ControlledCatalogMedicationParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const medication = cells[iMed] ?? "";
    const dose = cells[iDose] ?? "";
    const form = cells[iForm] ?? "";
    if (!medication.trim() && !dose.trim() && !form.trim()) continue;
    const rowNumber = i + 1;
    rows.push({
      rowKey: `CTL_CSV_${rowNumber}`,
      rowNumber,
      medication: medication.trim(),
      dose: dose.trim(),
      form: form.trim(),
      ndc11: iNdc >= 0 ? normalizeNdc11(cells[iNdc]) : null,
      price: iPrice >= 0 ? (cells[iPrice] ?? "").trim() || null : null,
      exactSourceText: [medication, dose, form].filter(Boolean).join(" ").trim(),
    });
  }
  return rows;
}

function mapWorkbookRow(r: PriorityErInventoryWorkbookRow): ControlledCatalogMedicationParsedRow {
  return {
    rowKey: r.sourceRowId,
    rowNumber: r.rowNumber,
    medication: r.medication,
    dose: r.dose,
    form: r.form,
    ndc11: null,
    price: null,
    exactSourceText: r.exactSourceText,
  };
}

export function parseControlledMedicationUpload(
  buffer: Buffer,
  filename: string
): ControlledCatalogMedicationParsedRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseControlledMedicationCsv(buffer);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const parsed = parsePriorityErInventoryWorkbook(buffer, filename);
    return parsed.rows.map(mapWorkbookRow);
  }
  throw new BadRequestException("Format accepté : .csv, .xlsx, .xls");
}

export function parseControlledProcedureCsv(buffer: Buffer): ControlledCatalogProcedureParsedRow[] {
  const raw = buffer.toString("utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Le fichier CSV doit contenir une ligne d’en-tête et au moins une ligne de données.",
    });
  }
  const header = parseCsvLine(lines[0]!);
  const iCode = headerIndex(header, ["code", "hcpcs", "cpt"]);
  const iSys = headerIndex(header, ["code_system", "system", "codesystem"]);
  const iShort = headerIndex(header, ["short_description", "description", "short_desc"]);
  const iLong = headerIndex(header, ["long_description", "long_desc"]);
  if (iCode < 0 || iSys < 0 || iShort < 0) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Colonnes requises : code, code_system, short_description.",
    });
  }

  const rows: ControlledCatalogProcedureParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const code = (cells[iCode] ?? "").trim();
    const sysRaw = (cells[iSys] ?? "").trim().toUpperCase();
    const shortDescription = (cells[iShort] ?? "").trim();
    if (!code && !shortDescription) continue;
    const codeSystem = sysRaw === "CPT" ? "CPT" : sysRaw === "HCPCS" ? "HCPCS" : null;
    if (!codeSystem) continue;
    const rowNumber = i + 1;
    rows.push({
      rowKey: `CTL_PROC_CSV_${rowNumber}`,
      rowNumber,
      code,
      codeSystem,
      shortDescription,
      longDescription: iLong >= 0 ? (cells[iLong] ?? "").trim() || null : null,
    });
  }
  return rows;
}

export function parseControlledProcedureXlsx(buffer: Buffer, filename: string): ControlledCatalogProcedureParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException("Classeur vide.");
  }
  const sheet = wb.Sheets[sheetName]!;
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
  if (matrix.length < 2) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Feuille vide ou sans données.",
    });
  }
  const headers = (matrix[0] ?? []).map((c) => String(c ?? ""));
  const iCode = headerIndex(headers, ["code", "hcpcs", "cpt"]);
  const iSys = headerIndex(headers, ["code_system", "system", "codesystem"]);
  const iShort = headerIndex(headers, ["short_description", "description", "short_desc"]);
  const iLong = headerIndex(headers, ["long_description", "long_desc"]);
  if (iCode < 0 || iSys < 0 || iShort < 0) {
    throwInventoryImportError({
      code: "MISSING_REQUIRED_COLUMNS",
      message: "Colonnes requises : code, code_system, short_description.",
    });
  }

  const rows: ControlledCatalogProcedureParsedRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const code = String(line[iCode] ?? "").trim();
    const sysRaw = String(line[iSys] ?? "").trim().toUpperCase();
    const shortDescription = String(line[iShort] ?? "").trim();
    if (!code && !shortDescription) continue;
    const codeSystem = sysRaw === "CPT" ? "CPT" : sysRaw === "HCPCS" ? "HCPCS" : null;
    if (!codeSystem) continue;
    rows.push({
      rowKey: `CTL_PROC_${sheetName}_${r + 1}`,
      rowNumber: r + 1,
      code,
      codeSystem,
      shortDescription,
      longDescription: iLong >= 0 ? String(line[iLong] ?? "").trim() || null : null,
    });
  }
  return rows;
}

export function parseControlledProcedureUpload(
  buffer: Buffer,
  filename: string
): ControlledCatalogProcedureParsedRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return parseControlledProcedureCsv(buffer);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseControlledProcedureXlsx(buffer, filename);
  }
  throw new BadRequestException("Format accepté : .csv, .xlsx, .xls");
}

/** Detect optional NDC/price columns in medication XLSX (second pass). */
export function enrichMedicationXlsxOptionalColumns(
  buffer: Buffer,
  rows: ControlledCatalogMedicationParsedRow[]
): ControlledCatalogMedicationParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return rows;
  const sheet = wb.Sheets[sheetName]!;
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
  const headers = (matrix[0] ?? []).map((c) => String(c ?? ""));
  const idx = detectColumnIndexes(headers);
  if (!idx) return rows;
  const iNdc = headerIndex(headers, ["ndc", "ndc11"]);
  const iPrice = headerIndex(headers, ["price", "unit_price", "cost"]);

  return rows.map((row) => {
    const line = matrix[row.rowNumber - 1];
    if (!line) return row;
    return {
      ...row,
      ndc11: iNdc >= 0 ? normalizeNdc11(String(line[iNdc] ?? "")) : row.ndc11,
      price: iPrice >= 0 ? String(line[iPrice] ?? "").trim() || null : row.price,
    };
  });
}
