import { describe, expect, it } from "vitest";
import {
  recurringFrequencySkipsSingleTerminalMarCompletion,
  shouldSkipOrderLineCompletionForDoseGatedMar,
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

  it("recurringFrequencySkipsSingleTerminalMarCompletion aligns with BID", () => {
    expect(recurringFrequencySkipsSingleTerminalMarCompletion("BID")).toBe(true);
    expect(recurringFrequencySkipsSingleTerminalMarCompletion("NOW")).toBe(false);
    expect(recurringFrequencySkipsSingleTerminalMarCompletion(null)).toBe(false);
  });
});
