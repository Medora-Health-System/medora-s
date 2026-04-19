import { BadRequestException } from "@nestjs/common";
import { OrderItemLifecycleState, OrderStatus } from "@prisma/client";

/**
 * Closed-loop line-item lifecycle. Synced with `OrderItem.status` on every write.
 * `OrderStatus` retains lab-specific values (RESULTED, VERIFIED); lifecycle compresses to COMPLETED / REVIEWED.
 */
export const ORDER_ITEM_LIFECYCLE_TRANSITIONS: Record<
  OrderItemLifecycleState,
  readonly OrderItemLifecycleState[]
> = {
  [OrderItemLifecycleState.ORDERED]: [
    OrderItemLifecycleState.ACKNOWLEDGED,
    OrderItemLifecycleState.IN_PROGRESS,
    OrderItemLifecycleState.COMPLETED,
    OrderItemLifecycleState.CANCELLED,
  ],
  [OrderItemLifecycleState.ACKNOWLEDGED]: [
    OrderItemLifecycleState.IN_PROGRESS,
    OrderItemLifecycleState.COMPLETED,
    OrderItemLifecycleState.CANCELLED,
  ],
  [OrderItemLifecycleState.IN_PROGRESS]: [
    OrderItemLifecycleState.COMPLETED,
    OrderItemLifecycleState.CANCELLED,
  ],
  [OrderItemLifecycleState.COMPLETED]: [
    OrderItemLifecycleState.REVIEWED,
    OrderItemLifecycleState.CANCELLED,
  ],
  [OrderItemLifecycleState.REVIEWED]: [],
  [OrderItemLifecycleState.CANCELLED]: [],
};

export function assertValidOrderItemLifecycleTransition(
  from: OrderItemLifecycleState,
  to: OrderItemLifecycleState
): void {
  if (from === to) {
    return;
  }
  const allowed = ORDER_ITEM_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!(allowed as OrderItemLifecycleState[]).includes(to)) {
    throw new BadRequestException(
      `Cycle de commande interdit : ${from} → ${to}.`
    );
  }
}

/**
 * Target lifecycle after a planned `OrderStatus` change (single source of truth for sync).
 */
export function nextLifecycleForOrderStatus(
  nextStatus: OrderStatus
): OrderItemLifecycleState {
  switch (nextStatus) {
    case OrderStatus.CANCELLED:
      return OrderItemLifecycleState.CANCELLED;
    case OrderStatus.ACKNOWLEDGED:
      return OrderItemLifecycleState.ACKNOWLEDGED;
    case OrderStatus.IN_PROGRESS:
      return OrderItemLifecycleState.IN_PROGRESS;
    case OrderStatus.COMPLETED:
    case OrderStatus.RESULTED:
      return OrderItemLifecycleState.COMPLETED;
    case OrderStatus.VERIFIED:
      return OrderItemLifecycleState.REVIEWED;
    case OrderStatus.PLACED:
    case OrderStatus.PENDING:
    case OrderStatus.DRAFT:
    case OrderStatus.SIGNED:
    default:
      return OrderItemLifecycleState.ORDERED;
  }
}

/** Validates and returns the new `lifecycleState` for a planned `OrderStatus` update. */
export function applyLifecycleWithStatus(
  currentLifecycle: OrderItemLifecycleState,
  nextStatus: OrderStatus
): OrderItemLifecycleState {
  const lifecycleState = nextLifecycleForOrderStatus(nextStatus);
  assertValidOrderItemLifecycleTransition(currentLifecycle, lifecycleState);
  return lifecycleState;
}
