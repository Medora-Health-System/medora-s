import { describe, expect, it } from "vitest";
import {
  assessMarRescheduleRisk,
  resolveMarRescheduleShiftBucket,
} from "./marRescheduleRiskAssessment.js";

const TZ = "America/Port-au-Prince";

describe("marRescheduleRiskAssessment", () => {
  it("classifies LOW for ≤30 minute movement", () => {
    const risk = assessMarRescheduleRisk({
      previousScheduledAt: "2026-06-03T15:00:00.000Z",
      newScheduledAt: "2026-06-03T15:20:00.000Z",
      facilityTimeZone: TZ,
    });
    expect(risk.severity).toBe("LOW");
    expect(risk.movedMinutes).toBe(20);
    expect(risk.reviewRecommended).toBe(false);
  });

  it("classifies MODERATE for 31–120 minute movement", () => {
    const risk = assessMarRescheduleRisk({
      previousScheduledAt: "2026-06-03T15:00:00.000Z",
      newScheduledAt: "2026-06-03T16:30:00.000Z",
      facilityTimeZone: TZ,
    });
    expect(risk.severity).toBe("MODERATE");
    expect(risk.movedMinutes).toBe(90);
    expect(risk.reviewRecommended).toBe(false);
  });

  it("classifies HIGH for >120 minute movement", () => {
    const risk = assessMarRescheduleRisk({
      previousScheduledAt: "2026-06-03T15:00:00.000Z",
      newScheduledAt: "2026-06-03T18:00:00.000Z",
      facilityTimeZone: TZ,
    });
    expect(risk.severity).toBe("HIGH");
    expect(risk.reviewRecommended).toBe(true);
  });

  it("detects cross-calendar-day movement", () => {
    const risk = assessMarRescheduleRisk({
      previousScheduledAt: "2026-06-04T03:30:00.000Z",
      newScheduledAt: "2026-06-04T05:00:00.000Z",
      facilityTimeZone: TZ,
    });
    expect(risk.crossedCalendarDay).toBe(true);
    expect(risk.severity).toBe("HIGH");
  });

  it("detects cross-shift boundary movement", () => {
    const risk = assessMarRescheduleRisk({
      previousScheduledAt: "2026-06-03T22:00:00.000Z",
      newScheduledAt: "2026-06-03T23:30:00.000Z",
      facilityTimeZone: TZ,
    });
    expect(risk.crossedShiftBoundary).toBe(true);
    expect(risk.severity).toBe("HIGH");
  });
});
