import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EdEncounterLifecycleState, ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import {
  resolveActiveTrackboardEncounters,
  resolveEdIncompleteChartBadgeKeys,
  resolveIncompleteChartsEncounters,
} from "./edIncompleteChartsFilter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readyForClosureRow(id: string) {
  return {
    id,
    status: "OPEN",
    type: "EMERGENCY",
    chiefComplaint: "Pain",
    providerNote: "Note",
    providerDocumentationStatus: "SIGNED",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return if worse",
      followUp: "PCP in 2 days",
    },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
    dispositionSafetyReadiness: { canClose: true },
  };
}

describe("edIncompleteChartsCertification (MEDUI.ED.LIFECYCLE.6)", () => {
  it("Incomplete Charts shows certification badges", () => {
    const filter = readSrc("features/emergency/edIncompleteChartsFilter.ts");
    expect(filter).toContain("resolveEdIncompleteChartBadgeKeys");
    expect(filter).toContain("buildEdClosedEncounterCertification");
  });

  it("Ready For Closure appears in Incomplete Charts workspace", () => {
    const rows = [readyForClosureRow("r1")];
    expect(resolveIncompleteChartsEncounters(rows).map((r) => r.id)).toEqual(["r1"]);
    const badges = resolveEdIncompleteChartBadgeKeys(rows[0]!);
    expect(badges).toContain("edLifecycle.incompleteCharts.badge.readyForClosure");
  });

  it("Trackboard still excludes departed incomplete and ready-for-closure encounters", () => {
    const rows = [readyForClosureRow("r1")];
    expect(resolveActiveTrackboardEncounters(rows)).toEqual([]);
    expect(
      resolveIncompleteChartsEncounters(rows)[0] &&
        resolveEdIncompleteChartBadgeKeys(rows[0]!).length
    ).toBeGreaterThan(0);
  });

  it("certification review panel is wired on incomplete charts cards", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("EdClosedEncounterCertificationPanel");
    expect(trackboard).toContain('boardViewMode === "incompleteCharts"');
    expect(trackboard).toContain("ed-certification-review-");
  });
});
