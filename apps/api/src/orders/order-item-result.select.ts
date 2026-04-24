import type { Prisma } from "@prisma/client";

/**
 * Nested `Result` fields for order / worklist reads.
 *
 * Omits `acknowledgedByUserId` so Prisma does not emit SQL for that column until migration
 * `20260423160000_result_acknowledged_by_user_id` is applied (`pnpm --filter @medora/api exec prisma migrate deploy`).
 * After migrate on all environments, add `acknowledgedByUserId: true` here so list payloads include it again.
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
  createdAt: true,
  updatedAt: true,
};
