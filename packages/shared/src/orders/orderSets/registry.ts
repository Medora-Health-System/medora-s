/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_4 — composed enterprise order-set registry.
 */
import { BEHAVIORAL_TOX_ED_ORDER_SETS } from "./Emergency/behavioralToxSets.js";
import { CARDIAC_ED_ORDER_SETS } from "./Emergency/cardiacSets.js";
import { GASTRO_ED_ORDER_SETS } from "./Emergency/gastroSets.js";
import { INFECTION_GENERAL_ED_ORDER_SETS } from "./Emergency/infectionGeneralSets.js";
import { NEURO_ED_ORDER_SETS } from "./Emergency/neuroSets.js";
import { PHASE_1_ED_ORDER_SETS } from "./Emergency/phase1Sets.js";
import { RESPIRATORY_ED_ORDER_SETS } from "./Emergency/respiratorySets.js";
import { TRAUMA_MSK_ED_ORDER_SETS } from "./Emergency/traumaMskSets.js";
import { WOUND_OB_ENT_METABOLIC_ED_ORDER_SETS } from "./Emergency/woundObEntMetabolicSets.js";
import {
  type EnterpriseOrderSetDefinition,
  type EnterpriseOrderSetRoleCode,
  resolveEnterpriseOrderSetDisplayName,
  resolveEnterpriseOrderSetItemDisplayName,
} from "./types.js";

export const ENTERPRISE_ORDER_SET_REGISTRY: readonly EnterpriseOrderSetDefinition[] = [
  ...PHASE_1_ED_ORDER_SETS,
  ...CARDIAC_ED_ORDER_SETS,
  ...NEURO_ED_ORDER_SETS,
  ...RESPIRATORY_ED_ORDER_SETS,
  ...GASTRO_ED_ORDER_SETS,
  ...TRAUMA_MSK_ED_ORDER_SETS,
  ...INFECTION_GENERAL_ED_ORDER_SETS,
  ...BEHAVIORAL_TOX_ED_ORDER_SETS,
  ...WOUND_OB_ENT_METABOLIC_ED_ORDER_SETS,
];

export type EnterpriseOrderSetCode = (typeof ENTERPRISE_ORDER_SET_REGISTRY)[number]["code"];

export function activeEnterpriseOrderSets(): readonly EnterpriseOrderSetDefinition[] {
  return ENTERPRISE_ORDER_SET_REGISTRY.filter((set) => set.isActive && !set.deprecatedBy);
}

export function enterpriseOrderSetByCode(code: string): EnterpriseOrderSetDefinition | undefined {
  return ENTERPRISE_ORDER_SET_REGISTRY.find((set) => set.code === code);
}

export function allEnterpriseOrderSetItems(
  set: EnterpriseOrderSetDefinition
): readonly import("./types.js").EnterpriseOrderSetItemRef[] {
  return [...set.requiredItems, ...set.optionalItems];
}

export function enterpriseOrderSetItemByKey(
  set: EnterpriseOrderSetDefinition,
  itemKey: string
): (import("./types.js").EnterpriseOrderSetItemRef & { required: boolean }) | undefined {
  const required = set.requiredItems.find((item) => item.key === itemKey);
  if (required) return { ...required, required: true };
  const optional = set.optionalItems.find((item) => item.key === itemKey);
  if (optional) return { ...optional, required: false };
  return undefined;
}

export function defaultCheckedEnterpriseOrderSetItemKeys(set: EnterpriseOrderSetDefinition): string[] {
  return [...set.requiredItems.map((item) => item.key), ...set.optionalItems.map((item) => item.key)];
}

export function canRolePlaceEnterpriseOrderSet(input: {
  rolesAllowed: readonly EnterpriseOrderSetRoleCode[];
  canPrescribe: boolean;
  roleCodes: readonly string[];
}): boolean {
  if (input.canPrescribe) return true;
  const normalized = new Set(input.roleCodes.map((code) => code.toUpperCase()));
  if (normalized.has("ADMIN") || normalized.has("MEDORA_SUPER_ADMIN")) return true;
  return false;
}

export {
  resolveEnterpriseOrderSetDisplayName,
  resolveEnterpriseOrderSetItemDisplayName,
};

export function enterpriseOrderSetsUsedCategories(): EnterpriseOrderSetDefinition["category"][] {
  const seen = new Set<EnterpriseOrderSetDefinition["category"]>();
  for (const set of activeEnterpriseOrderSets()) {
    seen.add(set.category);
  }
  return [...seen];
}
