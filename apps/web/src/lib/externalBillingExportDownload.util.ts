/** Pure helpers for external billing export URLs and filenames (no fetch / apiClient). */

export function buildExternalBillingEncounterExportPath(encounterId: string, format: "json" | "csv"): string {
  const q = new URLSearchParams({ format });
  return `/billing/external/encounters/${encodeURIComponent(encounterId)}/export?${q.toString()}`;
}

/** Legacy daily export path (backward compatible). */
export function buildExternalBillingDailyExportPath(date: string, format: "json" | "csv"): string {
  const q = new URLSearchParams({ date: date.trim(), format });
  return `/billing/external/daily-export?${q.toString()}`;
}

export function buildExternalBillingDailyCertifiedExportPath(date: string, format: "json" | "csv"): string {
  const trimmed = date.trim();
  return format === "json"
    ? `/billing/external-export/daily.json?date=${encodeURIComponent(trimmed)}`
    : `/billing/external-export/daily.csv?date=${encodeURIComponent(trimmed)}`;
}

export function buildExternalBillingWeeklyCertifiedExportPath(weekStart: string, format: "json" | "csv"): string {
  const trimmed = weekStart.trim();
  return format === "json"
    ? `/billing/external-export/weekly.json?weekStart=${encodeURIComponent(trimmed)}`
    : `/billing/external-export/weekly.csv?weekStart=${encodeURIComponent(trimmed)}`;
}

export function buildExternalBillingDailyCertificationPath(date: string): string {
  return `/billing/external-export/daily/certification?date=${encodeURIComponent(date.trim())}`;
}

export function buildExternalBillingWeeklyCertificationPath(weekStart: string): string {
  return `/billing/external-export/weekly/certification?weekStart=${encodeURIComponent(weekStart.trim())}`;
}

export function sanitizeFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120) || "export";
}

/** Parse `Content-Disposition` filename when present (RFC 5987 / quoted). */
export function filenameFromContentDisposition(cd: string | null, fallback: string): string {
  if (!cd || typeof cd !== "string") return fallback;
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
  if (star?.[1]) {
    try {
      const decoded = decodeURIComponent(star[1].replace(/["']/g, "").trim());
      if (decoded) return sanitizeFilenameSegment(decoded);
    } catch {
      return fallback;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) {
    const n = quoted[1].trim();
    if (n) return sanitizeFilenameSegment(n);
  }
  const plain = /filename=([^;\s]+)/i.exec(cd);
  if (plain?.[1]) {
    const n = plain[1].trim().replace(/^["']|["']$/g, "");
    if (n) return sanitizeFilenameSegment(n);
  }
  return fallback;
}
