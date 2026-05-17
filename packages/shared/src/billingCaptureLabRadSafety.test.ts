import { describe, expect, it } from "vitest";
import { buildOrderItemCandidate } from "./billingCaptureV1.js";

describe("billingCapture lab/radiology effective time safety", () => {
  it("buildOrderItemCandidate uses completedAtIso only, not effective clinical overlays", () => {
    const documentedCompleted = "2026-05-16T14:00:00.000Z";
    const item = buildOrderItemCandidate({
      orderItemId: "oi-1",
      orderId: "ord-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      orderType: "LAB",
      catalogItemType: "LAB_TEST",
      completedAtIso: documentedCompleted,
    });
    expect(item.serviceDate).toBe(documentedCompleted);
    expect(item.serviceDate).not.toBe("2026-05-16T13:00:00.000Z");
  });
});
