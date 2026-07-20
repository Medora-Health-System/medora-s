import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("EdClosedEncounterCertificationPanel (MEDUI.ED.LIFECYCLE.6)", () => {
  it("renders certification summary and deficiency groups", () => {
    const panel = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    expect(panel).toContain('data-testid="ed-closed-encounter-certification-panel"');
    expect(panel).toContain("buildEdClosedEncounterCertificationFromTrackboardRow");
    expect(panel).toContain("edLifecycle.certification.findingsTitle");
    expect(panel).toContain("edLifecycle.certification.actions.openChart");
    expect(panel).not.toContain("edLifecycle.certification.advisory.banner");
  });

  it("fetches disposition readiness only when panel is opened for open encounter", () => {
    const panel = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    expect(panel).toContain("/disposition-readiness");
    expect(panel).toContain('encounter.status !== "OPEN"');
  });
});
