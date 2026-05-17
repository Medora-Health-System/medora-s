import { describe, expect, it } from "vitest";
import { buildOrderItemCandidate } from "./billingCaptureV1.js";

describe("billingCapture order attribution safety", () => {
  it("does not set renderingProviderId from order creator", () => {
    const item = buildOrderItemCandidate({
      orderItemId: "oi-1",
      orderId: "o-1",
      encounterId: "e-1",
      patientId: "p-1",
      facilityId: "f-1",
      orderType: "LAB",
      catalogItemType: "CBC",
      completedAtIso: "2026-05-16T12:00:00.000Z",
      createdByUserId: "provider-user-id",
    });
    expect(item.createdByUserId).toBe("provider-user-id");
    expect(item.renderingProviderId).toBeUndefined();
  });
});
