import { describe, expect, it } from "vitest";
import { orderItemStatusEligibleForBillingCapture } from "./orderAcknowledgementBillingSafety.js";

describe("orderAcknowledgementBillingSafety", () => {
  it("does not treat ACKNOWLEDGED as billable completion", () => {
    expect(orderItemStatusEligibleForBillingCapture("ACKNOWLEDGED")).toBe(false);
    expect(orderItemStatusEligibleForBillingCapture("IN_PROGRESS")).toBe(false);
    expect(orderItemStatusEligibleForBillingCapture("PLACED")).toBe(false);
    expect(orderItemStatusEligibleForBillingCapture("ORDERED")).toBe(false);
    expect(orderItemStatusEligibleForBillingCapture("COMPLETED")).toBe(true);
  });

  it("ordered and acknowledged phases are never billable", () => {
    expect(orderItemStatusEligibleForBillingCapture("PENDING")).toBe(false);
    expect(orderItemStatusEligibleForBillingCapture("ACKNOWLEDGED")).toBe(false);
  });
});
