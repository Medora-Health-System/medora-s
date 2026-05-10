import {
  DEVICE_OBSERVATION_REVIEW_DECISION_VALUES,
  DEVICE_OBSERVATION_STATUS_VALUES,
  type DeviceObservationDraft,
} from "./device-monitor.contracts";

describe("device-monitor.contracts", () => {
  it("keeps DeviceObservationStatus union stable for exhaustive switches", () => {
    expect(DEVICE_OBSERVATION_STATUS_VALUES).toEqual([
      "received",
      "parsed",
      "pending_clinical_review",
      "accepted",
      "rejected",
      "expired",
      "duplicate_suppressed",
      "failed_technical",
    ]);
  });

  it("keeps DeviceObservationReviewDecision union stable", () => {
    expect(DEVICE_OBSERVATION_REVIEW_DECISION_VALUES).toEqual([
      "ACCEPT",
      "REJECT",
      "DEFER",
      "PENDING",
    ]);
  });

  it("DeviceObservationDraft type accepts minimal draft (compile-time contract smoke)", () => {
    const d: DeviceObservationDraft = {
      sourceKind: "DEVICE",
      facilityId: "f1",
      deviceId: "d1",
      receivedAt: "2026-05-10T00:00:00.000Z",
      signalQuality: "UNKNOWN",
      matchConfidence: "UNKNOWN",
      status: "pending_clinical_review",
      measurementTypes: ["HR"],
    };
    expect(d.deviceId).toBe("d1");
  });
});
