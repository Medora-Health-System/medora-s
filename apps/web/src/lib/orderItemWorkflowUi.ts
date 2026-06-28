import {
  nextOrderItemStatusAfterLifecycleAction,
  type OrderItemLifecycleAction,
} from "@medora/shared";

/** Shared UI helpers for order line acknowledge / start / complete actions. */

export type OrderItemLifecycleWorkflowAction = OrderItemLifecycleAction;

export function orderItemWorkflowPendingKey(
  itemId: string,
  action: OrderItemLifecycleWorkflowAction
): string {
  return `${itemId}:${action}`;
}

export function nextOrderItemStatusAfterWorkflowAction(
  action: OrderItemLifecycleWorkflowAction
): string {
  return nextOrderItemStatusAfterLifecycleAction(action);
}

export function isOrderItemWorkflowPending(
  pendingKey: string | null | undefined,
  itemId: string,
  action: OrderItemLifecycleWorkflowAction
): boolean {
  return pendingKey === orderItemWorkflowPendingKey(itemId, action);
}

export function isOrderItemAnyWorkflowPending(
  pendingKey: string | null | undefined,
  itemId: string
): boolean {
  if (!pendingKey) return false;
  return pendingKey.startsWith(`${itemId}:`);
}

export function patchOrderItemStatusInOrdersRaw(
  orders: unknown[] | null,
  itemId: string,
  nextStatus: string
): unknown[] | null {
  if (!Array.isArray(orders)) return orders;
  return orders.map((order) => {
    if (!order || typeof order !== "object") return order;
    const o = order as Record<string, unknown>;
    if (!Array.isArray(o.items)) return order;
    return {
      ...o,
      items: o.items.map((item) => {
        if (!item || typeof item !== "object") return item;
        const row = item as Record<string, unknown>;
        if (String(row.id ?? "") !== itemId) return item;
        return { ...row, status: nextStatus };
      }),
    };
  });
}

export function patchOrderItemStatusInSingleOrder(
  order: unknown,
  itemId: string,
  nextStatus: string
): unknown {
  if (!order || typeof order !== "object") return order;
  const o = order as Record<string, unknown>;
  if (!Array.isArray(o.items)) return order;
  return {
    ...o,
    items: o.items.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      if (String(row.id ?? "") !== itemId) return item;
      return { ...row, status: nextStatus };
    }),
  };
}

export function patchOrderItemStatusInWorklistQueue(
  queue: unknown[],
  itemId: string,
  nextStatus: string
): unknown[] {
  return queue.map((entry) => patchOrderItemStatusInSingleOrder(entry, itemId, nextStatus));
}

export const ER_ORDER_ITEM_WORKFLOW_BUSY_LABEL_KEY: Record<OrderItemLifecycleWorkflowAction, string> = {
  acknowledge: "erEmergencyOrders.acknowledgingOrder",
  start: "erEmergencyOrders.startingOrder",
  complete: "erEmergencyOrders.completingOrder",
};

export const WORKLIST_WORKFLOW_BUSY_LABEL_KEY: Record<OrderItemLifecycleWorkflowAction, string> = {
  acknowledge: "worklistDepartments.shared.acknowledging",
  start: "worklistDepartments.shared.starting",
  complete: "worklistDepartments.shared.completing",
};

export const ORDER_DETAIL_WORKFLOW_BUSY_LABEL_KEY: Record<OrderItemLifecycleWorkflowAction, string> = {
  acknowledge: "orderDetail.acknowledging",
  start: "orderDetail.starting",
  complete: "orderDetail.completing",
};

export function workflowActionFailureMessageKey(
  action: OrderItemLifecycleWorkflowAction,
  context: "worklist" | "orderDetail" | "er"
): string {
  if (context === "worklist") {
    if (action === "acknowledge") return "worklistDepartments.shared.worklistActionAckFailed";
    if (action === "start") return "worklistDepartments.shared.worklistActionStartFailed";
    return "worklistDepartments.shared.worklistActionCompleteFailed";
  }
  if (context === "orderDetail") {
    if (action === "acknowledge") return "orderDetail.acknowledgeFailed";
    return "orderDetail.actionFailed";
  }
  return "erEmergencyOrders.lineActionFailed";
}
