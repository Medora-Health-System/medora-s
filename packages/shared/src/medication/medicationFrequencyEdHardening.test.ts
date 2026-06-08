import { describe, expect, it } from "vitest";
import {
  MEDICATION_FREQUENCY_DIRECT_MAR_CODES,
  MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES,
  MEDICATION_FREQUENCY_INFUSION_ISOLATED_CODES,
  MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
  assertMedicationFrequencyEdHardeningPartition,
  isDirectMarFrequency,
  isFutureSchedulingFrequency,
  isInfusionIsolatedFrequency,
  medicationFrequencyMustBypassScheduleExpansion,
  medicationSchedulingFeatureFlagsEnabled,
  orderLineCompletesOnTerminalMarForFrequency,
  resolveMedicationScheduleExpansionGate,
} from "./medicationFrequencyEdHardening.js";

describe("medicationFrequencyEdHardening (M1.8B.6A)", () => {
  it("partitions all catalog codes across direct / future / infusion groups", () => {
    expect(() => assertMedicationFrequencyEdHardeningPartition()).not.toThrow();
    expect(MEDICATION_FREQUENCY_DIRECT_MAR_CODES).toEqual(["NOW", "STAT", "ONCE"]);
    expect(MEDICATION_FREQUENCY_INFUSION_ISOLATED_CODES).toEqual(["CONTINUOUS"]);
    expect(MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES).toContain("BID");
    expect(MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES).toContain("ACHS");
  });

  it("NOW STAT ONCE never allow schedule expansion", () => {
    for (const code of MEDICATION_FREQUENCY_DIRECT_MAR_CODES) {
      expect(isDirectMarFrequency(code)).toBe(true);
      expect(medicationFrequencyMustBypassScheduleExpansion(code)).toBe(true);
      const gate = resolveMedicationScheduleExpansionGate({
        frequencyCode: code,
        featureFlags: {
          MEDICATION_SCHEDULING_V1: true,
          MEDICATION_DOSE_INSTANCES: true,
          HOSPITAL_EMAR: true,
        },
      });
      expect(gate.scheduleExpansionAllowed).toBe(false);
      expect(gate.architecturePath).toBe("DIRECT_MAR");
      expect(gate.gateReason).toBe("DIRECT_MAR_FREQUENCY_NEVER_SCHEDULES");
    }
  });

  it("legacy orders without frequencyCode stay on direct MAR path", () => {
    const gate = resolveMedicationScheduleExpansionGate({
      frequencyCode: null,
      featureFlags: { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true },
    });
    expect(gate.scheduleExpansionAllowed).toBe(false);
    expect(gate.architecturePath).toBe("LEGACY_DIRECT_MAR");
  });

  it("hospital frequencies blocked when scheduling flags default OFF", () => {
    for (const code of ["BID", "Q6H", "ACHS"] as const) {
      const gate = resolveMedicationScheduleExpansionGate({
        frequencyCode: code,
        featureFlags: MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
      });
      expect(gate.scheduleExpansionAllowed).toBe(false);
      expect(gate.architecturePath).toBe("LEGACY_DIRECT_MAR");
      expect(gate.gateReason).toBe("SCHEDULING_FEATURE_FLAGS_OFF");
    }
  });

  it("hospital frequencies allowed only when both scheduling flags ON", () => {
    expect(medicationSchedulingFeatureFlagsEnabled(MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF)).toBe(
      false
    );
    expect(
      medicationSchedulingFeatureFlagsEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: false,
      })
    ).toBe(false);
    expect(
      medicationSchedulingFeatureFlagsEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: true,
      })
    ).toBe(true);

    const gate = resolveMedicationScheduleExpansionGate({
      frequencyCode: "BID",
      featureFlags: { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true },
    });
    expect(gate.scheduleExpansionAllowed).toBe(true);
    expect(gate.architecturePath).toBe("FUTURE_SCHEDULE");
  });

  it("CONTINUOUS bypasses dose instances and uses infusion lifecycle path", () => {
    expect(isInfusionIsolatedFrequency("CONTINUOUS")).toBe(true);
    expect(medicationFrequencyMustBypassScheduleExpansion("CONTINUOUS")).toBe(true);
    const gate = resolveMedicationScheduleExpansionGate({
      frequencyCode: "CONTINUOUS",
      featureFlags: { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true },
    });
    expect(gate.scheduleExpansionAllowed).toBe(false);
    expect(gate.architecturePath).toBe("INFUSION_LIFECYCLE");
    expect(orderLineCompletesOnTerminalMarForFrequency("CONTINUOUS")).toBe(false);
  });

  it("direct MAR frequencies preserve order-line completion on terminal MAR", () => {
    for (const code of MEDICATION_FREQUENCY_DIRECT_MAR_CODES) {
      expect(orderLineCompletesOnTerminalMarForFrequency(code)).toBe(true);
    }
  });

  it("classifies future scheduling codes including PRN and TAPER", () => {
    expect(isFutureSchedulingFrequency("PRN")).toBe(true);
    expect(isFutureSchedulingFrequency("TAPER")).toBe(true);
    expect(isFutureSchedulingFrequency("NOW")).toBe(false);
  });
});
