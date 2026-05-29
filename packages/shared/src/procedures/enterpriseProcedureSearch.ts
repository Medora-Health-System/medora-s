import {
  ENTERPRISE_PROCEDURE_CATALOG,
  enterpriseProcedureCategoryLabel,
  resolveEnterpriseProcedureDisplayName,
  type EnterpriseProcedureDefinition,
} from "./enterpriseProcedureCatalog.js";

export type EnterpriseProcedureSearchLocale = "en" | "fr";

export function normalizeEnterpriseProcedureSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function enterpriseProcedureSearchTerms(query: string): string[] {
  const normalized = normalizeEnterpriseProcedureSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

export function enterpriseProcedureSearchableText(
  procedureDef: EnterpriseProcedureDefinition,
  locale: EnterpriseProcedureSearchLocale
): string {
  const parts = [
    procedureDef.id.replace(/_/g, " "),
    resolveEnterpriseProcedureDisplayName(procedureDef, locale),
    resolveEnterpriseProcedureDisplayName(procedureDef, locale === "en" ? "fr" : "en"),
    enterpriseProcedureCategoryLabel(procedureDef.category, locale),
    enterpriseProcedureCategoryLabel(procedureDef.category, locale === "en" ? "fr" : "en"),
    ...procedureDef.aliases,
  ];
  return normalizeEnterpriseProcedureSearchText(parts.join(" "));
}

export function filterEnterpriseProcedures(
  query: string,
  locale: EnterpriseProcedureSearchLocale,
  catalog: readonly EnterpriseProcedureDefinition[] = ENTERPRISE_PROCEDURE_CATALOG
): EnterpriseProcedureDefinition[] {
  const terms = enterpriseProcedureSearchTerms(query);
  if (terms.length === 0) {
    return catalog.filter((entry) => entry.orderable);
  }
  return catalog.filter((entry) => {
    if (!entry.orderable) return false;
    const haystack = enterpriseProcedureSearchableText(entry, locale);
    return terms.every((term) => haystack.includes(term));
  });
}

export function countEnterpriseProcedureSearchMatches(
  query: string,
  locale: EnterpriseProcedureSearchLocale,
  catalog: readonly EnterpriseProcedureDefinition[] = ENTERPRISE_PROCEDURE_CATALOG
): number {
  return filterEnterpriseProcedures(query, locale, catalog).length;
}
