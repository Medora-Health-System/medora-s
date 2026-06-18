import { describe, expect, it } from "vitest";
import {
  REVENUE_CYCLE_QUEUE,
  resolveRevenueCycleQueue,
} from "./revenueCycleClassification.js";

describe("revenueCycleClassification (MEDUI.ADMIN.REVENUE.1)", () => {
  it("classifies ready encounters as READY_FOR_BILLING when claim not submitted", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: true,
        codingReady: true,
        claimStatus: "NOT_SUBMITTED",
        paymentStatus: "NOT_POSTED",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.READY_FOR_BILLING);
  });

  it("classifies billing deficiencies before coding review", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: false,
        codingReady: false,
        claimStatus: "NOT_SUBMITTED",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY);
  });

  it("classifies coding review when billing ready but coding not ready", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: true,
        codingReady: false,
        claimStatus: "NOT_SUBMITTED",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.CODING_REVIEW);
  });

  it("classifies submitted unpaid claims as CLAIM_SUBMITTED", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: true,
        codingReady: true,
        claimStatus: "SUBMITTED",
        paymentStatus: "NOT_POSTED",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.CLAIM_SUBMITTED);
  });

  it("classifies posted payments as CLAIM_PAID", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: false,
        codingReady: false,
        claimStatus: "SUBMITTED",
        paymentStatus: "POSTED",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.CLAIM_PAID);
  });

  it("treats claim PAID status as CLAIM_PAID even without explicit payment status", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: true,
        codingReady: true,
        claimStatus: "PAID",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.CLAIM_PAID);
  });

  it("defaults unknown claim/payment to pre-submission queues", () => {
    expect(
      resolveRevenueCycleQueue({
        billingReady: true,
        codingReady: false,
        claimStatus: "UNKNOWN",
        paymentStatus: "UNKNOWN",
      })
    ).toBe(REVENUE_CYCLE_QUEUE.CODING_REVIEW);
  });

  it("exports all queue constants", () => {
    expect(Object.values(REVENUE_CYCLE_QUEUE)).toEqual([
      "READY_FOR_BILLING",
      "BILLING_DEFICIENCY",
      "CODING_REVIEW",
      "CLAIM_SUBMITTED",
      "CLAIM_PAID",
    ]);
  });
});
