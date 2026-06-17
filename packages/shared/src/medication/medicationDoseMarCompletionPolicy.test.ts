import { describe, expect, it } from "vitest";
import {
  shouldAllowOrderLineCompletionDespitePrnContinuity,
  shouldSkipOrderLineCompletionForDoseGatedMar,
  shouldSkipOrderLineCompletionForMar,
} from "./medicationDoseMarCompletionPolicy.js";

const flagsOn = {
  MEDICATION_SCHEDULING_V1: true,
  MEDICATION_DOSE_INSTANCES: true,
  MEDICATION_DOSE_GATED_MAR: true,
};

describe("medicationDoseMarCompletionPolicy (M1.8B.7I.1)", () => {
  it("flags OFF → never skip (legacy behavior at API layer)", () => {
    expect(
      shouldSkipOrderLineCompletionForDoseGatedMar({
        featureFlags: { ...flagsOn, MEDICATION_DOSE_GATED_MAR: false },
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: true,
      })
    ).toBe(false);
  });

  it("dose-gated path used → skip completion", () => {
    expect(
      shouldSkipOrderLineCompletionForDoseGatedMar({
        featureFlags: flagsOn,
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: true,
      })
    ).toBe(true);
  });

  it("RECURRING schedule with flags ON → skip even without explicit path flag", () => {
    expect(
      shouldSkipOrderLineCompletionForDoseGatedMar({
        featureFlags: flagsOn,
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });

  it("direct MAR frequency → do not skip when not dose-gated path", () => {
    expect(
      shouldSkipOrderLineCompletionForDoseGatedMar({
        featureFlags: flagsOn,
        frequencyCode: "NOW",
        scheduleClassification: "DIRECT_MAR",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });
});

describe("medicationDoseMarCompletionPolicy — PRN continuity (MEDUI.ED.MAR.H2)", () => {
  it("PRN frequency skips order-line completion regardless of feature flags", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "PRN",
        directionsSig: "650 mg PO q6h PRN pain",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });

  it("interval+PRN (Q6H PRN) skips order-line completion", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "Q6H",
        directionsSig: "4 mg IVP q6h PRN nausea",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });

  it("NOW one-time order still completes on terminal MAR", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "NOW",
        directionsSig: null,
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("STAT one-time order still completes on terminal MAR", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "STAT",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("scheduled BID completes when dose-gated flags are OFF", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        featureFlags: { MEDICATION_DOSE_GATED_MAR: false },
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("scheduled BID skips when dose-gated flags are ON", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        featureFlags: flagsOn,
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });

  it("allows completion when PRN quantity is exhausted", () => {
    expect(
      shouldAllowOrderLineCompletionDespitePrnContinuity({
        skipForPrnContinuity: true,
        marAction: "administered",
        prescribedQuantity: 2,
        priorAdministeredSum: 1,
        administrationIncrement: 1,
      })
    ).toBe(true);
  });

  it("does not allow completion when PRN quantity remains", () => {
    expect(
      shouldAllowOrderLineCompletionDespitePrnContinuity({
        skipForPrnContinuity: true,
        marAction: "administered",
        prescribedQuantity: 3,
        priorAdministeredSum: 1,
        administrationIncrement: 1,
      })
    ).toBe(false);
  });

  it("does not allow completion override for refused MAR", () => {
    expect(
      shouldAllowOrderLineCompletionDespitePrnContinuity({
        skipForPrnContinuity: true,
        marAction: "refused",
        prescribedQuantity: 1,
        priorAdministeredSum: 0,
        administrationIncrement: 1,
      })
    ).toBe(false);
  });
});
