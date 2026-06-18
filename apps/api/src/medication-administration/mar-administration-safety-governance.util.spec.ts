import { BadRequestException } from "@nestjs/common";
import {
  buildMarScheduleTimingDocumentation,
  buildMarMissedDoseDocumentation,
} from "@medora/shared";
import {
  assertMarMissedDoseGovernanceForCreate,
  assertMarScheduleTimingGovernanceForCreate,
  MAR_EARLY_ADMIN_REASON_REQUIRED,
  MAR_MISSED_REASON_REQUIRED,
} from "./mar-administration-safety-governance.util";

describe("mar-administration-safety-governance.util (K.10B.9A)", () => {
  const scheduledAt = new Date("2026-06-12T13:00:00.000Z");
  const doseInstance = {
    scheduledAt,
    dueWindowStartAt: scheduledAt,
    dueWindowEndAt: new Date("2026-06-12T14:00:00.000Z"),
  };

  it("assertMarScheduleTimingGovernanceForCreate does not block early administration", () => {
    expect(() =>
      assertMarScheduleTimingGovernanceForCreate({
        marAction: "administered",
        data: {
          administeredAt: new Date("2026-06-12T09:00:00.000Z"),
        },
        doseInstance,
        facilityTimeZone: "UTC",
      })
    ).not.toThrow();
  });

  it("assertMarScheduleTimingGovernanceForCreate accepts without timing reason", () => {
    expect(() =>
      assertMarScheduleTimingGovernanceForCreate({
        marAction: "administered",
        data: {
          administeredAt: new Date("2026-06-12T09:00:00.000Z"),
          notes: buildMarScheduleTimingDocumentation({
            kind: "early",
            reasonCode: "PROCEDURE_SCHEDULED",
            minutesDelta: 240,
          }),
        },
        doseInstance,
        facilityTimeZone: "UTC",
      })
    ).not.toThrow();
  });

  it("assertMarMissedDoseGovernanceForCreate throws MAR_MISSED_REASON_REQUIRED", () => {
    try {
      assertMarMissedDoseGovernanceForCreate({
        marAction: "not_available",
        data: { notes: "Missed:" },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: MAR_MISSED_REASON_REQUIRED,
        errorCode: MAR_MISSED_REASON_REQUIRED,
      });
    }
  });

  it("assertMarMissedDoseGovernanceForCreate accepts missedReasonCode DTO field", () => {
    expect(() =>
      assertMarMissedDoseGovernanceForCreate({
        marAction: "not_available",
        data: {
          missedReasonCode: "CLINICAL_HOLD",
          notes: buildMarMissedDoseDocumentation("CLINICAL_HOLD"),
        },
      })
    ).not.toThrow();
  });

  it("skips late timing enforcement for infusion lifecycle", () => {
    expect(() =>
      assertMarScheduleTimingGovernanceForCreate({
        marAction: "administered",
        data: {
          administeredAt: new Date("2026-06-12T16:00:00.000Z"),
        },
        doseInstance,
        facilityTimeZone: "UTC",
        skipForInfusionLifecycle: true,
      })
    ).not.toThrow();
  });
});
