/**
 * Minimal RFC 4180-style CSV parser (quoted fields, comma delimiter).
 * No external dependency — workbook imports are admin-only and bounded.
 */

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Parse CSV text into header-keyed row objects.
 * @throws Error when empty or no header row
 */
export function parseWorkbookCsv(csvText: string): CsvParseResult {
  const lines = splitCsvLines(csvText);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) {
    throw new Error("CSV vide.");
  }

  const headerCells = parseCsvLine(nonEmpty[0]!);
  const headers = headerCells.map(normalizeHeader);
  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new Error("En-têtes CSV manquants.");
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = parseCsvLine(nonEmpty[i]!);
    if (cells.every((c) => !c.trim())) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      row[key] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export function missingRequiredColumns(
  headers: string[],
  required: readonly string[]
): string[] {
  const set = new Set(headers);
  return required.filter((c) => !set.has(c));
}
