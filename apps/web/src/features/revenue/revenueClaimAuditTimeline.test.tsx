import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  sortTimelineEntriesNewestFirst,
} from "@/features/revenue/RevenueClaimAuditTimeline";
import type { RevenueClaimAuditTimelineEntry } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const entries: RevenueClaimAuditTimelineEntry[] = [
  {
    at: "2026-06-01T10:00:00.000Z",
    phase: "CLAIM_CREATED",
    label: "Claim Created",
    source: "submission",
    detail: null,
  },
  {
    at: "2026-06-02T09:00:00.000Z",
    phase: "SENT",
    label: "Sent (MANUAL)",
    source: "attempt",
    detail: null,
  },
  {
    at: "2026-06-02T11:00:00.000Z",
    phase: "ACKNOWLEDGMENT",
    label: "277CA · CLAIM_REJECTED",
    source: "acknowledgment",
    detail: "Subscriber mismatch",
  },
];

describe("revenueClaimAuditTimeline (MEDUI.ADMIN.REVENUE.4)", () => {
  it("sorts entries newest first", () => {
    const sorted = sortTimelineEntriesNewestFirst(entries);
    expect(sorted[0]!.phase).toBe("ACKNOWLEDGMENT");
    expect(sorted[sorted.length - 1]!.phase).toBe("CLAIM_CREATED");
  });

  it("renders timeline test id and phase rows", () => {
    const timeline = readWebFile("src/features/revenue/RevenueClaimAuditTimeline.tsx");
    expect(timeline).toContain('data-testid="revenue-claim-audit-timeline"');
    expect(timeline).toContain("revenue-claim-audit-timeline-row-");
    expect(timeline).toContain("revenueClaimAudit.timeline.phases.");
  });

  it("shows empty state copy", () => {
    const timeline = readWebFile("src/features/revenue/RevenueClaimAuditTimeline.tsx");
    expect(timeline).toContain("revenueClaimAudit.timeline.empty");
  });

  it("renders detail text in timeline rows", () => {
    const timeline = readWebFile("src/features/revenue/RevenueClaimAuditTimeline.tsx");
    expect(timeline).toContain("entry.detail");
    expect(timeline).toContain("formatEncounterChromeDateTime");
  });

  it("exports sort helper for newest-first chronology", () => {
    const sorted = sortTimelineEntriesNewestFirst(entries);
    expect(sorted.map((entry) => entry.phase)).toEqual([
      "ACKNOWLEDGMENT",
      "SENT",
      "CLAIM_CREATED",
    ]);
  });
});
