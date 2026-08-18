/**
 * Enterprise order cancel/discontinue visibility — same rules as API
 * `resolveOrderCancelPolicyActor`. Pure function; does not throw.
 */

export type OrderCancelPolicyActor = "ADMIN" | "PROVIDER" | "RN" | "LAB" | "RADIOLOGY";

export type OrderCancelPolicyContextV1 = {
  order: {
    type: string;
    orderedBy: string | null;
    source: string | null;
  };
  catalogItemType?: string;
  allItemCatalogTypes?: string[];
  lifecycleState?: string | null;
  encounter?: {
    physicianAssignedUserId: string | null;
    nurseAssignedUserId: string | null;
  } | null;
};

const RN_ACK_CANCEL_SOURCES = new Set(["VERBAL_ORDER", "NURSING_PROTOCOL"]);

function upper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function allItemsAre(catalogItemType: string, types: string[]): boolean {
  return types.length > 0 && types.every((t) => t === catalogItemType);
}

function isOrderCreator(order: OrderCancelPolicyContextV1["order"], userId: string): boolean {
  return Boolean(order.orderedBy && order.orderedBy === userId);
}

function rnMayCancelOwnLine(
  order: OrderCancelPolicyContextV1["order"],
  lifecycleState: string | null | undefined,
  userId: string
): boolean {
  if (!isOrderCreator(order, userId)) return false;
  const life = upper(lifecycleState);
  if (life === "ORDERED") return true;
  if (life === "ACKNOWLEDGED" && order.source != null && RN_ACK_CANCEL_SOURCES.has(order.source)) {
    return true;
  }
  return false;
}

function rnMayCancelEncounterNursingOrder(
  order: OrderCancelPolicyContextV1["order"],
  lifecycleState: string | null | undefined,
  encounter: OrderCancelPolicyContextV1["encounter"],
  userId: string
): boolean {
  if (encounter?.nurseAssignedUserId !== userId) return false;
  if (!order.source || !RN_ACK_CANCEL_SOURCES.has(order.source)) return false;
  if (isOrderCreator(order, userId)) return false;
  const life = upper(lifecycleState);
  if (life === "IN_PROGRESS" || life === "COMPLETED" || life === "REVIEWED") return false;
  return true;
}

function roleSet(roles: readonly string[]): Set<string> {
  return new Set(roles.map((r) => String(r ?? "").trim().toUpperCase()));
}

/**
 * Returns the cancel actor when the requestor may cancel, otherwise null.
 * API wraps this and throws ForbiddenException.
 */
export function resolveOrderCancelPolicyActorCode(
  ctx: OrderCancelPolicyContextV1,
  requestorRoleCodes: readonly string[],
  userId: string
): OrderCancelPolicyActor | null {
  const roles = roleSet(requestorRoleCodes);
  if (roles.has("ADMIN") || roles.has("MEDORA_SUPER_ADMIN")) {
    return "ADMIN";
  }

  const { order, encounter, lifecycleState } = ctx;
  const creator = isOrderCreator(order, userId);

  if (roles.has("PROVIDER")) {
    if (order.type === "MEDICATION" || order.type === "CARE") {
      return "PROVIDER";
    }
    if (creator) return "PROVIDER";
    if (encounter?.physicianAssignedUserId === userId) return "PROVIDER";
  }

  if (roles.has("RN")) {
    if (rnMayCancelOwnLine(order, lifecycleState, userId)) return "RN";
    if (rnMayCancelEncounterNursingOrder(order, lifecycleState, encounter, userId)) return "RN";
  }

  const itemType = ctx.catalogItemType;
  const allTypes = ctx.allItemCatalogTypes ?? (itemType ? [itemType] : []);

  if (roles.has("LAB") && allItemsAre("LAB_TEST", allTypes)) return "LAB";
  if (roles.has("RADIOLOGY") && allItemsAre("IMAGING_STUDY", allTypes)) return "RADIOLOGY";

  return null;
}

export function orderCancelPolicyAllowsRequestor(
  ctx: OrderCancelPolicyContextV1,
  requestorRoleCodes: readonly string[],
  userId: string
): boolean {
  return resolveOrderCancelPolicyActorCode(ctx, requestorRoleCodes, userId) != null;
}
