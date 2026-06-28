/**
 * MEDUI.ORDERSETS.ENTERPRISE_FOUNDATION_PHASE_1 — registry dependency validation.
 */
import { canonicalCareProcedureByCode } from "../procedures/canonicalCareProcedureCatalog.js";
import {
  activeEnterpriseOrderSets,
  allEnterpriseOrderSetItems,
  ENTERPRISE_ORDER_SET_REGISTRY,
  type EnterpriseOrderSetDefinition,
  type EnterpriseOrderSetItemRef,
} from "./enterpriseOrderSets.js";

/** Reference lab codes present in Haiti seed catalog (facility may alias ER_*). */
export const ENTERPRISE_ORDER_SET_REFERENCE_LAB_CODES = new Set([
  "CBC",
  "CMP",
  "BMP",
  "TROPONIN",
  "TROP",
  "ER_TROP",
  "LACTATE",
  "ER_LAC",
  "BLOOD_CULTURE",
  "ER_BC",
  "TYPE_SCREEN",
  "ER_BLOOD_TYPE",
  "ABG",
  "ER_ABG",
  "VBG",
  "ER_VBG",
]);

/** Reference imaging codes present in Haiti seed catalog. */
export const ENTERPRISE_ORDER_SET_REFERENCE_IMAGING_CODES = new Set([
  "XR_CHEST",
  "CT_HEAD",
  "CT_HEAD_WO_CONTRAST",
  "CT_CERVICAL_SPINE",
  "CTA_HEAD_NECK",
  "CT_ABDOMEN_PELVIS",
  "CT_ABD",
]);

export type EnterpriseOrderSetValidationIssue = {
  orderSetCode: string;
  itemKey: string;
  kind: "structure" | "duplicate" | "care" | "lab" | "imaging" | "medication" | "oxygen";
  message: string;
};

export type EnterpriseOrderSetRegistryValidationReport = {
  ok: boolean;
  issues: EnterpriseOrderSetValidationIssue[];
  missingDependencies: EnterpriseOrderSetValidationIssue[];
};

function validateItemCatalogReference(item: EnterpriseOrderSetItemRef): EnterpriseOrderSetValidationIssue[] {
  const issues: EnterpriseOrderSetValidationIssue[] = [];
  if (item.kind === "CARE") {
    if (!item.enterpriseProcedureCode?.trim()) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "care",
        message: "CARE item missing enterpriseProcedureCode",
      });
      return issues;
    }
    const row = canonicalCareProcedureByCode(item.enterpriseProcedureCode);
    if (!row) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "care",
        message: `Unknown care procedure code: ${item.enterpriseProcedureCode}`,
      });
    } else if (!row.orderable || !row.isActive) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "care",
        message: `Care procedure not orderable/active: ${item.enterpriseProcedureCode}`,
      });
    }
    if (item.enterpriseProcedureCode === "oxygen_therapy" && !item.requiresStructuredParameters) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "oxygen",
        message: "oxygen_therapy must require structured parameters in order sets",
      });
    }
    return issues;
  }

  if (item.kind === "LAB") {
    const codes = [item.catalogCode, ...(item.catalogCodes ?? [])].filter(Boolean) as string[];
    if (codes.length === 0) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "lab",
        message: "LAB item missing catalogCode",
      });
      return issues;
    }
    const hasReference = codes.some((code) => ENTERPRISE_ORDER_SET_REFERENCE_LAB_CODES.has(code.toUpperCase()));
    if (!hasReference) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "lab",
        message: `LAB catalog code not in reference set: ${codes.join(", ")}`,
      });
    }
    return issues;
  }

  if (item.kind === "IMAGING") {
    const codes = [item.catalogCode, ...(item.catalogCodes ?? [])].filter(Boolean) as string[];
    if (codes.length === 0) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "imaging",
        message: "IMAGING item missing catalogCode",
      });
      return issues;
    }
    const hasReference = codes.some((code) =>
      ENTERPRISE_ORDER_SET_REFERENCE_IMAGING_CODES.has(code.toUpperCase())
    );
    if (!hasReference) {
      issues.push({
        orderSetCode: "",
        itemKey: item.key,
        kind: "imaging",
        message: `IMAGING catalog code not in reference set: ${codes.join(", ")}`,
      });
    }
    return issues;
  }

  if (item.kind === "MEDICATION") {
    issues.push({
      orderSetCode: "",
      itemKey: item.key,
      kind: "medication",
      message: "Phase 1 order sets must not include medication items",
    });
  }

  return issues;
}

export function validateEnterpriseOrderSetDefinition(
  set: EnterpriseOrderSetDefinition
): EnterpriseOrderSetValidationIssue[] {
  const issues: EnterpriseOrderSetValidationIssue[] = [];
  const keys = new Set<string>();
  for (const item of allEnterpriseOrderSetItems(set)) {
    if (keys.has(item.key)) {
      issues.push({
        orderSetCode: set.code,
        itemKey: item.key,
        kind: "duplicate",
        message: "Duplicate item key within order set",
      });
    }
    keys.add(item.key);
    for (const dep of validateItemCatalogReference(item)) {
      issues.push({ ...dep, orderSetCode: set.code });
    }
  }

  for (const requiredKey of set.requiredItems.map((item) => item.key)) {
    if (set.optionalItems.some((item) => item.key === requiredKey)) {
      issues.push({
        orderSetCode: set.code,
        itemKey: requiredKey,
        kind: "structure",
        message: "Item appears in both required and optional lists",
      });
    }
  }

  return issues;
}

export function validateEnterpriseOrderSetRegistry(): EnterpriseOrderSetRegistryValidationReport {
  const active = activeEnterpriseOrderSets();
  const codeCounts = new Map<string, number>();
  for (const set of active) {
    codeCounts.set(set.code, (codeCounts.get(set.code) ?? 0) + 1);
  }

  const issues: EnterpriseOrderSetValidationIssue[] = [];
  for (const [code, count] of codeCounts) {
    if (count > 1) {
      issues.push({
        orderSetCode: code,
        itemKey: "",
        kind: "structure",
        message: "Duplicate active order set code in registry",
      });
    }
  }

  for (const set of ENTERPRISE_ORDER_SET_REGISTRY) {
    issues.push(...validateEnterpriseOrderSetDefinition(set));
  }

  const missingDependencies = issues.filter(
    (issue) => issue.kind === "care" || issue.kind === "lab" || issue.kind === "imaging"
  );

  return {
    ok: issues.length === 0,
    issues,
    missingDependencies,
  };
}

export function listMissingOrderSetDependencies(): EnterpriseOrderSetValidationIssue[] {
  return validateEnterpriseOrderSetRegistry().missingDependencies;
}
