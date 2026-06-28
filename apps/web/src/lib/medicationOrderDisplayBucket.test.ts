import { describe, expect, it } from "vitest";
import {
  isMedicationOrderClosedForErCompleted,
  isMedicationOrderOpenForErDashboard,
  resolveMedicationOrderDisplayBucket,
} from "@/lib/medicationOrderDisplayBucket";
import { isOrderItemActiveForErDashboard, isOrderItemCompletedForErDashboard } from "@/features/emergency/erOrderLifecycleUi";

const vancomycinQ12H = {
  id: "item-vanco",
  status: "ACKNOWLEDGED",
  frequencyCode: "Q12H",
  medicationFulfillmentIntent: "ADMINISTER_CHART",
  medicationLifecycleStatus: null as string | null,
};

describe("resolveMedicationOrderDisplayBucket", () => {
  it("Vancomycin Q12H ACTIVE after MAR completion remains Open Orders", () => {
    const withMar = {
      ...vancomycinQ12H,
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: withMar })).toBe(
      "OPEN"
    );
    expect(isOrderItemActiveForErDashboard(withMar, "MEDICATION")).toBe(true);
    expect(isOrderItemCompletedForErDashboard(withMar, "MEDICATION")).toBe(false);
  });

  it("Vancomycin Q12H DISCONTINUED after MAR completion moves to Completed bucket", () => {
    const discontinued = {
      ...vancomycinQ12H,
      medicationLifecycleStatus: "DISCONTINUED",
      medicationLifecycleAt: "2026-06-23T14:00:00.000Z",
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: discontinued })).toBe(
      "COMPLETED"
    );
    expect(isOrderItemActiveForErDashboard(discontinued, "MEDICATION")).toBe(false);
    expect(isMedicationOrderClosedForErCompleted(discontinued, "MEDICATION")).toBe(true);
  });

  it("DISCONTINUED with no MAR administration is not Open", () => {
    const discontinued = {
      ...vancomycinQ12H,
      medicationLifecycleStatus: "DISCONTINUED",
      medicationLifecycleAt: "2026-06-23T14:00:00.000Z",
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: discontinued })).toBe(
      "CANCELED_OR_DISCONTINUED"
    );
    expect(isOrderItemActiveForErDashboard(discontinued, "MEDICATION")).toBe(false);
  });

  it("ON_HOLD remains Open", () => {
    const held = { ...vancomycinQ12H, medicationLifecycleStatus: "ON_HOLD" };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: held })).toBe("OPEN");
    expect(isMedicationOrderOpenForErDashboard(held, "MEDICATION")).toBe(true);
  });

  it("PRN Q6H with COMPLETED workflow and ACTIVE lifecycle remains Open Orders", () => {
    const prnAfterMar = {
      id: "item-apap-prn",
      status: "COMPLETED",
      frequencyCode: "Q6H",
      route: "PO",
      notes: "500 mg PO q6h PRN pain",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
      medicationLifecycleStatus: null,
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: prnAfterMar })).toBe(
      "OPEN"
    );
    expect(isMedicationOrderOpenForErDashboard(prnAfterMar, "MEDICATION")).toBe(true);
  });

  it("SUPERSEDED does not remain Open", () => {
    const superseded = {
      ...vancomycinQ12H,
      medicationLifecycleStatus: "SUPERSEDED",
      medicationLifecycleAt: "2026-06-23T15:00:00.000Z",
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: superseded })).toBe(
      "SUPERSEDED"
    );
    expect(isOrderItemActiveForErDashboard(superseded, "MEDICATION")).toBe(false);
  });

  it("ACTIVE replacement order remains Open when sibling is SUPERSEDED", () => {
    const replacement = {
      id: "item-vanco-2",
      status: "ORDERED",
      medicationLifecycleStatus: "ACTIVE",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: replacement })).toBe(
      "OPEN"
    );
  });

  it("CANCELED_ENTERED_IN_ERROR is never Open", () => {
    const canceled = {
      ...vancomycinQ12H,
      medicationLifecycleStatus: "CANCELED_ENTERED_IN_ERROR",
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: canceled })).toBe(
      "CANCELED_OR_DISCONTINUED"
    );
    expect(isOrderItemActiveForErDashboard(canceled, "MEDICATION")).toBe(false);
  });

  it("EXPIRED is never Open", () => {
    const expired = { ...vancomycinQ12H, medicationLifecycleStatus: "EXPIRED" };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: expired })).toBe(
      "COMPLETED"
    );
    expect(isOrderItemActiveForErDashboard(expired, "MEDICATION")).toBe(false);
  });

  it("lifecycle COMPLETED maps to Completed bucket", () => {
    const completed = { ...vancomycinQ12H, medicationLifecycleStatus: "COMPLETED" };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: completed })).toBe(
      "COMPLETED"
    );
  });
});
