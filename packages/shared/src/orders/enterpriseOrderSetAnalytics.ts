/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_3 — analytics types + pure helpers (no DB).
 */
import { z } from "zod";

export const ENTERPRISE_ORDER_SET_ANALYTICS_MAX_LIMIT = 200 as const;
export const ENTERPRISE_ORDER_SET_ANALYTICS_DEFAULT_LIMIT = 50 as const;
export const ENTERPRISE_ORDER_SET_ANALYTICS_SUMMARY_SCAN_CAP = 2000 as const;
export const ENTERPRISE_ORDER_SET_ANALYTICS_MAX_LOOKBACK_DAYS = 90 as const;

export const enterpriseOrderSetAnalyticsFiltersSchema = z.object({
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  orderSetCode: z.string().trim().min(1).max(128).optional(),
  orderSetAuthority: z.enum(["PROVIDER_ORDER_SET", "RN_STANDING_ORDER"]).optional(),
  category: z.string().trim().min(1).max(64).optional(),
  clinicalDomain: z.string().trim().min(1).max(128).optional(),
  providerId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ENTERPRISE_ORDER_SET_ANALYTICS_MAX_LIMIT)
    .optional()
    .default(ENTERPRISE_ORDER_SET_ANALYTICS_DEFAULT_LIMIT),
  cursor: z.string().trim().min(1).max(512).optional(),
});

export type EnterpriseOrderSetAnalyticsFilters = z.infer<
  typeof enterpriseOrderSetAnalyticsFiltersSchema
>;

export type EnterpriseOrderSetAuditMetadataRow = {
  auditLogId: string;
  createdAt: string;
  orderId: string | null;
  encounterId: string | null;
  providerUserId: string | null;
  orderSetCode: string;
  orderSetVersion: string;
  orderSetCategory: string;
  orderSetClinicalDomain: string;
  orderSetAuthority: string | null;
  orderType: string | null;
  selectedItemCount: number;
  skippedItemCount: number;
  structuredParameterSkippedCount: number;
  placedItemKeys: string[];
  appliedAt: string | null;
  appliedSurface: string | null;
  encounterType: string | null;
  providerDepartmentId: string | null;
};

export type EnterpriseOrderSetUsageRow = EnterpriseOrderSetAuditMetadataRow;

export type EnterpriseOrderSetAnalyticsSummary = {
  totalProvenanceOrders: number;
  totalApplications: number;
  totalSelectedItems: number;
  totalPlacedItems: number;
  totalSkippedItems: number;
  totalStructuredParameterSkipped: number;
  byOrderSetCode: Record<string, number>;
  byCategory: Record<string, number>;
  byClinicalDomain: Record<string, number>;
  byOrderSetAuthority: Record<string, number>;
  byProviderId: Record<string, number>;
  byEncounterType: Record<string, number>;
  summaryScanCount: number;
  summaryIsPartial: boolean;
};

export type EnterpriseOrderSetComplianceExportRow = {
  appliedAt: string | null;
  createdAt: string;
  orderSetCode: string;
  orderSetVersion: string;
  orderSetCategory: string;
  orderSetClinicalDomain: string;
  orderSetAuthority: string | null;
  encounterId: string | null;
  orderId: string | null;
  providerUserId: string | null;
  orderType: string | null;
  selectedItemCount: number;
  placedItemCount: number;
  skippedItemCount: number;
  structuredParameterSkippedCount: number;
  placedItemKeys: string[];
  appliedSurface: string | null;
};

export type EnterpriseOrderSetAnalyticsResponse = {
  summary: EnterpriseOrderSetAnalyticsSummary;
  rows: EnterpriseOrderSetUsageRow[];
  nextCursor: string | null;
  appliedFilters: EnterpriseOrderSetAnalyticsFilters;
  generatedAt: string;
};

function readString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readNumber(meta: Record<string, unknown>, key: string): number {
  const v = meta[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function readStringArray(meta: Record<string, unknown>, key: string): string[] {
  const v = meta[key];
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/** Parse Phase 2 audit metadata written on ORDER_CREATE. Returns null when not provenance-bearing. */
export function parseEnterpriseOrderSetAuditMetadata(input: {
  auditLogId: string;
  createdAt: string;
  metadata: unknown;
  encounterId?: string | null;
  orderId?: string | null;
  userId?: string | null;
  encounterType?: string | null;
  providerDepartmentId?: string | null;
}): EnterpriseOrderSetAuditMetadataRow | null {
  if (!input.metadata || typeof input.metadata !== "object" || Array.isArray(input.metadata)) {
    return null;
  }
  const meta = input.metadata as Record<string, unknown>;
  const orderSetCode = readString(meta, "enterpriseOrderSetCode");
  if (!orderSetCode) return null;

  return {
    auditLogId: input.auditLogId,
    createdAt: input.createdAt,
    orderId: input.orderId ?? readString(meta, "orderId"),
    encounterId: input.encounterId ?? null,
    providerUserId: input.userId ?? null,
    orderSetCode,
    orderSetVersion: readString(meta, "enterpriseOrderSetVersion") ?? "",
    orderSetCategory: readString(meta, "enterpriseOrderSetCategory") ?? "",
    orderSetClinicalDomain: readString(meta, "enterpriseOrderSetClinicalDomain") ?? "",
    orderSetAuthority: readString(meta, "enterpriseOrderSetAuthority"),
    orderType: readString(meta, "type"),
    selectedItemCount: readNumber(meta, "enterpriseOrderSetSelectedItemCount"),
    skippedItemCount: readNumber(meta, "enterpriseOrderSetSkippedItemCount"),
    structuredParameterSkippedCount: readNumber(meta, "enterpriseOrderSetStructuredParameterSkippedCount"),
    placedItemKeys: readStringArray(meta, "enterpriseOrderSetPlacedItemKeys"),
    appliedAt: readString(meta, "enterpriseOrderSetAppliedAt"),
    appliedSurface: readString(meta, "enterpriseOrderSetAppliedSurface"),
    encounterType: input.encounterType ?? null,
    providerDepartmentId: input.providerDepartmentId ?? null,
  };
}

/** Stable application key — groups multi-domain submits from one order-set apply. */
export function enterpriseOrderSetApplicationKey(row: EnterpriseOrderSetAuditMetadataRow): string {
  return [
    row.encounterId ?? "no-encounter",
    row.orderSetCode,
    row.appliedAt ?? row.createdAt,
  ].join("|");
}

export function aggregateEnterpriseOrderSetAnalytics(input: {
  rows: readonly EnterpriseOrderSetAuditMetadataRow[];
  summaryScanCount: number;
  summaryIsPartial: boolean;
}): EnterpriseOrderSetAnalyticsSummary {
  const applicationKeys = new Set<string>();
  let totalSelectedItems = 0;
  let totalPlacedItems = 0;
  let totalSkippedItems = 0;
  let totalStructuredParameterSkipped = 0;
  const byOrderSetCode: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byClinicalDomain: Record<string, number> = {};
  const byOrderSetAuthority: Record<string, number> = {};
  const byProviderId: Record<string, number> = {};
  const byEncounterType: Record<string, number> = {};

  const applicationAggregates = new Map<
    string,
    { selected: number; skipped: number; structured: number; placed: Set<string> }
  >();

  for (const row of input.rows) {
    byOrderSetCode[row.orderSetCode] = (byOrderSetCode[row.orderSetCode] ?? 0) + 1;
    if (row.orderSetCategory) {
      byCategory[row.orderSetCategory] = (byCategory[row.orderSetCategory] ?? 0) + 1;
    }
    if (row.orderSetClinicalDomain) {
      byClinicalDomain[row.orderSetClinicalDomain] =
        (byClinicalDomain[row.orderSetClinicalDomain] ?? 0) + 1;
    }
    if (row.orderSetAuthority) {
      byOrderSetAuthority[row.orderSetAuthority] =
        (byOrderSetAuthority[row.orderSetAuthority] ?? 0) + 1;
    }
    if (row.providerUserId) {
      byProviderId[row.providerUserId] = (byProviderId[row.providerUserId] ?? 0) + 1;
    }
    if (row.encounterType) {
      byEncounterType[row.encounterType] = (byEncounterType[row.encounterType] ?? 0) + 1;
    }

    totalPlacedItems += row.placedItemKeys.length;

    const appKey = enterpriseOrderSetApplicationKey(row);
    applicationKeys.add(appKey);
    const agg = applicationAggregates.get(appKey) ?? {
      selected: 0,
      skipped: 0,
      structured: 0,
      placed: new Set<string>(),
    };
    const nextAgg = {
      selected: Math.max(agg.selected, row.selectedItemCount),
      skipped: Math.max(agg.skipped, row.skippedItemCount),
      structured: Math.max(agg.structured, row.structuredParameterSkippedCount),
      placed: new Set([...agg.placed, ...row.placedItemKeys]),
    };
    applicationAggregates.set(appKey, nextAgg);
  }

  for (const agg of applicationAggregates.values()) {
    totalSelectedItems += agg.selected;
    totalSkippedItems += agg.skipped;
    totalStructuredParameterSkipped += agg.structured;
  }

  return {
    totalProvenanceOrders: input.rows.length,
    totalApplications: applicationKeys.size,
    totalSelectedItems,
    totalPlacedItems,
    totalSkippedItems,
    totalStructuredParameterSkipped,
    byOrderSetCode,
    byCategory,
    byClinicalDomain,
    byOrderSetAuthority,
    byProviderId,
    byEncounterType,
    summaryScanCount: input.summaryScanCount,
    summaryIsPartial: input.summaryIsPartial,
  };
}

export function toEnterpriseOrderSetComplianceExportRow(
  row: EnterpriseOrderSetAuditMetadataRow
): EnterpriseOrderSetComplianceExportRow {
  return {
    appliedAt: row.appliedAt,
    createdAt: row.createdAt,
    orderSetCode: row.orderSetCode,
    orderSetVersion: row.orderSetVersion,
    orderSetCategory: row.orderSetCategory,
    orderSetClinicalDomain: row.orderSetClinicalDomain,
    orderSetAuthority: row.orderSetAuthority,
    encounterId: row.encounterId,
    orderId: row.orderId,
    providerUserId: row.providerUserId,
    orderType: row.orderType,
    selectedItemCount: row.selectedItemCount,
    placedItemCount: row.placedItemKeys.length,
    skippedItemCount: row.skippedItemCount,
    structuredParameterSkippedCount: row.structuredParameterSkippedCount,
    placedItemKeys: [...row.placedItemKeys],
    appliedSurface: row.appliedSurface,
  };
}

export function enterpriseOrderSetComplianceExportRows(
  rows: readonly EnterpriseOrderSetAuditMetadataRow[]
): EnterpriseOrderSetComplianceExportRow[] {
  return rows.map(toEnterpriseOrderSetComplianceExportRow);
}
