import { describe, expect, it } from "vitest";
import {
  dispositionDecisionMsFromEncounterFields,
  formatDurationMsAsHhMm,
  parseIsoMs,
  reassessmentDue,
} from "./erTrackboardOperationalBadges";

describe("formatDurationMsAsHhMm — Phase 10B", () => {
  it("zero-pads hours and minutes", () => {
    expect(formatDurationMsAsHhMm(47 * 60 * 1000)).toBe("00h47");
    expect(formatDurationMsAsHhMm((3 * 60 + 12) * 60 * 1000)).toBe("03h12");
  });
});

describe("dispositionDecisionMsFromEncounterFields", () => {
  it("returns the earlier of two anchors when both exist", () => {
    const a = new Date("2026-05-10T12:00:00.000Z").getTime();
    const b = new Date("2026-05-10T11:00:00.000Z").getTime();
    expect(dispositionDecisionMsFromEncounterFields({ admittedAtMs: a, firstDispositionDocMs: b })).toBe(b);
  });
});

describe("reassessmentDue", () => {
  const created = new Date("2026-05-10T08:00:00.000Z").getTime();

  it("uses 1h threshold when ESI ≤ 2", () => {
    const last = new Date("2026-05-10T08:30:00.000Z").getTime();
    const now = new Date("2026-05-10T09:31:00.000Z").getTime();
    expect(
      reassessmentDue({
        nowMs: now,
        encounterCreatedMs: created,
        triageCompleteMs: null,
        lastReassessmentMs: last,
        esi: 2,
      })
    ).toBe(true);
  });

  it("uses 2h threshold when ESI is absent", () => {
    const last = new Date("2026-05-10T08:30:00.000Z").getTime();
    const now = new Date("2026-05-10T10:31:00.000Z").getTime();
    expect(
      reassessmentDue({
        nowMs: now,
        encounterCreatedMs: created,
        triageCompleteMs: null,
        lastReassessmentMs: last,
        esi: null,
      })
    ).toBe(true);
  });

  it("is false before threshold from last reassessment", () => {
    const last = new Date("2026-05-10T09:00:00.000Z").getTime();
    const now = new Date("2026-05-10T10:30:00.000Z").getTime();
    expect(
      reassessmentDue({
        nowMs: now,
        encounterCreatedMs: created,
        triageCompleteMs: null,
        lastReassessmentMs: last,
        esi: null,
      })
    ).toBe(false);
  });
});

describe("parseIsoMs", () => {
  it("returns null for empty input", () => {
    expect(parseIsoMs(null)).toBeNull();
    expect(parseIsoMs("")).toBeNull();
  });
});
