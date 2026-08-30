/**
 * Phase 19M.1 — lightweight responsive audit anchors (source-level, no DOM/Playwright).
 * Supplemented by cross-device QA checklist and 19M.8 rollup tests.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("19M.1 mobile/tablet responsiveness audit anchors", () => {
  it("audit document exists", () => {
    const doc = readFileSync(join(webRoot, "../../docs/ui/mobile-tablet-responsiveness-audit-19M1.md"), "utf8");
    expect(doc).toContain("Phase 19M.1");
    expect(doc).toContain("19M.2");
  });

  it("disposition panel implements responsive layout (19M.6)", () => {
    const src = readWebSource("src/features/emergency/EmergencyDispositionPanel.tsx");
    expect(src).toContain("resolveEdDispositionLayoutMode");
    expect(src).toContain('data-testid="ed-disposition-workspace-layout"');
    expect(src).toContain("ED_DISPOSITION_RESPONSIVE_CSS");
    expect(src).not.toContain("EdDispositionPreviewPanel");
    expect(src).not.toContain("wideLayout");
    expect(src).not.toContain('matchMedia("(min-width: 960px)")');
  });

  it("triage and nursing reassessment panels implement wideLayout breakpoint", () => {
    for (const file of [
      "src/features/emergency/EmergencyTriagePanel.tsx",
      "src/features/emergency/EmergencyNursingReassessmentPanel.tsx",
    ]) {
      const src = readWebSource(file);
      expect(src, file).toContain('matchMedia("(min-width: 960px)")');
    }
  });

  it("lab and radiology worklists include MedoraCardActionsMediaStyle", () => {
    expect(readWebSource("app/app/lab-worklist/page.tsx")).toContain("MedoraCardActionsMediaStyle");
    expect(readWebSource("app/app/rad-worklist/page.tsx")).toContain("MedoraCardActionsMediaStyle");
  });

  it("AppShell mobile drawer resolves C1 shell blocker (19M.2)", () => {
    const src = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(src).toContain('data-testid="app-shell-mobile-menu-button"');
    expect(src).toContain("resolveAppShellNavLayout");
  });

  it("ProviderDocumentationWorkspace implements responsive layout (19M.5)", () => {
    const src = readWebSource("src/components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(src).toContain("resolveProviderDocumentationLayoutMode");
    expect(src).toContain('data-testid="provider-documentation-workspace-layout"');
    expect(src).toContain('data-testid="provider-documentation-summary-stacked"');
    expect(src).not.toMatch(
      /display: "grid", gridTemplateColumns: "minmax\(0, 1fr\) minmax\(260px, 320px\)"/
    );
  });

  it("pharmacy worklist implements responsive MedoraCard layout (19M.7)", () => {
    const src = readWebSource("app/app/pharmacy-worklist/page.tsx");
    expect(src).toContain("resolveAncillaryLayoutMode");
    expect(src).toContain('data-testid="pharmacy-worklist-layout"');
    expect(src).toContain("MedoraCard");
    expect(src).not.toContain("<table");
  });

  it("EmergencyTrackboardView implements responsive patient cards (19M.3)", () => {
    const src = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(src).toContain("resolveErTrackboardLayoutMode");
    expect(src).toContain("stackedLayout={stackedCardLayout}");
    expect(src).toContain('data-testid="emergency-trackboard-layout"');
  });

  it("lab and radiology worklists use responsive layout hooks (19M.7)", () => {
    expect(readWebSource("app/app/lab-worklist/page.tsx")).toContain('data-testid="lab-worklist-layout"');
    expect(readWebSource("app/app/rad-worklist/page.tsx")).toContain('data-testid="rad-worklist-layout"');
  });

  it("EmergencyActiveWorkspaceView implements responsive section nav (19M.4)", () => {
    const src = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(src).toContain("resolveEmergencyChartLayoutMode");
    expect(src).toContain("EmergencyErWorkspaceSectionNav");
    expect(src).not.toContain('gridTemplateColumns: "repeat(10, minmax(0, 1fr))"');
  });

  it("cross-device QA checklist document exists (19M.8)", () => {
    const doc = readFileSync(join(webRoot, "../../docs/ui/cross-device-qa-checklist-19M8.md"), "utf8");
    expect(doc).toContain("Phase 19M.8");
    expect(doc).toContain("Core Clinical Workflow QA Matrix");
  });
});
