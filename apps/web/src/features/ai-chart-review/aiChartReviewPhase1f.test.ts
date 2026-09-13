import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(join(__dirname, "AiChartReviewPanel.tsx"), "utf8");

describe("Medora AI Phase 1F chart review", () => {
  it("auto-refreshes only while the chart is active and cancels stale requests", () => {
    expect(panel).toContain("AUTO_REFRESH_MS = 30_000");
    expect(panel).toContain('document.visibilityState === "visible"');
    expect(panel).toContain("AbortController");
    expect(panel).toContain("requestSequence.current");
  });

  it("submits structured helpful/not-helpful feedback without free text", () => {
    expect(panel).toContain('/feedback`');
    expect(panel).toContain('"HELPFUL"');
    expect(panel).toContain('"NOT_HELPFUL"');
    expect(panel).toContain("suggestionId: suggestion.id");
    expect(panel).toContain("snapshotVersion: suggestion.snapshotVersion");
    expect(panel).not.toContain("feedbackComment");
  });

  it("keeps the panel read-only and coding intelligence inactive", () => {
    expect(panel).toContain('data-read-only="true"');
    expect(panel).toContain("Medora AI does not modify the chart or place orders");
    expect(panel).toContain("Coding & Medical Necessity intelligence is not active in Phase 1D");
    expect(panel).not.toContain('actionType === "ACKNOWLEDGE"');
    expect(panel).not.toContain('actionType === "DISMISS"');
  });
});
