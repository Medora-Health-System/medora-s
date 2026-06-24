/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1
 * Suppress legacy duplicate catalog codes in provider search when canonical active code exists.
 * Preserves billing/MAR/inventory/audit on legacy rows — search-only deduplication.
 */

/** Legacy Haiti seed code → canonical enterprise activation code. */
export const MEDICATION_SEARCH_SUPERSEDED_BY_CANONICAL: Readonly<Record<string, string>> = {
  HYDROMORPHONE_2MG_ML_INJECTABLE: "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  FENTANYL_50MCG_ML_INJECTABLE: "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE",
};

export type DuplicateMedicationResolutionRow = {
  legacyCatalogCode: string;
  canonicalCatalogCode: string;
  resolution: "SUPPRESS_FROM_SEARCH" | "KEEP_BOTH";
  reason: string;
};

export type DuplicateMedicationResolutionReport = {
  rows: DuplicateMedicationResolutionRow[];
  suppressedSearchCodes: string[];
  preservedLegacyCodes: string[];
  decision: "DUPLICATE_SEARCH_RESOLVED";
};

/** O(1) per code — suppress legacy row when canonical is provider-orderable. */
export function shouldSuppressMedicationSearchCatalogCode(
  catalogCode: string,
  activeProviderOrderableCodes: ReadonlySet<string>
): boolean {
  const canonical = MEDICATION_SEARCH_SUPERSEDED_BY_CANONICAL[catalogCode];
  if (!canonical) return false;
  return activeProviderOrderableCodes.has(canonical);
}

export function dedupeMedicationSearchCatalogCodes<T extends { code: string }>(
  rows: T[],
  activeProviderOrderableCodes: ReadonlySet<string>
): T[] {
  if (rows.length <= 1) return rows;
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (shouldSuppressMedicationSearchCatalogCode(row.code, activeProviderOrderableCodes)) continue;
    const canonical = MEDICATION_SEARCH_SUPERSEDED_BY_CANONICAL[row.code] ?? row.code;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(row);
  }
  return out;
}

export function buildDuplicateMedicationResolutionReport(
  activeProviderOrderableCodes: ReadonlySet<string>
): DuplicateMedicationResolutionReport {
  const rows = Object.entries(MEDICATION_SEARCH_SUPERSEDED_BY_CANONICAL).map(([legacyCatalogCode, canonicalCatalogCode]) => ({
    legacyCatalogCode,
    canonicalCatalogCode,
    resolution: activeProviderOrderableCodes.has(canonicalCatalogCode)
      ? ("SUPPRESS_FROM_SEARCH" as const)
      : ("KEEP_BOTH" as const),
    reason: activeProviderOrderableCodes.has(canonicalCatalogCode)
      ? "Canonical enterprise code active — legacy search row suppressed"
      : "Canonical code not active — both rows retained",
  }));
  return {
    rows,
    suppressedSearchCodes: rows.filter((row) => row.resolution === "SUPPRESS_FROM_SEARCH").map((row) => row.legacyCatalogCode),
    preservedLegacyCodes: rows.filter((row) => row.resolution === "KEEP_BOTH").map((row) => row.legacyCatalogCode),
    decision: "DUPLICATE_SEARCH_RESOLVED",
  };
}
