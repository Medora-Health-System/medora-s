import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  encounterRowsSnapshot,
  shouldReplaceEncounterRows,
} from "./edTrackboardSilentRefresh";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edTrackboardSilentRefresh (MEDUI.ED.LIFECYCLE.5B)", () => {
  it("does not replace rows when snapshot is equivalent", () => {
    const prev = [
      { id: "a", updatedAt: "2026-06-03T10:00:00.000Z" },
      { id: "b", updatedAt: "2026-06-03T11:00:00.000Z" },
    ];
    const next = [
      { id: "b", updatedAt: "2026-06-03T11:00:00.000Z" },
      { id: "a", updatedAt: "2026-06-03T10:00:00.000Z" },
    ];
    expect(encounterRowsSnapshot(prev)).toBe(encounterRowsSnapshot(next));
    expect(shouldReplaceEncounterRows(prev, next)).toBe(false);
  });

  it("replaces rows when updatedAt changes", () => {
    const prev = [{ id: "a", updatedAt: "2026-06-03T10:00:00.000Z" }];
    const next = [{ id: "a", updatedAt: "2026-06-03T10:05:00.000Z" }];
    expect(shouldReplaceEncounterRows(prev, next)).toBe(true);
  });

  it("silent refresh does not clear existing rows before fetch completes", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("setRows([])");
    expect(loadBlock).toContain("shouldReplaceEncounterRows");
  });

  it("automatic polling uses silent refresh without refresh indicator", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("void loadEncounters({ silent: true })");
    expect(trackboard).not.toMatch(/setInterval[\s\S]{0,120}showRefreshIndicator:\s*true/);
  });

  it("manual refresh may show refresh indicator after initial load", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("showRefreshIndicator: hasLoadedOnceRef.current");
  });

  it("silent refresh failure keeps existing rows and shows non-blocking error", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("setSilentRefreshError(true)");
    expect(trackboard).toContain('data-testid="ed-trackboard-silent-refresh-error"');
    expect(trackboard).toContain("silentRefreshError && rows.length > 0");
  });

  it("initial load only shows skeleton when rows are empty", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("isInitialLoading && rows.length === 0");
  });
});
