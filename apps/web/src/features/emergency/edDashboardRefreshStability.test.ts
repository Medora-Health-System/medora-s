import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edDashboardRefreshStability (MEDUI.ED.LIFECYCLE.5B)", () => {
  it("row keys stable by encounter id", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("key={encounter.id}");
    expect(trackboard).not.toMatch(/key=\{[^}]*Math\.random/);
  });

  it("silent refresh does not reset active tab", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("setBoardViewMode");
  });

  it("silent refresh does not reset search", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("setSearch");
  });

  it("uses separate initial loading and silent refresh state", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("isInitialLoading");
    expect(trackboard).toContain("isRefreshingSilently");
    expect(trackboard).toContain("hasLoadedOnceRef");
  });

  it("no API changes for dashboard refresh", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("fetchOpenEncounters");
    expect(trackboard).not.toContain("/encounters?");
  });

  it("no encounter mutation during refresh", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toMatch(/status:\s*["']CLOSED["']/);
    expect(loadBlock).not.toContain("assignProviderSelf");
  });

  it("no permission changes in refresh path", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("roles.includes");
  });
});
