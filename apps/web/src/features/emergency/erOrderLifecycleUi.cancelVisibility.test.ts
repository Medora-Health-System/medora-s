import { describe, expect, it } from "vitest";
import {
  isOrderLineCancelableByStateForEr,
  isOrderItemCancellableLineForEr,
} from "./erOrderLifecycleUi";

describe("isOrderLineCancelableByStateForEr", () => {
  it("allows ORDERED lab line with PLACED status", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "ORDERED",
        status: "PLACED",
        catalogItemType: "LAB_TEST",
      })
    ).toBe(true);
  });

  it("allows ACKNOWLEDGED line", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "ACKNOWLEDGED",
        status: "ACKNOWLEDGED",
      })
    ).toBe(true);
  });

  it("allows legacy PLACED rows without lifecycleState", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        status: "PLACED",
        catalogItemType: "LAB_TEST",
      })
    ).toBe(true);
  });

  it("blocks IN_PROGRESS", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "IN_PROGRESS",
        status: "IN_PROGRESS",
      })
    ).toBe(false);
  });

  it("blocks COMPLETED", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "COMPLETED",
        status: "COMPLETED",
      })
    ).toBe(false);
  });

  it("blocks RESULTED", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "COMPLETED",
        status: "RESULTED",
      })
    ).toBe(false);
  });

  it("blocks REVIEWED", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "REVIEWED",
        status: "VERIFIED",
      })
    ).toBe(false);
  });

  it("blocks CANCELLED", () => {
    expect(
      isOrderLineCancelableByStateForEr({
        lifecycleState: "CANCELLED",
        status: "CANCELLED",
      })
    ).toBe(false);
  });
});

describe("isOrderItemCancellableLineForEr vs cancel state guard", () => {
  it("IN_PROGRESS remains active for dashboard but not for cancel ×", () => {
    const item = { lifecycleState: "IN_PROGRESS", status: "IN_PROGRESS" };
    expect(isOrderItemCancellableLineForEr(item)).toBe(true);
    expect(isOrderLineCancelableByStateForEr(item)).toBe(false);
  });
});
