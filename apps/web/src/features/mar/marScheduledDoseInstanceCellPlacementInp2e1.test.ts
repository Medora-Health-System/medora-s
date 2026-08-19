import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarShiftTimelineCompletionSummary } from "@medora/shared";

const repoRoot = join(import.meta.dirname, "../../../../../");

describe("MEDUI.INP.2E.1 scheduled dose instance cell placement", () => {
  it("timeline service keys scheduled dose cells from planned scheduledAt, not clinical time", () => {
    const service = readFileSync(
      join(repoRoot, "apps/api/src/medication-dose/mar-shift-timeline.service.ts"),
      "utf8"
    );
    expect(service).toContain("resolveMarScheduledDoseInstanceShiftCellInstant");
    expect(service).toContain("scheduledAt: cellPlacementInstant");
    expect(service).not.toMatch(/doseOverlapsMarShiftTimelineWindow\(\{[\s\S]*scheduledAt: placementInstant/);
  });

  it("completed scheduled cell still displays actual administration time", () => {
    const summary = buildMarShiftTimelineCompletionSummary({
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "COMPLETED",
      startedAt: null,
      startedByInitials: null,
      stoppedAt: null,
      stoppedByInitials: null,
      administeredAt: "2026-06-11T00:15:00.000Z",
      administeredByInitials: "MC",
      facilityTimeZone: "UTC",
    });
    expect(summary).toContain("00:15");
    expect(summary).toContain("MC");
  });
});
