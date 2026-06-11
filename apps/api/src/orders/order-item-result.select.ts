import type { Prisma } from "@prisma/client";

/**
 * Nested `Result` fields for order / worklist reads (includes attachment payload).
 * Prefer {@link ORDER_ITEM_RESULT_SUMMARY_SELECT} for encounter order list reads.
 */
export const ORDER_ITEM_RESULT_LIST_SELECT: Prisma.ResultSelect = {
  id: true,
  orderItemId: true,
  facilityId: true,
  resultData: true,
  resultText: true,
  criticalValue: true,
  verifiedByUserId: true,
  verifiedAt: true,
  acknowledgedByProviderAt: true,
  acknowledgedByUserId: true,
  effectiveResultedAt: true,
  effectiveResultedAtVersion: true,
  effectiveFinalizedAt: true,
  effectiveFinalizedAtVersion: true,
  createdAt: true,
  updatedAt: true,
};

/** Encounter order list — omits heavy `resultData` blobs; use GET /orders/:id for attachments. */
export const ORDER_ITEM_RESULT_SUMMARY_SELECT: Prisma.ResultSelect = {
  id: true,
  orderItemId: true,
  facilityId: true,
  resultText: true,
  criticalValue: true,
  verifiedByUserId: true,
  verifiedAt: true,
  acknowledgedByProviderAt: true,
  acknowledgedByUserId: true,
  effectiveResultedAt: true,
  effectiveResultedAtVersion: true,
  effectiveFinalizedAt: true,
  effectiveFinalizedAtVersion: true,
  createdAt: true,
  updatedAt: true,
};

/** OrderItem lab/radiology milestone fields for department worklists. */
export const ORDER_ITEM_LAB_RAD_TIME_SELECT: Prisma.OrderItemSelect = {
  documentedCollectedAt: true,
  effectiveCollectedAt: true,
  effectiveCollectedAtVersion: true,
  documentedReceivedAt: true,
  effectiveReceivedAt: true,
  effectiveReceivedAtVersion: true,
  documentedPerformedAt: true,
  effectivePerformedAt: true,
  effectivePerformedAtVersion: true,
};
