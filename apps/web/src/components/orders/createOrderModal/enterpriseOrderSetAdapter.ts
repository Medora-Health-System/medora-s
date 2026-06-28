/**
 * Maps shared enterprise order-set registry → Create Order modal view/resolution model.
 */
import type { CatalogType } from "@/lib/catalogSearchTypes";
import {
  activeEnterpriseOrderSets,
  defaultCheckedEnterpriseOrderSetItemKeys,
  enterpriseOrderSetByCode,
  enterpriseOrderSetItemByKey,
  resolveEnterpriseOrderSetDisplayName,
  resolveEnterpriseOrderSetItemDisplayName,
  type EnterpriseOrderSetCategory,
  type EnterpriseOrderSetCode,
  type EnterpriseOrderSetDefinition,
  type EnterpriseOrderSetItemRef,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";

export type OrderSetKey = EnterpriseOrderSetCode;

export type OrderSetItemType = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

export type OrderSetUiItem = {
  key: string;
  type: OrderSetItemType;
  required: boolean;
  catalogType?: CatalogType;
  catalogCode?: string;
  catalogCodes?: string[];
  fallbackSearchQuery?: string;
  enterpriseProcedureCode?: string;
  requiresStructuredParameters?: boolean;
  deferIfMissing?: boolean;
  comingSoon?: boolean;
  displayLabel: string;
};

export const ORDER_SET_KEYS: OrderSetKey[] = activeEnterpriseOrderSets().map((set) => set.code);

export function getDefaultOrderSetKey(): OrderSetKey {
  return ORDER_SET_KEYS[0] ?? "ed_chest_pain_v1";
}

export function checkedOrderSetItemKeys(orderSetCode: OrderSetKey): string[] {
  const set = enterpriseOrderSetByCode(orderSetCode);
  if (!set) return [];
  return defaultCheckedEnterpriseOrderSetItemKeys(set);
}

export function toOrderSetUiItems(
  set: EnterpriseOrderSetDefinition,
  locale: SupportedLanguage
): OrderSetUiItem[] {
  const mapItem = (item: EnterpriseOrderSetItemRef, required: boolean): OrderSetUiItem => ({
    key: item.key,
    type: item.kind === "CUSTOM" ? "CARE" : item.kind,
    required,
    catalogType:
      item.kind === "LAB" ? "LAB_TEST" : item.kind === "IMAGING" ? "IMAGING_STUDY" : undefined,
    catalogCode: item.catalogCode,
    catalogCodes: item.catalogCodes ? [...item.catalogCodes] : undefined,
    fallbackSearchQuery: item.fallbackSearchQuery,
    enterpriseProcedureCode: item.enterpriseProcedureCode,
    requiresStructuredParameters: item.requiresStructuredParameters,
    deferIfMissing: item.deferIfMissing,
    displayLabel: resolveEnterpriseOrderSetItemDisplayName(item, locale),
  });

  return [
    ...set.requiredItems.map((item) => mapItem(item, true)),
    ...set.optionalItems.map((item) => mapItem(item, false)),
  ];
}

export function filterEnterpriseOrderSets(input: {
  category: EnterpriseOrderSetCategory | "ALL";
  query: string;
  locale: SupportedLanguage;
}): EnterpriseOrderSetDefinition[] {
  const q = input.query.trim().toLowerCase();
  return activeEnterpriseOrderSets().filter((set) => {
    if (input.category !== "ALL" && set.category !== input.category) return false;
    if (!q) return true;
    const haystack = [
      set.code,
      set.displayNameEn,
      set.displayNameFr,
      set.clinicalDomain,
      ...set.indicationKeywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function resolveOrderSetTitle(set: EnterpriseOrderSetDefinition, locale: SupportedLanguage): string {
  return resolveEnterpriseOrderSetDisplayName(set, locale);
}

export function isRequiredOrderSetItem(orderSetCode: OrderSetKey, itemKey: string): boolean {
  const item = enterpriseOrderSetItemByKey(enterpriseOrderSetByCode(orderSetCode)!, itemKey);
  return item?.required === true;
}

export function orderSetWarningsForLocale(
  set: EnterpriseOrderSetDefinition,
  locale: SupportedLanguage
): string[] {
  return set.warnings.map((warning) => (locale === "fr" ? warning.fr : warning.en));
}

/** Legacy imaging audit mapping for retirement constants sync. */
export const LEGACY_ORDER_SET_IMAGING_REFS = activeEnterpriseOrderSets().flatMap((set) =>
  [...set.requiredItems, ...set.optionalItems]
    .filter((item) => item.kind === "IMAGING" && item.catalogCode)
    .flatMap((item) => {
      const refs: { source: string; catalogCode: string; catalogCodes?: string[] }[] = [
        { source: set.code, catalogCode: item.catalogCode! },
      ];
      if (item.catalogCodes?.length) {
        refs.push({ source: set.code, catalogCode: item.catalogCode!, catalogCodes: [...item.catalogCodes] });
      }
      return refs;
    })
);
