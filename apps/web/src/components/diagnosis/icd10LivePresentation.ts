import {
  formatIcd10CmDisplayCode,
  formatIcd10ServerResolvedOneLineDisplay,
  parseProductUiLanguage,
} from "@medora/shared";

export function icd10ListLocaleQuery(language: string | null | undefined): string {
  const locale = parseProductUiLanguage(language);
  return locale ? `&locale=${encodeURIComponent(locale)}` : "";
}

export function icd10ChartSummaryLocaleQuery(language: string | null | undefined): string {
  const locale = parseProductUiLanguage(language);
  return locale ? `?locale=${encodeURIComponent(locale)}` : "";
}

export function liveIcd10DiagnosisPrimary(input: {
  code: string;
  displayLabel?: string | null;
  displayResolution?: string | null;
}): string {
  return formatIcd10ServerResolvedOneLineDisplay({
    code: input.code,
    displayLabel: input.displayLabel,
    displayResolution: input.displayResolution,
  }).primary;
}

export function parseIcd10PresentationFields(
  raw: Record<string, unknown>,
  fallbackCode: string,
): { displayLabel: string; displayResolution: string } {
  return {
    displayLabel: typeof raw.displayLabel === "string" ? raw.displayLabel : fallbackCode,
    displayResolution:
      typeof raw.displayResolution === "string" ? raw.displayResolution : "UNLOCALIZED_CODE",
  };
}

/**
 * Stable PMH ICD pick for the patient-facing history.
 * Persist the server-resolved localized clinical name and retain the canonical code for
 * traceability/deduplication. Unlocalized results safely fall back to the code.
 */
export function formatPmhIcdPickLine(hit: {
  code: string;
  displayLabel?: string | null;
  displayResolution?: string | null;
}): string {
  const display = formatIcd10ServerResolvedOneLineDisplay(hit);
  return display.metadata ? `${display.primary} (${display.metadata})` : display.primary;
}

export function pmhContainsCanonicalIcdCode(pmh: string, code: string): boolean {
  const canonical = (formatIcd10CmDisplayCode(code) || code).trim();
  if (!canonical) return false;
  const upper = pmh.toUpperCase();
  if (upper.includes(canonical.toUpperCase())) return true;
  const compact = canonical.replace(/\./g, "").toUpperCase();
  if (!compact) return false;
  return new RegExp(`(?:^|[^A-Z0-9])${compact}(?:[^A-Z0-9]|$)`).test(upper.replace(/\./g, ""));
}
