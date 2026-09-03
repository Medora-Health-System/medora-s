/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_5 — pure browser grouping/filter helpers (no React).
 */
import {
  activeEnterpriseOrderSets,
  resolveEnterpriseOrderSetDisplayName,
} from "./registry.js";
import {
  ENTERPRISE_ORDER_SET_AUTHORITIES,
  ENTERPRISE_ORDER_SET_CATEGORIES,
  type EnterpriseOrderSetAuthority,
  type EnterpriseOrderSetCategory,
  type EnterpriseOrderSetDefinition,
} from "./types.js";
import {
  filterEnterpriseOrderSetsVisibleToRole,
  getEnterpriseOrderSetAuthorityLabel,
  isRnStandingOrderSet,
  resolveEnterpriseOrderSetAuthority,
} from "./authority.js";

export type EnterpriseOrderSetBrowserLocale = "en" | "fr";

export const ENTERPRISE_ORDER_SET_CATEGORY_LABELS: Record<
  EnterpriseOrderSetCategory,
  { en: string; fr: string }
> = {
  CARDIAC: { en: "Cardiac", fr: "Cardiaque" },
  NEURO: { en: "Neurology", fr: "Neurologie" },
  INFECTION: { en: "Infection / sepsis", fr: "Infection / sepsis" },
  TRAUMA: { en: "Trauma", fr: "Traumatologie" },
  RESPIRATORY: { en: "Respiratory", fr: "Respiratoire" },
  GASTRO: { en: "Gastroenterology", fr: "Gastro-entérologie" },
  METABOLIC: { en: "Metabolic", fr: "Métabolique" },
  OB_GYN: { en: "OB / GYN", fr: "Obstétrique / gynécologie" },
  ORTHOPEDICS: { en: "Orthopedics / MSK", fr: "Orthopédie / appareil locomoteur" },
  WOUND: { en: "Wound / skin", fr: "Plaies / peau" },
  ENT: { en: "ENT / eye", fr: "ORL / œil" },
  TOXICOLOGY: { en: "Toxicology", fr: "Toxicologie" },
  SEDATION: { en: "Sedation", fr: "Sédation" },
  BEHAVIORAL: { en: "Behavioral health", fr: "Santé comportementale" },
  GENERAL: { en: "General medicine", fr: "Médecine générale" },
};

export type EnterpriseOrderSetCategoryGroup = {
  category: EnterpriseOrderSetCategory;
  sets: EnterpriseOrderSetDefinition[];
};

export type EnterpriseOrderSetBrowserAuthoritySection = {
  authority: EnterpriseOrderSetAuthority;
  groups: EnterpriseOrderSetCategoryGroup[];
};

export type EnterpriseOrderSetBrowserModel = {
  mode: "browse" | "search";
  authoritySections: EnterpriseOrderSetBrowserAuthoritySection[];
  activeAuthority: EnterpriseOrderSetAuthority | null;
  groups: EnterpriseOrderSetCategoryGroup[];
  activeCategory: EnterpriseOrderSetCategory | null;
  categorySets: EnterpriseOrderSetDefinition[];
  searchResults: EnterpriseOrderSetDefinition[];
};

function orderSetSearchHaystack(set: EnterpriseOrderSetDefinition): string {
  return [
    set.code,
    set.displayNameEn,
    set.displayNameFr,
    set.clinicalDomain,
    set.category,
    ...set.indicationKeywords,
  ]
    .join(" ")
    .toLowerCase();
}

export function getEnterpriseOrderSetCategorySortOrder(
  category: EnterpriseOrderSetCategory
): number {
  return ENTERPRISE_ORDER_SET_CATEGORIES.indexOf(category);
}

export function getEnterpriseOrderSetCategoryLabel(
  category: EnterpriseOrderSetCategory,
  locale: EnterpriseOrderSetBrowserLocale
): string {
  return ENTERPRISE_ORDER_SET_CATEGORY_LABELS[category][locale];
}

export function sortEnterpriseOrderSetsByDisplayName(
  sets: readonly EnterpriseOrderSetDefinition[],
  locale: EnterpriseOrderSetBrowserLocale
): EnterpriseOrderSetDefinition[] {
  return [...sets].sort((a, b) =>
    resolveEnterpriseOrderSetDisplayName(a, locale).localeCompare(
      resolveEnterpriseOrderSetDisplayName(b, locale),
      locale,
      { sensitivity: "base" }
    )
  );
}

export function filterEnterpriseOrderSetsForBrowser(input: {
  query: string;
  category?: EnterpriseOrderSetCategory | null;
  locale: EnterpriseOrderSetBrowserLocale;
}): EnterpriseOrderSetDefinition[] {
  const q = input.query.trim().toLowerCase();
  const filtered = activeEnterpriseOrderSets().filter((set) => {
    if (input.category && set.category !== input.category) return false;
    if (!q) return true;
    return orderSetSearchHaystack(set).includes(q);
  });
  return sortEnterpriseOrderSetsByDisplayName(filtered, input.locale);
}

export function groupEnterpriseOrderSetsByCategory(
  sets: readonly EnterpriseOrderSetDefinition[],
  locale: EnterpriseOrderSetBrowserLocale
): EnterpriseOrderSetCategoryGroup[] {
  const byCategory = new Map<EnterpriseOrderSetCategory, EnterpriseOrderSetDefinition[]>();
  for (const set of sets) {
    const list = byCategory.get(set.category) ?? [];
    list.push(set);
    byCategory.set(set.category, list);
  }
  return ENTERPRISE_ORDER_SET_CATEGORIES.filter((category) => byCategory.has(category)).map(
    (category) => ({
      category,
      sets: sortEnterpriseOrderSetsByDisplayName(byCategory.get(category) ?? [], locale),
    })
  );
}

export function resolveEnterpriseOrderSetBrowserCategory(
  preferred: EnterpriseOrderSetCategory | null | undefined,
  groups: readonly EnterpriseOrderSetCategoryGroup[]
): EnterpriseOrderSetCategory | null {
  if (
    preferred &&
    groups.some((group) => group.category === preferred && group.sets.length > 0)
  ) {
    return preferred;
  }
  return groups.find((group) => group.sets.length > 0)?.category ?? null;
}

export function groupEnterpriseOrderSetsByAuthorityAndCategory(
  sets: readonly EnterpriseOrderSetDefinition[],
  locale: EnterpriseOrderSetBrowserLocale
): EnterpriseOrderSetBrowserAuthoritySection[] {
  return ENTERPRISE_ORDER_SET_AUTHORITIES.map((authority) => ({
    authority,
    groups: groupEnterpriseOrderSetsByCategory(
      sets.filter((set) => resolveEnterpriseOrderSetAuthority(set) === authority),
      locale
    ),
  })).filter((section) => section.groups.length > 0);
}

export function resolveEnterpriseOrderSetBrowserAuthority(
  preferred: EnterpriseOrderSetAuthority | null | undefined,
  sections: readonly EnterpriseOrderSetBrowserAuthoritySection[]
): EnterpriseOrderSetAuthority | null {
  if (
    preferred &&
    sections.some((section) => section.authority === preferred && section.groups.length > 0)
  ) {
    return preferred;
  }
  return sections[0]?.authority ?? null;
}

export function enterpriseOrderSetBrowserCategoryForCode(
  orderSetCode: string
): EnterpriseOrderSetCategory | null {
  const set = activeEnterpriseOrderSets().find((row) => row.code === orderSetCode);
  return set?.category ?? null;
}

export function enterpriseOrderSetBrowserAuthorityForCode(
  orderSetCode: string
): EnterpriseOrderSetAuthority | null {
  const set = activeEnterpriseOrderSets().find((row) => row.code === orderSetCode);
  return set ? resolveEnterpriseOrderSetAuthority(set) : null;
}

export { getEnterpriseOrderSetAuthorityLabel, isRnStandingOrderSet };

export function buildEnterpriseOrderSetBrowserModel(input: {
  query: string;
  activeAuthority: EnterpriseOrderSetAuthority | null;
  activeCategory: EnterpriseOrderSetCategory | null;
  locale: EnterpriseOrderSetBrowserLocale;
  canPrescribe: boolean;
  hasRnStandingOrderAuthority: boolean;
  roleCodes: readonly string[];
}): EnterpriseOrderSetBrowserModel {
  const visibleSets = filterEnterpriseOrderSetsVisibleToRole({
    sets: activeEnterpriseOrderSets(),
    canPrescribe: input.canPrescribe,
    hasRnStandingOrderAuthority: input.hasRnStandingOrderAuthority,
    roleCodes: input.roleCodes,
  });

  const query = input.query.trim();
  if (query) {
    return {
      mode: "search",
      authoritySections: [],
      activeAuthority: null,
      groups: [],
      activeCategory: null,
      categorySets: [],
      searchResults: filterEnterpriseOrderSetsForBrowser({
        query,
        locale: input.locale,
      }).filter((set) => visibleSets.some((row) => row.code === set.code)),
    };
  }

  const authoritySections = groupEnterpriseOrderSetsByAuthorityAndCategory(visibleSets, input.locale);
  const activeAuthority = resolveEnterpriseOrderSetBrowserAuthority(
    input.activeAuthority,
    authoritySections
  );
  const groups =
    activeAuthority != null
      ? authoritySections.find((section) => section.authority === activeAuthority)?.groups ?? []
      : [];
  const activeCategory = resolveEnterpriseOrderSetBrowserCategory(input.activeCategory, groups);
  const categorySets =
    activeCategory != null
      ? groups.find((group) => group.category === activeCategory)?.sets ?? []
      : [];

  return {
    mode: "browse",
    authoritySections,
    activeAuthority,
    groups,
    activeCategory,
    categorySets,
    searchResults: [],
  };
}
