import { describe, expect, it } from "vitest";
import {
  isMedicationDoseMarActionableForLifecycle,
  isMedicationOrderLifecycleMarBlocked,
  medicationOrderLifecycleAllowsEdit,
  medicationOrderLifecycleAllowsHold,
  medicationOrderLifecycleAllowsResume,
  medicationOrderLifecycleBlocksMutation,
  resolveMedicationOrderLifecycleStatus,
} from "./medicationOrderLifecycle.js";

describe("medicationOrderLifecycle", () => {
  const effective = new Date("2026-06-23T12:00:00.000Z");

  it("discontinued future doses are not actionable", () => {
    expect(
      isMedicationDoseMarActionableForLifecycle({
        lifecycleStatus: "DISCONTINUED",
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-23T14:00:00.000Z"),
        effectiveAt: effective,
        hasActiveInfusion: false,
      })
    ).toBe(false);
  });

  it("discontinued past due dose before effective time may remain actionable", () => {
    expect(
      isMedicationDoseMarActionableForLifecycle({
        lifecycleStatus: "DISCONTINUED",
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-23T11:00:00.000Z"),
        effectiveAt: effective,
        hasActiveInfusion: false,
      })
    ).toBe(true);
  });

  it("active infusion from discontinued order remains stoppable", () => {
    expect(
      isMedicationDoseMarActionableForLifecycle({
        lifecycleStatus: "DISCONTINUED",
        doseStatus: "IN_PROGRESS",
        scheduledAt: new Date("2026-06-23T14:00:00.000Z"),
        effectiveAt: effective,
        hasActiveInfusion: true,
      })
    ).toBe(true);
  });

  it("on hold suppresses MAR actions", () => {
    expect(isMedicationOrderLifecycleMarBlocked("ON_HOLD")).toBe(true);
    expect(
      isMedicationDoseMarActionableForLifecycle({
        lifecycleStatus: "ON_HOLD",
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-23T11:00:00.000Z"),
        effectiveAt: null,
        hasActiveInfusion: false,
      })
    ).toBe(false);
  });

  it("lifecycle mutation guards", () => {
    expect(medicationOrderLifecycleBlocksMutation("DISCONTINUED")).toBe(true);
    expect(medicationOrderLifecycleAllowsHold("ACTIVE")).toBe(true);
    expect(medicationOrderLifecycleAllowsResume("ON_HOLD")).toBe(true);
    expect(medicationOrderLifecycleAllowsEdit("ACTIVE")).toBe(true);
    expect(medicationOrderLifecycleAllowsEdit("DISCONTINUED")).toBe(false);
  });

  it("legacy rows default to ACTIVE", () => {
    expect(resolveMedicationOrderLifecycleStatus(null)).toBe("ACTIVE");
  });
});
