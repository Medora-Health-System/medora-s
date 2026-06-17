import { describe, expect, it } from "vitest";
import {
  appendMarDoseScheduleAdjustmentHistory,
  buildMarDoseScheduleAdjustmentAuditEntry,
} from "./marDoseScheduleAdjustment.js";
import { buildMarScheduleAdjustmentTimelineProjection } from "./marScheduleAdjustmentTimeline.js";

const ORIGINAL = "2026-06-03T03:00:00.000Z";
const TZ = "America/Port-au-Prince";

describe("marScheduleAdjustmentTimeline", () => {
  it("returns no badge when dose was never rescheduled", () => {
    const projection = buildMarScheduleAdjustmentTimelineProjection({
      scheduledAt: ORIGINAL,
      orderedDoseSnapshotJson: {},
    });
    expect(projection.isRescheduled).toBe(false);
    expect(projection.badgeLabel).toBeNull();
  });

  it("projects RESCHEDULED badge and original/current times", () => {
    const entry = buildMarDoseScheduleAdjustmentAuditEntry({
      doseStatus: "PLANNED",
      originalScheduledAt: ORIGINAL,
      previousScheduledAt: ORIGINAL,
      newScheduledAt: "2026-06-03T01:00:00.000Z",
      reasonCode: "PATIENT_SLEEPING",
      changedByUserId: "rn-1",
      changedByDisplay: "Elizabeth Posada RN",
      facilityTimeZone: TZ,
    });
    const snapshot = appendMarDoseScheduleAdjustmentHistory({}, entry);
    const projection = buildMarScheduleAdjustmentTimelineProjection({
      scheduledAt: "2026-06-03T01:00:00.000Z",
      orderedDoseSnapshotJson: snapshot,
    });
    expect(projection.isRescheduled).toBe(true);
    expect(projection.badgeLabel).toBe("RESCHEDULED");
    expect(projection.originalScheduledAt).toBe(ORIGINAL);
    expect(projection.currentScheduledAt).toBe("2026-06-03T01:00:00.000Z");
    expect(projection.lastChangedByDisplay).toBe("Elizabeth Posada RN");
    expect(projection.lastReasonCode).toBe("PATIENT_SLEEPING");
  });
});
