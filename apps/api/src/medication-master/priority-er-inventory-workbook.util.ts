import * as XLSX from "xlsx";
import { PRIORITY_ER_INVENTORY_XLSX_COLUMNS } from "./priority-er-reconciliation.constants";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";

export type PriorityErInventoryWorkbookRow = {
  sourceRowId: string;
  sheetName: string;
  rowNumber: number;
  workbookFilename: string;
  medication: string;
  dose: string;
  form: string;
  exactSourceText: string;
  sourceNameExact: string;
  sourceStrengthExact: string;
  sourceRouteExact: string | null;
  sourcePackageExact: string | null;
  sourceReviewStatus: string;
  originalRow: Record<string, string>;
};

export type ParsePriorityErInventoryResult = {
  rows: PriorityErInventoryWorkbookRow[];
  sheetNames: string[];
  parsedSheetName: string | null;
  headerRowIndex: number | null;
  detectedHeaders: string[];
};

function cellExactText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  if (cell.w != null && typeof cell.w === "string") return cell.w;
  if (cell.v == null) return "";
  return String(cell.v);
}

function headerKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeHeaderForMatch(raw: string): string {
  return headerKey(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchHeader(h: string, candidates: readonly string[]): boolean {
  const key = normalizeHeaderForMatch(h);
  if (!key) return false;
  return candidates.some((c) => {
    const cand = normalizeHeaderForMatch(c);
    return key === cand || key.includes(cand) || cand.includes(key);
  });
}

export function detectColumnIndexes(headers: string[]): {
  medicationIdx: number;
  doseIdx: number;
  formIdx: number;
} | null {
  let medicationIdx = -1;
  let doseIdx = -1;
  let formIdx = -1;

  headers.forEach((h, i) => {
    if (matchHeader(h, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.medication)) medicationIdx = i;
    if (matchHeader(h, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.dose)) doseIdx = i;
    if (matchHeader(h, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.form)) formIdx = i;
  });

  if (medicationIdx < 0) return null;
  return { medicationIdx, doseIdx, formIdx };
}

function joinExactSourceText(parts: string[]): string {
  return parts.filter((p) => p.length > 0).join(" ");
}

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const matrix: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      row.push(cellExactText(sheet[addr]));
    }
    matrix.push(row);
  }
  return matrix;
}

function parseMatrix(
  matrix: string[][],
  sheetName: string,
  workbookFilename: string
): {
  rows: PriorityErInventoryWorkbookRow[];
  headerRowIndex: number | null;
  detectedHeaders: string[];
} {
  if (matrix.length === 0) {
    return { rows: [], headerRowIndex: null, detectedHeaders: [] };
  }

  let headerRowIndex = -1;
  let columnIndexes: ReturnType<typeof detectColumnIndexes> = null;

  for (let i = 0; i < Math.min(matrix.length, 60); i++) {
    const detected = detectColumnIndexes(matrix[i] ?? []);
    if (detected) {
      headerRowIndex = i;
      columnIndexes = detected;
      break;
    }
  }

  if (!columnIndexes || headerRowIndex < 0) {
    return { rows: [], headerRowIndex: null, detectedHeaders: matrix[0] ?? [] };
  }

  const headers = matrix[headerRowIndex] ?? [];
  const rows: PriorityErInventoryWorkbookRow[] = [];

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    if (cells.every((c) => c.length === 0)) continue;

    const medication = cells[columnIndexes.medicationIdx] ?? "";
    const dose = columnIndexes.doseIdx >= 0 ? (cells[columnIndexes.doseIdx] ?? "") : "";
    const form = columnIndexes.formIdx >= 0 ? (cells[columnIndexes.formIdx] ?? "") : "";

    const exactSourceText = joinExactSourceText([medication, dose, form]) || medication;

    const originalRow: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      const key = headerKey(h) || `col_${colIdx}`;
      originalRow[key] = cells[colIdx] ?? "";
    });
    originalRow.medication = medication;
    originalRow.dose = dose;
    originalRow.form = form;
    originalRow.exact_source_text = exactSourceText;
    originalRow.source_name_exact = medication;
    originalRow.source_strength_exact = dose;
    originalRow.source_route_exact = form;
    originalRow.source_package_exact = form;
    originalRow.source_review_status = "MANUAL_REVIEW_REQUIRED";

    const excelRowNumber = i + 1;
    rows.push({
      sourceRowId: `PRI_ER_${sheetName.replace(/\s+/g, "_")}_${excelRowNumber}`,
      sheetName,
      rowNumber: excelRowNumber,
      workbookFilename,
      medication,
      dose,
      form,
      exactSourceText,
      sourceNameExact: medication,
      sourceStrengthExact: dose,
      sourceRouteExact: form || null,
      sourcePackageExact: form || null,
      sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
      originalRow,
    });
  }

  return { rows, headerRowIndex, detectedHeaders: headers };
}

function readWorkbook(buffer: Buffer, workbookFilename: string): XLSX.WorkBook {
  const lower = workbookFilename.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  try {
    if (isCsv) {
      const text = buffer.toString("utf8");
      return XLSX.read(text, { type: "string", raw: false });
    }
    return XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false });
  } catch (e) {
    throwInventoryImportError({
      code: "PARSER_FAILURE",
      message: "Impossible de lire le fichier inventaire.",
      details: {
        workbookFilename,
        cause: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

/**
 * Parse Priority ER pharmacy inventory workbook (.xlsx, .xls, .csv).
 * Uses the first worksheet that contains a Medication column (typically sheet 1).
 */
export function parsePriorityErInventoryWorkbook(
  buffer: Buffer,
  workbookFilename: string
): ParsePriorityErInventoryResult {
  const workbook = readWorkbook(buffer, workbookFilename);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throwInventoryImportError({
      code: "MISSING_WORKSHEET",
      message: "Aucune feuille trouvée dans le classeur.",
      details: { workbookFilename },
    });
  }

  const allRows: PriorityErInventoryWorkbookRow[] = [];
  let parsedSheetName: string | null = null;
  let headerRowIndex: number | null = null;
  let detectedHeaders: string[] = [];
  const sheetsAttempted: string[] = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    sheetsAttempted.push(sheetName);
    const matrix = sheetToMatrix(sheet);
    const parsed = parseMatrix(matrix, sheetName, workbookFilename);
    if (parsed.rows.length > 0) {
      allRows.push(...parsed.rows);
      parsedSheetName = sheetName;
      headerRowIndex = parsed.headerRowIndex;
      detectedHeaders = parsed.detectedHeaders;
      break;
    }
    if (parsed.headerRowIndex != null && detectedHeaders.length === 0) {
      headerRowIndex = parsed.headerRowIndex;
      detectedHeaders = parsed.detectedHeaders;
    }
  }

  if (allRows.length === 0) {
    const firstSheet = sheetNames[0]!;
    const firstMatrix = sheetToMatrix(workbook.Sheets[firstSheet]!);
    const sampleRows = firstMatrix.slice(0, 8).map((r) => r.filter(Boolean).join(" | "));
    const hasMedicationHeader = firstMatrix.some((row) => detectColumnIndexes(row) != null);

    if (!hasMedicationHeader) {
      throwInventoryImportError({
        code: "MISSING_REQUIRED_COLUMNS",
        message:
          "Colonnes obligatoires introuvables. Attendu : une colonne Médicament / Medication (et de préférence Dose, Form).",
        details: {
          workbookFilename,
          sheetsAttempted,
          expectedColumns: PRIORITY_ER_INVENTORY_XLSX_COLUMNS,
          firstSheetPreview: sampleRows,
        },
      });
    }

    throwInventoryImportError({
      code: "NO_DATA_ROWS",
      message:
        "En-têtes détectés mais aucune ligne de médicament. Vérifiez que les lignes sous l'en-tête ne sont pas vides.",
      details: {
        workbookFilename,
        sheetsAttempted,
        detectedHeaders,
        firstSheetPreview: sampleRows,
      },
    });
  }

  return {
    rows: allRows,
    sheetNames,
    parsedSheetName,
    headerRowIndex,
    detectedHeaders,
  };
}

/** Build minimal XLSX buffer for tests. */
export function buildPriorityErInventoryXlsxBuffer(
  dataRows: Array<{ medication: string; dose: string; form: string }>,
  sheetName = "Inventory"
): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Medication", "Dose", "Form"],
    ...dataRows.map((r) => [r.medication, r.dose, r.form]),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/** @deprecated use parsePriorityErInventoryWorkbook */
export const parsePriorityErInventoryXlsx = parsePriorityErInventoryWorkbook;
export type PriorityErInventoryXlsxRow = PriorityErInventoryWorkbookRow;
