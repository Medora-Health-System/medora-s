import { OrderItemLifecycleState, OrderStatus } from "@prisma/client";
import {
  assertValidOrderItemLifecycleTransition,
  applyLifecycleWithStatus,
  nextLifecycleForOrderStatus,
} from "./order-item-lifecycle.machine";

describe("order-item-lifecycle.machine", () => {
  it("maps statuses to lifecycle targets", () => {
    expect(nextLifecycleForOrderStatus(OrderStatus.VERIFIED)).toBe(OrderItemLifecycleState.REVIEWED);
    expect(nextLifecycleForOrderStatus(OrderStatus.RESULTED)).toBe(OrderItemLifecycleState.COMPLETED);
    expect(nextLifecycleForOrderStatus(OrderStatus.PLACED)).toBe(OrderItemLifecycleState.ORDERED);
  });

  it("allows ORDERED → IN_PROGRESS (queue shortcut)", () => {
    expect(() =>
      applyLifecycleWithStatus(OrderItemLifecycleState.ORDERED, OrderStatus.IN_PROGRESS)
    ).not.toThrow();
  });

  it("allows COMPLETED → REVIEWED via VERIFIED", () => {
    expect(() =>
      applyLifecycleWithStatus(OrderItemLifecycleState.COMPLETED, OrderStatus.VERIFIED)
    ).not.toThrow();
  });

  it("rejects REVIEWED → ORDERED", () => {
    expect(() =>
      assertValidOrderItemLifecycleTransition(
        OrderItemLifecycleState.REVIEWED,
        OrderItemLifecycleState.ORDERED
      )
    ).toThrow();
  });
});
