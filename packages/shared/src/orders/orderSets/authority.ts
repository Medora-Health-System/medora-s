/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_6 — order-set authority + role governance.
 */
import { canonicalCareProcedureByCode } from "../../procedures/canonicalCareProcedureCatalog.js";
import type {
  EnterpriseOrderSetAuthority,
  EnterpriseOrderSetDefinition,
  EnterpriseOrderSetItemRef,
  EnterpriseOrderSetRoleCode,
} from "./types.js";

export type { EnterpriseOrderSetAuthority };
export { ENTERPRISE_ORDER_SET_AUTHORITIES } from "./types.js";

export const ENTERPRISE_ORDER_SET_AUTHORITY_LABELS: Record<
  EnterpriseOrderSetAuthority,
  { en: string; fr: string }
> = {
  PROVIDER_ORDER_SET: {
    en: "Emergency provider sets",
    fr: "Protocoles médecin (urgences)",
  },
  RN_STANDING_ORDER: {
    en: "RN standing orders",
    fr: "Ordres permanents infirmiers",
  },
};

export function resolveEnterpriseOrderSetAuthority(
  set: Pick<EnterpriseOrderSetDefinition, "orderSetAuthority">
): EnterpriseOrderSetAuthority {
  return set.orderSetAuthority ?? "PROVIDER_ORDER_SET";
}

export function isRnStandingOrderSet(
  authority: EnterpriseOrderSetAuthority | Pick<EnterpriseOrderSetDefinition, "orderSetAuthority">
): boolean {
  const value =
    typeof authority === "string" ? authority : resolveEnterpriseOrderSetAuthority(authority);
  return value === "RN_STANDING_ORDER";
}

export function isProviderEnterpriseOrderSet(
  authority: EnterpriseOrderSetAuthority | Pick<EnterpriseOrderSetDefinition, "orderSetAuthority">
): boolean {
  return !isRnStandingOrderSet(authority);
}

export function getEnterpriseOrderSetAuthorityLabel(
  authority: EnterpriseOrderSetAuthority,
  locale: "en" | "fr"
): string {
  return ENTERPRISE_ORDER_SET_AUTHORITY_LABELS[authority][locale];
}

export function isEnterpriseOrderSetItemRnStandingOrderSafe(
  item: EnterpriseOrderSetItemRef
): boolean {
  if (item.kind === "MEDICATION") return false;
  if (item.requiresStructuredParameters) return false;
  if (item.kind === "IMAGING") return false;
  if (item.kind === "LAB") return true;
  if (item.kind !== "CARE" || !item.enterpriseProcedureCode?.trim()) return false;
  const row = canonicalCareProcedureByCode(item.enterpriseProcedureCode);
  if (!row || !row.isActive || !row.orderable) return false;
  return row.nursingProtocolAllowed && !row.requiresProviderOrder;
}

export function canRoleApplyEnterpriseOrderSet(input: {
  orderSetAuthority: EnterpriseOrderSetAuthority;
  rolesAllowed: readonly EnterpriseOrderSetRoleCode[];
  canPrescribe: boolean;
  hasRnStandingOrderAuthority: boolean;
  roleCodes: readonly string[];
}): boolean {
  const normalized = new Set(input.roleCodes.map((code) => code.toUpperCase()));
  if (normalized.has("ADMIN") || normalized.has("MEDORA_SUPER_ADMIN")) return true;

  if (isProviderEnterpriseOrderSet(input.orderSetAuthority)) {
    if (!input.canPrescribe) return false;
    return (
      input.rolesAllowed.includes("PROVIDER") ||
      input.rolesAllowed.includes("ADMIN")
    );
  }

  if (input.canPrescribe) return true;
  return (
    input.hasRnStandingOrderAuthority &&
    input.rolesAllowed.includes("RN") &&
    normalized.has("RN")
  );
}

/** @deprecated name kept for provenance callers — prefer canRoleApplyEnterpriseOrderSet */
export function canRolePlaceEnterpriseOrderSet(input: {
  rolesAllowed: readonly EnterpriseOrderSetRoleCode[];
  canPrescribe: boolean;
  roleCodes: readonly string[];
  orderSetAuthority?: EnterpriseOrderSetAuthority;
  hasRnStandingOrderAuthority?: boolean;
}): boolean {
  return canRoleApplyEnterpriseOrderSet({
    orderSetAuthority: input.orderSetAuthority ?? "PROVIDER_ORDER_SET",
    rolesAllowed: input.rolesAllowed,
    canPrescribe: input.canPrescribe,
    hasRnStandingOrderAuthority: input.hasRnStandingOrderAuthority ?? false,
    roleCodes: input.roleCodes,
  });
}

export type EnterpriseOrderSetAuthorityValidationIssue = {
  orderSetCode: string;
  itemKey: string;
  kind: "authority" | "role" | "item" | "medication" | "imaging" | "oxygen";
  message: string;
};

export function validateEnterpriseOrderSetAuthorityDefinition(
  set: EnterpriseOrderSetDefinition
): EnterpriseOrderSetAuthorityValidationIssue[] {
  const issues: EnterpriseOrderSetAuthorityValidationIssue[] = [];
  const authority = resolveEnterpriseOrderSetAuthority(set);

  if (isRnStandingOrderSet(authority)) {
    if (!set.rolesAllowed.includes("RN")) {
      issues.push({
        orderSetCode: set.code,
        itemKey: "",
        kind: "role",
        message: "RN standing order set must allow RN role",
      });
    }
    if (set.rolesAllowed.includes("PROVIDER") && !set.rolesAllowed.includes("RN")) {
      issues.push({
        orderSetCode: set.code,
        itemKey: "",
        kind: "role",
        message: "RN standing order set cannot be provider-only",
      });
    }
    for (const item of [...set.requiredItems, ...set.optionalItems]) {
      if (item.kind === "MEDICATION") {
        issues.push({
          orderSetCode: set.code,
          itemKey: item.key,
          kind: "medication",
          message: "RN standing order set cannot include medication items",
        });
        continue;
      }
      if (item.kind === "IMAGING") {
        issues.push({
          orderSetCode: set.code,
          itemKey: item.key,
          kind: "imaging",
          message: "RN standing order set cannot include imaging items",
        });
        continue;
      }
      if (!isEnterpriseOrderSetItemRnStandingOrderSafe(item)) {
        issues.push({
          orderSetCode: set.code,
          itemKey: item.key,
          kind: "item",
          message: "Item is not RN standing-order safe",
        });
      }
    }
    return issues;
  }

  if (!set.rolesAllowed.includes("PROVIDER") && !set.rolesAllowed.includes("ADMIN")) {
    issues.push({
      orderSetCode: set.code,
      itemKey: "",
      kind: "role",
      message: "Provider order set must allow provider/admin roles",
    });
  }

  return issues;
}

export function filterEnterpriseOrderSetsVisibleToRole(input: {
  sets: readonly EnterpriseOrderSetDefinition[];
  canPrescribe: boolean;
  hasRnStandingOrderAuthority: boolean;
  roleCodes: readonly string[];
}): EnterpriseOrderSetDefinition[] {
  return input.sets.filter((set) =>
    canRoleApplyEnterpriseOrderSet({
      orderSetAuthority: resolveEnterpriseOrderSetAuthority(set),
      rolesAllowed: set.rolesAllowed,
      canPrescribe: input.canPrescribe,
      hasRnStandingOrderAuthority: input.hasRnStandingOrderAuthority,
      roleCodes: input.roleCodes,
    })
  );
}
