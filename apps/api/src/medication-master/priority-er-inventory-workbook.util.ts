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
  /** True when columns A/B/C were used without a Medication/Dose/Form header row. */
  headerlessDetected: boolean;
};

const HEADERLESS_MEDICATION_COL = 0;
const HEADERLESS_DOSE_COL = 1;
const HEADERLESS_FORM_COL = 2;

export type HeaderlessColumnLayout = {
  medicationCol: number;
  doseCol: number;
  formCol: number;
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

/** Row is a literal Medication/Dose/Form header line — not inventory data. */
export function rowLooksLikeColumnHeaders(cells: string[]): boolean {
  const med = cells[HEADERLESS_MEDICATION_COL] ?? "";
  const dose = cells[HEADERLESS_DOSE_COL] ?? "";
  const form = cells[HEADERLESS_FORM_COL] ?? "";
  return (
    matchHeader(med, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.medication) &&
    matchHeader(dose, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.dose) &&
    matchHeader(form, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.form)
  );
}

function rowLooksLikeColumnHeadersAt(
  row: string[],
  startCol: number
): boolean {
  const med = row[startCol] ?? "";
  const dose = row[startCol + 1] ?? "";
  const form = row[startCol + 2] ?? "";
  return (
    matchHeader(med, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.medication) &&
    matchHeader(dose, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.dose) &&
    matchHeader(form, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.form)
  );
}

function rowLooksLikeColumnHeadersAtLayout(
  row: string[],
  layout: HeaderlessColumnLayout
): boolean {
  const med = row[layout.medicationCol] ?? "";
  const dose = row[layout.doseCol] ?? "";
  const form = row[layout.formCol] ?? "";
  return (
    matchHeader(med, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.medication) &&
    matchHeader(dose, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.dose) &&
    matchHeader(form, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.form)
  );
}

function nonEmptyColumnIndices(row: string[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < row.length; i++) {
    if ((row[i] ?? "").length > 0) indices.push(i);
  }
  return indices;
}

function isStandaloneMedicationTitleRow(row: string[], layout: HeaderlessColumnLayout): boolean {
  const med = row[layout.medicationCol] ?? "";
  return (
    matchHeader(med, PRIORITY_ER_INVENTORY_XLSX_COLUMNS.medication) &&
    !(row[layout.doseCol] ?? "").length &&
    !(row[layout.formCol] ?? "").length
  );
}

/**
 * Detect headerless layout: first three non-empty columns per row (handles leading blanks
 * and a blank column between dose and form, e.g. C/D/F).
 */
export function detectHeaderlessColumnLayout(matrix: string[][]): HeaderlessColumnLayout | null {
  if (matrix.length === 0) return null;
  if (matrix.some((row) => rowLooksLikeColumnHeaders(row))) return null;

  const layoutCounts = new Map<string, { layout: HeaderlessColumnLayout; count: number }>();

  for (const row of matrix) {
    const indices = nonEmptyColumnIndices(row);
    if (indices.length < 3) continue;

    const layout: HeaderlessColumnLayout = {
      medicationCol: indices[0]!,
      doseCol: indices[1]!,
      formCol: indices[2]!,
    };
    if (rowLooksLikeColumnHeadersAtLayout(row, layout)) continue;
    if (isStandaloneMedicationTitleRow(row, layout)) continue;

    const key = `${layout.medicationCol}:${layout.doseCol}:${layout.formCol}`;
    const prev = layoutCounts.get(key);
    layoutCounts.set(key, { layout, count: (prev?.count ?? 0) + 1 });
  }

  let best: HeaderlessColumnLayout | null = null;
  let bestCount = 0;
  for (const { layout, count } of layoutCounts.values()) {
    if (count > bestCount) {
      bestCount = count;
      best = layout;
    }
  }

  if (!best || bestCount === 0) return null;

  const hasFullRow = matrix.some((row) => {
    const med = row[best!.medicationCol] ?? "";
    const dose = row[best!.doseCol] ?? "";
    const form = row[best!.formCol] ?? "";
    if (!med.length || rowLooksLikeColumnHeadersAtLayout(row, best!)) return false;
    if (isStandaloneMedicationTitleRow(row, best!)) return false;
    return dose.length > 0 && form.length > 0;
  });

  return hasFullRow ? best : null;
}

/**
 * @deprecated Prefer detectHeaderlessColumnLayout; returns medication column index or -1.
 */
export function detectHeaderlessStartColumn(matrix: string[][]): number {
  return detectHeaderlessColumnLayout(matrix)?.medicationCol ?? -1;
}

/** Headerless Priority ER layout: no explicit header row; at least one full medication/dose/form row. */
export function matrixQualifiesForHeaderlessLayout(matrix: string[][]): boolean {
  return detectHeaderlessColumnLayout(matrix) != null;
}

function buildWorkbookRow(
  medication: string,
  dose: string,
  form: string,
  sheetName: string,
  workbookFilename: string,
  excelRowNumber: number,
  headerless: boolean,
  extraOriginal: Record<string, string> = {}
): PriorityErInventoryWorkbookRow {
  const exactSourceText = joinExactSourceText([medication, dose, form]) || medication;

  const originalRow: Record<string, string> = {
    ...extraOriginal,
    medication,
    dose,
    form,
    exact_source_text: exactSourceText,
    source_name_exact: medication,
    source_strength_exact: dose,
    source_route_exact: form,
    source_package_exact: form,
    source_review_status: "MANUAL_REVIEW_REQUIRED",
  };
  if (headerless) {
    originalRow.col_a = medication;
    originalRow.col_b = dose;
    originalRow.col_c = form;
    originalRow.__layout = "headerless_abc";
  }

  return {
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
  };
}

function parseHeaderlessMatrix(
  matrix: string[][],
  sheetName: string,
  workbookFilename: string,
  layout: HeaderlessColumnLayout
): {
  rows: PriorityErInventoryWorkbookRow[];
  headerRowIndex: null;
  detectedHeaders: string[];
  headerlessDetected: true;
} {
  const rows: PriorityErInventoryWorkbookRow[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    if (cells.every((c) => c.length === 0)) continue;

    const medication = cells[layout.medicationCol] ?? "";
    const dose = cells[layout.doseCol] ?? "";
    const form = cells[layout.formCol] ?? "";

    if (!medication.length) continue;
    if (rowLooksLikeColumnHeadersAtLayout(cells, layout)) continue;
    if (isStandaloneMedicationTitleRow(cells, layout)) continue;

    rows.push(
      buildWorkbookRow(medication, dose, form, sheetName, workbookFilename, i + 1, true)
    );
  }

  return { rows, headerRowIndex: null, detectedHeaders: [], headerlessDetected: true };
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
  headerlessDetected: boolean;
} {
  if (matrix.length === 0) {
    return { rows: [], headerRowIndex: null, detectedHeaders: [], headerlessDetected: false };
  }

  let headerRowIndex = -1;
  let columnIndexes: ReturnType<typeof detectColumnIndexes> = null;

  for (let i = 0; i < Math.min(matrix.length, 60); i++) {
    const row = matrix[i] ?? [];
    if (!rowLooksLikeColumnHeaders(row)) continue;
    const detected = detectColumnIndexes(row);
    if (detected) {
      headerRowIndex = i;
      columnIndexes = detected;
      break;
    }
  }

  if (!columnIndexes || headerRowIndex < 0) {
    const layout = detectHeaderlessColumnLayout(matrix);
    if (layout) {
      return parseHeaderlessMatrix(matrix, sheetName, workbookFilename, layout);
    }
    return {
      rows: [],
      headerRowIndex: null,
      detectedHeaders: matrix[0] ?? [],
      headerlessDetected: false,
    };
  }

  const headers = matrix[headerRowIndex] ?? [];
  const rows: PriorityErInventoryWorkbookRow[] = [];

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    if (cells.every((c) => c.length === 0)) continue;

    const medication = cells[columnIndexes.medicationIdx] ?? "";
    const dose = columnIndexes.doseIdx >= 0 ? (cells[columnIndexes.doseIdx] ?? "") : "";
    const form = columnIndexes.formIdx >= 0 ? (cells[columnIndexes.formIdx] ?? "") : "";

    const originalRow: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      const key = headerKey(h) || `col_${colIdx}`;
      originalRow[key] = cells[colIdx] ?? "";
    });

    rows.push(
      buildWorkbookRow(medication, dose, form, sheetName, workbookFilename, i + 1, false, originalRow)
    );
  }

  return { rows, headerRowIndex, detectedHeaders: headers, headerlessDetected: false };
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
  let headerlessDetected = false;
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
      headerlessDetected = parsed.headerlessDetected;
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
    const hasExplicitHeaderRow = firstMatrix.some((row) => rowLooksLikeColumnHeaders(row));
    const headerlessLayout = detectHeaderlessColumnLayout(firstMatrix);

    if (headerlessLayout) {
      const headerless = parseHeaderlessMatrix(
        firstMatrix,
        firstSheet,
        workbookFilename,
        headerlessLayout
      );
      if (headerless.rows.length > 0) {
        return {
          rows: headerless.rows,
          sheetNames,
          parsedSheetName: firstSheet,
          headerRowIndex: null,
          detectedHeaders: [],
          headerlessDetected: true,
        };
      }
    }

    if (!hasExplicitHeaderRow && !headerlessLayout) {
      throwInventoryImportError({
        code: "MISSING_REQUIRED_COLUMNS",
        message:
          "Colonnes obligatoires introuvables. Attendu : une colonne Médicament / Medication (et de préférence Dose, Form), ou trois colonnes A/B/C sans en-tête.",
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
    headerlessDetected,
  };
}

/** Build minimal XLSX buffer for tests (with Medication/Dose/Form header row). */
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

/** Build headerless 3-column inventory sheet (columns A/B/C, no header row). */
export function buildHeaderlessPriorityErInventoryXlsxBuffer(
  dataRows: Array<{ medication: string; dose: string; form: string }>,
  sheetName = "Inventory"
): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(dataRows.map((r) => [r.medication, r.dose, r.form]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/** @deprecated use parsePriorityErInventoryWorkbook */
export const parsePriorityErInventoryXlsx = parsePriorityErInventoryWorkbook;
export type PriorityErInventoryXlsxRow = PriorityErInventoryWorkbookRow;
