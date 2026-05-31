import { describe, expect, it } from "vitest";
import { countTrackboardOpenOrderItems, isTrackboardOpenOrderItem } from "./trackboardOpenOrderCount";

describe("isTrackboardOpenOrderItem", () => {
  it("includes ORDERED / PLACED / PENDING / ACKNOWLEDGED lines", () => {
    for (const status of ["ORDERED", "PLACED", "PENDING", "ACKNOWLEDGED"]) {
      expect(
        isTrackboardOpenOrderItem({ itemStatus: status, lifecycleState: "ORDERED", parentOrderStatus: "PLACED" })
      ).toBe(true);
    }
  });

  it("includes IN_PROGRESS lines (still actionable on the floor)", () => {
    expect(
      isTrackboardOpenOrderItem({
        itemStatus: "IN_PROGRESS",
        lifecycleState: "IN_PROGRESS",
        parentOrderStatus: "IN_PROGRESS",
      })
    ).toBe(true);
  });

  it("excludes completed, resulted, verified, reviewed, and cancelled lines", () => {
    expect(isTrackboardOpenOrderItem({ itemStatus: "COMPLETED", lifecycleState: "COMPLETED" })).toBe(false);
    expect(isTrackboardOpenOrderItem({ itemStatus: "RESULTED", lifecycleState: "COMPLETED" })).toBe(false);
    expect(isTrackboardOpenOrderItem({ itemStatus: "VERIFIED", lifecycleState: "REVIEWED" })).toBe(false);
    expect(isTrackboardOpenOrderItem({ itemStatus: "CANCELLED", lifecycleState: "CANCELLED" })).toBe(false);
    expect(
      isTrackboardOpenOrderItem({ itemStatus: "PLACED", lifecycleState: "REVIEWED", parentOrderStatus: "PLACED" })
    ).toBe(false);
  });

  it("excludes lines on cancelled parent orders", () => {
    expect(
      isTrackboardOpenOrderItem({
        itemStatus: "PLACED",
        lifecycleState: "ORDERED",
        parentOrderStatus: "CANCELLED",
      })
    ).toBe(false);
  });
});

describe("countTrackboardOpenOrderItems", () => {
  it("counts only actionable open lines across orders", () => {
    const count = countTrackboardOpenOrderItems([
      {
        status: "PLACED",
        items: [
          { status: "PLACED", lifecycleState: "ORDERED" },
          { status: "COMPLETED", lifecycleState: "COMPLETED" },
        ],
      },
      {
        status: "CANCELLED",
        items: [{ status: "PLACED", lifecycleState: "ORDERED" }],
      },
      {
        status: "IN_PROGRESS",
        items: [
          { status: "ACKNOWLEDGED", lifecycleState: "ACKNOWLEDGED" },
          { status: "RESULTED", lifecycleState: "COMPLETED" },
        ],
      },
    ]);
    expect(count).toBe(2);
  });
});
