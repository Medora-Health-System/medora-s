/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_4 — shared order-set types and item builders.
 */

import { pickCatalogDisplayLabelForProductUi } from "../../i18n/productUiLocale.js";
import {
  lookupGovernedCatalogEsLabel,
  lookupOrderSetItemDisplayEs,
} from "../../i18n/clinicalCatalogEsDisplay.js";

export const ENTERPRISE_ORDER_SET_CATEGORIES = [
  "CARDIAC",
  "NEURO",
  "INFECTION",
  "TRAUMA",
  "RESPIRATORY",
  "GASTRO",
  "METABOLIC",
  "OB_GYN",
  "ORTHOPEDICS",
  "WOUND",
  "ENT",
  "TOXICOLOGY",
  "SEDATION",
  "BEHAVIORAL",
  "GENERAL",
] as const;

export type EnterpriseOrderSetCategory = (typeof ENTERPRISE_ORDER_SET_CATEGORIES)[number];

export const ENTERPRISE_ORDER_SET_AGE_GROUPS = ["ADULT", "PEDIATRIC", "BOTH"] as const;
export type EnterpriseOrderSetAgeGroup = (typeof ENTERPRISE_ORDER_SET_AGE_GROUPS)[number];

export const ENTERPRISE_ORDER_SET_ROLE_CODES = ["PROVIDER", "ADMIN", "RN"] as const;
export type EnterpriseOrderSetRoleCode = (typeof ENTERPRISE_ORDER_SET_ROLE_CODES)[number];

export const ENTERPRISE_ORDER_SET_ITEM_KINDS = [
  "LAB",
  "IMAGING",
  "MEDICATION",
  "CARE",
  "CUSTOM",
] as const;

export type EnterpriseOrderSetItemKind = (typeof ENTERPRISE_ORDER_SET_ITEM_KINDS)[number];

export type EnterpriseOrderSetItemRef = {
  key: string;
  kind: EnterpriseOrderSetItemKind;
  displayNameEn: string;
  displayNameFr: string;
  catalogCode?: string;
  catalogCodes?: readonly string[];
  fallbackSearchQuery?: string;
  enterpriseProcedureCode?: string;
  requiresStructuredParameters?: boolean;
  deferIfMissing?: boolean;
};

export type EnterpriseOrderSetWarning = {
  en: string;
  fr: string;
};

export type EnterpriseOrderSetGovernanceLevel = "PHASE_1_ED" | "PHASE_4_ED" | "PHASE_6_RN_STANDING";

export const ENTERPRISE_ORDER_SET_AUTHORITIES = [
  "PROVIDER_ORDER_SET",
  "RN_STANDING_ORDER",
] as const;

export type EnterpriseOrderSetAuthority = (typeof ENTERPRISE_ORDER_SET_AUTHORITIES)[number];

export type EnterpriseOrderSetDefinition = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  category: EnterpriseOrderSetCategory;
  department: "ED";
  clinicalDomain: string;
  descriptionEn: string;
  descriptionFr: string;
  indicationKeywords: readonly string[];
  requiredItems: readonly EnterpriseOrderSetItemRef[];
  optionalItems: readonly EnterpriseOrderSetItemRef[];
  mutuallyExclusiveGroups?: readonly (readonly string[])[];
  warnings: readonly EnterpriseOrderSetWarning[];
  rolesAllowed: readonly EnterpriseOrderSetRoleCode[];
  /** Defaults to PROVIDER_ORDER_SET when omitted (legacy provider sets). */
  orderSetAuthority?: EnterpriseOrderSetAuthority;
  ageGroup: EnterpriseOrderSetAgeGroup;
  version: string;
  isActive: boolean;
  deprecatedBy?: string;
  governanceLevel: EnterpriseOrderSetGovernanceLevel;
};

export const lab = (
  key: string,
  displayNameEn: string,
  displayNameFr: string,
  catalogCode: string,
  catalogCodes: readonly string[] = []
): EnterpriseOrderSetItemRef => ({
  key,
  kind: "LAB",
  displayNameEn,
  displayNameFr,
  catalogCode,
  catalogCodes,
});

export const imaging = (
  key: string,
  displayNameEn: string,
  displayNameFr: string,
  catalogCode: string,
  catalogCodes: readonly string[] = []
): EnterpriseOrderSetItemRef => ({
  key,
  kind: "IMAGING",
  displayNameEn,
  displayNameFr,
  catalogCode,
  catalogCodes,
});

export const care = (
  key: string,
  displayNameEn: string,
  displayNameFr: string,
  enterpriseProcedureCode: string,
  options?: Pick<EnterpriseOrderSetItemRef, "requiresStructuredParameters" | "deferIfMissing">
): EnterpriseOrderSetItemRef => ({
  key,
  kind: "CARE",
  displayNameEn,
  displayNameFr,
  enterpriseProcedureCode,
  ...options,
});

export const providerRoles: readonly EnterpriseOrderSetRoleCode[] = ["PROVIDER", "ADMIN"];
export const rnStandingRoles: readonly EnterpriseOrderSetRoleCode[] = ["RN"];

export function resolveEnterpriseOrderSetDisplayName(
  set: EnterpriseOrderSetDefinition,
  locale: string
): string {
  return pickCatalogDisplayLabelForProductUi(locale, {
    displayNameEn: set.displayNameEn,
    displayNameFr: set.displayNameFr,
    displayNameEs: lookupGovernedCatalogEsLabel("ORDER_SET", set.code),
    code: set.code,
  });
}

export function resolveEnterpriseOrderSetItemDisplayName(
  item: EnterpriseOrderSetItemRef,
  locale: string
): string {
  const code = item.catalogCode ?? item.enterpriseProcedureCode ?? item.key;
  return pickCatalogDisplayLabelForProductUi(locale, {
    displayNameEn: item.displayNameEn,
    displayNameFr: item.displayNameFr,
    displayNameEs: lookupOrderSetItemDisplayEs(item.displayNameEn, code),
    code,
  });
}
