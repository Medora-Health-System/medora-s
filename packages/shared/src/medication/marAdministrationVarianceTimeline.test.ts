import { describe, expect, it } from "vitest";
import { buildMarAdministrationVarianceTimelineProjection } from "./marAdministrationVarianceTimeline.js";

describe("marAdministrationVarianceTimeline", () => {
  it("returns no projection when dose not administered", () => {
    const projection = buildMarAdministrationVarianceTimelineProjection({
      scheduledAt: "2026-06-03T23:00:00.000Z",
      administeredAt: null,
    });
    expect(projection.hasVariance).toBe(false);
    expect(projection.badgeLabel).toBeNull();
  });

  it("projects EARLY badge after reschedule exclusion", () => {
    const projection = buildMarAdministrationVarianceTimelineProjection({
      scheduledAt: "2026-06-03T21:00:00.000Z",
      administeredAt: "2026-06-03T19:00:00.000Z",
      orderedDoseSnapshotJson: {
        _marScheduleAdjustmentHistory: [
          {
            originalScheduledAt: "2026-06-03T23:00:00.000Z",
            previousScheduledAt: "2026-06-03T23:00:00.000Z",
            newScheduledAt: "2026-06-03T21:00:00.000Z",
          },
        ],
      },
    });
    expect(projection.badgeLabel).toBe("EARLY");
    expect(projection.varianceMinutes).toBe(-120);
  });

  it("projects ON_TIME when administered near effective schedule after reschedule", () => {
    const projection = buildMarAdministrationVarianceTimelineProjection({
      scheduledAt: "2026-06-03T21:00:00.000Z",
      administeredAt: "2026-06-03T21:05:00.000Z",
      orderedDoseSnapshotJson: {
        _marScheduleAdjustmentHistory: [
          {
            originalScheduledAt: "2026-06-03T23:00:00.000Z",
            previousScheduledAt: "2026-06-03T23:00:00.000Z",
            newScheduledAt: "2026-06-03T21:00:00.000Z",
          },
        ],
      },
    });
    expect(projection.badgeLabel).toBe("ON_TIME");
    expect(projection.varianceMinutes).toBe(5);
  });
});
