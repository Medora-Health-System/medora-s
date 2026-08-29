/**
 * INP.PROV.1A — Provider Documentation board access vs clinical authorship.
 * Navigation visibility ≠ write authority. ADMIN may view; PROVIDER authors.
 */

export type InpatientProviderDocumentationSubtab =
  | "historyPhysical"
  | "progressNotes"
  | "problemsPlan"
  | "consults";

export const INPATIENT_PROVIDER_DOCUMENTATION_SUBTABS: readonly InpatientProviderDocumentationSubtab[] =
  ["historyPhysical", "progressNotes", "problemsPlan", "consults"] as const;

/** Sticky / deep-link visibility for the Provider Documentation board. */
export function canViewInpatientProviderDocumentationBoard(
  roles: readonly string[] | null | undefined
): boolean {
  const set = new Set((roles ?? []).map((r) => String(r).trim().toUpperCase()));
  return set.has("PROVIDER") || set.has("ADMIN");
}

/**
 * Clinical authorship (edit / sign / amend / attest).
 * ADMIN alone must not masquerade as PROVIDER.
 */
export function canAuthorInpatientProviderDocumentation(
  roles: readonly string[] | null | undefined
): boolean {
  const set = new Set((roles ?? []).map((r) => String(r).trim().toUpperCase()));
  return set.has("PROVIDER");
}

/** Authoring deep-link sections that must not open the provider board for non-viewers. */
export const INPATIENT_PROVIDER_DOCUMENTATION_AUTHORING_SECTIONS = [
  "providerDocumentation",
  "historyPhysical",
  "progressNotes",
  "problemsPlan",
  "consults",
] as const;

export function isInpatientProviderDocumentationAuthoringSection(
  section: string | null | undefined
): boolean {
  const s = String(section ?? "").trim();
  return (INPATIENT_PROVIDER_DOCUMENTATION_AUTHORING_SECTIONS as readonly string[]).includes(s);
}

export function parseInpatientProviderDocumentationSubtab(
  raw: string | null | undefined
): InpatientProviderDocumentationSubtab {
  const t = String(raw ?? "").trim();
  if ((INPATIENT_PROVIDER_DOCUMENTATION_SUBTABS as readonly string[]).includes(t)) {
    return t as InpatientProviderDocumentationSubtab;
  }
  const lower = t.toLowerCase().replace(/[_-]/g, "");
  if (lower === "hp" || lower === "handp" || lower === "historyphysical") return "historyPhysical";
  if (lower === "progress" || lower === "progressnotes") return "progressNotes";
  if (lower === "plan" || lower === "problems" || lower === "problemsplan" || lower === "assessment")
    return "problemsPlan";
  if (lower === "consult" || lower === "consults") return "consults";
  return "historyPhysical";
}
