import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;
const panelPath = join(featureDir, "AiChartReviewPanel.tsx");
const clinicLayoutPath = join(featureDir, "../../../app/app/encounters/[id]/layout.tsx");
const emergencyLayoutPath = join(featureDir, "../../../app/app/emergency/active/[id]/layout.tsx");
const inpatientLayoutPath = join(
  featureDir,
  "../../../app/app/hospitalisation/inpatient/active/[id]/layout.tsx"
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Medora AI chart review clinical workspace rail", () => {
  it("allows provider, facility admin, and Medora super admin in ambulatory encounter context", () => {
    const layout = read(clinicLayoutPath);
    expect(layout).toContain('"PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"');
    expect(layout).toContain("canUseAiChartReview");
    expect(layout).toContain("isClinicCareAmbulatoryEncounterType");
    expect(layout).toContain("AiChartReviewPanel");
  });

  it("mounts the same AI chart review in active ED and inpatient workspaces", () => {
    const emergency = read(emergencyLayoutPath);
    const inpatient = read(inpatientLayoutPath);
    expect(emergency).toContain('"PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"');
    expect(emergency).toContain("AiChartReviewPanel");
    expect(emergency).toContain("emergencyActiveWorkspacePath");
    expect(inpatient).toContain('"PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"');
    expect(inpatient).toContain("AiChartReviewPanel");
    expect(inpatient).toContain("inpatientProviderWorkspacePath");
  });

  it("keeps the AI rail visible while the clinical chart scrolls", () => {
    for (const layoutPath of [clinicLayoutPath, emergencyLayoutPath, inpatientLayoutPath]) {
      const layout = read(layoutPath);
      expect(layout).toContain('data-testid="ai-chart-review-sticky-rail"');
      expect(layout).toContain('position: "sticky"');
      expect(layout).toContain("top: 12");
      expect(layout).toContain('maxHeight: "calc(100vh - 24px)"');
      expect(layout).toContain('overflowY: "auto"');
    }
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
