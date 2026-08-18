import { ForbiddenException } from "@nestjs/common";
import { OrderItemLifecycleState, RoleCode } from "@prisma/client";
import { resolveOrderCancelPolicyActorCode, type OrderCancelPolicyActor } from "@medora/shared";

export type CancelPolicyActor = OrderCancelPolicyActor;

export type OrderCancelPolicyContext = {
  order: {
    type: string;
    orderedBy: string | null;
    source: string | null;
  };
  /** Line-level catalog type (required for LAB/RADIOLOGY line cancel). */
  catalogItemType?: string;
  /** Parent-order cancel: every line must match for dept-wide cancel authority. */
  allItemCatalogTypes?: string[];
  lifecycleState?: OrderItemLifecycleState;
  /**
   * Operational ownership assignee ids for cancel match (D4A.4.3).
   * Callers MUST pass values from `resolveOrderCancelOperationalAssignees`
   * (PRIMARY_PROVIDER / PRIMARY_RN) — not raw ED columns for OBS/IP.
   * Assignment match ≠ chart ACL / role authorization.
   */
  encounter?: {
    physicianAssignedUserId: string | null;
    nurseAssignedUserId: string | null;
  } | null;
};

/**
 * Resolves who may cancel an order or line under facility RBAC.
 * Throws {@link ForbiddenException} when no rule matches.
 */
export function resolveOrderCancelPolicyActor(
  ctx: OrderCancelPolicyContext,
  requestorRoleCodes: RoleCode[],
  userId: string
): CancelPolicyActor {
  const actor = resolveOrderCancelPolicyActorCode(
    {
      order: ctx.order,
      catalogItemType: ctx.catalogItemType,
      allItemCatalogTypes: ctx.allItemCatalogTypes,
      lifecycleState: ctx.lifecycleState,
      encounter: ctx.encounter,
    },
    requestorRoleCodes,
    userId
  );
  if (!actor) {
    throw new ForbiddenException("Droits insuffisants pour annuler cette ligne.");
  }
  return actor;
}
