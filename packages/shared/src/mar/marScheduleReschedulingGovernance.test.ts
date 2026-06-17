import { describe, expect, it } from "vitest";
import {
  MAR_RESCHEDULE_REASON_CODES,
  buildMarRescheduleSummary,
  isMarRescheduleReasonCode,
  resolveMarRescheduleReasonLabel,
  resolveMarRescheduleReasonLabelKey,
  validateMarRescheduleGovernance,
} from "./marScheduleReschedulingGovernance.js";

describe("marScheduleReschedulingGovernance", () => {
  it("accepts enterprise reason codes", () => {
    for (const code of MAR_RESCHEDULE_REASON_CODES) {
      expect(isMarRescheduleReasonCode(code)).toBe(true);
    }
  });

  it("accepts legacy H9 reason codes for backward compatibility", () => {
    expect(isMarRescheduleReasonCode("PROVIDER_INSTRUCTION")).toBe(true);
    expect(isMarRescheduleReasonCode("EARLY_ADMINISTRATION")).toBe(true);
  });

  it("resolves EN/FR labels", () => {
    expect(resolveMarRescheduleReasonLabel("PATIENT_SLEEPING", "en")).toBe("Patient sleeping");
    expect(resolveMarRescheduleReasonLabel("PATIENT_SLEEPING", "fr")).toBe("Patient endormi");
  });

  it("resolves i18n label keys", () => {
    expect(resolveMarRescheduleReasonLabelKey("PATIENT_REQUEST")).toBe(
      "marTimingOverride.reason.PATIENT_REQUEST"
    );
    expect(resolveMarRescheduleReasonLabelKey("PROVIDER_INSTRUCTION")).toBe(
      "marTimingOverride.reason.PROVIDER_REQUEST"
    );
    expect(resolveMarRescheduleReasonLabelKey("PROCEDURE_TIMING")).toBe(
      "marTimingOverride.reason.PROCEDURE_SCHEDULE"
    );
  });

  it("builds structured reschedule summary", () => {
    const summary = buildMarRescheduleSummary({
      originalScheduledAt: "2026-06-03T03:00:00.000Z",
      previousScheduledAt: "2026-06-03T03:00:00.000Z",
      newScheduledAt: "2026-06-03T01:00:00.000Z",
      reasonCode: "PATIENT_SLEEPING",
      reasonDetail: null,
      changedByDisplay: "Elizabeth Posada",
      changedAt: "2026-06-03T00:47:00.000Z",
      riskSeverity: "MODERATE",
    });
    expect(summary).toContain("SCHEDULE_TIME_CHANGED");
    expect(summary).toContain("original=2026-06-03T03:00:00.000Z");
    expect(summary).toContain("new=2026-06-03T01:00:00.000Z");
    expect(summary).toContain("risk=MODERATE");
  });

  it("requires OTHER detail", () => {
    expect(validateMarRescheduleGovernance({ reasonCode: "OTHER" }).ok).toBe(false);
    expect(
      validateMarRescheduleGovernance({ reasonCode: "OTHER", otherText: "Clinic delay" }).ok
    ).toBe(true);
  });
});
