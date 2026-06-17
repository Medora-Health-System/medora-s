import { describe, expect, it } from "vitest";
import {
  appendMarDoseScheduleAdjustmentHistory,
  buildMarDoseScheduleAdjustmentAuditEntry,
  readMarDoseScheduleAdjustmentHistory,
  resolveOriginalScheduledAtFromDose,
} from "../medication/marDoseScheduleAdjustment.js";
import { normalizeMedicationAdministrationHistoryScheduleAdjustmentRow } from "./medicationAdministrationHistoryNormalization.js";

const ORIGINAL = "2026-06-03T03:00:00.000Z";
const TZ = "America/Port-au-Prince";

describe("marScheduleAdjustmentHistory", () => {
  it("preserves original scheduled time across chain", () => {
    let snapshot: Record<string, unknown> = {};
    const first = buildMarDoseScheduleAdjustmentAuditEntry({
      doseStatus: "PLANNED",
      originalScheduledAt: ORIGINAL,
      previousScheduledAt: ORIGINAL,
      newScheduledAt: "2026-06-03T02:00:00.000Z",
      reasonCode: "PROVIDER_REQUEST",
      changedByUserId: "rn-1",
      facilityTimeZone: TZ,
    });
    snapshot = appendMarDoseScheduleAdjustmentHistory(snapshot, first);
    const second = buildMarDoseScheduleAdjustmentAuditEntry({
      doseStatus: "PLANNED",
      originalScheduledAt: ORIGINAL,
      previousScheduledAt: "2026-06-03T02:00:00.000Z",
      newScheduledAt: "2026-06-03T01:00:00.000Z",
      reasonCode: "PATIENT_SLEEPING",
      changedByUserId: "rn-1",
      facilityTimeZone: TZ,
    });
    snapshot = appendMarDoseScheduleAdjustmentHistory(snapshot, second);

    const history = readMarDoseScheduleAdjustmentHistory(snapshot);
    expect(history).toHaveLength(2);
    expect(history[0].originalScheduledAt).toBe(ORIGINAL);
    expect(history[1].originalScheduledAt).toBe(ORIGINAL);
    expect(resolveOriginalScheduledAtFromDose({
      scheduledAt: "2026-06-03T01:00:00.000Z",
      orderedDoseSnapshotJson: snapshot,
    })).toBe(ORIGINAL);
  });

  it("appends without overwriting prior entries", () => {
    let snapshot: Record<string, unknown> = {};
    for (let i = 0; i < 3; i++) {
      const entry = buildMarDoseScheduleAdjustmentAuditEntry({
        doseStatus: "PLANNED",
        originalScheduledAt: ORIGINAL,
        previousScheduledAt: new Date(Date.parse(ORIGINAL) + i * 3_600_000).toISOString(),
        newScheduledAt: new Date(Date.parse(ORIGINAL) + (i + 1) * 3_600_000).toISOString(),
        reasonCode: "NURSING_WORKFLOW",
        changedByUserId: "rn-1",
        facilityTimeZone: TZ,
      });
      snapshot = appendMarDoseScheduleAdjustmentHistory(snapshot, entry);
    }
    expect(readMarDoseScheduleAdjustmentHistory(snapshot)).toHaveLength(3);
  });

  it("normalizes SCHEDULE_TIME_CHANGED history rows with risk metadata", () => {
    const row = normalizeMedicationAdministrationHistoryScheduleAdjustmentRow({
      medicationDoseInstanceId: "dose-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      medicationLabel: "Acetaminophen",
      originalScheduledAt: ORIGINAL,
      previousScheduledAt: ORIGINAL,
      newScheduledAt: "2026-06-03T01:00:00.000Z",
      reasonCode: "PATIENT_SLEEPING",
      changedAt: "2026-06-03T00:47:00.000Z",
      changedByUserId: "rn-1",
      changedByDisplay: "Elizabeth Posada RN",
      riskSeverity: "MODERATE",
      reviewRecommended: false,
    });
    expect(row.eventType).toBe("SCHEDULE_TIME_CHANGED");
    expect(row.originalScheduledAt).toBe(ORIGINAL);
    expect(row.previousScheduledAt).toBe(ORIGINAL);
    expect(row.riskSeverity).toBe("MODERATE");
    expect(row.effectiveChangeSummary).toContain("SCHEDULE_TIME_CHANGED");
  });
});
