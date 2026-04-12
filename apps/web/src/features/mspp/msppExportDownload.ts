/**
 * Téléchargement CSV UTF-8 (BOM) côté client — pas de persistance serveur.
 */

export function csvEscapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRowsToString(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvEscapeCell).join(",")).join("\r\n");
}

/** Télécharge un fichier .csv (Excel reconnaît l’UTF-8 avec BOM). */
export function downloadUtf8Csv(filename: string, rows: (string | number | boolean | null | undefined)[][]): void {
  const bom = "\uFEFF";
  const text = bom + csvRowsToString(rows);
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Téléchargement JSON UTF-8 (interop / paquets versionnés). */
export function downloadJson(filename: string, payload: unknown): void {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
