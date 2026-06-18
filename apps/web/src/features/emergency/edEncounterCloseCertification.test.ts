import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edEncounterCloseCertification (MEDUI.ED.LIFECYCLE.6 / 6B)", () => {
  it("closure surface integrates certification review for close governance", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("EdEncounterCertificationReview");
    expect(closure).toContain("buildEdClosedEncounterCertificationFromEncounter");
    expect(closure).toContain("DispositionReadinessBanner");
    expect(closure).toContain("acknowledgeDispositionSafety");
  });

  it("no encounter status mutation in certification filter modules", () => {
    const filter = readSrc("features/emergency/edIncompleteChartsFilter.ts");
    const cert = readSrc("features/emergency/edClosedEncounterCertificationFromTrackboard.ts");
    expect(filter).not.toMatch(/status:\s*["']CLOSED["']/);
    expect(cert).not.toContain("apiFetch");
  });

  it("certification engine is read-only projection", () => {
    const shared = readFileSync(
      join(webSrcRoot, "../../../packages/shared/src/encounters/edClosedEncounterCertification.ts"),
      "utf8"
    );
    expect(shared).toContain("buildEdClosedEncounterCertification");
    expect(shared).not.toContain("prisma");
  });
});
