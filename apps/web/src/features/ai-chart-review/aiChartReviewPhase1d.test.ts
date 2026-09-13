import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;
const panelPath = join(featureDir, "AiChartReviewPanel.tsx");
const layoutPath = join(featureDir, "../../../app/app/encounters/[id]/layout.tsx");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Medora AI Phase 1D chart review panel", () => {
  it("mounts for provider, facility admin, and Medora super admin in ambulatory encounter context", () => {
    const layout = read(layoutPath);
    expect(layout).toContain('"PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"');
    expect(layout).toContain("canUseAiChartReview");
    expect(layout).toContain("isClinicCareAmbulatoryEncounterType");
    expect(layout).toContain("AiChartReviewPanel");
  });

  it("renders the six required panel tabs and read-only safety copy", () => {
    const panel = read(panelPath);
    expect(panel).toContain("Clinical Safety");
    expect(panel).toContain("Diagnostics");
    expect(panel).toContain("Treatment & Orders");
    expect(panel).toContain("Documentation / MDM");
    expect(panel).toContain("Discharge");
    expect(panel).toContain("Coding & Medical Necessity");
    expect(panel).toContain('data-read-only="true"');
  });

  it("keeps coding intelligence inactive and does not expose fake acknowledge/dismiss controls", () => {
    const panel = read(panelPath);
    expect(panel).toContain("Coding & Medical Necessity intelligence is not active in Phase 1D");
    expect(panel).not.toContain('actionType === "ACKNOWLEDGE"');
    expect(panel).not.toContain('actionType === "DISMISS"');
  });

  it("contains English, French, and Spanish panel chrome", () => {
    const panel = read(panelPath);
    expect(panel).toContain("AI Chart Review");
    expect(panel).toContain("Révision IA du dossier");
    expect(panel).toContain("Revisión de historia con IA");
  });
});
