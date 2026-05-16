import { describe, expect, it } from "vitest";
import type { ObservationOperationalSnapshot } from "@medora/shared";
import { buildObservationSummaryDraft } from "./observationSummaryDraft";

const labels = {
  draftBanner: "[DRAFT]",
  motifLabel: "Motif",
  losLabel: "LOS",
  laneProviderLabel: "MD lane",
  laneRnLabel: "RN lane",
  laneOverdue: "OVERDUE",
  laneDue: "DUE",
  laneOk: "OK",
  pendingLabel: "Pending",
  pendingNone: "None",
  pendingCount: "Pending: {count}",
  criticalLabsFlag: "CRITICAL",
  vitalsStale: "STALE",
  vitalsOk: "Vitals OK",
  extended24h: "EXT24",
};

const minimalSnap = {
  losLabel: "4h00",
  vitalsStale: false,
  extendedStay24h: true,
  flags: { criticalLabsUnacked: false },
  reassessmentLanes: {
    provider: { overdue: false, due: true },
    rnObservation: { overdue: true, due: false },
  },
} as unknown as ObservationOperationalSnapshot;

describe("buildObservationSummaryDraft", () => {
  it("includes motif, LOS, lanes, readiness lines, and pending aggregate", () => {
    const text = buildObservationSummaryDraft(minimalSnap, 2, false, "Cough", labels, {
      readinessLineLabels: ["READINESS A"],
    });
    expect(text).toContain("[DRAFT]");
    expect(text).toContain("Cough");
    expect(text).toContain("4h00");
    expect(text).toContain("DUE");
    expect(text).toContain("OVERDUE");
    expect(text).toContain("READINESS A");
    expect(text).toMatch(/Pending: 2/);
    expect(text).toContain("EXT24");
  });

  it("works without snapshot", () => {
    const text = buildObservationSummaryDraft(null, 0, true, "", labels, {});
    expect(text).toContain("CRITICAL");
  });
});
