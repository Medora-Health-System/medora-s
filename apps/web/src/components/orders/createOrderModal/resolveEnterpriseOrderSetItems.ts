/**
 * Enterprise order-set apply — resolve selected registry items to staged order lines.
 */
import {
  canonicalCareProcedureByCode,
  OXYGEN_THERAPY_PROCEDURE_CODE,
  resolveCanonicalCareProcedureDisplayName,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";
import {
  resolveOrderSetCatalogBatch,
  type OrderSetCatalogResolveRequestRow,
} from "@/lib/orderSetCatalogResolveApi";
import type { CreateOrderLineItem } from "./types";
import { newOrderLineId } from "./types";
import type { OrderSetUiItem } from "./enterpriseOrderSetAdapter";

export type OrderSetSkippedReason =
  | "noMatch"
  | "ambiguous"
  | "nonPrescriber"
  | "structuredParametersRequired";

export type OrderSetSkippedItem = { key: string; reason: OrderSetSkippedReason };

export type ResolvedOrderSetItems = {
  LAB: CreateOrderLineItem[];
  IMAGING: CreateOrderLineItem[];
  MEDICATION: CreateOrderLineItem[];
  CARE: CreateOrderLineItem[];
  skipped: OrderSetSkippedItem[];
};

export type ResolveEnterpriseOrderSetItemsInput = {
  items: readonly OrderSetUiItem[];
  facilityId: string;
  language: SupportedLanguage;
  canPrescribe: boolean;
  /** RN standing-order apply: stage nursing-safe CARE/LAB without verbal attestation at apply time. */
  allowRnStandingOrderSetApply?: boolean;
  catalogItemToOrderLine: (
    item: CatalogSearchItem,
    language: SupportedLanguage
  ) => CreateOrderLineItem | null;
  orderSetCode?: string;
};

export function emptyResolvedOrderSetItems(): ResolvedOrderSetItems {
  return { LAB: [], IMAGING: [], MEDICATION: [], CARE: [], skipped: [] };
}

export function isApprovedCatalogMatch(
  item: CatalogSearchItem,
  catalogType: CatalogType,
  approvedCodes: Set<string>
): boolean {
  return item.type === catalogType && approvedCodes.has(item.code.toUpperCase());
}

const SKIP_REASON_I18N_KEY: Record<OrderSetSkippedReason, string> = {
  noMatch: "ordersets.apply.itemReason.noMatch",
  ambiguous: "ordersets.apply.itemReason.ambiguous",
  nonPrescriber: "ordersets.apply.itemReason.nonPrescriber",
  structuredParametersRequired: "ordersets.apply.itemReason.structuredParametersRequired",
};

export function formatOrderSetSkippedItemLine(input: {
  displayLabel: string;
  reason: OrderSetSkippedReason;
  t: (key: string) => string;
}): string {
  const reasonLabel = input.t(SKIP_REASON_I18N_KEY[input.reason]);
  return `- ${input.displayLabel}: ${reasonLabel}`;
}

export function formatOrderSetSkippedSummary(input: {
  skipped: readonly OrderSetSkippedItem[];
  itemsByKey: Map<string, OrderSetUiItem>;
  t: (key: string) => string;
}): string | null {
  if (input.skipped.length === 0) return null;
  const lines = input.skipped.map((entry) => {
    const ui = input.itemsByKey.get(entry.key);
    return formatOrderSetSkippedItemLine({
      displayLabel: ui?.displayLabel ?? entry.key,
      reason: entry.reason,
      t: input.t,
    });
  });
  return input.t("ordersets.apply.partialStagingSummary").replace("{items}", lines.join("\n"));
}

function logOrderSetResolution(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[orderSetApply] ${event}`, payload);
}

export async function resolveEnterpriseOrderSetItems(
  input: ResolveEnterpriseOrderSetItemsInput
): Promise<ResolvedOrderSetItems> {
  const resolved = emptyResolvedOrderSetItems();
  const catalogBatchRows: Array<{
    orderSetItem: OrderSetUiItem;
    acceptableCodes: Set<string>;
  }> = [];

  logOrderSetResolution("resolve.start", {
    orderSetCode: input.orderSetCode ?? null,
    selectedCount: input.items.length,
    selectedKeys: input.items.map((item) => item.key),
    references: input.items.map((item) => ({
      key: item.key,
      type: item.type,
      catalogCode: item.catalogCode ?? null,
      catalogCodes: item.catalogCodes ?? [],
      enterpriseProcedureCode: item.enterpriseProcedureCode ?? null,
    })),
  });

  for (const orderSetItem of input.items) {
    if (orderSetItem.comingSoon) continue;

    if (orderSetItem.requiresStructuredParameters) {
      resolved.skipped.push({ key: orderSetItem.key, reason: "structuredParametersRequired" });
      continue;
    }

    if (
      orderSetItem.type === "MEDICATION" &&
      !input.canPrescribe &&
      !input.allowRnStandingOrderSetApply
    ) {
      resolved.skipped.push({ key: orderSetItem.key, reason: "nonPrescriber" });
      continue;
    }

    if (orderSetItem.type === "CARE") {
      const procedureCode = orderSetItem.enterpriseProcedureCode?.trim();
      const label =
        (procedureCode
          ? resolveCanonicalCareProcedureDisplayName(procedureCode, input.language) ??
            canonicalCareProcedureByCode(procedureCode)?.displayNameEn
          : null) ?? orderSetItem.displayLabel;
      if (procedureCode && !canonicalCareProcedureByCode(procedureCode)) {
        if (orderSetItem.deferIfMissing) continue;
        resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
        continue;
      }
      resolved.CARE.push({
        _lineId: newOrderLineId(),
        isManual: true,
        catalogItemType: "CARE",
        manualLabel: label,
        _label: label,
        _enterpriseOrderSetItemKey: orderSetItem.key,
        ...(procedureCode ? { _enterpriseProcedureId: procedureCode } : {}),
        ...(procedureCode === OXYGEN_THERAPY_PROCEDURE_CODE
          ? { _careQuickKey: "oxygen_therapy" as const }
          : {}),
        ...(procedureCode === "ekg_ecg" ? { _careQuickKey: "ekg_workflow" as const } : {}),
      });
      continue;
    }

    if (!orderSetItem.catalogType || !orderSetItem.catalogCode) {
      if (orderSetItem.deferIfMissing) continue;
      resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
      continue;
    }

    catalogBatchRows.push({
      orderSetItem,
      acceptableCodes: new Set(
        [orderSetItem.catalogCode, ...(orderSetItem.catalogCodes ?? [])].map((code) => code.toUpperCase())
      ),
    });
  }

  if (catalogBatchRows.length > 0) {
    const batchPayload: OrderSetCatalogResolveRequestRow[] = catalogBatchRows.map(({ orderSetItem }) => ({
      requestId: orderSetItem.key,
      catalogType: orderSetItem.catalogType as "LAB_TEST" | "IMAGING_STUDY",
      referenceCodes: [orderSetItem.catalogCode!, ...(orderSetItem.catalogCodes ?? [])],
      fallbackSearchQuery: orderSetItem.fallbackSearchQuery,
    }));

    try {
      const batchResults = await resolveOrderSetCatalogBatch(input.facilityId, batchPayload);

      logOrderSetResolution("resolve.batchResponse", {
        orderSetCode: input.orderSetCode ?? null,
        requestCount: batchPayload.length,
        matchedCount: [...batchResults.values()].filter((row) => row.item != null).length,
        ambiguousCount: [...batchResults.values()].filter((row) => row.ambiguous).length,
        results: batchPayload.map((row) => {
          const result = batchResults.get(row.requestId);
          return {
            requestId: row.requestId,
            referenceCodes: row.referenceCodes,
            matchedCode: result?.item?.code ?? null,
            ambiguous: result?.ambiguous ?? false,
          };
        }),
      });

      for (const { orderSetItem, acceptableCodes } of catalogBatchRows) {
        const batchResult = batchResults.get(orderSetItem.key);
        if (!batchResult) {
          if (orderSetItem.deferIfMissing) continue;
          resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
          continue;
        }
        if (batchResult.ambiguous) {
          resolved.skipped.push({ key: orderSetItem.key, reason: "ambiguous" });
          continue;
        }
        const catalogItem =
          batchResult.item &&
          isApprovedCatalogMatch(batchResult.item, orderSetItem.catalogType!, acceptableCodes)
            ? batchResult.item
            : null;

        if (!catalogItem) {
          if (orderSetItem.deferIfMissing) continue;
          resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
          continue;
        }

        const line = input.catalogItemToOrderLine(catalogItem, input.language);
        if (!line) {
          resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
          continue;
        }

        const taggedLine = { ...line, _enterpriseOrderSetItemKey: orderSetItem.key };
        if (orderSetItem.type === "LAB" && taggedLine.catalogItemType === "LAB_TEST") {
          resolved.LAB.push(taggedLine);
        }
        if (orderSetItem.type === "IMAGING" && taggedLine.catalogItemType === "IMAGING_STUDY") {
          resolved.IMAGING.push(taggedLine);
        }
        if (orderSetItem.type === "MEDICATION" && taggedLine.catalogItemType === "MEDICATION") {
          resolved.MEDICATION.push(taggedLine);
        }
      }
    } catch (error) {
      logOrderSetResolution("resolve.batchError", {
        orderSetCode: input.orderSetCode ?? null,
        message: error instanceof Error ? error.message : "unknown",
      });
      for (const { orderSetItem } of catalogBatchRows) {
        if (orderSetItem.deferIfMissing) continue;
        resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
      }
    }
  }

  logOrderSetResolution("resolve.complete", {
    orderSetCode: input.orderSetCode ?? null,
    staged: {
      LAB: resolved.LAB.length,
      IMAGING: resolved.IMAGING.length,
      MEDICATION: resolved.MEDICATION.length,
      CARE: resolved.CARE.length,
    },
    skipped: resolved.skipped,
  });

  return resolved;
}
