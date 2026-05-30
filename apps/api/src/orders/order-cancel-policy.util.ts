import { ForbiddenException } from "@nestjs/common";
import { OrderItemLifecycleState, RoleCode } from "@prisma/client";

export type CancelPolicyActor = "ADMIN" | "PROVIDER" | "RN" | "LAB" | "RADIOLOGY";

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
  encounter?: {
    physicianAssignedUserId: string | null;
    nurseAssignedUserId: string | null;
  } | null;
};

const RN_ACK_CANCEL_SOURCES = new Set(["VERBAL_ORDER", "NURSING_PROTOCOL"]);

function allItemsAre(catalogItemType: string, types: string[]): boolean {
  return types.length > 0 && types.every((t) => t === catalogItemType);
}

function isOrderCreator(order: OrderCancelPolicyContext["order"], userId: string): boolean {
  return Boolean(order.orderedBy && order.orderedBy === userId);
}

function rnMayCancelOwnLine(
  order: OrderCancelPolicyContext["order"],
  lifecycleState: OrderItemLifecycleState | undefined,
  userId: string
): boolean {
  if (!isOrderCreator(order, userId)) return false;
  if (lifecycleState === OrderItemLifecycleState.ORDERED) return true;
  if (
    lifecycleState === OrderItemLifecycleState.ACKNOWLEDGED &&
    order.source != null &&
    RN_ACK_CANCEL_SOURCES.has(order.source)
  ) {
    return true;
  }
  return false;
}

function rnMayCancelEncounterNursingOrder(
  order: OrderCancelPolicyContext["order"],
  lifecycleState: OrderItemLifecycleState | undefined,
  encounter: OrderCancelPolicyContext["encounter"],
  userId: string
): boolean {
  if (encounter?.nurseAssignedUserId !== userId) return false;
  if (!order.source || !RN_ACK_CANCEL_SOURCES.has(order.source)) return false;
  if (isOrderCreator(order, userId)) return false;
  if (
    lifecycleState === OrderItemLifecycleState.IN_PROGRESS ||
    lifecycleState === OrderItemLifecycleState.COMPLETED ||
    lifecycleState === OrderItemLifecycleState.REVIEWED
  ) {
    return false;
  }
  return true;
}

/**
 * Resolves who may cancel an order or line under facility RBAC.
 * Throws {@link ForbiddenException} when no rule matches.
 */
export function resolveOrderCancelPolicyActor(
  ctx: OrderCancelPolicyContext,
  requestorRoleCodes: RoleCode[],
  userId: string
): CancelPolicyActor {
  if (
    requestorRoleCodes.includes(RoleCode.ADMIN) ||
    requestorRoleCodes.includes(RoleCode.MEDORA_SUPER_ADMIN)
  ) {
    return "ADMIN";
  }

  const { order, encounter, lifecycleState } = ctx;
  const creator = isOrderCreator(order, userId);

  if (requestorRoleCodes.includes(RoleCode.PROVIDER)) {
    if (order.type === "MEDICATION" || order.type === "CARE") {
      return "PROVIDER";
    }
    if (creator) {
      return "PROVIDER";
    }
    if (encounter?.physicianAssignedUserId === userId) {
      return "PROVIDER";
    }
  }

  if (requestorRoleCodes.includes(RoleCode.RN)) {
    if (rnMayCancelOwnLine(order, lifecycleState, userId)) {
      return "RN";
    }
    if (rnMayCancelEncounterNursingOrder(order, lifecycleState, encounter, userId)) {
      return "RN";
    }
  }

  const itemType = ctx.catalogItemType;
  const allTypes = ctx.allItemCatalogTypes ?? (itemType ? [itemType] : []);

  if (requestorRoleCodes.includes(RoleCode.LAB) && allItemsAre("LAB_TEST", allTypes)) {
    return "LAB";
  }

  if (requestorRoleCodes.includes(RoleCode.RADIOLOGY) && allItemsAre("IMAGING_STUDY", allTypes)) {
    return "RADIOLOGY";
  }

  throw new ForbiddenException("Droits insuffisants pour annuler cette ligne.");
}
