/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_2 — order-set provenance + server validation.
 */
import { z } from "zod";
import {
  canRolePlaceEnterpriseOrderSet,
  enterpriseOrderSetByCode,
  enterpriseOrderSetItemByKey,
  type EnterpriseOrderSetDefinition,
  type EnterpriseOrderSetItemKind,
} from "./enterpriseOrderSets.js";

export const ENTERPRISE_ORDER_SET_APPLY_SURFACES = ["CREATE_ORDER_MODAL"] as const;
export type EnterpriseOrderSetApplySurface = (typeof ENTERPRISE_ORDER_SET_APPLY_SURFACES)[number];

export const ENTERPRISE_ORDER_SET_SKIP_REASONS = [
  "structuredParametersRequired",
  "nonPrescriber",
  "noMatch",
  "ambiguous",
  "deferIfMissing",
] as const;
export type EnterpriseOrderSetSkipReason = (typeof ENTERPRISE_ORDER_SET_SKIP_REASONS)[number];

export const enterpriseOrderSetSkippedItemSchema = z.object({
  key: z.string().min(1).max(128),
  reason: z.enum(ENTERPRISE_ORDER_SET_SKIP_REASONS),
});

export type EnterpriseOrderSetSkippedItem = z.infer<typeof enterpriseOrderSetSkippedItemSchema>;

export const enterpriseOrderSetProvenanceSchema = z.object({
  orderSetCode: z.string().min(1).max(128),
  orderSetVersion: z.string().min(1).max(32),
  orderSetCategory: z.string().min(1).max(64),
  orderSetClinicalDomain: z.string().min(1).max(128),
  selectedItemKeys: z.array(z.string().min(1).max(128)).min(1),
  skippedItems: z.array(enterpriseOrderSetSkippedItemSchema).optional(),
  appliedAt: z.string().datetime(),
  appliedSurface: z.enum(ENTERPRISE_ORDER_SET_APPLY_SURFACES),
  registryValidationStatus: z.literal("VALID"),
  /** Order domain for this POST (LAB / IMAGING / MEDICATION / CARE). */
  orderType: z.enum(["LAB", "IMAGING", "MEDICATION", "CARE"]),
  /** Registry item keys placed in this order (must match items.length). */
  placedItemKeys: z.array(z.string().min(1).max(128)).min(1),
});

export type EnterpriseOrderSetProvenance = z.infer<typeof enterpriseOrderSetProvenanceSchema>;

export type EnterpriseOrderSetApplyContext = {
  orderSetCode: string;
  orderSetVersion: string;
  orderSetCategory: string;
  orderSetClinicalDomain: string;
  selectedItemKeys: string[];
  skippedItems: EnterpriseOrderSetSkippedItem[];
  appliedAt: string;
  appliedSurface: EnterpriseOrderSetApplySurface;
  registryValidationStatus: "VALID";
};

const ORDER_KIND_BY_TYPE: Record<
  EnterpriseOrderSetProvenance["orderType"],
  EnterpriseOrderSetItemKind
> = {
  LAB: "LAB",
  IMAGING: "IMAGING",
  MEDICATION: "MEDICATION",
  CARE: "CARE",
};

function itemKindForOrderType(
  orderType: EnterpriseOrderSetProvenance["orderType"]
): EnterpriseOrderSetItemKind {
  return ORDER_KIND_BY_TYPE[orderType];
}

export function buildEnterpriseOrderSetApplyContext(input: {
  set: EnterpriseOrderSetDefinition;
  selectedItemKeys: readonly string[];
  skippedItems: readonly EnterpriseOrderSetSkippedItem[];
  appliedAt: string;
  appliedSurface?: EnterpriseOrderSetApplySurface;
}): EnterpriseOrderSetApplyContext {
  return {
    orderSetCode: input.set.code,
    orderSetVersion: input.set.version,
    orderSetCategory: input.set.category,
    orderSetClinicalDomain: input.set.clinicalDomain,
    selectedItemKeys: [...input.selectedItemKeys],
    skippedItems: [...input.skippedItems],
    appliedAt: input.appliedAt,
    appliedSurface: input.appliedSurface ?? "CREATE_ORDER_MODAL",
    registryValidationStatus: "VALID",
  };
}

export function buildEnterpriseOrderSetProvenance(input: {
  applyContext: EnterpriseOrderSetApplyContext;
  orderType: EnterpriseOrderSetProvenance["orderType"];
  placedItemKeys: readonly string[];
}): EnterpriseOrderSetProvenance {
  return {
    orderSetCode: input.applyContext.orderSetCode,
    orderSetVersion: input.applyContext.orderSetVersion,
    orderSetCategory: input.applyContext.orderSetCategory,
    orderSetClinicalDomain: input.applyContext.orderSetClinicalDomain,
    selectedItemKeys: input.applyContext.selectedItemKeys,
    skippedItems:
      input.applyContext.skippedItems.length > 0 ? input.applyContext.skippedItems : undefined,
    appliedAt: input.applyContext.appliedAt,
    appliedSurface: input.applyContext.appliedSurface,
    registryValidationStatus: input.applyContext.registryValidationStatus,
    orderType: input.orderType,
    placedItemKeys: [...input.placedItemKeys],
  };
}

export type EnterpriseOrderSetApplicationValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateEnterpriseOrderSetApplication(input: {
  provenance: EnterpriseOrderSetProvenance;
  itemCount: number;
  roleCodes: readonly string[];
  canPrescribe: boolean;
}): EnterpriseOrderSetApplicationValidationResult {
  const parsed = enterpriseOrderSetProvenanceSchema.safeParse(input.provenance);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_PROVENANCE", message: "Invalid enterprise order set provenance." };
  }
  const provenance = parsed.data;

  const set = enterpriseOrderSetByCode(provenance.orderSetCode);
  if (!set || !set.isActive) {
    return {
      ok: false,
      code: "ORDER_SET_NOT_FOUND",
      message: "Enterprise order set not found or inactive.",
    };
  }
  if (set.version !== provenance.orderSetVersion) {
    return {
      ok: false,
      code: "ORDER_SET_VERSION_MISMATCH",
      message: "Enterprise order set version mismatch.",
    };
  }
  if (set.category !== provenance.orderSetCategory) {
    return {
      ok: false,
      code: "ORDER_SET_CATEGORY_MISMATCH",
      message: "Enterprise order set category mismatch.",
    };
  }
  if (set.clinicalDomain !== provenance.orderSetClinicalDomain) {
    return {
      ok: false,
      code: "ORDER_SET_DOMAIN_MISMATCH",
      message: "Enterprise order set clinical domain mismatch.",
    };
  }

  if (
    !canRolePlaceEnterpriseOrderSet({
      rolesAllowed: set.rolesAllowed,
      canPrescribe: input.canPrescribe,
      roleCodes: input.roleCodes,
    })
  ) {
    return {
      ok: false,
      code: "ORDER_SET_ROLE_DENIED",
      message: "Role not allowed to place this enterprise order set.",
    };
  }

  const selectedSet = new Set(provenance.selectedItemKeys);
  for (const key of provenance.selectedItemKeys) {
    if (!enterpriseOrderSetItemByKey(set, key)) {
      return {
        ok: false,
        code: "UNKNOWN_SELECTED_ITEM",
        message: `Unknown selected order set item: ${key}.`,
      };
    }
  }

  const skippedByKey = new Map(
    (provenance.skippedItems ?? []).map((item) => [item.key, item.reason] as const)
  );
  for (const skipped of provenance.skippedItems ?? []) {
    if (!enterpriseOrderSetItemByKey(set, skipped.key)) {
      return {
        ok: false,
        code: "UNKNOWN_SKIPPED_ITEM",
        message: `Unknown skipped order set item: ${skipped.key}.`,
      };
    }
  }

  for (const key of provenance.placedItemKeys) {
    if (!selectedSet.has(key)) {
      return {
        ok: false,
        code: "PLACED_NOT_SELECTED",
        message: `Placed item not in selected set: ${key}.`,
      };
    }
    const item = enterpriseOrderSetItemByKey(set, key);
    if (!item) {
      return {
        ok: false,
        code: "UNKNOWN_PLACED_ITEM",
        message: `Unknown placed order set item: ${key}.`,
      };
    }
    if (item.kind !== itemKindForOrderType(provenance.orderType)) {
      return {
        ok: false,
        code: "PLACED_ITEM_KIND_MISMATCH",
        message: `Placed item kind mismatch for ${key}.`,
      };
    }
    if (item.requiresStructuredParameters) {
      return {
        ok: false,
        code: "STRUCTURED_PARAMETERS_ITEM_PLACED",
        message: `Structured-parameters item cannot be auto-placed: ${key}.`,
      };
    }
  }

  if (provenance.placedItemKeys.length !== input.itemCount) {
    return {
      ok: false,
      code: "PLACED_ITEM_COUNT_MISMATCH",
      message: "Placed item keys must match order line count.",
    };
  }

  const expectedKind = itemKindForOrderType(provenance.orderType);
  for (const key of provenance.selectedItemKeys) {
    const item = enterpriseOrderSetItemByKey(set, key);
    if (!item || item.kind !== expectedKind) continue;
    if (!item.required) continue;
    if (provenance.placedItemKeys.includes(key)) continue;
    const skipReason = skippedByKey.get(key);
    if (!skipReason) {
      return {
        ok: false,
        code: "REQUIRED_ITEM_OMITTED",
        message: `Required item omitted without skip reason: ${key}.`,
      };
    }
    if (item.requiresStructuredParameters && skipReason !== "structuredParametersRequired") {
      return {
        ok: false,
        code: "INVALID_SKIP_REASON",
        message: `Structured-parameters item requires structuredParametersRequired skip: ${key}.`,
      };
    }
  }

  return { ok: true };
}

/** Flatten provenance for audit / OrderEvent metadata (PHI-safe). */
export function enterpriseOrderSetProvenanceAuditMetadata(
  provenance: EnterpriseOrderSetProvenance,
  extras?: { orderId?: string }
): Record<string, unknown> {
  const skipped = provenance.skippedItems ?? [];
  return {
    enterpriseOrderSetCode: provenance.orderSetCode,
    enterpriseOrderSetVersion: provenance.orderSetVersion,
    enterpriseOrderSetCategory: provenance.orderSetCategory,
    enterpriseOrderSetClinicalDomain: provenance.orderSetClinicalDomain,
    enterpriseOrderSetSelectedItemCount: provenance.selectedItemKeys.length,
    enterpriseOrderSetSkippedItemCount: skipped.length,
    enterpriseOrderSetStructuredParameterSkippedCount: skipped.filter(
      (item) => item.reason === "structuredParametersRequired"
    ).length,
    enterpriseOrderSetPlacedItemKeys: provenance.placedItemKeys,
    enterpriseOrderSetAppliedSurface: provenance.appliedSurface,
    enterpriseOrderSetAppliedAt: provenance.appliedAt,
    enterpriseOrderSetRegistryValidationStatus: provenance.registryValidationStatus,
    ...(extras?.orderId ? { orderId: extras.orderId } : {}),
  };
}
