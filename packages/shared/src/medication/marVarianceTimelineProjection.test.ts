import { describe, expect, it } from "vitest";
import { buildMarScheduleTimingDocumentation } from "../mar/marAdministrationSafetyGovernance.js";
import { buildMarAdministrationVarianceTimelineProjection } from "./marAdministrationVarianceTimeline.js";

describe("marVarianceTimelineProjection", () => {
  it("projects full early administration variance with reason and performer", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "CLINICAL_CONDITION",
      otherText: "Patient deteriorating",
      minutesDelta: 120,
    });
    const projection = buildMarAdministrationVarianceTimelineProjection({
      scheduledAt: "2026-06-03T23:01:00.000Z",
      administeredAt: "2026-06-03T21:00:00.000Z",
      administrationNotes: notes,
      performedByDisplay: "Jane Smith RN",
      performedAt: "2026-06-03T21:00:00.000Z",
    });
    expect(projection.classification).toBe("EARLY_ADMINISTRATION");
    expect(projection.badgeLabel).toBe("EARLY");
    expect(projection.varianceMinutes).toBe(-121);
    expect(projection.scheduledAt).toBe("2026-06-03T23:01:00.000Z");
    expect(projection.administeredAt).toBe("2026-06-03T21:00:00.000Z");
    expect(projection.reasonCode).toBe("CLINICAL_CONDITION");
    expect(projection.reasonDetail).toBeNull();
    expect(projection.performedByDisplay).toBe("Jane Smith RN");
    expect(projection.performedAt).toBe("2026-06-03T21:00:00.000Z");
    expect(projection.severity).toBe("HIGH");
    expect(projection.reviewRecommended).toBe(true);
  });

  it("projects late administration variance with reason", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "PATIENT_OFF_UNIT",
      minutesDelta: 165,
    });
    const projection = buildMarAdministrationVarianceTimelineProjection({
      scheduledAt: "2026-06-03T10:00:00.000Z",
      administeredAt: "2026-06-03T12:45:00.000Z",
      administrationNotes: notes,
      performedByDisplay: "Elizabeth Posada RN",
    });
    expect(projection.badgeLabel).toBe("LATE");
    expect(projection.reasonCode).toBe("PATIENT_OFF_UNIT");
    expect(projection.performedByDisplay).toBe("Elizabeth Posada RN");
  });

  it("projects on-time administration without reason fields", () => {
    const projection = buildMarAdministrationVarianceTimelineProjection({
      scheduledAt: "2026-06-03T21:00:00.000Z",
      administeredAt: "2026-06-03T21:05:00.000Z",
      performedByDisplay: "Nurse A",
    });
    expect(projection.badgeLabel).toBe("ON_TIME");
    expect(projection.varianceMinutes).toBe(5);
    expect(projection.reasonCode).toBeNull();
    expect(projection.reviewRecommended).toBe(false);
    expect(projection.performedByDisplay).toBe("Nurse A");
  });

  it("uses effective schedule after reschedule for variance", () => {
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
    expect(projection.scheduledAt).toBe("2026-06-03T21:00:00.000Z");
    expect(projection.varianceMinutes).toBe(-120);
  });
});
