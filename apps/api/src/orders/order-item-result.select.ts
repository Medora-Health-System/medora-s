import type { Prisma } from "@prisma/client";

/**
 * Nested `Result` fields for order / worklist reads.
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
  createdAt: true,
  updatedAt: true,
};
