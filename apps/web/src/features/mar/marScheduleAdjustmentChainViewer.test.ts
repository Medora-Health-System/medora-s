import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarScheduleAdjustmentChain } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marScheduleAdjustmentChainViewer", () => {
  it("builds unlimited-depth read-only chain", () => {
    const steps = buildMarScheduleAdjustmentChain({
      scheduledAt: "2026-06-03T01:00:00.000Z",
      orderedDoseSnapshotJson: {
        _marScheduleAdjustmentHistory: [
          {
            originalScheduledAt: "2026-06-03T03:00:00.000Z",
            previousScheduledAt: "2026-06-03T03:00:00.000Z",
            newScheduledAt: "2026-06-03T02:00:00.000Z",
            reasonCode: "PROVIDER_REQUEST",
            changedByUserId: "rn-1",
            changedAt: "2026-06-03T00:30:00.000Z",
          },
          {
            originalScheduledAt: "2026-06-03T03:00:00.000Z",
            previousScheduledAt: "2026-06-03T02:00:00.000Z",
            newScheduledAt: "2026-06-03T01:00:00.000Z",
            reasonCode: "PATIENT_SLEEPING",
            changedByUserId: "rn-1",
            changedAt: "2026-06-03T00:47:00.000Z",
          },
        ],
      },
      administeredAt: "2026-06-03T01:03:00.000Z",
    });
    expect(steps).toHaveLength(4);
    expect(steps[0].kind).toBe("ORIGINAL_SCHEDULED");
    expect(steps[1].kind).toBe("RESCHEDULED");
    expect(steps[2].kind).toBe("RESCHEDULED");
    expect(steps[3].kind).toBe("ADMINISTERED");
  });

  it("wires chain viewer into MAR drawer", () => {
    const drawerSrc = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    const viewerSrc = readSrc("components/mar/MedicationScheduleAdjustmentChainViewer.tsx");
    expect(drawerSrc).toContain("MedicationScheduleAdjustmentChainViewer");
    expect(drawerSrc).toContain("scheduleAdjustmentChain");
    expect(viewerSrc).toContain('data-testid="mar-schedule-adjustment-chain-viewer"');
    expect(viewerSrc).toContain("marReschedule.chain");
  });

  it("exposes analytics reschedule projection support", () => {
    const analyticsSrc = readFileSync(
      join(webSrcRoot, "../../../packages/shared/src/mar/marAnalyticsScheduleReschedule.ts"),
      "utf8"
    );
    expect(analyticsSrc).toContain("rescheduledDoseCount");
    expect(analyticsSrc).toContain("earlyRescheduleCount");
    expect(analyticsSrc).toContain("lateRescheduleCount");
    expect(analyticsSrc).toContain("highRiskRescheduleCount");
    expect(analyticsSrc).toContain("rescheduleRate");
  });
});
